# =============================================================================
# AI Course Generator - FastAPI Application Entry Point
# =============================================================================
# Main application configuration and startup.
# This is the FOUNDATION of the LMS - keep it clean and simple.
# =============================================================================

import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Load environment variables from .env file
# WHY EARLY LOAD: Ensures all modules have access to env vars
load_dotenv()

# Configure logging
# WHY LOGGING: Essential for debugging and monitoring in production
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Import after env vars are loaded
from app.api.course_generator_controller import router as course_generator_router
from app.db.nosql_client import get_nosql_client


# =============================================================================
# Application Lifespan Management
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application startup and shutdown.
    
    NOTE: This is the API server only.
    The worker runs as a SEPARATE process: python -m app.worker.course_worker
    """
    # Startup
    logger.info("Starting AI Course Generator API...")
    
    # Initialize database connection
    try:
        client = get_nosql_client()
        if client.health_check():
            logger.info("MongoDB connection established")
        else:
            logger.warning("MongoDB health check failed - will retry on first request")
    except Exception as e:
        logger.warning(f"MongoDB connection failed on startup: {e}")
    
    # Initialize Redis connection
    try:
        from app.queue.redis_queue import get_queue
        queue = get_queue()
        await queue.connect()
        if await queue.health_check():
            logger.info("Redis connection established")
        else:
            logger.warning("Redis health check failed")
    except Exception as e:
        logger.warning(f"Redis connection failed on startup: {e}")
    
    logger.info("AI Course Generator API started successfully")
    logger.info("NOTE: Start worker separately with: python -m app.worker.course_worker")
    
    yield  # Application runs here
    
    # Shutdown
    logger.info("Shutting down AI Course Generator API...")
    
    # Close Redis connection
    try:
        from app.queue.redis_queue import close_queue
        await close_queue()
        logger.info("Redis connection closed")
    except Exception as e:
        logger.error(f"Error closing Redis: {e}")
    
    # Close MongoDB connection
    try:
        client = get_nosql_client()
        client.close()
        logger.info("MongoDB connection closed")
    except Exception as e:
        logger.error(f"Error closing MongoDB: {e}")
    
    logger.info("AI Course Generator API shutdown complete")


# =============================================================================
# FastAPI Application Configuration
# =============================================================================

app = FastAPI(
    title="AI Course Generator",
    description="""
    AI-powered LMS Course Generator Backend
    
    Generates full LMS-ready courses using OpenAI and stores them in MongoDB.
    
    ## Features
    
    - **Deterministic Generation**: Course structure is defined by system constraints
    - **Constraint-Driven**: AI follows strict rules for content length and quality
    - **Validated Output**: All content is validated before storage
    
    ## Course Structure
    
    ```
    Course
    └── Levels (progressive difficulty)
        └── Modules (logical groupings)
            └── Slides (individual content units)
                ├── slide_text (instructional content)
                ├── voiceover_script (narration)
                └── visual_prompt (image generation)
    ```
    
    ## Content Rules
    
    - Voiceover word count matches target duration ±10%
    - No placeholders or summaries allowed
    - Assessment questions aligned with content
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc",  # ReDoc
)


# =============================================================================
# Middleware Configuration
# =============================================================================

# CORS middleware for frontend integration (when needed)
# WHY CORS: Allows frontend apps on different domains to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Route Registration
# =============================================================================

# Register course generator routes
# Register course generator routes
app.include_router(course_generator_router)
from app.api.course_editor_controller import router as course_editor_router
app.include_router(course_editor_router)

# =============================================================================
# Static Files Configuration
# =============================================================================
from fastapi.staticfiles import StaticFiles

# Serve generated course content (images/audio)
# Frontend will access via /static/Generated_Courses/...
# Ensure directory exists
os.makedirs("Generated_Courses", exist_ok=True)
app.mount("/static", StaticFiles(directory="Generated_Courses"), name="static")



# =============================================================================
# Health Check Endpoint
# =============================================================================

@app.get(
    "/health",
    tags=["Health"],
    summary="Health check",
    description="Check if the service, MongoDB, and Redis are healthy.",
    responses={
        200: {"description": "Service is healthy"},
        503: {"description": "Service is unhealthy"},
    }
)
async def health_check():
    """
    Health check endpoint for load balancers and monitoring.
    
    Checks:
    - MongoDB connection
    - Redis connection (job queue)
    """
    from app.queue.redis_queue import get_queue
    
    mongo_healthy = False
    redis_healthy = False
    
    # Check MongoDB
    try:
        client = get_nosql_client()
        mongo_healthy = client.health_check()
    except Exception as e:
        logger.error(f"MongoDB health check failed: {e}")
    
    # Check Redis
    try:
        queue = get_queue()
        redis_healthy = await queue.health_check()
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
    
    all_healthy = mongo_healthy and redis_healthy
    
    response_content = {
        "status": "healthy" if all_healthy else "unhealthy",
        "service": "ai-course-generator-api",
        "components": {
            "mongodb": "connected" if mongo_healthy else "disconnected",
            "redis": "connected" if redis_healthy else "disconnected"
        }
    }
    
    if all_healthy:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=response_content
        )
    else:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=response_content
        )


@app.get(
    "/",
    tags=["Root"],
    summary="API Root",
    description="Welcome message and API information.",
)
async def root():
    """Root endpoint with API information."""
    return {
        "service": "AI Course Generator",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health",
        "architecture": {
            "type": "Distributed worker with Redis queue",
            "api": "FastAPI (this server)",
            "queue": "Redis",
            "worker": "Separate process (python -m app.worker.course_worker)",
            "database": "MongoDB"
        },
        "endpoints": {
            "jobs": {
                "create": "POST /api/course-generator/jobs",
                "status": "GET /api/course-generator/jobs/{job_id}",
                "draft": "GET /api/course-generator/jobs/{job_id}/draft",
                "list": "GET /api/course-generator/jobs",
                "stats": "GET /api/course-generator/jobs/stats/summary"
            },
            "courses": {
                "get": "GET /api/course-generator/courses/{course_id}",
                "list": "GET /api/course-generator/courses"
            }
        },
        "note": "Start worker separately: python -m app.worker.course_worker"
    }


# =============================================================================
# Development Server
# =============================================================================

if __name__ == "__main__":
    # Only used for development - production uses uvicorn directly
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )
