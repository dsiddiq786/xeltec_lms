
# =============================================================================
# Course Editor Controller - Content Management Endpoints
# =============================================================================
# Handles updates to existing courses.
# - Full course updates
# - Partial slide updates
# - Media uploads (Images/Audio)
# =============================================================================

import os
import shutil
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Body, Path

from app.schemas.editor_schema import CourseUpdateRequest, SlideUpdateRequest, MediaUploadResponse
from app.schemas.course_schema import CourseDocument
from app.db.course_repository import CourseRepository
from app.services.file_storage_service import FileStorageService, sanitize_name

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/course-generator",
    tags=["Course Editor"]
)

# Helper for locating slides
def _get_slide_path_info(course_doc: CourseDocument, level_order: int, module_order: int, slide_index: int) -> dict:
    """Helper to find the slide object and construct its directory path."""
    content = course_doc.content
    
    # 1. Locate Level
    level = next((l for l in content.levels if l.level_order == level_order), None)
    if not level:
        raise HTTPException(
            status_code=404, 
            detail=f"Level {level_order} not found (Course has {len(content.levels)} levels)"
        )
    
    # 2. Locate Module
    module = next((m for m in level.modules if m.module_order == module_order), None)
    if not module:
        raise HTTPException(
            status_code=404,
            detail=f"Module {module_order} not found in Level {level_order}"
        )
    
    # 3. Locate Slide
    if slide_index < 1 or slide_index > len(module.slides):
        raise HTTPException(
            status_code=404,
            detail=f"Slide {slide_index} not found (Module has {len(module.slides)} slides)"
        )
    
    slide = module.slides[slide_index - 1]
    
    # 4. Construct Path
    # Using existing logic from FileStorageService to reconstruct paths
    # WARNING: This assumes folder names haven't changed drastically or are reconstructible
    # Ideally, we should store absolute paths in DB, but we store relative for portability.
    # We'll use the course output directory from metadata if available.
    
    course_dir = course_doc.output_directory
    if not course_dir or not os.path.exists(course_dir):
        # Fallback: try to reconstruct based on title/id
        # This is risky if title changed. Ideally we use the ID.
        # But for POC we assume output_directory is correct.
        error = f"Course directory not found: {course_dir}"
        logger.error(error)
        raise HTTPException(status_code=500, detail=error)

    storage = FileStorageService()
    slide_dir = storage.get_slide_directory(
        course_dir=course_dir,
        level_order=level.level_order,
        level_title=level.level_title,
        module_order=module.module_order,
        module_title=module.module_title,
        slide_index=slide_index,
        slide_title=slide.slide_title
    )
    
    return {
        "slide": slide,
        "slide_dir": slide_dir,
        "absolute_path": slide_dir
    }

# =============================================================================
# Update Endpoints
# =============================================================================

@router.put(
    "/courses/{course_id}",
    response_model=CourseDocument,
    summary="Update full course"
)
async def update_course(
    course_id: str,
    update_data: CourseUpdateRequest
):
    """Update the entire course content object."""
    repo = CourseRepository()
    existing_course = repo.get_by_id(course_id)
    
    if not existing_course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Update content
    existing_course.content = update_data.course_content
    
    # Update metadata if provided
    if update_data.metadata:
        # Pydantic v2 model_dump/copy
        meta_dict = existing_course.metadata.model_dump()
        meta_dict.update(update_data.metadata)
        # Re-validate
        # existing_course.metadata = CourseMetadata(**meta_dict) 
        # (Assuming metadata structure doesn't change much for now)
        pass

    # Save to DB
    repo.update(course_id, existing_course)
    
    return existing_course

@router.patch(
    "/courses/{course_id}/slides",
    summary="Update specific slide"
)
async def update_slide(
    course_id: str,
    patch_data: SlideUpdateRequest
):
    """Partial update of a slide's text fields."""
    repo = CourseRepository()
    course = repo.get_by_id(course_id)
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Find slide
    # Note: We implement custom search because we need to MODIFY the object in place
    found = False
    
    for level in course.content.levels:
        if level.level_order == patch_data.level_order:
            for module in level.modules:
                if module.module_order == patch_data.module_order:
                    if 1 <= patch_data.slide_index <= len(module.slides):
                        slide = module.slides[patch_data.slide_index - 1]
                        
                        # Apply updates
                        if patch_data.slide_title is not None:
                            slide.slide_title = patch_data.slide_title
                        if patch_data.slide_text is not None:
                            slide.slide_text = patch_data.slide_text
                        if patch_data.voiceover_script is not None:
                            slide.voiceover_script = patch_data.voiceover_script
                        if patch_data.visual_prompt is not None:
                            slide.visual_prompt = patch_data.visual_prompt
                        if patch_data.estimated_duration_sec is not None:
                            slide.estimated_duration_sec = patch_data.estimated_duration_sec
                            
                        # Update slide content.json on disk as well?
                        # Ideally yes, to keep disk in sync with DB.
                        # For POC, we focus on DB as source of truth for UI.
                        
                        found = True
                    break
            break
            
    if not found:
         raise HTTPException(status_code=404, detail="Slide not found")

    repo.update(course)
    return {"status": "success", "message": "Slide updated"}

# =============================================================================
# Media Upload Endpoints
# =============================================================================

@router.post(
    "/courses/{course_id}/slides/image",
    response_model=MediaUploadResponse,
    summary="Upload/Replace slide image"
)
async def upload_slide_image(
    course_id: str = Path(...),
    level: int = Body(..., ge=1, embed=True),
    module: int = Body(..., ge=1, embed=True),
    slide: int = Body(..., ge=1, embed=True),
    file: UploadFile = File(...)
):
    """Upload a new image for a slide."""
    repo = CourseRepository()
    course = repo.get_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    # Validation
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Locate slide & directory
    info = _get_slide_path_info(course, level, module, slide)
    slide_obj = info["slide"]
    slide_dir = info["slide_dir"]
    
    # Save file
    # We rename it to ensure consistency, e.g., "image_uploaded.png" or overwrite "image.png"
    # Overwriting "image.png" is simplest for checking logic, but caching might be an issue.
    # Let's overwrite "image.png"
    filename = "image.png"
    file_path = os.path.join(slide_dir, filename)
    
    # Ensure directory exists
    os.makedirs(slide_dir, exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update DB relative path
    storage = FileStorageService()
    relative_path = storage.get_relative_path(file_path)
    
    # Update slide object
    slide_obj.image_url = relative_path
    repo.update(course)
    
    return MediaUploadResponse(
        slide_id=f"{level}-{module}-{slide}",
        media_type="image",
        url=relative_path  # Frontend will prepend /static/ or use absolute URL
    )

@router.post(
    "/courses/{course_id}/slides/audio",
    response_model=MediaUploadResponse,
    summary="Upload/Replace slide audio"
)
async def upload_slide_audio(
    course_id: str = Path(...),
    level: int = Body(..., ge=1, embed=True),
    module: int = Body(..., ge=1, embed=True),
    slide: int = Body(..., ge=1, embed=True),
    file: UploadFile = File(...)
):
    """Upload a new audio file for a slide."""
    repo = CourseRepository()
    course = repo.get_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    # Validation
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be audio")

    # Locate slide & directory
    info = _get_slide_path_info(course, level, module, slide)
    slide_obj = info["slide"]
    slide_dir = info["slide_dir"]
    
    # Save file
    filename = "voiceover.mp3" # Force standard name for simplicity
    file_path = os.path.join(slide_dir, filename)
    
    os.makedirs(slide_dir, exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update DB relative path
    storage = FileStorageService()
    relative_path = storage.get_relative_path(file_path)
    
    # Update slide object
    slide_obj.voiceover_audio_url = relative_path
    repo.update(course)
    
    return MediaUploadResponse(
        slide_id=f"{level}-{module}-{slide}",
        media_type="audio",
        url=relative_path
    )

@router.post(
    "/courses/{course_id}/slides/video",
    response_model=MediaUploadResponse,
    summary="Upload/Replace slide video"
)
async def upload_slide_video(
    course_id: str = Path(...),
    level: int = Body(..., ge=1, embed=True),
    module: int = Body(..., ge=1, embed=True),
    slide: int = Body(..., ge=1, embed=True),
    file: UploadFile = File(...)
):
    """Upload a new video file for a slide."""
    repo = CourseRepository()
    course = repo.get_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    # Validation
    if not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")

    # Locate slide & directory
    info = _get_slide_path_info(course, level, module, slide)
    slide_obj = info["slide"]
    slide_dir = info["slide_dir"]
    
    # Save file
    filename = "video.mp4" # Force standard name
    file_path = os.path.join(slide_dir, filename)
    
    os.makedirs(slide_dir, exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update DB relative path
    storage = FileStorageService()
    relative_path = storage.get_relative_path(file_path)
    
    # Update slide object
    slide_obj.video_url = relative_path
    slide_obj.asset_type = "video"
    repo.update(course)
    
    return MediaUploadResponse(
        slide_id=f"{level}-{module}-{slide}",
        media_type="video",
        url=relative_path
    )
