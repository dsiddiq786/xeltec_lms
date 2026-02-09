# =============================================================================
# Draft Repository - Incremental Course Saving
# =============================================================================
# Saves course content incrementally as it's generated.
# If generation fails, partial progress is preserved.
# =============================================================================

import logging
from datetime import datetime
from typing import Optional, Any
from bson import ObjectId

from app.db.nosql_client import get_nosql_client

logger = logging.getLogger(__name__)


class DraftRepository:
    """
    Repository for saving course drafts incrementally.
    
    WHY INCREMENTAL SAVING:
    - If generation fails at slide 15/20, we keep slides 1-14
    - User can see partial progress
    - Failed jobs can be resumed
    - No work is lost
    
    STRUCTURE:
    - One draft document per job
    - Outline saved first
    - Each slide appended as completed
    - Assessment added at end
    - Draft promoted to course when complete
    """
    
    def __init__(self):
        """Initialize repository."""
        self._client = get_nosql_client()
        self._collection_name = "course_drafts"
    
    @property
    def collection(self):
        """Get the drafts collection."""
        return self._client.get_collection(self._collection_name)
    
    def create_draft(
        self,
        job_id: str,
        course_title: str,
        request_data: dict
    ) -> str:
        """
        Create initial draft document.
        
        Called when job starts processing.
        """
        try:
            doc = {
                "job_id": job_id,
                "course_title": course_title,
                "request_data": request_data,
                "status": "initializing",
                "outline": None,
                "levels": [],
                "assessment": None,
                "slides_completed": 0,
                "slides_total": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = self.collection.insert_one(doc)
            logger.info(f"Created draft for job {job_id}: {result.inserted_id}")
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"Failed to create draft: {e}")
            raise
    
    def save_outline(
        self,
        job_id: str,
        outline: dict,
        slides_total: int
    ) -> bool:
        """
        Save the generated outline.
        
        Called after outline generation succeeds.
        Creates the level/module structure for slide insertion.
        """
        try:
            # Build level structure from outline
            levels = []
            for level_data in outline.get("levels", []):
                level = {
                    "level_title": level_data["level_title"],
                    "level_order": level_data["level_order"],
                    "modules": []
                }
                
                for module_data in level_data.get("modules", []):
                    module = {
                        "module_title": module_data["module_title"],
                        "module_order": module_data["module_order"],
                        "slide_titles": module_data.get("slide_titles", []),
                        "slides": []  # Will be populated as slides complete
                    }
                    level["modules"].append(module)
                
                levels.append(level)
            
            result = self.collection.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "generating_slides",
                    "outline": outline,
                    "description": outline.get("description", ""),
                    "levels": levels,
                    "slides_total": slides_total,
                    "updated_at": datetime.utcnow()
                }}
            )
            
            logger.info(f"Saved outline for job {job_id}")
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to save outline: {e}")
            return False
    
    def save_slide(
        self,
        job_id: str,
        level_order: int,
        module_order: int,
        slide_data: dict
    ) -> bool:
        """
        Save a completed slide to the draft.
        
        Called as each slide completes generation.
        Uses MongoDB array update to append slide.
        """
        try:
            # Find the correct position and append slide
            result = self.collection.update_one(
                {
                    "job_id": job_id,
                    "levels.level_order": level_order,
                    "levels.modules.module_order": module_order
                },
                {
                    "$push": {
                        "levels.$[level].modules.$[module].slides": slide_data
                    },
                    "$inc": {"slides_completed": 1},
                    "$set": {"updated_at": datetime.utcnow()}
                },
                array_filters=[
                    {"level.level_order": level_order},
                    {"module.module_order": module_order}
                ]
            )
            
            if result.modified_count > 0:
                logger.debug(f"Saved slide to job {job_id}: {slide_data.get('slide_title', 'Unknown')}")
                return True
            else:
                # Fallback: try simpler update
                return self._save_slide_fallback(job_id, level_order, module_order, slide_data)
                
        except Exception as e:
            logger.error(f"Failed to save slide: {e}")
            return self._save_slide_fallback(job_id, level_order, module_order, slide_data)
    
    def _save_slide_fallback(
        self,
        job_id: str,
        level_order: int,
        module_order: int,
        slide_data: dict
    ) -> bool:
        """Fallback method for saving slide using read-modify-write."""
        try:
            doc = self.collection.find_one({"job_id": job_id})
            if not doc:
                return False
            
            # Find and update the correct module
            for level in doc.get("levels", []):
                if level.get("level_order") == level_order:
                    for module in level.get("modules", []):
                        if module.get("module_order") == module_order:
                            if "slides" not in module:
                                module["slides"] = []
                            module["slides"].append(slide_data)
                            break
                    break
            
            # Update the document
            self.collection.update_one(
                {"job_id": job_id},
                {"$set": {
                    "levels": doc["levels"],
                    "slides_completed": doc.get("slides_completed", 0) + 1,
                    "updated_at": datetime.utcnow()
                }}
            )
            
            logger.debug(f"Saved slide (fallback) to job {job_id}")
            return True
            
        except Exception as e:
            logger.error(f"Fallback slide save failed: {e}")
            return False
    
    def save_assessment(
        self,
        job_id: str,
        assessment: dict
    ) -> bool:
        """Save the generated assessment."""
        try:
            result = self.collection.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "completing",
                    "assessment": assessment,
                    "updated_at": datetime.utcnow()
                }}
            )
            
            logger.info(f"Saved assessment for job {job_id}")
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to save assessment: {e}")
            return False
    
    def mark_complete(self, job_id: str) -> bool:
        """Mark draft as complete."""
        try:
            result = self.collection.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "complete",
                    "completed_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to mark complete: {e}")
            return False
    
    def mark_failed(self, job_id: str, error: str) -> bool:
        """Mark draft as failed but preserve content."""
        try:
            result = self.collection.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "failed",
                    "error": error,
                    "updated_at": datetime.utcnow()
                }}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to mark failed: {e}")
            return False
    
    def get_by_job_id(self, job_id: str) -> Optional[dict]:
        """Get draft by job ID."""
        try:
            doc = self.collection.find_one({"job_id": job_id})
            if doc:
                doc["_id"] = str(doc["_id"])
            return doc
        except Exception as e:
            logger.error(f"Failed to get draft: {e}")
            return None
    
    def get_draft_content(self, job_id: str) -> Optional[dict]:
        """Get draft content in course format."""
        try:
            doc = self.collection.find_one({"job_id": job_id})
            if not doc:
                return None
            
            return {
                "title": doc.get("course_title"),
                "description": doc.get("description", ""),
                "levels": doc.get("levels", []),
                "assessment": doc.get("assessment"),
                "status": doc.get("status"),
                "slides_completed": doc.get("slides_completed", 0),
                "slides_total": doc.get("slides_total", 0)
            }
        except Exception as e:
            logger.error(f"Failed to get draft content: {e}")
            return None
    
    def delete_draft(self, job_id: str) -> bool:
        """Delete a draft (after promoting to course)."""
        try:
            result = self.collection.delete_one({"job_id": job_id})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Failed to delete draft: {e}")
            return False
