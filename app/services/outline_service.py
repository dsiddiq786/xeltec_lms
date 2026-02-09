# =============================================================================
# Outline Service - Course Structure Generation
# =============================================================================
# Generates the course outline (levels, modules, slide titles) based on
# system-owned constraints. This is the FIRST step in course generation.
# =============================================================================

import os
import json
import logging
from typing import Any
from openai import OpenAI

from app.schemas.request_schema import CourseGenerationRequest

logger = logging.getLogger(__name__)


class OutlineService:
    """
    Service for generating course outlines.
    
    WHY SEPARATE SERVICE:
    - Clear separation of concerns
    - Can be converted to child agent in future
    - Testable in isolation
    - Focused responsibility: structure only, no content
    
    WHAT THIS GENERATES:
    - Course description
    - Level titles and order
    - Module titles and order
    - Slide titles (not content)
    
    CONSTRAINTS ENFORCED:
    - Exact number of levels, modules, slides as specified
    - No skipping hierarchy levels
    """
    
    def __init__(self):
        """Initialize with OpenAI client."""
        self._client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self._model = os.getenv("OPENAI_MODEL", "gpt-4-turbo")
    
    def generate_outline(self, request: CourseGenerationRequest) -> dict[str, Any]:
        """
        Generate course outline from constraints.
        
        WHY AI FOR OUTLINE:
        - Creates meaningful, contextual titles
        - Ensures logical progression
        - Adapts to different subject matter
        
        WHY NOT AI FOR STRUCTURE:
        - Structure is fixed by constraints
        - No room for AI interpretation
        - Deterministic output guaranteed
        
        Args:
            request: Course generation constraints
            
        Returns:
            Outline dictionary with levels, modules, slide titles
            
        Raises:
            RuntimeError: If generation fails
        """
        logger.info(f"Generating outline for: {request.course_title}")
        
        # Build the prompt with explicit constraints
        prompt = self._build_outline_prompt(request)
        
        try:
            response = self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {
                        "role": "system",
                        "content": self._get_system_prompt()
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"}
            )
            
            # Parse JSON response - check for empty response
            content = response.choices[0].message.content
            if not content or not content.strip():
                raise RuntimeError(f"Empty response from OpenAI - model may not support JSON format")
            
            outline = json.loads(content)
            
            # Validate structure matches constraints
            self._validate_outline_structure(outline, request)
            
            logger.info("Outline generated successfully")
            return outline
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse outline JSON: {e}")
            raise RuntimeError(f"Invalid outline format from AI: {e}")
        except Exception as e:
            logger.error(f"Outline generation failed: {e}")
            raise RuntimeError(f"Outline generation failed: {e}")
    
    def _get_system_prompt(self) -> str:
        """
        System prompt for outline generation.
        
        WHY DETAILED SYSTEM PROMPT:
        - Sets clear expectations for output format
        - Enforces JSON structure
        - Prevents creative interpretation of constraints
        """
        return """You are an expert instructional designer creating course outlines.

Your task is to generate a structured course outline with meaningful, educational titles.

CRITICAL RULES:
1. Output MUST be valid JSON
2. You MUST create EXACTLY the number of levels, modules, and slides specified
3. Titles must be clear, professional, and educational
4. Each level should represent progressive learning
5. Modules within a level should be logically grouped
6. Slide titles should indicate specific learning content

DO NOT:
- Skip any hierarchy level
- Create fewer or more items than specified
- Use placeholder text like "Module 1" without description
- Include actual content (only titles/structure)
"""
    
    def _build_outline_prompt(self, request: CourseGenerationRequest) -> str:
        """
        Build the user prompt for outline generation.
        
        WHY EXPLICIT STRUCTURE:
        - Leaves no room for interpretation
        - AI knows exact output format expected
        - Easy validation of response
        """
        return f"""Create a course outline for:

COURSE DETAILS:
- Title: {request.course_title}
- Category: {request.category}
- Level: {request.course_level}
- Regulatory Context: {request.regulatory_context or "General"}

REQUIRED STRUCTURE (MUST FOLLOW EXACTLY):
- Number of Levels: {request.levels_count}
- Modules per Level: {request.modules_per_level}
- Slides per Module: {request.slides_per_module}
- Total Slides: {request.total_slides}

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
                    "slide_titles": [
                        "Slide 1 title",
                        "Slide 2 title"
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
        """
        Validate that generated outline matches constraints.
        
        WHY VALIDATION:
        - AI may not follow instructions perfectly
        - Fail fast before content generation
        - Ensures downstream processes have valid structure
        
        Raises:
            RuntimeError: If structure doesn't match constraints
        """
        # Check description exists
        if not outline.get("description"):
            raise RuntimeError("Outline missing description")
        
        # Check levels count
        levels = outline.get("levels", [])
        if len(levels) != request.levels_count:
            raise RuntimeError(
                f"Expected {request.levels_count} levels, got {len(levels)}"
            )
        
        # Check each level
        for level_idx, level in enumerate(levels):
            # Validate level_order
            if level.get("level_order") != level_idx + 1:
                level["level_order"] = level_idx + 1  # Auto-fix
            
            # Validate modules count
            modules = level.get("modules", [])
            if len(modules) != request.modules_per_level:
                raise RuntimeError(
                    f"Level {level_idx + 1} has {len(modules)} modules, "
                    f"expected {request.modules_per_level}"
                )
            
            # Check each module
            for module_idx, module in enumerate(modules):
                # Validate module_order
                if module.get("module_order") != module_idx + 1:
                    module["module_order"] = module_idx + 1  # Auto-fix
                
                # Validate slide titles count
                slide_titles = module.get("slide_titles", [])
                if len(slide_titles) != request.slides_per_module:
                    raise RuntimeError(
                        f"Module {module_idx + 1} in Level {level_idx + 1} "
                        f"has {len(slide_titles)} slides, "
                        f"expected {request.slides_per_module}"
                    )
        
        logger.debug("Outline structure validation passed")
