# =============================================================================
# Course Repository - Database Operations for Courses
# =============================================================================
# Abstracts all database operations for course documents.
# Provides a clean API that can work with MongoDB or DynamoDB.
# =============================================================================

import os
import logging
from datetime import datetime
from typing import Optional
from bson import ObjectId

from app.db.nosql_client import get_nosql_client
from app.schemas.course_schema import CourseDocument

logger = logging.getLogger(__name__)


class CourseRepository:
    """
    Repository for course document operations.
    
    WHY REPOSITORY PATTERN:
    - Abstracts database implementation details
    - Enables easy testing with mock repositories
    - Supports future database migration (MongoDB → DynamoDB)
    - Single place for all course data access
    
    PRINCIPLES:
    - One course per document (atomic operations)
    - No partial writes (full document or nothing)
    - Version tracking for updates
    """
    
    def __init__(self):
        """Initialize repository with database client."""
        self._client = get_nosql_client()
        self._collection_name = os.getenv("MONGODB_COLLECTION", "courses")
    
    @property
    def collection(self):
        """Get the courses collection."""
        return self._client.get_collection(self._collection_name)
    
    def create(self, course_document: CourseDocument) -> CourseDocument:
        """
        Create a new course document.
        
        WHY ATOMIC WRITE:
        - Course must be complete before storage
        - No partial courses in database
        - Enables consistent reads
        
        Args:
            course_document: Complete course document to store
            
        Returns:
            CourseDocument with assigned _id
            
        Raises:
            RuntimeError: If insert fails
        """
        try:
            # Convert to dict for MongoDB
            doc = course_document.model_dump(by_alias=True, exclude={"id"})
            
            # Ensure created_at is set
            if "metadata" in doc and "created_at" not in doc["metadata"]:
                doc["metadata"]["created_at"] = datetime.utcnow()
            
            # Insert document
            result = self.collection.insert_one(doc)
            
            if not result.inserted_id:
                raise RuntimeError("Failed to insert course document")
            
            logger.info(f"Created course document: {result.inserted_id}")
            
            # Return document with assigned ID
            return CourseDocument(
                _id=str(result.inserted_id),
                **{k: v for k, v in doc.items() if k != "_id"}
            )
            
        except Exception as e:
            logger.error(f"Failed to create course document: {e}")
            raise RuntimeError(f"Database insert failed: {e}")
    
    def get_by_id(self, course_id: str) -> Optional[CourseDocument]:
        """
        Retrieve a course by its ID.
        
        WHY OPTIONAL RETURN:
        - Course may not exist
        - Caller handles not-found case
        - No exceptions for normal conditions
        
        Args:
            course_id: The MongoDB ObjectId as string
            
        Returns:
            CourseDocument if found, None otherwise
        """
        try:
            # Convert string ID to ObjectId
            object_id = ObjectId(course_id)
            
            # Find document
            doc = self.collection.find_one({"_id": object_id})
            
            if doc is None:
                logger.debug(f"Course not found: {course_id}")
                return None
            
            # Convert ObjectId to string for Pydantic
            doc["_id"] = str(doc["_id"])
            
            return CourseDocument(**doc)
            
        except Exception as e:
            logger.error(f"Failed to get course {course_id}: {e}")
            return None
    
    def get_by_title(self, title: str) -> Optional[CourseDocument]:
        """
        Retrieve a course by its title.
        
        WHY THIS METHOD:
        - Enables duplicate detection
        - Supports course lookup without ID
        - Used for validation before creation
        
        Args:
            title: Course title to search for
            
        Returns:
            CourseDocument if found, None otherwise
        """
        try:
            doc = self.collection.find_one({"metadata.title": title})
            
            if doc is None:
                return None
            
            doc["_id"] = str(doc["_id"])
            return CourseDocument(**doc)
            
        except Exception as e:
            logger.error(f"Failed to get course by title '{title}': {e}")
            return None
    
    def list_courses(
        self,
        category: Optional[str] = None,
        course_level: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> list[CourseDocument]:
        """
        List courses with optional filtering.
        
        WHY PAGINATION:
        - Prevents memory issues with large datasets
        - Enables efficient UI pagination
        - Default limit prevents accidental full scans
        
        Args:
            category: Filter by category
            course_level: Filter by difficulty level
            skip: Number of documents to skip
            limit: Maximum documents to return
            
        Returns:
            List of CourseDocument objects
        """
        try:
            # Build query filter
            query = {}
            if category:
                query["metadata.category"] = category
            if course_level:
                query["metadata.course_level"] = course_level
            
            # Execute query with pagination
            cursor = self.collection.find(query).skip(skip).limit(limit)
            
            courses = []
            for doc in cursor:
                doc["_id"] = str(doc["_id"])
                courses.append(CourseDocument(**doc))
            
            return courses
            
        except Exception as e:
            logger.error(f"Failed to list courses: {e}")
            return []
    
    def update(
        self,
        course_id: str,
        course_document: CourseDocument
    ) -> Optional[CourseDocument]:
        """
        Update an existing course document.
        
        WHY FULL DOCUMENT UPDATE:
        - Ensures atomic consistency
        - Version increment prevents conflicts
        - No partial update bugs
        
        Args:
            course_id: The course ID to update
            course_document: Complete new document
            
        Returns:
            Updated CourseDocument if successful, None otherwise
        """
        try:
            object_id = ObjectId(course_id)
            
            # Convert to dict and increment version
            doc = course_document.model_dump(by_alias=True, exclude={"id"})
            doc["metadata"]["version"] = doc["metadata"].get("version", 1) + 1
            
            # Replace entire document
            result = self.collection.replace_one(
                {"_id": object_id},
                doc
            )
            
            if result.modified_count == 0:
                logger.warning(f"Course not updated (not found?): {course_id}")
                return None
            
            logger.info(f"Updated course: {course_id}")
            
            return CourseDocument(_id=course_id, **doc)
            
        except Exception as e:
            logger.error(f"Failed to update course {course_id}: {e}")
            return None
    
    def delete(self, course_id: str) -> bool:
        """
        Delete a course document.
        
        WHY HARD DELETE:
        - Simple for MVP
        - Soft delete can be added via 'deleted_at' field
        - No orphaned data concerns
        
        Args:
            course_id: The course ID to delete
            
        Returns:
            True if deleted, False otherwise
        """
        try:
            object_id = ObjectId(course_id)
            result = self.collection.delete_one({"_id": object_id})
            
            if result.deleted_count == 0:
                logger.warning(f"Course not deleted (not found?): {course_id}")
                return False
            
            logger.info(f"Deleted course: {course_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete course {course_id}: {e}")
            return False
    
    def count(
        self,
        category: Optional[str] = None,
        course_level: Optional[str] = None
    ) -> int:
        """
        Count courses matching filters.
        
        WHY COUNT METHOD:
        - Enables pagination UI
        - Quick stats without loading documents
        - Efficient database operation
        
        Args:
            category: Filter by category
            course_level: Filter by difficulty level
            
        Returns:
            Number of matching courses
        """
        try:
            query = {}
            if category:
                query["metadata.category"] = category
            if course_level:
                query["metadata.course_level"] = course_level
            
            return self.collection.count_documents(query)
            
        except Exception as e:
            logger.error(f"Failed to count courses: {e}")
            return 0
