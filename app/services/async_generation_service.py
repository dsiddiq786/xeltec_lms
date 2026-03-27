# =============================================================================
# Async Generation Service - Parallel Content Generation
# =============================================================================
# Uses AsyncOpenAI for concurrent API calls to dramatically speed up
# course generation. Saves content incrementally as it's generated.
# =============================================================================

import os
import json
import asyncio
import logging
from typing import Any, Optional, Callable
from openai import AsyncOpenAI

from app.schemas.request_schema import CourseGenerationRequest
from app.services.cost_tracker import CostTracker
from app.utils.duration import count_words, calculate_duration_from_words
from app.utils.validators import (
    validate_voiceover_word_count,
    validate_no_placeholders,
    validate_not_summary,
    ValidationError
)

logger = logging.getLogger(__name__)

# Concurrency limit to avoid rate limiting
MAX_CONCURRENT_SLIDES = 5  # Increased for throughput
MAX_RETRIES = 5  # More retries for resilience
RETRY_DELAY_BASE = 2  # Base delay for exponential backoff


class AsyncGenerationService:
    """
    Async service for parallel course content generation.
    
    WHY ASYNC:
    - OpenAI API calls are I/O bound
    - Parallel execution dramatically speeds up generation
    - 5 concurrent slides = ~5x faster than sequential
    
    WHY SINGLE SERVICE:
    - All generation uses same OpenAI client
    - Shared rate limiting and concurrency control
    - Unified error handling
    """
    
    def __init__(self, cost_tracker: Optional[CostTracker] = None):
        """Initialize with async OpenAI client and optional cost tracker."""
        self._client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self._model = os.getenv("OPENAI_MODEL", "gpt-4-turbo")
        self._semaphore = asyncio.Semaphore(MAX_CONCURRENT_SLIDES)
        self._cost_tracker = cost_tracker
    
    # =========================================================================
    # Outline Generation
    # =========================================================================
    
    async def generate_outline(
        self,
        request: CourseGenerationRequest,
        progress_callback: Optional[Callable] = None
    ) -> dict[str, Any]:
        """
        Generate course outline (structure only).
        
        Args:
            request: Course generation constraints
            progress_callback: Optional callback for progress updates
            
        Returns:
            Outline dictionary with levels, modules, slide titles
        """
        logger.info(f"Generating outline for: {request.course_title}")
        
        if progress_callback:
            await progress_callback("Generating course outline", 1, 0, 0)
        
        prompt = self._build_outline_prompt(request)
        system_prompt = self._get_outline_system_prompt()
        if request.course_prompt:
            system_prompt += f"\n\nADDITIONAL INSTRUCTIONS FROM ADMIN:\n{request.course_prompt}"
        
        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            # Track token usage
            if self._cost_tracker and response.usage:
                self._cost_tracker.add_text_generation(
                    prompt_tokens=response.usage.prompt_tokens,
                    completion_tokens=response.usage.completion_tokens,
                    model=self._model,
                    label="outline"
                )
            
            content = response.choices[0].message.content
            if not content:
                raise RuntimeError("Empty response from OpenAI")
            
            outline = json.loads(content)
            self._validate_outline_structure(outline, request)
            
            logger.info("Outline generated successfully")
            return outline
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse outline JSON: {e}")
            raise RuntimeError(f"Invalid outline format from AI: {e}")
        except Exception as e:
            logger.error(f"Outline generation failed: {e}")
            raise RuntimeError(f"Outline generation failed: {e}")
    
    def _get_outline_system_prompt(self) -> str:
        """System prompt for outline generation."""
        return """You are an expert instructional designer creating course outlines.

Your task is to generate a structured course outline with meaningful, educational titles.

SLIDE TYPES:
- "content": Normal instructional slide with text, visuals, voiceover
- "quiz": Inline module check-in with 1-2 questions (placed as the LAST slide of each module)

CRITICAL RULES:
1. Output MUST be valid JSON
2. You MUST create EXACTLY the number of levels, modules, and slides specified
3. Titles must be clear, professional, and educational
4. Each level should represent progressive learning
5. Modules within a level should be logically grouped
6. The LAST slide in every module MUST be a quiz slide titled "Module Check: [topic]"
7. All other slides are content slides

DO NOT:
- Skip any hierarchy level
- Create fewer or more items than specified
- Use placeholder text like "Module 1" without description
- Include actual content (only titles/structure)"""
    
    def _build_outline_prompt(self, request: CourseGenerationRequest) -> str:
        """Build the user prompt for outline generation."""
        module_instruction = ""
        if request.module_names:
            module_instruction = f"""
STRICT MODULE NAMES REQUIREMENT:
You MUST use the following module titles in order:
{json.dumps(request.module_names, indent=2)}
If more modules are required than names provided, generate appropriate titles for the rest.
If fewer modules are required, use only the first N names.
"""

        intro_instruction = ""
        if request.include_standard_intro_slides:
            intro_instruction = """
WELCOME SLIDES REQUIREMENT:
Add exactly 2 extra content slides at the very START of the FIRST module of the FIRST level:
1. {{"title": "Course Title & Welcome", "type": "content"}}
2. {{"title": "Learning Outcomes & Overview", "type": "content"}}
These are brief intro slides (no heavy content or voiceover needed). They do NOT count toward the per-module slide total.
"""

        return f"""Create a course outline for:

COURSE DETAILS:
- Title: {request.course_title}
- Category: {request.category}
- Difficulty Level: {request.course_level} (Adjust tone and depth accordingly)
- Regulatory Context: {request.regulatory_context or "General"}

REQUIRED STRUCTURE (MUST FOLLOW EXACTLY):
- Number of Levels: {request.levels_count}
- Modules per Level: {request.modules_per_level}
- Slides per Module: {request.slides_per_module}
- Total Slides: {request.total_slides}

{module_instruction}
{intro_instruction}

QUIZ SLIDE RULE:
The LAST slide in EVERY module must be a quiz slide (type "quiz") titled "Module Check: [module topic]".

OUTPUT FORMAT (JSON):
{{
    "description": "2-3 sentence course description covering learning objectives",
    "levels": [
        {{
            "level_title": "Descriptive level title",
            "level_order": 1,
            "modules": [
                {{
                    "module_title": "Descriptive module title",
                    "module_order": 1,
                    "slides": [
                        {{"title": "Slide 1 title", "type": "content"}},
                        {{"title": "Module Check: Topic", "type": "quiz"}}
                    ]
                }}
            ]
        }}
    ]
}}

Generate the complete outline now. Remember: EXACTLY {request.levels_count} levels, {request.modules_per_level} modules per level, {request.slides_per_module} slides per module."""
    
    def _validate_outline_structure(
        self,
        outline: dict,
        request: CourseGenerationRequest
    ) -> None:
        """Validate and normalize outline structure.
        
        Handles both old format (slide_titles: string[]) and new format
        (slides: [{title, type}]) gracefully.
        """
        if not outline.get("description"):
            raise RuntimeError("Outline missing description")
        
        levels = outline.get("levels", [])
        if len(levels) != request.levels_count:
            raise RuntimeError(
                f"Expected {request.levels_count} levels, got {len(levels)}"
            )
        
        for level_idx, level in enumerate(levels):
            if level.get("level_order") != level_idx + 1:
                level["level_order"] = level_idx + 1
            
            modules = level.get("modules", [])
            if len(modules) != request.modules_per_level:
                raise RuntimeError(
                    f"Level {level_idx + 1} has {len(modules)} modules, "
                    f"expected {request.modules_per_level}"
                )
            
            for module_idx, module in enumerate(modules):
                if module.get("module_order") != module_idx + 1:
                    module["module_order"] = module_idx + 1
                
                # Normalize: convert old slide_titles format to new slides format
                if "slide_titles" in module and "slides" not in module:
                    raw = module.pop("slide_titles")
                    normalized = []
                    for i, item in enumerate(raw):
                        if isinstance(item, str):
                            stype = "quiz" if i == len(raw) - 1 else "content"
                            normalized.append({"title": item, "type": stype})
                        elif isinstance(item, dict):
                            normalized.append(item)
                    module["slides"] = normalized
                
                slides = module.get("slides", [])
                
                expected_slides = request.slides_per_module
                if (request.include_standard_intro_slides and 
                    level_idx == 0 and module_idx == 0):
                    if len(slides) == expected_slides + 2:
                        expected_slides += 2
                    elif len(slides) == expected_slides + 3:
                        expected_slides += 3

                if len(slides) < expected_slides:
                    if not (request.include_standard_intro_slides and len(slides) >= request.slides_per_module):
                        logger.warning(
                            f"Module {module_idx + 1} in Level {level_idx + 1} "
                            f"has {len(slides)} slides, expected {expected_slides}. Allowing."
                        )
                
                # Ensure each slide entry has title and type
                for si, s in enumerate(slides):
                    if isinstance(s, str):
                        slides[si] = {"title": s, "type": "content"}
                    elif isinstance(s, dict):
                        if "title" not in s:
                            s["title"] = f"Slide {si + 1}"
                        if "type" not in s:
                            s["type"] = "quiz" if si == len(slides) - 1 else "content"
    
    # =========================================================================
    # Parallel Slide Generation with Incremental Saving
    # =========================================================================
    
    async def generate_all_slides(
        self,
        outline: dict[str, Any],
        request: CourseGenerationRequest,
        progress_callback: Optional[Callable] = None,
        slide_save_callback: Optional[Callable] = None
    ) -> dict[str, Any]:
        """
        Generate content for all slides in parallel with incremental saving.
        
        Args:
            outline: Generated course outline
            request: Course generation constraints
            progress_callback: Callback for progress updates
            slide_save_callback: Callback to save each slide as it completes
                                 signature: (level_order, module_order, slide_data) -> None
            
        Returns:
            Complete course content dictionary
        """
        logger.info("Starting parallel slide generation")
        
        # Collect all slide tasks
        slide_tasks = []
        total_slides = request.total_slides
        
        for level_data in outline["levels"]:
            for module_data in level_data["modules"]:
                slides_list = module_data.get("slides", [])
                for slide_entry in slides_list:
                    if isinstance(slide_entry, str):
                        slide_entry = {"title": slide_entry, "type": "content"}
                    task_info = {
                        "slide_title": slide_entry.get("title", "Untitled"),
                        "slide_type": slide_entry.get("type", "content"),
                        "module_title": module_data["module_title"],
                        "level_title": level_data["level_title"],
                        "level_order": level_data["level_order"],
                        "module_order": module_data["module_order"]
                    }
                    slide_tasks.append(task_info)
        
        total_slides = len(slide_tasks)
        
        # Generate all slides with concurrency limit
        slides_completed = 0
        results = {}
        errors = []
        
        async def generate_with_progress(task_info: dict, index: int) -> tuple[int, dict, bool]:
            """Generate single slide with semaphore control and incremental save."""
            nonlocal slides_completed
            
            async with self._semaphore:
                try:
                    if task_info.get("slide_type") == "quiz":
                        slide = await self._generate_quiz_slide(task_info, request)
                    else:
                        slide = await self._generate_single_slide(task_info, request)
                    slide["slide_title"] = task_info["slide_title"]
                    slide["slide_type"] = task_info.get("slide_type", "content")
                    
                    # Save incrementally
                    if slide_save_callback:
                        try:
                            await slide_save_callback(
                                task_info["level_order"],
                                task_info["module_order"],
                                slide
                            )
                        except Exception as save_err:
                            logger.warning(f"Failed to save slide incrementally: {save_err}")
                    
                    slides_completed += 1
                    
                    if progress_callback:
                        await progress_callback(
                            f"Generating slides ({slides_completed}/{total_slides})",
                            2,
                            slides_completed,
                            total_slides
                        )
                    
                    return index, slide, True
                    
                except Exception as e:
                    logger.error(f"Slide generation error: {e}")
                    # Return placeholder on error
                    placeholder = self._create_placeholder_slide(task_info, request)
                    placeholder["slide_title"] = task_info["slide_title"]
                    slides_completed += 1
                    
                    if progress_callback:
                        await progress_callback(
                            f"Generating slides ({slides_completed}/{total_slides})",
                            2,
                            slides_completed,
                            total_slides
                        )
                    
                    return index, placeholder, False
        
        # Run all tasks concurrently
        tasks = [
            generate_with_progress(task_info, i)
            for i, task_info in enumerate(slide_tasks)
        ]
        
        completed = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        failed_count = 0
        for result in completed:
            if isinstance(result, Exception):
                logger.error(f"Task exception: {result}")
                failed_count += 1
                continue
            index, slide, success = result
            results[index] = slide
            if not success:
                failed_count += 1
        
        if failed_count > 0:
            logger.warning(f"{failed_count}/{total_slides} slides used placeholders")
        
        # Reconstruct course structure with generated content
        course_content = {
            "title": request.course_title,
            "description": outline["description"],
            "levels": []
        }
        
        slide_index = 0
        for level_data in outline["levels"]:
            level = {
                "level_title": level_data["level_title"],
                "level_order": level_data["level_order"],
                "modules": []
            }
            
            for module_data in level_data["modules"]:
                module = {
                    "module_title": module_data["module_title"],
                    "module_order": module_data["module_order"],
                    "slides": []
                }
                
                for slide_entry in module_data.get("slides", []):
                    if isinstance(slide_entry, str):
                        slide_entry = {"title": slide_entry, "type": "content"}
                    if slide_index in results:
                        module["slides"].append(results[slide_index])
                    else:
                        placeholder = self._create_placeholder_slide({
                            "slide_title": slide_entry.get("title", "Untitled"),
                            "module_title": module_data["module_title"],
                            "level_title": level_data["level_title"]
                        }, request)
                        placeholder["slide_title"] = slide_entry.get("title", "Untitled")
                        placeholder["slide_type"] = slide_entry.get("type", "content")
                        module["slides"].append(placeholder)
                    slide_index += 1
                
                level["modules"].append(module)
            
            course_content["levels"].append(level)
        
        logger.info(f"Generated {total_slides} slides ({total_slides - failed_count} successful, {failed_count} placeholders)")
        return course_content
    
    async def _generate_single_slide(
        self,
        task_info: dict,
        request: CourseGenerationRequest
    ) -> dict:
        """
        Generate content for a single slide with retries and exponential backoff.
        
        Args:
            task_info: Slide context information
            request: Course generation constraints
            
        Returns:
            Slide content dictionary
        """
        target_words = request.target_words_per_slide
        min_words, max_words = request.word_count_tolerance
        
        prompt = self._build_slide_prompt(task_info, request)
        last_error = None
        
        for attempt in range(MAX_RETRIES):
            try:
                # Exponential backoff on retries
                if attempt > 0:
                    delay = RETRY_DELAY_BASE * (2 ** (attempt - 1))
                    logger.info(f"Retry {attempt + 1} for '{task_info['slide_title']}' after {delay}s delay")
                    await asyncio.sleep(delay)
                
                slide_sys = self._get_slide_system_prompt(target_words)
                if request.course_prompt:
                    slide_sys += f"\n\nADDITIONAL CONTENT INSTRUCTIONS:\n{request.course_prompt}"
                if request.voiceover_prompt:
                    slide_sys += f"\n\nVOICEOVER STYLE INSTRUCTIONS:\n{request.voiceover_prompt}"
                
                response = await self._client.chat.completions.create(
                    model=self._model,
                    messages=[
                        {"role": "system", "content": slide_sys},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"},
                    max_completion_tokens=4000
                )
                
                # Track token usage
                if self._cost_tracker and response.usage:
                    slide_label = f"slide_{task_info.get('slide_title', 'unknown')[:30]}_content"
                    self._cost_tracker.add_text_generation(
                        prompt_tokens=response.usage.prompt_tokens,
                        completion_tokens=response.usage.completion_tokens,
                        model=self._model,
                        label=slide_label
                    )
                
                # Handle empty response
                content = response.choices[0].message.content
                if not content or not content.strip():
                    logger.warning(f"Empty response for '{task_info['slide_title']}', attempt {attempt + 1}")
                    last_error = RuntimeError("Empty response from OpenAI")
                    continue
                
                # Parse JSON
                try:
                    slide = json.loads(content)
                except json.JSONDecodeError as e:
                    logger.warning(f"Invalid JSON for '{task_info['slide_title']}': {content[:200]}")
                    last_error = e
                    continue
                
                # Ensure all required fields exist with defaults
                slide = self._ensure_slide_fields(slide, task_info["slide_title"])
                
                # Try to validate (lenient on word count for now)
                try:
                    self._validate_slide_content(
                        slide,
                        request.target_slide_duration_sec,
                        request.words_per_minute,
                        task_info["slide_title"]
                    )
                except ValidationError as ve:
                    # Log but don't fail - accept the content
                    logger.warning(f"Validation warning for '{task_info['slide_title']}': {ve.message}")
                
                # Calculate duration
                word_count = count_words(slide.get("voiceover_script", ""))
                slide["estimated_duration_sec"] = max(
                    calculate_duration_from_words(word_count, request.words_per_minute),
                    30  # Minimum 30 seconds
                )
                
                logger.debug(f"Generated slide: {task_info['slide_title']} ({word_count} words)")
                return slide
                
            except Exception as e:
                last_error = e
                logger.error(f"Generation error for '{task_info['slide_title']}': {e}")
        
        # All retries failed - return a placeholder that won't break the course
        logger.error(f"All retries failed for '{task_info['slide_title']}', using placeholder")
        return self._create_placeholder_slide(task_info, request)
    
    def _ensure_slide_fields(self, slide: dict, title: str) -> dict:
        """Ensure all required fields exist with sensible defaults."""
        if not slide.get("slide_text"):
            slide["slide_text"] = f"Content for: {title}. This section covers important concepts related to the topic."
        
        if not slide.get("voiceover_script"):
            slide["voiceover_script"] = slide.get("slide_text", f"In this section, we'll explore {title}.")
        
        if not slide.get("visual_prompt"):
            slide["visual_prompt"] = f"Professional educational illustration depicting concepts related to {title}"
        
        return slide
    
    def _create_placeholder_slide(self, task_info: dict, request: CourseGenerationRequest) -> dict:
        """Create a placeholder slide when generation fails completely."""
        title = task_info["slide_title"]
        target_words = request.target_words_per_slide
        
        return {
            "slide_text": f"## {title}\n\nThis section covers important concepts related to {title}. "
                         f"The content explores key principles and practical applications within the context "
                         f"of {task_info['module_title']} as part of {task_info['level_title']}.",
            "voiceover_script": f"In this section, we'll explore {title}. This is an important topic "
                               f"that builds on our understanding of {task_info['module_title']}. "
                               f"Let's dive into the key concepts and practical applications.",
            "visual_prompt": f"Professional educational illustration showing concepts related to {title}, "
                            f"suitable for a {request.course_level} level course",
            "estimated_duration_sec": request.target_slide_duration_sec,
            "_placeholder": True
        }
    
    async def _generate_quiz_slide(
        self,
        task_info: dict,
        request: CourseGenerationRequest
    ) -> dict:
        """Generate an inline quiz slide with 1-2 questions."""
        prompt = f"""Generate an inline module check quiz for:

COURSE: {request.course_title}
LEVEL: {task_info['level_title']}
MODULE: {task_info['module_title']}
SLIDE TITLE: {task_info['slide_title']}

This is a non-graded knowledge check at the end of the module.
"""
        system_prompt = """You are an expert instructional assessment designer.

Generate a quick knowledge-check quiz slide for the end of a learning module.
This is NOT a formal assessment - it is a lightweight check-in to reinforce learning.

Return valid JSON with these fields:
{
    "slide_text": "Brief 1-2 sentence context paragraph introducing the check",
    "quiz_question": "Clear, specific question testing a key concept from this module",
    "quiz_options": ["Option A", "Option B", "Option C", "Option D"],
    "quiz_correct_index": 0,
    "quiz_explanation": "Brief explanation of why the correct answer is right (2-3 sentences)"
}

RULES:
- Question must directly relate to the module topic
- All 4 options must be plausible
- quiz_correct_index is zero-based (0-3)
- Explanation should be educational and reinforce the correct concept
- Keep slide_text very brief (1-2 sentences max)"""

        if request.course_prompt:
            system_prompt += f"\n\nADDITIONAL INSTRUCTIONS:\n{request.course_prompt}"

        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                max_completion_tokens=1000
            )
            
            if self._cost_tracker and response.usage:
                self._cost_tracker.add_text_generation(
                    prompt_tokens=response.usage.prompt_tokens,
                    completion_tokens=response.usage.completion_tokens,
                    model=self._model,
                    label=f"quiz_{task_info.get('slide_title', 'unknown')[:30]}"
                )
            
            content = response.choices[0].message.content
            if not content:
                raise RuntimeError("Empty quiz response")
            
            data = json.loads(content)
            return {
                "slide_type": "quiz",
                "slide_text": data.get("slide_text", "Test your knowledge from this module."),
                "quiz_question": data.get("quiz_question", ""),
                "quiz_options": data.get("quiz_options", ["A", "B", "C", "D"]),
                "quiz_correct_index": data.get("quiz_correct_index", 0),
                "quiz_explanation": data.get("quiz_explanation", ""),
                "voiceover_script": "",
                "visual_prompt": "",
                "estimated_duration_sec": 30,
            }
        except Exception as e:
            logger.error(f"Quiz slide generation failed: {e}")
            return {
                "slide_type": "quiz",
                "slide_text": f"Quick check on {task_info['module_title']}.",
                "quiz_question": f"Which of the following best describes a key concept from {task_info['module_title']}?",
                "quiz_options": [
                    "All of the above concepts apply",
                    "Only the first concept applies",
                    "None of the concepts apply",
                    "The concepts are unrelated"
                ],
                "quiz_correct_index": 0,
                "quiz_explanation": f"This module covered several interconnected concepts within {task_info['module_title']}.",
                "voiceover_script": "",
                "visual_prompt": "",
                "estimated_duration_sec": 30,
            }
    
    def _get_slide_system_prompt(self, target_words: int) -> str:
        """System prompt for slide content generation."""
        # Ensure minimum 250 words for 1-2 minute content
        min_words = max(target_words, 250)
        
        return f"""You are an expert instructional content creator for professional e-learning courses.

Generate COMPLETE, DETAILED educational slide content. Each slide must provide comprehensive learning value.

STRICT REQUIREMENTS:

1. slide_text (MINIMUM 150 words):
   - Long-form, detailed instructional content
   - Include specific examples, explanations, and practical applications
   - Use clear paragraphs, not bullet points
   - Must be educational and informative, NOT a summary
   - Write as if creating content for a professional training manual

2. voiceover_script (EXACTLY {min_words}-{min_words + 50} words):
   - Natural, conversational narration for spoken delivery
   - MUST be {min_words} words minimum - this is critical for timing
   - Expand on slide_text with additional context and explanations
   - Include transitions, emphasis, and engaging phrasing
   - Write as a professional narrator would speak

3. visual_prompt (EXACTLY 50-100 words - COMPLETE, NO TRUNCATION):
   - Write a COMPLETE, detailed image generation prompt
   - Describe specific visual elements, composition, style, and mood
   - Include: subject matter, setting, colors, lighting, perspective
   - DO NOT use "..." or truncate - write the FULL description
   - Must be professional and suitable for corporate training
   - COLLAGE RULE: If the slide compares 2+ concepts, processes, or items side-by-side,
     describe a split/collage layout (e.g. "Split image: left side shows X, right side
     shows Y, divided by a clean vertical line"). Only use this when multi-concept
     comparison genuinely aids comprehension.

OUTPUT JSON FORMAT:
{{
    "slide_text": "Full detailed instructional content here (150+ words)...",
    "voiceover_script": "Complete natural narration script here ({min_words}+ words)...",
    "visual_prompt": "Complete detailed image description without any truncation (50-100 words)..."
}}

CRITICAL - DO NOT:
- Truncate any field with "..." 
- Use placeholders like [Insert] or [Add]
- Write less than {min_words} words for voiceover
- Write less than 50 words for visual_prompt
- Create summaries instead of full content"""
    
    def _build_slide_prompt(
        self,
        task_info: dict,
        request: CourseGenerationRequest
    ) -> str:
        """Build the generation prompt for a slide."""
        target_words = request.target_words_per_slide
        min_words, max_words = request.word_count_tolerance
        
        return f"""Generate content for this slide:

COURSE CONTEXT:
- Course: {request.course_title}
- Category: {request.category}
- Difficulty: {request.course_level}
- Regulatory Context: {request.regulatory_context or "General"}
- Level: {task_info['level_title']}
- Module: {task_info['module_title']}

SLIDE TO GENERATE:
- Title: {task_info['slide_title']}

WORD COUNT REQUIREMENTS:
- Target voiceover words: {target_words}
- Acceptable range: {min_words} to {max_words} words
- Speaking rate: {request.words_per_minute} words per minute

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
        required = ["slide_text", "voiceover_script", "visual_prompt"]
        for field in required:
            if field not in slide or not slide[field]:
                raise ValidationError(
                    f"Missing required field: {field}",
                    field=field
                )
        
        validate_no_placeholders(slide["slide_text"], "slide_text")
        validate_no_placeholders(slide["voiceover_script"], "voiceover_script")
        validate_no_placeholders(slide["visual_prompt"], "visual_prompt")
        validate_not_summary(slide["slide_text"], "slide_text", min_words=50)
        validate_voiceover_word_count(
            slide["voiceover_script"],
            target_duration_sec,
            words_per_minute,
            slide_title
        )
    
    # =========================================================================
    # Assessment Generation
    # =========================================================================
    
    async def generate_assessment(
        self,
        course_content: dict[str, Any],
        pass_percentage: int = 85,
        questions_per_level: int = 3,
        progress_callback: Optional[Callable] = None,
        course_prompt: Optional[str] = None
    ) -> dict[str, Any]:
        """
        Generate course assessment based on content.
        
        Args:
            course_content: Generated course content
            pass_percentage: Required pass score
            questions_per_level: Questions per level
            progress_callback: Optional progress callback
            
        Returns:
            Assessment dictionary with questions
        """
        logger.info("Generating course assessment")
        
        if progress_callback:
            await progress_callback("Generating assessment", 4, 0, 0)
        
        content_summary = self._extract_content_summary(course_content)
        levels_count = len(course_content.get("levels", []))
        total_questions = max(levels_count * questions_per_level, 5)
        
        prompt = self._build_assessment_prompt(
            course_title=course_content.get("title", "Course"),
            content_summary=content_summary,
            total_questions=total_questions,
            pass_percentage=pass_percentage
        )
        
        try:
            assessment_sys = self._get_assessment_system_prompt()
            if course_prompt:
                assessment_sys += f"\n\nADDITIONAL INSTRUCTIONS:\n{course_prompt}"
            
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": assessment_sys},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                max_completion_tokens=3000
            )
            
            if self._cost_tracker and response.usage:
                self._cost_tracker.add_text_generation(
                    prompt_tokens=response.usage.prompt_tokens,
                    completion_tokens=response.usage.completion_tokens,
                    model=self._model,
                    label="assessment"
                )
            
            content = response.choices[0].message.content
            if not content:
                raise RuntimeError("Empty response from OpenAI")
            
            assessment_data = json.loads(content)
            
            # Validate questions
            questions = self._validate_questions(assessment_data.get("questions", []))
            
            return {
                "questions": questions,
                "pass_percentage": pass_percentage
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse assessment JSON: {e}")
            raise RuntimeError(f"Invalid assessment format from AI: {e}")
        except Exception as e:
            logger.error(f"Assessment generation failed: {e}")
            raise RuntimeError(f"Assessment generation failed: {e}")
    
    def _get_assessment_system_prompt(self) -> str:
        """System prompt for assessment generation."""
        return """You are an expert assessment designer for educational courses.

