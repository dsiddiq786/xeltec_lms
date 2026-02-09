# =============================================================================
# Schemas Package
# =============================================================================
# Contains Pydantic models for request validation and data serialization.
# The course schema is LOCKED and must not be modified.
# =============================================================================

from app.schemas.request_schema import CourseGenerationRequest
from app.schemas.course_schema import (
    Course,
    CourseLevel,
    CourseModule,
    Slide,
    Assessment,
    AssessmentQuestion,
    CourseDocument,
    CourseMetadata,
)

__all__ = [
    "CourseGenerationRequest",
    "Course",
    "CourseLevel",
    "CourseModule",
    "Slide",
    "Assessment",
    "AssessmentQuestion",
    "CourseDocument",
    "CourseMetadata",
]
