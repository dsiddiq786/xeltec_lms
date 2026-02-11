
# =============================================================================
# Editor Schema - Course Update Models
# =============================================================================
# Models for editing existing courses.
# Supports full course updates and partial slide updates.
# =============================================================================

from typing import Optional, Any
from pydantic import BaseModel, Field
from app.schemas.course_schema import Course

class CourseUpdateRequest(BaseModel):
    """
    Request model for updating a full course.
    validate: Validate the full course structure against schema.
    """
    course_content: Course = Field(..., description="The complete updated course object")
    metadata: Optional[dict[str, Any]] = Field(default=None, description="Optional metadata to update")

class SlideUpdateRequest(BaseModel):
    """
    Request model for updating a specific slide.
    Identify slide by coordinates (level, module, slide index).
    """
    level_order: int = Field(..., ge=1, description="Level number (1-indexed)")
    module_order: int = Field(..., ge=1, description="Module number within level (1-indexed)")
    slide_index: int = Field(..., ge=1, description="Slide number within module (1-indexed)")
    
    # Update fields (all optional to support partial updates)
    slide_title: Optional[str] = None
    slide_text: Optional[str] = None
    voiceover_script: Optional[str] = None
    visual_prompt: Optional[str] = None
    estimated_duration_sec: Optional[int] = None

class MediaUploadResponse(BaseModel):
    """Response after uploading media."""
    slide_id: str  # level-module-slide identifier
    media_type: str
    url: str       # The new accessible URL (e.g. /static/...)