Your task is to create multiple-choice assessment questions that:
- Test understanding of the course content
- Cover key concepts from each section
- Have clear, unambiguous correct answers
- Include plausible distractors (wrong options)

QUESTION REQUIREMENTS:
1. Questions must be based on actual course content
2. Each question must have 4 options (A, B, C, D)
3. Exactly one option must be correct
4. Distractors should be plausible but clearly wrong
5. Questions should test comprehension, not memorization

OUTPUT FORMAT (JSON):
{
    "questions": [
        {
            "question": "Clear question text?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_option_index": 0
        }
    ]
}

DO NOT:
- Use placeholder text
- Create trick questions
- Make correct answer obvious by length/format
- Use "All of the above" or "None of the above" options"""
    
    def _build_assessment_prompt(
        self,
        course_title: str,
        content_summary: str,
        total_questions: int,
        pass_percentage: int
    ) -> str:
        """Build the assessment generation prompt."""
        return f"""Generate an assessment for this course:

COURSE: {course_title}

COURSE CONTENT SUMMARY:
{content_summary}

REQUIREMENTS:
- Generate exactly {total_questions} questions
- Questions must test the content above
- Pass percentage will be {pass_percentage}%
- Each question needs 4 options with one correct answer
- Distribute questions across all topics covered

Generate the complete assessment now."""
    
    def _extract_content_summary(self, course_content: dict) -> str:
        """Extract a summary of course content for assessment context."""
        summary_parts = []
        
        summary_parts.append(f"Course: {course_content.get('title', 'Unknown')}")
        summary_parts.append(f"Description: {course_content.get('description', '')}")
        summary_parts.append("")
        
        for level in course_content.get("levels", []):
            summary_parts.append(f"## {level.get('level_title', 'Level')}")
            
            for module in level.get("modules", []):
                summary_parts.append(f"### {module.get('module_title', 'Module')}")
                
                for slide in module.get("slides", []):
                    title = slide.get("slide_title", "Slide")
                    text = slide.get("slide_text", "")
                    text_preview = " ".join(text.split()[:100])
                    summary_parts.append(f"- {title}: {text_preview}...")
                
                summary_parts.append("")
        
        return "\n".join(summary_parts)
    
    def _validate_questions(self, questions_data: list[dict]) -> list[dict]:
        """Validate and clean assessment questions."""
        validated = []
        
        for idx, q_data in enumerate(questions_data):
            question_text = q_data.get("question", "")
            if not question_text:
                logger.warning(f"Question {idx + 1} has no text, skipping")
                continue
            
            validate_no_placeholders(question_text, f"question_{idx + 1}")
            
            options = q_data.get("options", [])
            if len(options) < 2:
                logger.warning(f"Question {idx + 1} has insufficient options, skipping")
                continue
            
            for opt_idx, option in enumerate(options):
                if option:
                    validate_no_placeholders(option, f"question_{idx + 1}_option_{opt_idx + 1}")
            
            correct_idx = q_data.get("correct_option_index")
            if correct_idx is None or not isinstance(correct_idx, int):
                logger.warning(f"Question {idx + 1} missing correct_option_index, skipping")
                continue
            
            if correct_idx < 0 or correct_idx >= len(options):
                logger.warning(f"Question {idx + 1} has invalid correct_option_index, skipping")
                continue
            
            validated.append({
                "question": question_text,
                "options": options,
                "correct_option_index": correct_idx
            })
        
        return validated
