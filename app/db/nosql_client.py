# =============================================================================
# NoSQL Client - MongoDB Connection Management
# =============================================================================
# Provides a singleton MongoDB client for database operations.
# Designed for easy swap to DynamoDB if needed.
# =============================================================================

import os
import logging
from typing import Optional
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

logger = logging.getLogger(__name__)


class NoSQLClient:
    """
    Singleton MongoDB client manager.
    
    WHY SINGLETON:
    - MongoDB connections are expensive to create
    - Connection pooling is handled internally by PyMongo
    - One client instance serves the entire application
    
    WHY NOT DEPENDENCY INJECTION:
    - FastAPI's dependency injection works well for request-scoped resources
    - Database connections are application-scoped, not request-scoped
    - Singleton ensures consistent connection pool management
    """
    
    _instance: Optional["NoSQLClient"] = None
    _client: Optional[MongoClient] = None
    _database: Optional[Database] = None
    
    def __new__(cls) -> "NoSQLClient":
        """Ensure only one instance exists."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize is called each time, but setup only happens once."""
        # Only connect if not already connected
        if self._client is None:
            self._connect()
    
    def _connect(self) -> None:
        """
        Establish connection to MongoDB.
        
        WHY ENVIRONMENT VARIABLES:
        - Secrets should never be hardcoded
        - Enables different configs for dev/staging/prod
        - Follows 12-factor app principles
        """
        uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        database_name = os.getenv("MONGODB_DATABASE", "ai_course_generator")
        
        try:
            # Create client with reasonable defaults
            self._client = MongoClient(
                uri,
                serverSelectionTimeoutMS=5000,  # 5 second timeout
                connectTimeoutMS=5000,
                socketTimeoutMS=30000,  # 30 seconds for operations
                maxPoolSize=50,  # Connection pool size
                retryWrites=True,  # Automatic retry on transient errors
            )
            
            # Verify connection
            self._client.admin.command("ping")
            self._database = self._client[database_name]
            
            logger.info(f"Connected to MongoDB: {database_name}")
            
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise RuntimeError(f"Database connection failed: {e}")
    
    @property
    def database(self) -> Database:
        """Get the database instance."""
        if self._database is None:
            self._connect()
        return self._database
    
    def get_collection(self, name: str) -> Collection:
        """
        Get a collection by name.
        
        WHY METHOD INSTEAD OF PROPERTY:
        - Allows dynamic collection access
        - Supports multiple collections if needed
        - Cleaner API for repository layer
        
        Args:
            name: Collection name
            
        Returns:
            MongoDB Collection instance
        """
        return self.database[name]
    
    def health_check(self) -> bool:
        """
        Check if database connection is healthy.
        
        WHY HEALTH CHECK:
        - Required for load balancer health endpoints
        - Enables graceful degradation
        - Early detection of connection issues
        
        Returns:
            True if connected and responsive
        """
        try:
            self._client.admin.command("ping")
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False
    
    def close(self) -> None:
        """
        Close database connection.
        
        WHY EXPLICIT CLOSE:
        - Clean shutdown for graceful termination
        - Release connection pool resources
        - Called during application shutdown
        """
        if self._client:
            self._client.close()
            self._client = None
            self._database = None
            logger.info("MongoDB connection closed")


# =============================================================================
# Convenience function for getting client instance
# =============================================================================

def get_nosql_client() -> NoSQLClient:
    """
    Get the NoSQL client singleton instance.
    
    WHY FUNCTION:
    - Can be used as FastAPI dependency
    - Cleaner import for other modules
    - Hides singleton implementation detail
    
    Returns:
        NoSQLClient singleton instance
    """
    return NoSQLClient()
