# =============================================================================
# Course Generation Agent - Orchestrator
# =============================================================================
# The single orchestrator agent that coordinates all generation services.
# Designed to be split into child agents in the future.
# =============================================================================

import logging
from datetime import datetime
from typing import Any

from app.schemas.request_schema import CourseGenerationRequest
from app.schemas.course_schema import (
    Course,
    CourseLevel,
    CourseModule,
    Slide,
    CourseDocument,
    CourseMetadata,
    CourseConstraints,
)
from app.services.outline_service import OutlineService
from app.services.slide_content_service import SlideContentService
from app.services.assessment_service import AssessmentService
from app.db.course_repository import CourseRepository
from app.utils.validators import (
    validate_course_structure,
    validate_assessment,
    ValidationError
)
from app.utils.duration import calculate_total_course_duration, format_duration

logger = logging.getLogger(__name__)


class CourseGenerationAgent:
    """
    Orchestrator agent for course generation.
    
    WHY SINGLE AGENT NOW:
    - Simpler to develop and debug
    - Clear execution flow
    - Easy to extend
    
    WHY AGENT-READY DESIGN:
    - Services are isolated and stateless
    - Clear boundaries between generation steps
    - Each service can become a child agent
    
    EXECUTION FLOW:
    1. Validate constraints
    2. Generate outline (structure)
    3. Generate slide content (per module)
    4. Calculate durations
    5. Generate assessment
    6. Validate final schema
    7. Store in database
    8. Return complete course
    """
    
    def __init__(self):
        """
        Initialize agent with all required services.
        
        WHY COMPOSITION:
        - Each service is independently testable
        - Easy to swap implementations
        - Clear dependency graph
        """
        self.outline_service = OutlineService()
        self.slide_content_service = SlideContentService()
        self.assessment_service = AssessmentService()
        self.repository = CourseRepository()
    
    def generate_course(self, request: CourseGenerationRequest) -> CourseDocument:
        """
        Execute the complete course generation pipeline.
        
        WHY SYNCHRONOUS:
        - Ensures atomic operation
        - Simpler error handling
        - No partial state issues
        
        Args:
            request: Validated course generation constraints
            
        Returns:
            Complete CourseDocument stored in database
            
        Raises:
            ValidationError: If constraints or content are invalid
            RuntimeError: If generation or storage fails
        """
        logger.info(f"Starting course generation: {request.course_title}")
        start_time = datetime.utcnow()
        
        try:
            # Step 1: Validate constraints
            self._validate_constraints(request)
            
            # Step 2: Generate outline
            logger.info("Step 1/5: Generating course outline...")
            outline = self.outline_service.generate_outline(request)
            
            # Step 3: Generate slide content for each module
            logger.info("Step 2/5: Generating slide content...")
            course_content = self._generate_all_content(outline, request)
            
            # Step 4: Calculate total duration
            logger.info("Step 3/5: Calculating durations...")
            total_duration = self._calculate_course_duration(
                course_content,
                request.words_per_minute
            )
            
            # Step 5: Generate assessment
            logger.info("Step 4/5: Generating assessment...")
            assessment = self.assessment_service.generate_assessment(
                course_content,
                pass_percentage=request.pass_percentage,
                questions_per_level=3
            )
            
            # Step 6: Build and validate final course
            logger.info("Step 5/5: Validating and storing course...")
            course = self._build_course(course_content, assessment)
            
            # Validate final structure
            validate_course_structure(
                course.model_dump(),
                request.levels_count,
                request.modules_per_level,
                request.slides_per_module
            )
            validate_assessment(
                assessment.model_dump(),
                min_questions=5,
                pass_percentage=request.pass_percentage
            )
            
            # Step 7: Store in database
            document = self._create_document(course, request)
            stored_document = self.repository.create(document)
            
            # Log completion
            elapsed = (datetime.utcnow() - start_time).total_seconds()
            logger.info(
                f"Course generation complete: {request.course_title} "
                f"({format_duration(total_duration)} content, "
                f"generated in {elapsed:.1f}s)"
            )
            
            return stored_document
            
        except ValidationError as e:
            logger.error(f"Validation failed: {e.message}")
            raise
        except Exception as e:
            logger.error(f"Course generation failed: {e}")
            raise RuntimeError(f"Course generation failed: {e}")
    
    def _validate_constraints(self, request: CourseGenerationRequest) -> None:
        """
        Validate that constraints are internally consistent.
        
        WHY UPFRONT VALIDATION:
        - Fail fast before expensive generation
        - Clear error messages
        - Prevents partial work loss
        """
        # Check duration consistency
        if not request.validate_total_duration():
            calculated = (
                request.total_slides * request.target_slide_duration_sec
            ) / 60
            raise ValidationError(
                f"Duration mismatch: {request.total_slides} slides × "
                f"{request.target_slide_duration_sec}s = {calculated:.0f}min, "
                f"but target is {request.target_course_duration_minutes}min",
                field="target_course_duration_minutes",
                details={
                    "total_slides": request.total_slides,
                    "target_slide_duration_sec": request.target_slide_duration_sec,
                    "calculated_minutes": calculated,
                    "target_minutes": request.target_course_duration_minutes
                }
            )
        
        logger.debug("Constraints validated successfully")
    
    def _generate_all_content(
        self,
        outline: dict[str, Any],
        request: CourseGenerationRequest
    ) -> dict[str, Any]:
        """
        Generate content for all slides in the course.
        
        WHY MODULE-BY-MODULE:
        - Provides context for continuity
        - Enables progress logging
        - Could be parallelized later
        
        Returns:
            Complete course content dictionary
        """
        course_content = {
            "title": request.course_title,
            "description": outline["description"],
            "levels": []
        }
        
        total_modules = request.levels_count * request.modules_per_level
        current_module = 0
        
        for level_data in outline["levels"]:
            level = {
                "level_title": level_data["level_title"],
                "level_order": level_data["level_order"],
                "modules": []
            }
            
            for module_data in level_data["modules"]:
                current_module += 1
                logger.info(
                    f"Generating module {current_module}/{total_modules}: "
                    f"{module_data['module_title']}"
                )
                
                # Generate slides for this module
                slides = self.slide_content_service.generate_module_slides(
                    module=module_data,
                    level_title=level_data["level_title"],
                    course_title=request.course_title,
                    request=request
                )
                
                module = {
                    "module_title": module_data["module_title"],
                    "module_order": module_data["module_order"],
                    "slides": slides
                }
                
                level["modules"].append(module)
            
            course_content["levels"].append(level)
        
        return course_content
    
    def _calculate_course_duration(
        self,
        course_content: dict,
        words_per_minute: int
    ) -> int:
        """
        Calculate total course duration from generated content.
        
        WHY RECALCULATE:
        - Actual word counts may vary from target
        - Provides accurate course metadata
        - Validates duration constraints
        """
        all_slides = []
        for level in course_content.get("levels", []):
            for module in level.get("modules", []):
                all_slides.extend(module.get("slides", []))
        
        return calculate_total_course_duration(all_slides, words_per_minute)
    
    def _build_course(
        self,
        course_content: dict,
        assessment: Any
    ) -> Course:
        """
        Build the final Course object from generated content.
        
        WHY PYDANTIC CONVERSION:
        - Validates all fields
        - Ensures schema compliance
        - Enables JSON serialization
        """
        levels = []
        for level_data in course_content["levels"]:
            modules = []
            for module_data in level_data["modules"]:
                slides = [
                    Slide(
                        slide_title=s["slide_title"],
                        slide_text=s["slide_text"],
                        visual_prompt=s["visual_prompt"],
                        voiceover_script=s["voiceover_script"],
                        estimated_duration_sec=s["estimated_duration_sec"]
                    )
                    for s in module_data["slides"]
                ]
                
                modules.append(CourseModule(
                    module_title=module_data["module_title"],
                    module_order=module_data["module_order"],
                    slides=slides
                ))
            
            levels.append(CourseLevel(
                level_title=level_data["level_title"],
                level_order=level_data["level_order"],
                modules=modules
            ))
        
        return Course(
            title=course_content["title"],
            description=course_content["description"],
            levels=levels,
            assessment=assessment
        )
    
    def _create_document(
        self,
        course: Course,
        request: CourseGenerationRequest
    ) -> CourseDocument:
        """
        Create the complete CourseDocument for storage.
        
        WHY SEPARATE DOCUMENT:
        - Includes metadata for querying
        - Stores constraints for auditing
        - Single document per course
        """
        metadata = CourseMetadata(
            title=course.title,
            description=course.description,
            category=request.category,
            course_level=request.course_level,
            regulatory_context=request.regulatory_context,
            version=1,
            created_at=datetime.utcnow()
        )
        
        constraints = CourseConstraints(
            target_course_duration_minutes=request.target_course_duration_minutes,
            levels_count=request.levels_count,
            modules_per_level=request.modules_per_level,
            slides_per_module=request.slides_per_module,
            target_slide_duration_sec=request.target_slide_duration_sec,
            words_per_minute=request.words_per_minute,
            pass_percentage=request.pass_percentage
        )
        
        return CourseDocument(
            metadata=metadata,
            content=course,
            constraints=constraints
        )
