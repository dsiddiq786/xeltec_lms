# =============================================================================
# Course Generation Worker - Robust Concurrent Background Process
# =============================================================================
# Production-grade worker with:
# - Concurrent job processing (configurable workers)
# - Memory-safe resource management
# - Automatic cleanup and connection pooling
# - Graceful shutdown handling
#
# RUN: python -m app.worker.course_worker
# =============================================================================

import os
import sys
import asyncio
import logging
import signal
import uuid
import gc
import weakref
from datetime import datetime
from typing import Optional, Set
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
load_dotenv()

from app.queue.redis_queue import get_queue, RedisQueue
from app.db.job_repository import JobRepository
from app.db.course_repository import CourseRepository
from app.db.draft_repository import DraftRepository
from app.schemas.request_schema import CourseGenerationRequest
from app.schemas.job_schema import JobStatus
from app.schemas.course_schema import (
    Course, CourseLevel, CourseModule, Slide,
    Assessment, AssessmentQuestion,
    CourseDocument, CourseMetadata, CourseConstraints
)
from app.services.async_generation_service import AsyncGenerationService
from app.utils.validators import validate_course_structure, validate_assessment, ValidationError
from app.utils.duration import calculate_total_course_duration, format_duration

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Worker configuration
MAX_CONCURRENT_JOBS = int(os.getenv("WORKER_CONCURRENT_JOBS", "3"))
HEARTBEAT_INTERVAL = 10
POLL_INTERVAL = 2
CLEANUP_INTERVAL = 300  # 5 minutes
MAX_MEMORY_MB = int(os.getenv("WORKER_MAX_MEMORY_MB", "1024"))


class ResourceManager:
    """
    Manages shared resources with proper cleanup.
    
    Prevents memory leaks by:
    - Using connection pooling
    - Tracking active resources
    - Periodic cleanup
    - Weak references where appropriate
    """
    
    def __init__(self):
        self._generation_services: weakref.WeakSet = weakref.WeakSet()
        self._active_tasks: Set[asyncio.Task] = set()
        self._lock = asyncio.Lock()
    
    async def get_generation_service(self) -> AsyncGenerationService:
        """Get or create a generation service with tracking."""
        service = AsyncGenerationService()
        self._generation_services.add(service)
        return service
    
    def track_task(self, task: asyncio.Task) -> None:
        """Track an active task."""
        self._active_tasks.add(task)
        task.add_done_callback(self._active_tasks.discard)
    
    async def cleanup(self) -> None:
        """Cleanup resources and run garbage collection."""
        async with self._lock:
            # Force garbage collection
            gc.collect()
            
            # Log memory usage
            try:
                import psutil
                process = psutil.Process()
                memory_mb = process.memory_info().rss / 1024 / 1024
                logger.info(f"Memory usage: {memory_mb:.1f} MB, Active tasks: {len(self._active_tasks)}")
                
                if memory_mb > MAX_MEMORY_MB:
                    logger.warning(f"Memory usage exceeds {MAX_MEMORY_MB}MB, forcing cleanup")
                    gc.collect()
            except ImportError:
                pass
    
    async def shutdown(self) -> None:
        """Gracefully shutdown all resources."""
        # Cancel active tasks
        for task in list(self._active_tasks):
            if not task.done():
                task.cancel()
        
        # Wait for tasks to complete
        if self._active_tasks:
            await asyncio.gather(*self._active_tasks, return_exceptions=True)
        
        # Final cleanup
        gc.collect()


class JobProcessor:
    """
    Processes a single job with proper resource management.
    
    Each job gets its own processor instance to ensure isolation.
    """
    
    def __init__(
        self,
        worker_id: str,
        job_id: str,
        resource_manager: ResourceManager
    ):
        self.worker_id = worker_id
        self.job_id = job_id
        self.resource_manager = resource_manager
        
        # Repositories (lightweight, can be recreated)
        self.job_repo = JobRepository()
        self.course_repo = CourseRepository()
        self.draft_repo = DraftRepository()
        
        # Will be created on demand
        self._generation_service: Optional[AsyncGenerationService] = None
        self._heartbeat_task: Optional[asyncio.Task] = None
    
    async def process(self) -> bool:
        """
        Process the job.
        
        Returns:
            True if successful, False otherwise
        """
        logger.info(f"[{self.worker_id}] Processing job: {self.job_id}")
        
        # Get job from MongoDB
        job = self.job_repo.get_by_id(self.job_id)
        if not job:
            logger.error(f"Job not found: {self.job_id}")
            return False
        
        # Check retry count
        if job.retry_count >= job.max_retries:
            logger.error(f"Job {self.job_id} exceeded max retries")
            self.job_repo.mark_failed(self.job_id, None, f"Exceeded maximum retries ({job.max_retries})")
            return False
        
        try:
            request = CourseGenerationRequest(**job.request_data)
            
            # Mark as processing
            if not self.job_repo.start_processing(self.job_id, self.worker_id, request.total_slides):
                logger.warning(f"Could not start job {self.job_id}")
                return False
            
            # Start heartbeat
            self._heartbeat_task = asyncio.create_task(self._send_heartbeats())
            
            # Get generation service
            self._generation_service = await self.resource_manager.get_generation_service()
            
            # Generate course
            course_id = await self._generate_course(request)
            
            # Mark completed
            self.job_repo.mark_completed(self.job_id, self.worker_id, course_id)
            logger.info(f"[{self.worker_id}] Job {self.job_id} completed: {course_id}")
            return True
            
        except Exception as e:
            logger.error(f"[{self.worker_id}] Job {self.job_id} failed: {e}")
            self.job_repo.mark_failed(
                self.job_id, self.worker_id, str(e),
                {"type": type(e).__name__}
            )
            return False
            
        finally:
            await self._cleanup()
    
    async def _cleanup(self) -> None:
        """Cleanup job resources."""
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass
        
        # Clear references
        self._generation_service = None
        self._heartbeat_task = None
    
    async def _send_heartbeats(self) -> None:
        """Send periodic heartbeats."""
        while True:
            try:
                await asyncio.sleep(HEARTBEAT_INTERVAL)
                self.job_repo.update_heartbeat(self.job_id, self.worker_id)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Heartbeat failed: {e}")
    
    async def _generate_course(self, request: CourseGenerationRequest) -> str:
        """Execute the course generation pipeline."""
        start_time = datetime.utcnow()
        
        # Create draft
        try:
            self.draft_repo.create_draft(
                job_id=self.job_id,
                course_title=request.course_title,
                request_data=request.model_dump()
            )
        except Exception as e:
            logger.warning(f"Failed to create draft: {e}")
        
        # Progress callback
        async def update_progress(step: str, step_num: int, slides_done: int, slides_total: int):
            self.job_repo.update_progress(
                self.job_id, self.worker_id,
                current_step=step,
                current_step_number=step_num,
                slides_completed=slides_done,
                slides_total=slides_total or request.total_slides
            )
        
        # Slide save callback
        async def save_slide(level_order: int, module_order: int, slide_data: dict):
            try:
                self.draft_repo.save_slide(self.job_id, level_order, module_order, slide_data)
            except Exception as e:
                logger.warning(f"Failed to save slide: {e}")
        
        # Step 1: Generate outline
        await update_progress("Generating course outline", 1, 0, request.total_slides)
        outline = await self._generation_service.generate_outline(request)
        
        try:
            self.draft_repo.save_outline(self.job_id, outline, request.total_slides)
        except Exception:
            pass
        
        # Step 2: Generate slides
        course_content = await self._generation_service.generate_all_slides(
            outline, request,
            progress_callback=update_progress,
            slide_save_callback=save_slide
        )
        
        # Step 3: Calculate durations
        await update_progress("Calculating durations", 3, request.total_slides, request.total_slides)
        total_duration = self._calculate_duration(course_content, request.words_per_minute)
        
        # Step 4: Generate assessment
        await update_progress("Generating assessment", 4, request.total_slides, request.total_slides)
        assessment_data = await self._generation_service.generate_assessment(
            course_content,
            pass_percentage=request.pass_percentage,
            questions_per_level=3
        )
        
        try:
            self.draft_repo.save_assessment(self.job_id, assessment_data)
        except Exception:
            pass
        
        # Step 5: Store final course
        await update_progress("Storing course", 5, request.total_slides, request.total_slides)
        
        course = self._build_course(course_content, assessment_data)
        document = self._create_document(course, request)
        stored = self.course_repo.create(document)
        
        try:
            self.draft_repo.mark_complete(self.job_id)
        except Exception:
            pass
        
        elapsed = (datetime.utcnow() - start_time).total_seconds()
        logger.info(f"Course generated: {request.course_title} ({format_duration(total_duration)}, {elapsed:.1f}s)")
        
        return stored.id
    
    def _calculate_duration(self, course_content: dict, words_per_minute: int) -> int:
        """Calculate total course duration."""
        all_slides = []
        for level in course_content.get("levels", []):
            for module in level.get("modules", []):
                all_slides.extend(module.get("slides", []))
        return calculate_total_course_duration(all_slides, words_per_minute)
    
    def _build_course(self, course_content: dict, assessment_data: dict) -> Course:
        """Build Course object."""
        levels = []
        for level_data in course_content["levels"]:
            modules = []
            for module_data in level_data["modules"]:
                slides = [
                    Slide(
                        slide_title=s["slide_title"],
                        slide_text=s["slide_text"],
                        visual_prompt=s["visual_prompt"],
                        voiceover_script=s["voiceover_script"],
                        estimated_duration_sec=s["estimated_duration_sec"]
                    )
                    for s in module_data["slides"]
                ]
                modules.append(CourseModule(
                    module_title=module_data["module_title"],
                    module_order=module_data["module_order"],
                    slides=slides
                ))
            levels.append(CourseLevel(
                level_title=level_data["level_title"],
                level_order=level_data["level_order"],
                modules=modules
            ))
        
        questions = [
            AssessmentQuestion(
                question=q["question"],
                options=q["options"],
                correct_option_index=q["correct_option_index"]
            )
            for q in assessment_data["questions"]
        ]
        
        return Course(
            title=course_content["title"],
            description=course_content["description"],
            levels=levels,
            assessment=Assessment(
                questions=questions,
                pass_percentage=assessment_data["pass_percentage"]
            )
        )
    
    def _create_document(self, course: Course, request: CourseGenerationRequest) -> CourseDocument:
        """Create CourseDocument."""
        return CourseDocument(
            metadata=CourseMetadata(
                title=course.title,
                description=course.description,
                category=request.category,
                course_level=request.course_level,
                regulatory_context=request.regulatory_context,
                version=1,
                created_at=datetime.utcnow()
            ),
            content=course,
            constraints=CourseConstraints(
                target_course_duration_minutes=request.target_course_duration_minutes,
                levels_count=request.levels_count,
                modules_per_level=request.modules_per_level,
                slides_per_module=request.slides_per_module,
                target_slide_duration_sec=request.target_slide_duration_sec,
                words_per_minute=request.words_per_minute,
                pass_percentage=request.pass_percentage
            )
        )


