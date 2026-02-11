# =============================================================================
# Job Repository - Database Operations for Generation Jobs
# =============================================================================
# Handles all MongoDB operations for job tracking.
# Worker updates job status here, API reads from here.
# =============================================================================

import logging
from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId

from app.db.nosql_client import get_nosql_client
from app.schemas.job_schema import GenerationJob, JobStatus, JobProgress

logger = logging.getLogger(__name__)

# Heartbeat timeout - if no heartbeat for this long, job is considered stale
HEARTBEAT_TIMEOUT_SECONDS = 60


class JobRepository:
    """
    Repository for generation job operations.
    
    ARCHITECTURE:
    - Jobs stored in MongoDB (persistent)
    - Job IDs queued in Redis (transient)
    - Worker reads job from MongoDB, updates progress here
    - API reads status from MongoDB
    """
    
    def __init__(self):
        """Initialize repository with database client."""
        self._client = get_nosql_client()
        self._collection_name = "generation_jobs"
    
    @property
    def collection(self):
        """Get the jobs collection."""
        return self._client.get_collection(self._collection_name)
    
    def create(self, job: GenerationJob) -> GenerationJob:
        """Create a new generation job."""
        try:
            doc = job.model_dump(by_alias=True, exclude={"id"})
            doc["created_at"] = datetime.utcnow()
            doc["status"] = JobStatus.QUEUED.value
            
            result = self.collection.insert_one(doc)
            
            if not result.inserted_id:
                raise RuntimeError("Failed to insert job document")
            
            logger.info(f"Created job: {result.inserted_id}")
            
            return GenerationJob(
                _id=str(result.inserted_id),
                **{k: v for k, v in doc.items() if k != "_id"}
            )
            
        except Exception as e:
            logger.error(f"Failed to create job: {e}")
            raise RuntimeError(f"Job creation failed: {e}")
    
    def get_by_id(self, job_id: str) -> Optional[GenerationJob]:
        """Retrieve a job by its ID."""
        try:
            object_id = ObjectId(job_id)
            doc = self.collection.find_one({"_id": object_id})
            
            if doc is None:
                return None
            
            doc["_id"] = str(doc["_id"])
            return GenerationJob(**doc)
            
        except Exception as e:
            logger.error(f"Failed to get job {job_id}: {e}")
            return None
    
    def mark_queued(self, job_id: str) -> bool:
        """Mark job as queued to Redis."""
        try:
            object_id = ObjectId(job_id)
            result = self.collection.update_one(
                {"_id": object_id},
                {"$set": {
                    "status": JobStatus.QUEUED.value,
                    "queued_at": datetime.utcnow()
                }}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to mark job queued {job_id}: {e}")
            return False
    
    def start_processing(
        self,
        job_id: str,
        worker_id: str,
        slides_total: int
    ) -> bool:
        """
        Mark job as being processed by a worker.
        
        Called by worker when it picks up a job.
        """
        try:
            object_id = ObjectId(job_id)
            now = datetime.utcnow()
            
            result = self.collection.update_one(
                {"_id": object_id, "status": JobStatus.QUEUED.value},
                {"$set": {
                    "status": JobStatus.PROCESSING.value,
                    "worker_id": worker_id,
                    "worker_heartbeat": now,
                    "started_at": now,
                    "progress.current_step": "Starting generation",
                    "progress.slides_total": slides_total,
                    "progress.percentage": 0.0
                }}
            )
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to start processing job {job_id}: {e}")
            return False
    
    def update_heartbeat(self, job_id: str, worker_id: str) -> bool:
        """Update worker heartbeat for a job."""
        try:
            object_id = ObjectId(job_id)
            result = self.collection.update_one(
                {"_id": object_id, "worker_id": worker_id},
                {"$set": {"worker_heartbeat": datetime.utcnow()}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to update heartbeat for job {job_id}: {e}")
            return False
    
    def update_progress(
        self,
        job_id: str,
        worker_id: str,
        current_step: str,
        current_step_number: int,
        slides_completed: int = 0,
        slides_total: int = 0
    ) -> bool:
        """Update job progress (called by worker)."""
        try:
            object_id = ObjectId(job_id)
            
            # Calculate percentage
            if slides_total > 0:
                slide_percentage = (slides_completed / slides_total) * 60
                step_percentage = (current_step_number / 5) * 40
                percentage = min(slide_percentage + step_percentage, 100)
            else:
                percentage = (current_step_number / 5) * 100
            
            result = self.collection.update_one(
                {"_id": object_id, "worker_id": worker_id},
                {"$set": {
                    "progress.current_step": current_step,
                    "progress.current_step_number": current_step_number,
                    "progress.slides_completed": slides_completed,
                    "progress.slides_total": slides_total,
                    "progress.percentage": round(percentage, 1),
                    "worker_heartbeat": datetime.utcnow()
                }}
            )
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to update progress for job {job_id}: {e}")
            return False
    
    def mark_completed(
        self,
        job_id: str,
        worker_id: str,
        course_id: str,
        cost_summary: dict = None,
        output_directory: str = None
    ) -> bool:
        """Mark job as successfully completed."""
        try:
            object_id = ObjectId(job_id)
            update_fields = {
                "status": JobStatus.COMPLETED.value,
                "course_id": course_id,
                "completed_at": datetime.utcnow(),
                "progress.current_step": "Completed",
                "progress.percentage": 100.0
            }
            
            if cost_summary:
                update_fields["cost_summary"] = cost_summary
            if output_directory:
                update_fields["output_directory"] = output_directory
            
            result = self.collection.update_one(
                {"_id": object_id, "worker_id": worker_id},
                {"$set": update_fields}
            )
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to mark job completed {job_id}: {e}")
            return False
    
    def mark_failed(
        self,
        job_id: str,
        worker_id: Optional[str],
        error_message: str,
        error_details: Optional[dict] = None,
        increment_retry: bool = True
    ) -> bool:
        """Mark job as failed."""
        try:
            object_id = ObjectId(job_id)
            
            update = {
                "$set": {
                    "status": JobStatus.FAILED.value,
                    "error_message": error_message,
                    "error_details": error_details or {},
                    "completed_at": datetime.utcnow(),
                    "progress.current_step": f"Failed: {error_message[:50]}"
                }
            }
            
            if increment_retry:
                update["$inc"] = {"retry_count": 1}
            
            # Only match worker_id if provided
            query = {"_id": object_id}
            if worker_id:
                query["worker_id"] = worker_id
            
            result = self.collection.update_one(query, update)
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to mark job failed {job_id}: {e}")
            return False
    
    def requeue_stale_jobs(self) -> int:
        """
        Find and requeue jobs with stale heartbeats.
        
        Called periodically to handle worker crashes.
        """
        try:
            cutoff = datetime.utcnow() - timedelta(seconds=HEARTBEAT_TIMEOUT_SECONDS)
            
            result = self.collection.update_many(
                {
                    "status": JobStatus.PROCESSING.value,
                    "worker_heartbeat": {"$lt": cutoff},
                    "retry_count": {"$lt": 3}  # Don't retry forever
                },
                {
                    "$set": {
                        "status": JobStatus.QUEUED.value,
                        "worker_id": None,
                        "worker_heartbeat": None,
                        "progress.current_step": "Requeued after worker timeout"
                    },
                    "$inc": {"retry_count": 1}
                }
            )
            
            if result.modified_count > 0:
                logger.warning(f"Requeued {result.modified_count} stale jobs")
            
            return result.modified_count
            
        except Exception as e:
            logger.error(f"Failed to requeue stale jobs: {e}")
            return 0
    
    def list_jobs(
        self,
        status: Optional[JobStatus] = None,
        skip: int = 0,
        limit: int = 50
    ) -> list[GenerationJob]:
        """List jobs with optional status filtering."""
        try:
            query = {}
            if status:
                query["status"] = status.value
            
            cursor = self.collection.find(query).sort(
                "created_at", -1
            ).skip(skip).limit(limit)
            
            jobs = []
            for doc in cursor:
                doc["_id"] = str(doc["_id"])
                jobs.append(GenerationJob(**doc))
            
            return jobs
            
        except Exception as e:
            logger.error(f"Failed to list jobs: {e}")
            return []
    
    def count_by_status(self) -> dict[str, int]:
        """Get count of jobs by status."""
        try:
            pipeline = [
                {"$group": {"_id": "$status", "count": {"$sum": 1}}}
            ]
            results = list(self.collection.aggregate(pipeline))
            return {r["_id"]: r["count"] for r in results}
        except Exception as e:
            logger.error(f"Failed to count jobs: {e}")
            return {}
    
    def delete_old_jobs(self, days: int = 7) -> int:
        """Delete completed/failed jobs older than specified days."""
        try:
            cutoff = datetime.utcnow() - timedelta(days=days)
            
            result = self.collection.delete_many({
                "status": {"$in": [JobStatus.COMPLETED.value, JobStatus.FAILED.value]},
                "completed_at": {"$lt": cutoff}
            })
            
            if result.deleted_count > 0:
                logger.info(f"Deleted {result.deleted_count} old jobs")
            
            return result.deleted_count
            
        except Exception as e:
            logger.error(f"Failed to delete old jobs: {e}")
            return 0
