# =============================================================================
# Course Generator Controller - HTTP API Endpoints
# =============================================================================
# Clean API layer - handles HTTP concerns only.
# All processing happens in separate worker process.
# =============================================================================

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError as PydanticValidationError

from app.schemas.request_schema import CourseGenerationRequest
from app.schemas.course_schema import CourseDocument
from app.schemas.job_schema import (
    GenerationJob,
    JobStatus,
    JobProgress,
    JobCreateResponse,
    JobStatusResponse
)
from app.db.job_repository import JobRepository
from app.db.course_repository import CourseRepository
from app.queue.redis_queue import get_queue
from app.utils.validators import ValidationError

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/course-generator",
    tags=["Course Generator"]
)


# =============================================================================
# Job Endpoints - Production API
# =============================================================================

@router.post(
    "/jobs",
    response_model=JobCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Create course generation job",
    description="""
    Create a background job for course generation.
    
    **This is the recommended endpoint for production use.**
    
    The API immediately returns a job ID. The actual generation happens
    in a separate worker process. Use GET /jobs/{job_id} to check status.
    
    Flow:
    1. Job created in MongoDB (status: queued)
    2. Job ID enqueued to Redis
    3. Worker picks up job and processes
    4. Poll GET /jobs/{job_id} for status
    """
)
async def create_job(request: CourseGenerationRequest) -> JobCreateResponse:
    """Create a new course generation job."""
    logger.info(f"Creating job for: {request.course_title}")
    
    try:
        # Validate request upfront
        if not request.validate_total_duration():
            calculated = (request.total_slides * request.target_slide_duration_sec) / 60
            raise ValidationError(
                f"Duration mismatch: {request.total_slides} slides × "
                f"{request.target_slide_duration_sec}s = {calculated:.0f}min, "
                f"but target is {request.target_course_duration_minutes}min",
                field="target_course_duration_minutes"
            )
        
        # Create job in MongoDB
        job_repo = JobRepository()
        job = GenerationJob(
            course_title=request.course_title,
            request_data=request.model_dump(),
            progress=JobProgress(
                current_step="Queued",
                slides_total=request.total_slides
            )
        )
        created_job = job_repo.create(job)
        
        # Queue to Redis
        queue = get_queue()
        queue_length = await queue.enqueue(created_job.id)
        
        # Update job as queued
        job_repo.mark_queued(created_job.id)
        
        logger.info(f"Job created and queued: {created_job.id}, position: {queue_length}")
        
        return JobCreateResponse(
            job_id=created_job.id,
            status=JobStatus.QUEUED,
            message="Job queued for processing",
            queue_position=queue_length
        )
        
    except ValidationError as e:
        logger.warning(f"Validation error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "validation_error",
                "message": e.message,
                "field": e.field
            }
        )
    except Exception as e:
        logger.exception(f"Failed to create job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "job_creation_failed",
                "message": str(e)
            }
        )


@router.get(
    "/jobs/{job_id}",
    response_model=JobStatusResponse,
    summary="Get job status",
    description="""
    Get current status and progress of a generation job.
    
    **Poll this endpoint to track progress.**
    
    Status values:
    - `queued`: Job waiting in queue for worker
    - `processing`: Worker is generating the course
    - `completed`: Course generated successfully (course_id available)
    - `failed`: Generation failed (error_message available)
    
    The progress object shows detailed step information:
    - current_step: Human-readable description
    - percentage: Overall completion (0-100)
    - slides_completed / slides_total: Slide generation progress
    """
)
async def get_job_status(job_id: str) -> JobStatusResponse:
    """Get job status from MongoDB."""
    job_repo = JobRepository()
    job = job_repo.get_by_id(job_id)
    
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "not_found",
                "message": f"Job '{job_id}' not found"
            }
        )
    
    return JobStatusResponse.from_job(job)


@router.get(
    "/jobs",
    response_model=list[JobStatusResponse],
    summary="List jobs",
    description="List all generation jobs with optional status filtering."
)
async def list_jobs(
    status_filter: Optional[JobStatus] = None,
    skip: int = 0,
    limit: int = 50
) -> list[JobStatusResponse]:
    """List jobs with optional filtering."""
    job_repo = JobRepository()
    jobs = job_repo.list_jobs(status=status_filter, skip=skip, limit=limit)
    return [JobStatusResponse.from_job(job) for job in jobs]


@router.get(
    "/jobs/stats/summary",
    summary="Get job statistics",
    description="Get summary statistics of all jobs."
)
async def get_job_stats() -> dict:
    """Get job statistics."""
    job_repo = JobRepository()
    queue = get_queue()
    
    counts = job_repo.count_by_status()
    queue_stats = await queue.get_stats()
    
    return {
        "jobs_by_status": counts,
        "queue": queue_stats,
        "redis_healthy": await queue.health_check()
    }


# =============================================================================
# Draft Endpoints - Partial Progress
# =============================================================================

@router.get(
    "/jobs/{job_id}/draft",
    summary="Get draft content",
    description="""
    Get partial course content while generation is in progress.
    
    Use this to show incremental progress to users.
    Returns whatever slides have been generated so far.
    """
)
async def get_job_draft(job_id: str) -> dict:
    """Get draft content for a job."""
    from app.db.draft_repository import DraftRepository
    
    draft_repo = DraftRepository()
    draft = draft_repo.get_draft_content(job_id)
    
    if draft is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "not_found",
                "message": f"Draft for job '{job_id}' not found"
            }
        )
    
    return draft


# =============================================================================
# Course Endpoints - Read Operations
# =============================================================================

@router.get(
    "/courses/{course_id}",
    response_model=CourseDocument,
    summary="Get course by ID",
    description="Retrieve a generated course by its database ID."
)
async def get_course(course_id: str) -> CourseDocument:
    """Get a course by ID."""
    repo = CourseRepository()
    course = repo.get_by_id(course_id)
    
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "not_found",
                "message": f"Course '{course_id}' not found"
            }
        )
    
    return course


@router.get(
    "/courses",
    response_model=list[CourseDocument],
    summary="List courses",
    description="List all generated courses with optional filtering."
)
async def list_courses(
    category: Optional[str] = None,
    course_level: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> list[CourseDocument]:
    """List courses with optional filtering."""
    repo = CourseRepository()
    return repo.list_courses(
        category=category,
        course_level=course_level,
        skip=skip,
        limit=limit
    )