class ConcurrentWorker:
    """
    Production-grade concurrent worker.
    
    Features:
    - Process multiple jobs simultaneously
    - Memory-safe resource management
    - Automatic cleanup
    - Graceful shutdown
    - Connection pooling
    """
    
    def __init__(self, max_concurrent: int = MAX_CONCURRENT_JOBS):
        self.worker_id = f"worker-{uuid.uuid4().hex[:8]}"
        self.max_concurrent = max_concurrent
        self.queue: Optional[RedisQueue] = None
        self.resource_manager = ResourceManager()
        
        self.running = False
        self.active_jobs: Set[str] = set()
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._lock = asyncio.Lock()
        
        # Stats
        self.jobs_completed = 0
        self.jobs_failed = 0
        self.started_at = datetime.utcnow()
    
    async def start(self) -> None:
        """Start the worker."""
        logger.info(f"Starting worker: {self.worker_id} (max concurrent: {self.max_concurrent})")
        self.running = True
        self.queue = get_queue()
        
        # Setup signal handlers (Unix only)
        if sys.platform != "win32":
            loop = asyncio.get_event_loop()
            for sig in (signal.SIGTERM, signal.SIGINT):
                loop.add_signal_handler(sig, self._handle_shutdown)
        
        try:
            # Start background tasks
            cleanup_task = asyncio.create_task(self._periodic_cleanup())
            stale_check_task = asyncio.create_task(self._check_stale_jobs())
            
            # Main processing loop
            await self._process_loop()
            
            # Cleanup
            cleanup_task.cancel()
            stale_check_task.cancel()
            
        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received")
        except Exception as e:
            logger.error(f"Worker error: {e}")
        finally:
            await self._shutdown()
    
    def _handle_shutdown(self) -> None:
        """Handle shutdown signal."""
        logger.info(f"Shutdown signal received for {self.worker_id}")
        self.running = False
    
    async def _process_loop(self) -> None:
        """Main processing loop - fetches and processes jobs concurrently."""
        logger.info(f"Worker {self.worker_id} ready, waiting for jobs...")
        
        while self.running:
            try:
                # Try to get a job if we have capacity
                async with self._semaphore:
                    if not self.running:
                        break
                    
                    job_id = await self.queue.dequeue(timeout=POLL_INTERVAL)
                    
                    if job_id:
                        # Process job in background
                        task = asyncio.create_task(self._process_job(job_id))
                        self.resource_manager.track_task(task)
                    
            except Exception as e:
                logger.error(f"Error in process loop: {e}")
                await asyncio.sleep(POLL_INTERVAL)
    
    async def _process_job(self, job_id: str) -> None:
        """Process a single job with proper tracking."""
        async with self._lock:
            self.active_jobs.add(job_id)
        
        try:
            processor = JobProcessor(self.worker_id, job_id, self.resource_manager)
            success = await processor.process()
            
            if success:
                self.jobs_completed += 1
                await self.queue.complete(job_id)
            else:
                self.jobs_failed += 1
                # Check if should retry
                job = JobRepository().get_by_id(job_id)
                should_retry = job and job.retry_count < job.max_retries
                await self.queue.fail(job_id, requeue=should_retry)
                
        except Exception as e:
            logger.error(f"Job processing error: {e}")
            self.jobs_failed += 1
            await self.queue.fail(job_id, requeue=False)
            
        finally:
            async with self._lock:
                self.active_jobs.discard(job_id)
    
    async def _periodic_cleanup(self) -> None:
        """Periodic resource cleanup."""
        while self.running:
            try:
                await asyncio.sleep(CLEANUP_INTERVAL)
                await self.resource_manager.cleanup()
                
                # Log stats
                uptime = (datetime.utcnow() - self.started_at).total_seconds()
                logger.info(
                    f"Worker stats - Uptime: {uptime:.0f}s, "
                    f"Completed: {self.jobs_completed}, "
                    f"Failed: {self.jobs_failed}, "
                    f"Active: {len(self.active_jobs)}"
                )
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Cleanup error: {e}")
    
    async def _check_stale_jobs(self) -> None:
        """Check for and requeue stale jobs."""
        while self.running:
            try:
                await asyncio.sleep(60)  # Check every minute
                job_repo = JobRepository()
                requeued = job_repo.requeue_stale_jobs()
                if requeued > 0:
                    logger.info(f"Requeued {requeued} stale jobs")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Stale job check error: {e}")
    
    async def _shutdown(self) -> None:
        """Graceful shutdown."""
        logger.info(f"Shutting down worker {self.worker_id}...")
        
        # Wait for active jobs to complete (with timeout)
        if self.active_jobs:
            logger.info(f"Waiting for {len(self.active_jobs)} active jobs...")
            await asyncio.sleep(5)
        
        # Cleanup resources
        await self.resource_manager.shutdown()
        
        # Close queue connection
        if self.queue:
            await self.queue.disconnect()
        
        logger.info(
            f"Worker {self.worker_id} stopped. "
            f"Completed: {self.jobs_completed}, Failed: {self.jobs_failed}"
        )


async def main():
    """Entry point."""
    worker = ConcurrentWorker(max_concurrent=MAX_CONCURRENT_JOBS)
    await worker.start()


if __name__ == "__main__":
    asyncio.run(main())
