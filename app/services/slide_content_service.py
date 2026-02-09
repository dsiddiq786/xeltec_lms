# =============================================================================
# Slide Content Service - Full Slide Content Generation
# =============================================================================
# Generates complete slide content including text, voiceover, and visual prompts.
# This is the CORE generation step where word count constraints are enforced.
# =============================================================================

import os
import json
import logging
from typing import Any
from openai import OpenAI

from app.schemas.request_schema import CourseGenerationRequest
from app.utils.duration import (
    count_words,
    calculate_duration_from_words,
    calculate_target_word_count
)
from app.utils.validators import (
    validate_voiceover_word_count,
    validate_no_placeholders,
    validate_not_summary,
    ValidationError
)

logger = logging.getLogger(__name__)


class SlideContentService:
    """
    Service for generating complete slide content.
    
    WHY SEPARATE SERVICE:
    - Most computationally intensive step
    - Can be parallelized per module in future
    - Clear boundary for child agent conversion
    - Isolated word count enforcement
    
    WHAT THIS GENERATES:
    - slide_text: Long-form instructional content
    - voiceover_script: Natural spoken narration
    - visual_prompt: Image generation prompt
    - estimated_duration_sec: Calculated from word count
    
    CONSTRAINTS ENFORCED:
    - Voiceover word count within ±10% of target
    - No placeholders
    - No summaries in slide_text
    """
    
    def __init__(self):
        """Initialize with OpenAI client."""
        self._client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self._model = os.getenv("OPENAI_MODEL", "gpt-4-turbo")
    
    def generate_slide_content(
        self,
        slide_title: str,
        module_title: str,
        level_title: str,
        course_title: str,
        request: CourseGenerationRequest,
        previous_slides: list[dict] = None
    ) -> dict[str, Any]:
        """
        Generate complete content for a single slide.
        
        WHY PER-SLIDE GENERATION:
        - Allows precise word count control
        - Enables retry for individual failures
        - Prevents context length issues
        - Better quality per slide
        
        Args:
            slide_title: Title for this slide
            module_title: Parent module title for context
            level_title: Parent level title for context
            course_title: Course title for context
            request: Generation constraints
            previous_slides: Prior slides for continuity
            
        Returns:
            Complete slide dictionary with all fields
            
        Raises:
            RuntimeError: If generation fails after retries
        """
        logger.debug(f"Generating content for slide: {slide_title}")
        
        target_words = request.target_words_per_slide
        min_words, max_words = request.word_count_tolerance
        
        # Build prompt with explicit word count requirements
        prompt = self._build_slide_prompt(
            slide_title=slide_title,
            module_title=module_title,
            level_title=level_title,
            course_title=course_title,
            category=request.category,
            course_level=request.course_level,
            regulatory_context=request.regulatory_context,
            target_words=target_words,
            min_words=min_words,
            max_words=max_words,
            words_per_minute=request.words_per_minute,
            previous_slides=previous_slides or []
        )
        
        # Attempt generation with retries
        max_retries = 3
        last_error = None
        
        for attempt in range(max_retries):
            try:
                slide = self._generate_single_slide(prompt, target_words)
                
                # Validate the generated content
                self._validate_slide_content(
                    slide,
                    request.target_slide_duration_sec,
                    request.words_per_minute,
                    slide_title
                )
                
                # Calculate actual duration
                word_count = count_words(slide["voiceover_script"])
                slide["estimated_duration_sec"] = calculate_duration_from_words(
                    word_count,
                    request.words_per_minute
                )
                
                logger.debug(
                    f"Slide '{slide_title}' generated: "
                    f"{word_count} words, {slide['estimated_duration_sec']}s"
                )
                return slide
                
            except ValidationError as e:
                last_error = e
                logger.warning(
                    f"Attempt {attempt + 1}/{max_retries} failed for "
                    f"'{slide_title}': {e.message}"
                )
                # Adjust prompt for retry
                prompt = self._build_retry_prompt(prompt, e)
            except Exception as e:
                last_error = e
                logger.error(f"Generation error: {e}")
        
        # All retries failed
        raise RuntimeError(
            f"Failed to generate valid content for '{slide_title}' "
            f"after {max_retries} attempts: {last_error}"
        )
    
    def generate_module_slides(
        self,
        module: dict,
        level_title: str,
        course_title: str,
        request: CourseGenerationRequest
    ) -> list[dict]:
        """
        Generate all slides for a module.
        
        WHY MODULE-LEVEL METHOD:
        - Provides context continuity between slides
        - Enables future parallel generation
        - Clean batch processing
        
        Args:
            module: Module dictionary with slide_titles
            level_title: Parent level title
            course_title: Course title
            request: Generation constraints
            
        Returns:
            List of complete slide dictionaries
        """
        slides = []
        module_title = module["module_title"]
        
        for slide_title in module["slide_titles"]:
            slide = self.generate_slide_content(
                slide_title=slide_title,
                module_title=module_title,
                level_title=level_title,
                course_title=course_title,
                request=request,
                previous_slides=slides  # Pass generated slides for context
            )
            slide["slide_title"] = slide_title
            slides.append(slide)
        
        return slides
    
    def _generate_single_slide(
        self,
        prompt: str,
        target_words: int
    ) -> dict:
        """
        Make API call to generate slide content.
        
        Returns:
            Parsed slide dictionary
            
        Raises:
            RuntimeError: If response is empty or invalid
        """
        response = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {
                    "role": "system",
                    "content": self._get_system_prompt(target_words)
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            response_format={"type": "json_object"},
            max_completion_tokens=2000  # Enough for comprehensive content
        )
        
        # Check for empty response (common with reasoning models)
        content = response.choices[0].message.content
        if not content or not content.strip():
            logger.error(f"Empty response from OpenAI model: {self._model}")
            raise RuntimeError(f"Empty response from OpenAI - model may not support this request format")
        
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON from OpenAI: {content[:500]}")
            raise RuntimeError(f"Invalid JSON response: {e}")
    
    def _get_system_prompt(self, target_words: int) -> str:
        """System prompt for slide content generation."""
        return f"""You are an expert instructional content creator.

Your task is to generate educational slide content that is:
- Comprehensive and instructional (not summaries)
- Natural and engaging (not robotic)
- Precisely targeted at {target_words} words for the voiceover

CRITICAL REQUIREMENTS:

1. slide_text: Long-form instructional content
   - Detailed explanations, examples, and context
   - Written for reading on screen
   - NOT a summary or bullet points
   - Minimum 100 words

2. voiceover_script: Natural spoken narration
   - MUST be approximately {target_words} words (±10%)
   - Written as natural speech, not reading text
   - Engaging, conversational but professional
   - Expands on slide_text, doesn't just repeat it

3. visual_prompt: Descriptive image prompt
   - Detailed description for image generation
   - Relevant to the slide content
   - Professional, educational imagery

OUTPUT FORMAT (JSON):
{{
    "slide_text": "Comprehensive instructional content...",
    "voiceover_script": "Natural narration approximately {target_words} words...",
    "visual_prompt": "Description of educational visual..."
}}

DO NOT:
- Use placeholders like [Insert content here]
- Create brief summaries
- Write voiceover that's too short or too long
- Copy slide_text directly to voiceover"""
    
    def _build_slide_prompt(
        self,
        slide_title: str,
        module_title: str,
        level_title: str,
        course_title: str,
        category: str,
        course_level: str,
        regulatory_context: str,
        target_words: int,
        min_words: int,
        max_words: int,
        words_per_minute: int,
        previous_slides: list[dict]
    ) -> str:
        """Build the generation prompt with full context."""
        
        # Build context from previous slides
        context = ""
        if previous_slides:
            context = "\n\nPREVIOUS SLIDES IN THIS MODULE:\n"
            for i, slide in enumerate(previous_slides[-3:], 1):  # Last 3 slides
                context += f"- {slide.get('slide_title', f'Slide {i}')}\n"
        
        return f"""Generate content for this slide:

COURSE CONTEXT:
- Course: {course_title}
- Category: {category}
- Difficulty: {course_level}
- Regulatory Context: {regulatory_context or "General"}
- Level: {level_title}
- Module: {module_title}

SLIDE TO GENERATE:
- Title: {slide_title}
{context}

WORD COUNT REQUIREMENTS:
- Target voiceover words: {target_words}
- Acceptable range: {min_words} to {max_words} words
- Speaking rate: {words_per_minute} words per minute

Generate comprehensive, educational content for this slide.
The voiceover script MUST be between {min_words} and {max_words} words."""
    
    def _build_retry_prompt(self, original_prompt: str, error: ValidationError) -> str:
        """Build a retry prompt with error correction guidance."""
        correction = ""
        
        if "too short" in error.message.lower():
            correction = f"""
CORRECTION NEEDED: Your previous voiceover was too short.
- You provided: {error.details.get('actual_words', 'unknown')} words
- Required minimum: {error.details.get('min_words', 'unknown')} words
- Target: {error.details.get('target_words', 'unknown')} words

Please generate MORE content. Expand explanations, add examples, provide more detail."""
        
        elif "too long" in error.message.lower():
            correction = f"""
CORRECTION NEEDED: Your previous voiceover was too long.
- You provided: {error.details.get('actual_words', 'unknown')} words
- Required maximum: {error.details.get('max_words', 'unknown')} words
- Target: {error.details.get('target_words', 'unknown')} words

Please generate LESS content. Be more concise while maintaining educational value."""
        
        elif "placeholder" in error.message.lower():
            correction = """
CORRECTION NEEDED: You used placeholder text.
Do NOT use placeholders like [Insert], [Add], [TODO], etc.
Generate complete, real content."""
        
        return f"{original_prompt}\n\n{correction}"
    
    def _validate_slide_content(
        self,
        slide: dict,
        target_duration_sec: int,
        words_per_minute: int,
        slide_title: str
    ) -> None:
        """Validate slide content against all rules."""
        
        # Check required fields
        required = ["slide_text", "voiceover_script", "visual_prompt"]
        for field in required:
            if field not in slide or not slide[field]:
                raise ValidationError(
                    f"Missing required field: {field}",
                    field=field
                )
        
        # Validate no placeholders
        validate_no_placeholders(slide["slide_text"], "slide_text")
        validate_no_placeholders(slide["voiceover_script"], "voiceover_script")
        validate_no_placeholders(slide["visual_prompt"], "visual_prompt")
        
        # Validate slide_text is substantial
        validate_not_summary(slide["slide_text"], "slide_text", min_words=50)
        
        # Validate voiceover word count
        validate_voiceover_word_count(
            slide["voiceover_script"],
            target_duration_sec,
            words_per_minute,
            slide_title
        )
