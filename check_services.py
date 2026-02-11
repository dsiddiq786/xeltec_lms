
import asyncio
from pymongo import MongoClient
import redis.asyncio as redis

async def check():
    print("Checking services...")
    
    # Check MongoDB
    try:
        client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=2000)
        client.server_info()
        print("✅ MongoDB is running")
    except Exception as e:
        print(f"❌ MongoDB is NOT running or not accessible: {e}")

    # Check Redis
    try:
        r = redis.from_url("redis://localhost:6379")
        await r.ping()
        print("✅ Redis is running")
        await r.close()
    except Exception as e:
        print(f"❌ Redis is NOT running or not accessible: {e}")

if __name__ == "__main__":
    asyncio.run(check())
