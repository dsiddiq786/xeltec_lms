# =============================================================================
# Duration Utilities - Word Count and Duration Calculations
# =============================================================================
# Provides utilities for calculating slide duration based on word count.
# These calculations are DETERMINISTIC - no guessing allowed.
# =============================================================================


def count_words(text: str) -> int:
    """
    Count words in a text string.
    
    WHY THIS MATTERS:
    - Word count determines voiceover duration
    - Duration must be calculated, not guessed
    - Ensures consistency across all slides
    
    Args:
        text: The text to count words in
        
    Returns:
        Number of words in the text
    """
    if not text or not text.strip():
        return 0
    # Split on whitespace and filter empty strings
    words = [word for word in text.split() if word.strip()]
    return len(words)


def calculate_duration_from_words(
    word_count: int,
    words_per_minute: int = 150
) -> int:
    """
    Calculate speaking duration from word count.
    
    Formula: (word_count / words_per_minute) * 60 = seconds
    
    WHY THIS FORMULA:
    - Industry standard speaking rate is 120-180 WPM
    - 150 WPM is comfortable listening speed for educational content
    - Allows viewers to absorb information while listening
    
    Args:
        word_count: Number of words in the voiceover script
        words_per_minute: Speaking rate (default 150)
        
    Returns:
        Duration in seconds (rounded to nearest integer)
    """
    if word_count <= 0:
        return 0
    if words_per_minute <= 0:
        raise ValueError("words_per_minute must be positive")
    
    duration_minutes = word_count / words_per_minute
    duration_seconds = duration_minutes * 60
    return round(duration_seconds)


def calculate_target_word_count(
    target_duration_sec: int,
    words_per_minute: int = 150
) -> int:
    """
    Calculate target word count for a given duration.
    
    Formula: (target_duration_sec / 60) * words_per_minute
    
    WHY THIS EXISTS:
    - Provides exact target for content generation
    - Ensures voiceover matches slide duration
    - AI must generate content within ±10% of this target
    
    Args:
        target_duration_sec: Target duration in seconds
        words_per_minute: Speaking rate (default 150)
        
    Returns:
        Target word count for the voiceover script
    """
    if target_duration_sec <= 0:
        raise ValueError("target_duration_sec must be positive")
    if words_per_minute <= 0:
        raise ValueError("words_per_minute must be positive")
    
    duration_minutes = target_duration_sec / 60
    return round(duration_minutes * words_per_minute)


def get_word_count_bounds(
    target_word_count: int,
    tolerance_percent: float = 0.10
) -> tuple[int, int]:
    """
    Calculate acceptable word count range with tolerance.
    
    WHY TOLERANCE EXISTS:
    - Natural language doesn't produce exact word counts
    - ±10% allows flexibility while maintaining duration accuracy
    - Fail fast if content is outside this range
    
    Args:
        target_word_count: The ideal word count
        tolerance_percent: Acceptable variance (default 10%)
        
    Returns:
        Tuple of (min_words, max_words)
    """
    tolerance = int(target_word_count * tolerance_percent)
    min_words = max(1, target_word_count - tolerance)  # Never less than 1
    max_words = target_word_count + tolerance
    return (min_words, max_words)


def calculate_total_course_duration(
    slides: list[dict],
    words_per_minute: int = 150
) -> int:
    """
    Calculate total course duration from all slides.
    
    WHY CALCULATE FROM SLIDES:
    - Each slide has actual generated content
    - Duration is derived from real word counts
    - Provides accurate total for course metadata
    
    Args:
        slides: List of slide dictionaries with 'voiceover_script' key
        words_per_minute: Speaking rate for calculation
        
    Returns:
        Total duration in seconds
    """
    total_seconds = 0
    for slide in slides:
        voiceover = slide.get("voiceover_script", "")
        word_count = count_words(voiceover)
        total_seconds += calculate_duration_from_words(word_count, words_per_minute)
    return total_seconds


def format_duration(seconds: int) -> str:
    """
    Format duration in human-readable format.
    
    Args:
        seconds: Duration in seconds
        
    Returns:
        Formatted string (e.g., "5m 30s" or "1h 15m")
    """
    if seconds < 60:
        return f"{seconds}s"
    
    minutes = seconds // 60
    remaining_seconds = seconds % 60
    
    if minutes < 60:
        if remaining_seconds > 0:
            return f"{minutes}m {remaining_seconds}s"
        return f"{minutes}m"
    
    hours = minutes // 60
    remaining_minutes = minutes % 60
    
    if remaining_minutes > 0:
        return f"{hours}h {remaining_minutes}m"
    return f"{hours}h"
