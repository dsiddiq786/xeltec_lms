# =============================================================================
# Validators - Content Validation Utilities
# =============================================================================
# Enforces strict content rules for generated course content.
# Fail fast on any violation - no placeholders, no summaries, no shortcuts.
# =============================================================================

from typing import Any
from app.utils.duration import count_words, get_word_count_bounds


class ValidationError(Exception):
    """
    Custom exception for validation failures.
    
    WHY CUSTOM EXCEPTION:
    - Distinguishes validation errors from system errors
    - Allows specific error handling in the API layer
    - Provides detailed context for debugging
    """
    def __init__(self, message: str, field: str = None, details: dict = None):
        self.message = message
        self.field = field
        self.details = details or {}
        super().__init__(self.message)


def validate_voiceover_word_count(
    voiceover_script: str,
    target_duration_sec: int,
    words_per_minute: int,
    slide_title: str = "Unknown"
) -> int:
    """
    Validate that voiceover script word count matches duration constraints.
    
    RULE: voiceover_script length MUST match:
          (target_slide_duration_sec / 60) * words_per_minute ±10%
    
    WHY THIS VALIDATION:
    - Ensures slide duration is accurate
    - Prevents too-short or too-long narration
    - Fails fast if AI didn't follow constraints
    
    Args:
        voiceover_script: The generated voiceover text
        target_duration_sec: Target duration in seconds
        words_per_minute: Speaking rate
        slide_title: For error context
        
    Returns:
        Actual word count if valid
        
    Raises:
        ValidationError: If word count is outside tolerance
    """
    actual_words = count_words(voiceover_script)
    target_words = int((target_duration_sec / 60) * words_per_minute)
    min_words, max_words = get_word_count_bounds(target_words)
    
    if actual_words < min_words:
        raise ValidationError(
            f"Voiceover too short for slide '{slide_title}'",
            field="voiceover_script",
            details={
                "actual_words": actual_words,
                "min_words": min_words,
                "max_words": max_words,
                "target_words": target_words,
                "target_duration_sec": target_duration_sec
            }
        )
    
    if actual_words > max_words:
        raise ValidationError(
            f"Voiceover too long for slide '{slide_title}'",
            field="voiceover_script",
            details={
                "actual_words": actual_words,
                "min_words": min_words,
                "max_words": max_words,
                "target_words": target_words,
                "target_duration_sec": target_duration_sec
            }
        )
    
    return actual_words


def validate_no_placeholders(text: str, field_name: str) -> None:
    """
    Ensure text contains no placeholder patterns.
    
    RULE: No placeholders allowed - all content must be fully generated.
    
    WHY THIS VALIDATION:
    - Detects AI shortcuts like "[Insert content here]"
    - Ensures complete, usable content
    - Fails fast on incomplete generation
    
    Args:
        text: Text to validate
        field_name: For error context
        
    Raises:
        ValidationError: If placeholder patterns detected
    """
    placeholder_patterns = [
        "[Insert",
        "[Add",
        "[TODO",
        "[TBD",
        "[PLACEHOLDER",
        "Lorem ipsum",
        "...",  # Often used as placeholder
        "[Your",
        "[Example",
        "{INSERT",
        "{ADD",
        "REPLACE_ME",
        "XXX",  # Common placeholder marker
    ]
    
    text_lower = text.lower()
    for pattern in placeholder_patterns:
        if pattern.lower() in text_lower:
            raise ValidationError(
                f"Placeholder detected in {field_name}",
                field=field_name,
                details={"pattern_found": pattern, "text_preview": text[:200]}
            )


def validate_not_summary(text: str, field_name: str, min_words: int = 50) -> None:
    """
    Ensure text is substantial content, not a brief summary.
    
    RULE: slide_text must be long-form instructional content.
    
    WHY THIS VALIDATION:
    - Prevents AI from generating brief summaries
    - Ensures educational value in each slide
    - Content must be substantial enough to teach
    
    Args:
        text: Text to validate
        field_name: For error context
        min_words: Minimum word count for substantial content
        
    Raises:
        ValidationError: If text appears to be a summary
    """
    word_count = count_words(text)
    
    if word_count < min_words:
        raise ValidationError(
            f"{field_name} appears to be a summary (too short)",
            field=field_name,
            details={
                "word_count": word_count,
                "min_required": min_words,
                "text_preview": text[:200]
            }
        )
    
    # Check for summary indicator phrases
    summary_indicators = [
        "in summary",
        "to summarize",
        "in conclusion",
        "this section covers",
        "we will discuss",  # Promising future content instead of providing it
        "as mentioned",
        "briefly",
    ]
    
    text_lower = text.lower()
    for indicator in summary_indicators:
        # Only flag if the text is short AND has summary indicators
        if indicator in text_lower and word_count < min_words * 2:
            raise ValidationError(
                f"{field_name} contains summary language without substance",
                field=field_name,
                details={
                    "indicator_found": indicator,
                    "word_count": word_count,
                    "text_preview": text[:200]
                }
            )


