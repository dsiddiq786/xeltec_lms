# =============================================================================
# Job Schema - Background Job Status Tracking
# =============================================================================
# Defines the schema for tracking course generation job status.
# Jobs are processed by separate worker process via Redis queue.
# =============================================================================

from datetime import datetime
from typing import Optional, Any
from enum import Enum
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    """
    Job status states for course generation.
    
    State Machine:
    QUEUED -> PROCESSING -> COMPLETED
                        -> FAILED
    
    QUEUED: Job in Redis queue, waiting for worker
    PROCESSING: Worker picked up job, actively generating
    COMPLETED: Course generated and stored
    FAILED: Generation failed (see error_message)
    """
    QUEUED = "queued"             # In Redis queue, waiting for worker
    PROCESSING = "processing"     # Worker is actively processing
    COMPLETED = "completed"       # Successfully completed
    FAILED = "failed"            # Failed with error


class JobProgress(BaseModel):
    """
    Progress tracking for course generation.
    
    Updated by worker process during generation.
    API reads from MongoDB to return current progress.
    """
    current_step: str = Field(
        default="Queued",
        description="Current step description"
    )
    total_steps: int = Field(
        default=5,
        description="Total number of major steps"
    )
    current_step_number: int = Field(
        default=0,
        description="Current step number (0-indexed)"
    )
    slides_completed: int = Field(
        default=0,
        description="Number of slides generated"
    )
    slides_total: int = Field(
        default=0,
        description="Total slides to generate"
    )
    percentage: float = Field(
        default=0.0,
        ge=0.0,
        le=100.0,
        description="Overall completion percentage"
    )


class GenerationJob(BaseModel):
    """
    Background job for course generation.
    
    ARCHITECTURE:
    1. API creates job in MongoDB (status=QUEUED)
    2. API enqueues job_id to Redis
    3. Worker picks up from Redis
    4. Worker updates MongoDB during processing
    5. API reads MongoDB for status
    """
    id: Optional[str] = Field(
        default=None,
        alias="_id",
        description="Job ID (MongoDB ObjectId as string)"
    )
    
    status: JobStatus = Field(
        default=JobStatus.QUEUED,
        description="Current job status"
    )
    
    course_title: str = Field(
        ...,
        description="Title of the course being generated"
    )
    
    request_data: dict[str, Any] = Field(
        ...,
        description="Original request data for retry capability"
    )
    
    progress: JobProgress = Field(
        default_factory=JobProgress,
        description="Detailed progress tracking"
    )
    
    course_id: Optional[str] = Field(
        default=None,
        description="ID of generated course (when completed)"
    )
    
    error_message: Optional[str] = Field(
        default=None,
        description="Error message if job failed"
    )
    
    error_details: Optional[dict] = Field(
        default=None,
        description="Detailed error information for debugging"
    )
    
    # Worker tracking
    worker_id: Optional[str] = Field(
        default=None,
        description="ID of worker processing this job"
    )
    
    worker_heartbeat: Optional[datetime] = Field(
        default=None,
        description="Last heartbeat from worker"
    )
    
    retry_count: int = Field(
        default=0,
        description="Number of retry attempts"
    )
    
    max_retries: int = Field(
        default=3,
        description="Maximum retry attempts"
    )
    
    # Timestamps
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the job was created"
    )
    
    queued_at: Optional[datetime] = Field(
        default=None,
        description="When job was queued to Redis"
    )
    
    started_at: Optional[datetime] = Field(
        default=None,
        description="When worker started processing"
    )
    
    completed_at: Optional[datetime] = Field(
        default=None,
        description="When job finished (success or failure)"
    )
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class JobCreateResponse(BaseModel):
    """Response when creating a new generation job."""
    job_id: str = Field(..., description="The created job ID")
    status: JobStatus = Field(..., description="Initial job status")
    message: str = Field(..., description="Status message")
    queue_position: Optional[int] = Field(
        default=None,
        description="Position in queue (if available)"
    )


class JobStatusResponse(BaseModel):
    """Response when querying job status."""
    job_id: str
    status: JobStatus
    progress: JobProgress
    course_title: str
    course_id: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    worker_id: Optional[str] = None
    created_at: datetime
    queued_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    elapsed_seconds: Optional[float] = None
    
    @classmethod
    def from_job(cls, job: GenerationJob) -> "JobStatusResponse":
        """Create response from job document."""
        elapsed = None
        if job.started_at:
            end_time = job.completed_at or datetime.utcnow()
            elapsed = (end_time - job.started_at).total_seconds()
        
        return cls(
            job_id=job.id,
            status=job.status,
            progress=job.progress,
            course_title=job.course_title,
            course_id=job.course_id,
            error_message=job.error_message,
            retry_count=job.retry_count,
            worker_id=job.worker_id,
            created_at=job.created_at,
            queued_at=job.queued_at,
            started_at=job.started_at,
            completed_at=job.completed_at,
            elapsed_seconds=elapsed
        )


class WorkerStatus(BaseModel):
    """Status of a worker process."""
    worker_id: str
    is_alive: bool
    current_job_id: Optional[str] = None
    jobs_completed: int = 0
    jobs_failed: int = 0
    last_heartbeat: Optional[datetime] = None
    started_at: datetime
