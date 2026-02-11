# =============================================================================
# Course Schema - LOCKED Course Architecture
# =============================================================================
# Defines the Pydantic models for the course data structure.
# THIS SCHEMA IS LOCKED - DO NOT MODIFY THE STRUCTURE.
# Any changes here will break compatibility with the LMS frontend.
# =============================================================================

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# =============================================================================
# Content Models (LOCKED STRUCTURE)
# =============================================================================

class Slide(BaseModel):
    """
    Individual slide within a module.
    
    CONTENT RULES:
    - slide_text: Long-form instructional content (NOT summaries)
    - voiceover_script: Natural spoken narration matching duration constraints
    - visual_prompt: Descriptive prompt for visual generation
    - estimated_duration_sec: Calculated from actual word count
    - image_url: Path to the generated image (local or S3)
    - voiceover_audio_url: Path to the generated audio (local or S3)
    """
    slide_title: str = Field(
        ...,
        description="Concise, descriptive title for the slide"
    )
    
    slide_text: str = Field(
        ...,
        description="Long-form instructional content displayed on the slide"
    )
    
    visual_prompt: str = Field(
        ...,
        description="Descriptive prompt for generating slide visuals"
    )
    
    voiceover_script: str = Field(
        ...,
        description="Natural narration script matching target word count"
    )
    
    estimated_duration_sec: int = Field(
        ...,
        ge=1,
        description="Calculated duration based on voiceover word count"
    )
    
    # --- Media Asset Paths (populated after generation) ---
    image_url: Optional[str] = Field(
        default=None,
        description="Path to the AI-generated image (local path or S3 URL)"
    )
    
    video_url: Optional[str] = Field(
        default=None,
        description="Path to the uploaded video file (local path or S3 URL)"
    )

    asset_type: str = Field(
        default="image",
        description="Type of media asset: 'image' or 'video'"
    )
    
    voiceover_audio_url: Optional[str] = Field(
        default=None,
        description="Path to the AI-generated voiceover audio (local path or S3 URL)"
    )


class CourseModule(BaseModel):
    """
    Module containing multiple slides.
    
    WHY MODULES EXIST:
    - Group related slides into logical learning units
    - Allow progress tracking at module level
    - Enable module-based assessments in future
    """
    module_title: str = Field(
        ...,
        description="Title describing the module's learning objective"
    )
    
    module_order: int = Field(
        ...,
        ge=1,
        description="Order of this module within its level (1-indexed)"
    )
    
    slides: list[Slide] = Field(
        ...,
        min_length=1,
        description="Ordered list of slides in this module"
    )


class CourseLevel(BaseModel):
    """
    Level containing multiple modules.
    
    WHY LEVELS EXIST:
    - Represent progressive difficulty stages
    - Enable prerequisite enforcement
    - Support level-based certification
    """
    level_title: str = Field(
        ...,
        description="Title describing the level's scope"
    )
    
    level_order: int = Field(
        ...,
        ge=1,
        description="Order of this level in the course (1-indexed)"
    )
    
    modules: list[CourseModule] = Field(
        ...,
        min_length=1,
        description="Ordered list of modules in this level"
    )


# =============================================================================
# Assessment Models (LOCKED STRUCTURE)
# =============================================================================

class AssessmentQuestion(BaseModel):
    """
    Single assessment question with multiple choice options.
    
    WHY THIS STRUCTURE:
    - Simple, universally understood format
    - Easy to grade automatically
    - Supports randomization of option order
    """
    question: str = Field(
        ...,
        description="The question text"
    )
    
    options: list[str] = Field(
        ...,
        min_length=2,
        max_length=6,
        description="List of answer options (2-6 choices)"
    )
    
    correct_option_index: int = Field(
        ...,
        ge=0,
        description="Index of the correct option (0-indexed)"
    )


class Assessment(BaseModel):
    """
    Course assessment containing questions and pass criteria.
    
    WHY ASSESSMENT EXISTS:
    - Validate learner comprehension
    - Enable certification upon completion
    - Questions must align with generated content
    """
    questions: list[AssessmentQuestion] = Field(
        ...,
        min_length=1,
        description="List of assessment questions"
    )
    
    pass_percentage: int = Field(
        default=85,
        ge=50,
        le=100,
        description="Minimum score to pass (percentage)"
    )