def validate_slide(
    slide: dict,
    target_duration_sec: int,
    words_per_minute: int,
    slide_index: int = 0
) -> dict:
    """
    Validate a complete slide against all content rules.
    
    RULES ENFORCED:
    1. Voiceover word count matches duration ±10%
    2. No placeholders in any field
    3. Slide text is substantial (not summary)
    4. Visual prompt is descriptive
    
    Args:
        slide: Slide dictionary to validate
        target_duration_sec: Target duration in seconds
        words_per_minute: Speaking rate
        slide_index: For error context
        
    Returns:
        Validated slide dictionary with calculated duration
        
    Raises:
        ValidationError: On any rule violation
    """
    slide_title = slide.get("slide_title", f"Slide {slide_index + 1}")
    
    # Required fields
    required_fields = ["slide_title", "slide_text", "visual_prompt", "voiceover_script"]
    for field in required_fields:
        if field not in slide or not slide[field]:
            raise ValidationError(
                f"Missing required field: {field}",
                field=field,
                details={"slide_index": slide_index}
            )
    
    # Validate no placeholders
    validate_no_placeholders(slide["slide_text"], f"{slide_title}.slide_text")
    validate_no_placeholders(slide["voiceover_script"], f"{slide_title}.voiceover_script")
    validate_no_placeholders(slide["visual_prompt"], f"{slide_title}.visual_prompt")
    
    # Validate slide_text is substantial
    validate_not_summary(slide["slide_text"], f"{slide_title}.slide_text", min_words=50)
    
    # Validate voiceover word count and get actual count
    actual_words = validate_voiceover_word_count(
        slide["voiceover_script"],
        target_duration_sec,
        words_per_minute,
        slide_title
    )
    
    # Calculate actual duration from word count
    from app.utils.duration import calculate_duration_from_words
    calculated_duration = calculate_duration_from_words(actual_words, words_per_minute)
    
    # Return slide with calculated duration
    return {
        **slide,
        "estimated_duration_sec": calculated_duration
    }


def validate_course_structure(
    course: dict,
    levels_count: int,
    modules_per_level: int,
    slides_per_module: int
) -> None:
    """
    Validate that course structure matches constraints exactly.
    
    RULE: No skipped hierarchy - every level/module/slide must exist.
    
    WHY THIS VALIDATION:
    - Ensures AI followed structural constraints
    - Prevents partial generation
    - Course must be complete and usable
    
    Args:
        course: Course dictionary to validate
        levels_count: Expected number of levels
        modules_per_level: Expected modules per level
        slides_per_module: Expected slides per module
        
    Raises:
        ValidationError: If structure doesn't match constraints
    """
    levels = course.get("levels", [])
    
    if len(levels) != levels_count:
        raise ValidationError(
            f"Expected {levels_count} levels, got {len(levels)}",
            field="levels",
            details={"expected": levels_count, "actual": len(levels)}
        )
    
    for level_idx, level in enumerate(levels):
        modules = level.get("modules", [])
        
        if len(modules) != modules_per_level:
            raise ValidationError(
                f"Level {level_idx + 1} has {len(modules)} modules, expected {modules_per_level}",
                field=f"levels[{level_idx}].modules",
                details={"expected": modules_per_level, "actual": len(modules)}
            )
        
        for module_idx, module in enumerate(modules):
            slides = module.get("slides", [])
            
            if len(slides) != slides_per_module:
                raise ValidationError(
                    f"Module {module_idx + 1} in Level {level_idx + 1} has {len(slides)} slides, expected {slides_per_module}",
                    field=f"levels[{level_idx}].modules[{module_idx}].slides",
                    details={"expected": slides_per_module, "actual": len(slides)}
                )


def validate_assessment(
    assessment: dict,
    min_questions: int = 5,
    pass_percentage: int = 85
) -> None:
    """
    Validate assessment structure and content.
    
    RULE: Assessment must align with content.
    
    Args:
        assessment: Assessment dictionary to validate
        min_questions: Minimum number of questions
        pass_percentage: Expected pass percentage
        
    Raises:
        ValidationError: If assessment is invalid
    """
    questions = assessment.get("questions", [])
    
    if len(questions) < min_questions:
        raise ValidationError(
            f"Assessment needs at least {min_questions} questions, got {len(questions)}",
            field="assessment.questions",
            details={"expected_min": min_questions, "actual": len(questions)}
        )
    
    for q_idx, question in enumerate(questions):
        # Validate question text
        if not question.get("question"):
            raise ValidationError(
                f"Question {q_idx + 1} has no text",
                field=f"assessment.questions[{q_idx}].question"
            )
        
        # Validate options
        options = question.get("options", [])
        if len(options) < 2:
            raise ValidationError(
                f"Question {q_idx + 1} needs at least 2 options",
                field=f"assessment.questions[{q_idx}].options",
                details={"actual": len(options)}
            )
        
        # Validate correct_option_index
        correct_idx = question.get("correct_option_index")
        if correct_idx is None or correct_idx < 0 or correct_idx >= len(options):
            raise ValidationError(
                f"Question {q_idx + 1} has invalid correct_option_index",
                field=f"assessment.questions[{q_idx}].correct_option_index",
                details={
                    "correct_option_index": correct_idx,
                    "options_count": len(options)
                }
            )
        
        # Validate no placeholders in question content
        validate_no_placeholders(question["question"], f"question_{q_idx + 1}")
        for opt_idx, option in enumerate(options):
            validate_no_placeholders(option, f"question_{q_idx + 1}_option_{opt_idx + 1}")
