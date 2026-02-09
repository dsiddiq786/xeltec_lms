# =============================================================================
# Assessment Service - Course Assessment Generation
# =============================================================================
# Generates assessment questions based on course content.
# Questions must align with and test the generated content.
# =============================================================================

import os
import json
import logging
from typing import Any
from openai import OpenAI

from app.schemas.course_schema import Assessment, AssessmentQuestion
from app.utils.validators import validate_no_placeholders, ValidationError

logger = logging.getLogger(__name__)


class AssessmentService:
    """
    Service for generating course assessments.
    
    WHY SEPARATE SERVICE:
    - Runs after content generation
    - Needs full course context
    - Can be converted to child agent
    - Clear testing boundary
    
    WHAT THIS GENERATES:
    - Multiple choice questions
    - Answer options
    - Correct answer indices
    
    CONSTRAINTS ENFORCED:
    - Questions must relate to course content
    - No placeholders in questions/options
    - Minimum question count based on course size
    """
    
    def __init__(self):
        """Initialize with OpenAI client."""
        self._client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self._model = os.getenv("OPENAI_MODEL", "gpt-4-turbo")
    
    def generate_assessment(
        self,
        course_content: dict[str, Any],
        pass_percentage: int = 85,
        questions_per_level: int = 3
    ) -> Assessment:
        """
        Generate assessment from course content.
        
        WHY CONTENT-BASED GENERATION:
        - Questions test actual delivered content
        - Ensures assessment validity
        - Prevents random/unrelated questions
        
        Args:
            course_content: Generated course with all slides
            pass_percentage: Required pass score
            questions_per_level: Questions to generate per level
            
        Returns:
            Complete Assessment object
            
        Raises:
            RuntimeError: If generation fails
        """
        logger.info("Generating course assessment")
        
        # Extract content summary for context
        content_summary = self._extract_content_summary(course_content)
        
        # Calculate total questions needed
        levels_count = len(course_content.get("levels", []))
        total_questions = levels_count * questions_per_level
        
        # Ensure minimum questions
        total_questions = max(total_questions, 5)
        
        prompt = self._build_assessment_prompt(
            course_title=course_content.get("title", "Course"),
            content_summary=content_summary,
            total_questions=total_questions,
            pass_percentage=pass_percentage
        )
        
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
                response_format={"type": "json_object"},
                max_completion_tokens=3000
            )
            
            # Check for empty response
            content = response.choices[0].message.content
            if not content or not content.strip():
                raise RuntimeError(f"Empty response from OpenAI - model may not support JSON format")
            
            assessment_data = json.loads(content)
            
            # Validate and convert to Assessment object
            questions = self._validate_and_convert_questions(
                assessment_data.get("questions", [])
            )
            
            assessment = Assessment(
                questions=questions,
                pass_percentage=pass_percentage
            )
            
            logger.info(f"Generated {len(questions)} assessment questions")
            return assessment
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse assessment JSON: {e}")
            raise RuntimeError(f"Invalid assessment format from AI: {e}")
        except Exception as e:
            logger.error(f"Assessment generation failed: {e}")
            raise RuntimeError(f"Assessment generation failed: {e}")
    
    def _get_system_prompt(self) -> str:
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
        """
        Extract a summary of course content for assessment context.
        
        WHY SUMMARY:
        - Full content may exceed context window
        - Key concepts are enough for question generation
        - Reduces token usage
        """
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
                    # Get first 100 words of slide_text for context
                    text = slide.get("slide_text", "")
                    text_preview = " ".join(text.split()[:100])
                    summary_parts.append(f"- {title}: {text_preview}...")
                
                summary_parts.append("")
        
        return "\n".join(summary_parts)
    
    def _validate_and_convert_questions(
        self,
        questions_data: list[dict]
    ) -> list[AssessmentQuestion]:
        """
        Validate questions and convert to Pydantic models.
        
        WHY VALIDATION:
        - Ensure no placeholders
        - Verify correct_option_index is valid
        - Guarantee schema compliance
        """
        validated_questions = []
        
        for idx, q_data in enumerate(questions_data):
            # Validate question text
            question_text = q_data.get("question", "")
            if not question_text:
                raise ValidationError(
                    f"Question {idx + 1} has no text",
                    field=f"questions[{idx}].question"
                )
            validate_no_placeholders(question_text, f"question_{idx + 1}")
            
            # Validate options
            options = q_data.get("options", [])
            if len(options) < 2:
                raise ValidationError(
                    f"Question {idx + 1} needs at least 2 options",
                    field=f"questions[{idx}].options"
                )
            
            for opt_idx, option in enumerate(options):
                if not option:
                    raise ValidationError(
                        f"Question {idx + 1} option {opt_idx + 1} is empty",
                        field=f"questions[{idx}].options[{opt_idx}]"
                    )
                validate_no_placeholders(option, f"question_{idx + 1}_option_{opt_idx + 1}")
            
            # Validate correct_option_index
            correct_idx = q_data.get("correct_option_index")
            if correct_idx is None:
                raise ValidationError(
                    f"Question {idx + 1} missing correct_option_index",
                    field=f"questions[{idx}].correct_option_index"
                )
            
            if not isinstance(correct_idx, int) or correct_idx < 0 or correct_idx >= len(options):
                raise ValidationError(
                    f"Question {idx + 1} has invalid correct_option_index: {correct_idx}",
                    field=f"questions[{idx}].correct_option_index",
                    details={"value": correct_idx, "options_count": len(options)}
                )
            
            # Create validated question
            validated_questions.append(AssessmentQuestion(
                question=question_text,
                options=options,
                correct_option_index=correct_idx
            ))
        
        return validated_questions
