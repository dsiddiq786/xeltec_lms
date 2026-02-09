# =============================================================================
# Request Schema - Course Generation Request Validation
# =============================================================================
# Defines the Pydantic model for incoming course generation requests.
# These are SYSTEM-OWNED CONSTRAINTS - the AI does NOT decide course structure.
# All constraints must be provided by the system/client.
# =============================================================================

from pydantic import BaseModel, Field, field_validator


class CourseGenerationRequest(BaseModel):
    """
    System-owned constraints for course generation.
    
    WHY THIS EXISTS:
    - The AI must NOT decide course length or structure
    - All structural decisions are deterministic and constraint-driven
    - This ensures consistent, predictable course generation
    
    CONSTRAINTS ENFORCED:
    - Course structure (levels, modules, slides) is fixed
    - Duration targets are explicit
    - Word count calculations are derived from these values
    """
    
    # -------------------------------------------------------------------------
    # Course Identity
    # -------------------------------------------------------------------------
    course_title: str = Field(
        ...,
        min_length=3,
        max_length=200,
        description="The title of the course to generate"
    )
    
    category: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Course category (e.g., 'Information Security', 'Compliance')"
    )
    
    course_level: str = Field(
        ...,
        description="Difficulty level: Beginner, Intermediate, Advanced, Expert"
    )
    
    regulatory_context: str = Field(
        default="",
        max_length=500,
        description="Regulatory framework context (e.g., 'HIPAA', 'GDPR', 'SOX')"
    )
    
    # -------------------------------------------------------------------------
    # Duration Constraints
    # -------------------------------------------------------------------------
    target_course_duration_minutes: int = Field(
        ...,
        ge=5,
        le=480,
        description="Target total course duration in minutes (5-480)"
    )
    
    target_slide_duration_sec: int = Field(
        ...,
        ge=30,
        le=600,
        description="Target duration per slide in seconds (30-600)"
    )
    
    words_per_minute: int = Field(
        default=150,
        ge=100,
        le=200,
        description="Speaking rate for voiceover calculation (100-200 WPM)"
    )
    
    # -------------------------------------------------------------------------
    # Structure Constraints
    # -------------------------------------------------------------------------
    levels_count: int = Field(
        ...,
        ge=1,
        le=10,
        description="Number of levels in the course (1-10)"
    )
    
    modules_per_level: int = Field(
        ...,
        ge=1,
        le=10,
        description="Number of modules per level (1-10)"
    )
    
    slides_per_module: int = Field(
        ...,
        ge=1,
        le=20,
        description="Number of slides per module (1-20)"
    )
    
    # -------------------------------------------------------------------------
    # Assessment Constraints
    # -------------------------------------------------------------------------
    pass_percentage: int = Field(
        default=85,
        ge=50,
        le=100,
        description="Minimum score to pass the assessment (50-100%)"
    )
    
    # -------------------------------------------------------------------------
    # Validators
    # -------------------------------------------------------------------------
    @field_validator("course_level")
    @classmethod
    def validate_course_level(cls, v: str) -> str:
        """Ensure course level is one of the allowed values."""
        allowed = {"Beginner", "Intermediate", "Advanced", "Expert"}
        if v not in allowed:
            raise ValueError(f"course_level must be one of: {allowed}")
        return v
    
    # -------------------------------------------------------------------------
    # Computed Properties
    # -------------------------------------------------------------------------
    @property
    def total_slides(self) -> int:
        """Calculate total number of slides in the course."""
        return self.levels_count * self.modules_per_level * self.slides_per_module
    
    @property
    def target_words_per_slide(self) -> int:
        """
        Calculate target word count for each slide's voiceover script.
        
        Formula: (target_slide_duration_sec / 60) * words_per_minute
        
        Example: 120 sec / 60 = 2 min * 150 WPM = 300 words
        """
        return int((self.target_slide_duration_sec / 60) * self.words_per_minute)
    
    @property
    def word_count_tolerance(self) -> tuple[int, int]:
        """
        Calculate acceptable word count range (±10% tolerance).
        
        Returns: (min_words, max_words) tuple
        """
        target = self.target_words_per_slide
        tolerance = int(target * 0.10)
        return (target - tolerance, target + tolerance)
    
    def validate_total_duration(self) -> bool:
        """
        Validate that slide count and duration align with course duration.
        
        WHY THIS MATTERS:
        - Prevents impossible constraints (e.g., 100 slides in 10 minutes)
        - Ensures generated content is realistic and achievable
        """
        calculated_duration = (self.total_slides * self.target_slide_duration_sec) / 60
        # Allow 20% variance from target
        min_duration = self.target_course_duration_minutes * 0.8
        max_duration = self.target_course_duration_minutes * 1.2
        return min_duration <= calculated_duration <= max_duration
