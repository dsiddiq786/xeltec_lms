# =============================================================================
# File Storage Service - Local File System Management
# =============================================================================
# Manages the folder structure for generated courses.
# Saves content, images, and audio to organized directory tree.
# Designed for easy migration to S3 later.
# =============================================================================

import os
import re
import json
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Base directory for all generated courses (project root)
BASE_DIR = os.getenv(
    "GENERATED_COURSES_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "Generated_Courses")
)


def sanitize_name(name: str, max_length: int = 60) -> str:
    """
    Sanitize a string for use as a folder name.
    
    - Removes special characters
    - Replaces spaces with underscores
    - Truncates to max_length
    - Ensures the name is filesystem-safe
    """
    # Remove or replace problematic characters
    sanitized = re.sub(r'[<>:"/\\|?*]', '', name)
    # Replace spaces and multiple underscores
    sanitized = re.sub(r'\s+', '_', sanitized)
    sanitized = re.sub(r'_+', '_', sanitized)
    # Remove leading/trailing underscores and dots
    sanitized = sanitized.strip('_.')
    # Truncate
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length].rstrip('_')
    # Fallback if empty
    return sanitized or "unnamed"


class FileStorageService:
    """
    Service for managing course file storage on local filesystem.
    
    FOLDER STRUCTURE:
    Generated_Courses/
    └── {course_title}_{job_id}/
        ├── course_info.json
        ├── cost_report.json
        └── Level_1_{level_title}/
            └── Module_1_{module_title}/
                └── Slide_1_{slide_title}/
                    ├── content.json
                    ├── image.png
                    └── voiceover.mp3
    
    WHY LOCAL FIRST:
    - Simple development and testing
    - No cloud dependency
    - Easy to verify generated content
    - S3 migration planned (just change save methods)
    """
    
    def __init__(self, base_dir: Optional[str] = None):
        """Initialize with base directory."""
        self._base_dir = base_dir or BASE_DIR
        os.makedirs(self._base_dir, exist_ok=True)
    
    def create_course_directory(
        self,
        course_title: str,
        job_id: str,
        outline: dict,
        request_data: dict
    ) -> str:
        """
        Create the complete folder structure for a course.
        
        Creates the course root and all level/module/slide directories
        based on the outline structure.
        
        Args:
            course_title: Title of the course
            job_id: Unique job identifier
            outline: Generated course outline with levels/modules/slides
            request_data: Original request parameters
            
        Returns:
            Absolute path to the course root directory
        """
        # Create course root directory
        course_dir_name = f"{sanitize_name(course_title)}_{job_id[:8]}"
        course_dir = os.path.join(self._base_dir, course_dir_name)
        os.makedirs(course_dir, exist_ok=True)
        
        # Save course info
        course_info = {
            "course_title": course_title,
            "job_id": job_id,
            "request_data": request_data,
            "created_at": datetime.utcnow().isoformat(),
            "structure": {}
        }
        
        # Create level/module/slide directories
        structure = {}
        for level_data in outline.get("levels", []):
            level_order = level_data["level_order"]
            level_title = level_data["level_title"]
            level_dir_name = f"Level_{level_order}_{sanitize_name(level_title)}"
            level_dir = os.path.join(course_dir, level_dir_name)
            os.makedirs(level_dir, exist_ok=True)
            
            structure[level_dir_name] = {}
            
            for module_data in level_data.get("modules", []):
                module_order = module_data["module_order"]
                module_title = module_data["module_title"]
                module_dir_name = f"Module_{module_order}_{sanitize_name(module_title)}"
                module_dir = os.path.join(level_dir, module_dir_name)
                os.makedirs(module_dir, exist_ok=True)
                
                structure[level_dir_name][module_dir_name] = []
                
                for slide_idx, slide_title in enumerate(module_data.get("slide_titles", []), 1):
                    slide_dir_name = f"Slide_{slide_idx}_{sanitize_name(slide_title)}"
                    slide_dir = os.path.join(module_dir, slide_dir_name)
                    os.makedirs(slide_dir, exist_ok=True)
                    
                    structure[level_dir_name][module_dir_name].append(slide_dir_name)
        
        course_info["structure"] = structure
        
        # Save course_info.json
        self._save_json(os.path.join(course_dir, "course_info.json"), course_info)
        
        logger.info(f"Created course directory structure: {course_dir}")
        return course_dir
    
    def get_slide_directory(
        self,
        course_dir: str,
        level_order: int,
        level_title: str,
        module_order: int,
        module_title: str,
        slide_index: int,
        slide_title: str
    ) -> str:
        """
        Get the absolute path to a specific slide's directory.
        
        Args:
            course_dir: Root course directory
            level_order: Level number (1-indexed)
            level_title: Level title for folder name
            module_order: Module number (1-indexed)
            module_title: Module title for folder name
            slide_index: Slide number (1-indexed)
            slide_title: Slide title for folder name
            
        Returns:
            Absolute path to the slide directory
        """
        level_dir = f"Level_{level_order}_{sanitize_name(level_title)}"
        module_dir = f"Module_{module_order}_{sanitize_name(module_title)}"
        slide_dir = f"Slide_{slide_index}_{sanitize_name(slide_title)}"
        
        path = os.path.join(course_dir, level_dir, module_dir, slide_dir)
        os.makedirs(path, exist_ok=True)
        return path
    
    def save_slide_content(
        self,
        slide_dir: str,
        slide_data: dict
    ) -> str:
        """
        Save slide text content as JSON.
        
        Args:
            slide_dir: Path to slide directory
            slide_data: Slide content dictionary
            
        Returns:
            Path to saved content.json file
        """
        content_path = os.path.join(slide_dir, "content.json")
        
        # Extract only content fields (not file paths)
        content = {
            "slide_title": slide_data.get("slide_title", ""),
            "slide_text": slide_data.get("slide_text", ""),
            "voiceover_script": slide_data.get("voiceover_script", ""),
            "visual_prompt": slide_data.get("visual_prompt", ""),
            "estimated_duration_sec": slide_data.get("estimated_duration_sec", 0),
            "saved_at": datetime.utcnow().isoformat()
        }
        
        self._save_json(content_path, content)
        logger.debug(f"Saved slide content: {content_path}")
        return content_path
    
    def save_cost_report(self, course_dir: str, cost_report: dict) -> str:
        """
        Save cost report to the course directory.
        
        Args:
            course_dir: Root course directory
            cost_report: Cost breakdown dictionary
            
        Returns:
            Path to saved cost_report.json file
        """
        report_path = os.path.join(course_dir, "cost_report.json")
        self._save_json(report_path, cost_report)
        logger.info(f"Saved cost report: {report_path}")
        return report_path
    
    def save_assessment(self, course_dir: str, assessment_data: dict) -> str:
        """
        Save assessment data to the course directory.
        
        Args:
            course_dir: Root course directory
            assessment_data: Assessment dictionary with questions
            
        Returns:
            Path to saved assessment.json file
        """
        assessment_path = os.path.join(course_dir, "assessment.json")
        self._save_json(assessment_path, assessment_data)
        logger.info(f"Saved assessment: {assessment_path}")
        return assessment_path
    
    def get_image_path(self, slide_dir: str) -> str:
        """Get the standard path for a slide's image file."""
        return os.path.join(slide_dir, "image.png")
    
    def get_voiceover_path(self, slide_dir: str) -> str:
        """Get the standard path for a slide's voiceover file."""
        return os.path.join(slide_dir, "voiceover.mp3")
    
    def get_relative_path(self, absolute_path: str) -> str:
        """
        Convert an absolute path to a path relative to the base directory.
        
        Useful for storing in database (portable paths for S3 migration).
        """
        try:
            return os.path.relpath(absolute_path, self._base_dir)
        except ValueError:
            return absolute_path
    
    def _save_json(self, path: str, data: dict) -> None:
        """Save a dictionary as formatted JSON."""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)