# =============================================================================
# Complete Course Model (LOCKED STRUCTURE)
# =============================================================================

class Course(BaseModel):
    """
    Complete course content structure.
    
    THIS IS THE LOCKED COURSE ARCHITECTURE.
    The hierarchy is: Course → Levels → Modules → Slides
    
    All content is generated deterministically based on system constraints.
    """
    title: str = Field(
        ...,
        description="Course title"
    )
    
    description: str = Field(
        ...,
        description="Course description summarizing learning objectives"
    )
    
    levels: list[CourseLevel] = Field(
        ...,
        min_length=1,
        description="Ordered list of course levels"
    )
    
    assessment: Assessment = Field(
        ...,
        description="Course assessment for certification"
    )


# =============================================================================
# Document Models (Database Schema)
# =============================================================================

class CourseMetadata(BaseModel):
    """
    Metadata for the course document.
    
    WHY METADATA IS SEPARATE:
    - Enables efficient querying without loading full content
    - Supports versioning for course updates
    - Tracks creation/modification timestamps
    """
    title: str
    description: str
    category: str
    course_level: str
    regulatory_context: str
    version: int = Field(default=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CourseConstraints(BaseModel):
    """
    System-owned constraints stored with the course.
    
    WHY STORE CONSTRAINTS:
    - Enables re-generation with same parameters
    - Supports auditing of generation settings
    - Documents the exact specifications used
    """
    target_course_duration_minutes: int
    levels_count: int
    modules_per_level: int
    slides_per_module: int
    target_slide_duration_sec: int
    words_per_minute: int
    pass_percentage: int


class GenerationCosts(BaseModel):
    """
    Cost breakdown for course generation.
    
    Tracks all OpenAI API costs:
    - Text generation (GPT-4 tokens)
    - Image generation (DALL-E 3)
    - TTS generation (OpenAI TTS)
    """
    total_cost_usd: float = Field(
        default=0.0,
        description="Total cost in USD for generating this course"
    )
    text_generation_cost_usd: float = Field(
        default=0.0,
        description="Cost for all text generation (outline, slides, assessment)"
    )
    image_generation_cost_usd: float = Field(
        default=0.0,
        description="Cost for all DALL-E image generations"
    )
    tts_generation_cost_usd: float = Field(
        default=0.0,
        description="Cost for all TTS audio generations"
    )
    total_tokens: int = Field(
        default=0,
        description="Total tokens used (prompt + completion)"
    )
    total_prompt_tokens: int = Field(
        default=0,
        description="Total prompt/input tokens"
    )
    total_completion_tokens: int = Field(
        default=0,
        description="Total completion/output tokens"
    )
    images_generated: int = Field(
        default=0,
        description="Number of images generated"
    )
    tts_characters: int = Field(
        default=0,
        description="Total characters sent to TTS"
    )


class CourseDocument(BaseModel):
    """
    Complete course document for NoSQL storage.
    
    DOCUMENT DESIGN:
    - One course per document (atomic writes)
    - Embedded content (no joins needed)
    - Version-ready for updates
    
    This is the exact shape stored in MongoDB/DynamoDB.
    """
    id: Optional[str] = Field(
        default=None,
        alias="_id",
        description="Document ID (MongoDB ObjectId as string)"
    )
    
    metadata: CourseMetadata = Field(
        ...,
        description="Course metadata for querying"
    )
    
    content: Course = Field(
        ...,
        description="Complete course content (locked structure)"
    )
    
    constraints: CourseConstraints = Field(
        ...,
        description="System constraints used for generation"
    )
    
    generation_costs: Optional[GenerationCosts] = Field(
        default=None,
        description="Cost breakdown for generating this course"
    )
    
    output_directory: Optional[str] = Field(
        default=None,
        description="Path to the generated course files on disk"
    )
    
    class Config:
        populate_by_name = True  # Allow both 'id' and '_id'
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
