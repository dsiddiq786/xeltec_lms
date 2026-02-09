# =============================================================================
# Redis Queue Service - Job Queue Management
# =============================================================================
# Handles Redis queue operations for job processing.
# API enqueues jobs, Worker dequeues and processes.
# =============================================================================

import os
import json
import logging
from typing import Optional
from datetime import datetime
import redis.asyncio as redis

logger = logging.getLogger(__name__)

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
QUEUE_NAME = "course_generation_jobs"
PROCESSING_QUEUE = "course_generation_processing"


class RedisQueue:
    """
    Redis-based job queue for course generation.
    
    ARCHITECTURE:
    - Jobs stored in MongoDB (persistent data)
    - Job IDs queued in Redis (fast queue)
    - Separate worker process consumes from Redis
    - Provides reliable queue with visibility timeout
    """
    
    def __init__(self):
        """Initialize Redis connection."""
        self._client: Optional[redis.Redis] = None
    
    async def connect(self) -> None:
        """Establish Redis connection."""
        if self._client is None:
            self._client = redis.from_url(
                REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            # Test connection
            await self._client.ping()
            logger.info(f"Connected to Redis: {REDIS_URL}")
    
    async def disconnect(self) -> None:
        """Close Redis connection."""
        if self._client:
            await self._client.close()
            self._client = None
            logger.info("Disconnected from Redis")
    
    async def enqueue(self, job_id: str) -> int:
        """
        Add a job ID to the queue.
        
        Args:
            job_id: MongoDB job document ID
            
        Returns:
            Queue length after adding
        """
        await self.connect()
        
        job_data = json.dumps({
            "job_id": job_id,
            "queued_at": datetime.utcnow().isoformat()
        })
        
        length = await self._client.rpush(QUEUE_NAME, job_data)
        logger.info(f"Enqueued job {job_id}, queue length: {length}")
        return length
    
    async def dequeue(self, timeout: int = 5) -> Optional[str]:
        """
        Get next job ID from queue (blocking).
        
        Args:
            timeout: Seconds to wait for job
            
        Returns:
            Job ID or None if timeout
        """
        await self.connect()
        
        result = await self._client.blpop(QUEUE_NAME, timeout=timeout)
        
        if result:
            _, job_data = result
            data = json.loads(job_data)
            job_id = data["job_id"]
            
            # Move to processing queue for visibility
            await self._client.hset(
                PROCESSING_QUEUE,
                job_id,
                json.dumps({
                    "job_id": job_id,
                    "started_at": datetime.utcnow().isoformat()
                })
            )
            
            logger.debug(f"Dequeued job {job_id}")
            return job_id
        
        return None
    
    async def complete(self, job_id: str) -> None:
        """Remove job from processing queue (successful completion)."""
        await self.connect()
        await self._client.hdel(PROCESSING_QUEUE, job_id)
        logger.debug(f"Completed job {job_id}")
    
    async def fail(self, job_id: str, requeue: bool = False) -> None:
        """
        Handle failed job.
        
        Args:
            job_id: Failed job ID
            requeue: Whether to put back in queue
        """
        await self.connect()
        await self._client.hdel(PROCESSING_QUEUE, job_id)
        
        if requeue:
            await self.enqueue(job_id)
            logger.info(f"Requeued failed job {job_id}")
        else:
            logger.info(f"Removed failed job {job_id}")
    
    async def get_queue_length(self) -> int:
        """Get number of jobs waiting in queue."""
        await self.connect()
        return await self._client.llen(QUEUE_NAME)
    
    async def get_processing_count(self) -> int:
        """Get number of jobs currently being processed."""
        await self.connect()
        return await self._client.hlen(PROCESSING_QUEUE)
    
    async def get_queue_position(self, job_id: str) -> Optional[int]:
        """Get position of a job in the queue (1-indexed)."""
        await self.connect()
        
        # Check if in processing
        if await self._client.hexists(PROCESSING_QUEUE, job_id):
            return 0  # Currently processing
        
        # Search in queue
        queue_items = await self._client.lrange(QUEUE_NAME, 0, -1)
        for i, item in enumerate(queue_items):
            data = json.loads(item)
            if data["job_id"] == job_id:
                return i + 1
        
        return None  # Not in queue
    
    async def health_check(self) -> bool:
        """Check if Redis connection is healthy."""
        try:
            await self.connect()
            await self._client.ping()
            return True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False
    
    async def get_stats(self) -> dict:
        """Get queue statistics."""
        await self.connect()
        return {
            "queue_length": await self.get_queue_length(),
            "processing_count": await self.get_processing_count(),
        }


# Global queue instance
_queue: Optional[RedisQueue] = None


def get_queue() -> RedisQueue:
    """Get the global queue instance."""
    global _queue
    if _queue is None:
        _queue = RedisQueue()
    return _queue


async def close_queue() -> None:
    """Close the global queue connection."""
    global _queue
    if _queue:
        await _queue.disconnect()
        _queue = None
