# =============================================================================
# Image Generation Service - DALL-E 3 Image Generation
# =============================================================================
# Generates actual images from visual prompts using OpenAI's DALL-E 3 API.
# Designed to run in ThreadPoolExecutor for parallel slide processing.
# Images saved locally now, S3 migration planned for later.
# =============================================================================

import os
import base64
import logging
from typing import Optional

from openai import OpenAI

logger = logging.getLogger(__name__)

# Configuration
DALLE_MODEL = os.getenv("DALLE_MODEL", "dall-e-3")
DALLE_SIZE = os.getenv("DALLE_SIZE", "1024x1024")
DALLE_QUALITY = os.getenv("DALLE_QUALITY", "standard")


class ImageGenerationService:
    """
    Service for generating images using OpenAI's DALL-E 3.
    
    WHY SYNC CLIENT:
    - Designed to run inside ThreadPoolExecutor
    - Each thread gets its own execution context
    - Simpler error handling in threaded environment
    
    WHY DALL-E 3:
    - Best quality for educational visuals
    - Prompt understanding is superior
    - Supports detailed scene descriptions
    """
    
    def __init__(self):
        """Initialize with OpenAI client."""
        self._client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self._model = DALLE_MODEL
        self._size = DALLE_SIZE
        self._quality = DALLE_QUALITY
    
    def generate_image(
        self,
        prompt: str,
        output_path: str,
        size: Optional[str] = None,
        quality: Optional[str] = None
    ) -> dict:
        """
        Generate an image from a text prompt and save to disk.
        
        This method is SYNCHRONOUS - designed to be called from
        ThreadPoolExecutor via asyncio.to_thread() or loop.run_in_executor().
        
        Args:
            prompt: Descriptive text prompt for image generation
            output_path: Full path where image will be saved (e.g., /path/image.png)
            size: Image size override (default from env: 1024x1024)
            quality: Quality override (default from env: standard)
            
        Returns:
            dict with:
                - success: bool
                - output_path: str (path where image was saved)
                - revised_prompt: str (DALL-E's modified prompt)
                - model: str
                - size: str
                - quality: str
                - cost_usd: float (estimated cost)
                
        Raises:
            Does NOT raise - returns success=False on failure
        """
        use_size = size or self._size
        use_quality = quality or self._quality
        
        try:
            logger.info(f"Generating image: {prompt[:80]}...")
            
            # Ensure output directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Generate image using DALL-E 3 with base64 response
            response = self._client.images.generate(
                model=self._model,
                prompt=prompt,
                size=use_size,
                quality=use_quality,
                n=1,
                response_format="b64_json"
            )
            
            # Extract image data
            image_data = response.data[0]
            image_b64 = image_data.b64_json
            revised_prompt = image_data.revised_prompt or prompt
            
            # Decode and save
            image_bytes = base64.b64decode(image_b64)
            with open(output_path, "wb") as f:
                f.write(image_bytes)
            
            # Calculate cost
            cost = self._calculate_cost(use_size, use_quality)
            
            logger.info(
                f"Image saved: {output_path} "
                f"({len(image_bytes) / 1024:.0f} KB, ${cost:.4f})"
            )
            
            return {
                "success": True,
                "output_path": output_path,
                "revised_prompt": revised_prompt,
                "model": self._model,
                "size": use_size,
                "quality": use_quality,
                "file_size_bytes": len(image_bytes),
                "cost_usd": cost
            }
            
        except Exception as e:
            logger.error(f"Image generation failed: {e}")
            return {
                "success": False,
                "output_path": output_path,
                "error": str(e),
                "model": self._model,
                "size": use_size,
                "quality": use_quality,
                "cost_usd": 0.0
            }
    
    def _calculate_cost(self, size: str, quality: str) -> float:
        """
        Calculate cost for a DALL-E 3 image generation.
        
        Pricing (as of 2024):
        - Standard 1024x1024: $0.040
        - Standard 1024x1792 or 1792x1024: $0.080
        - HD 1024x1024: $0.080
        - HD 1024x1792 or 1792x1024: $0.120
        """
        pricing = {
            "standard": {
                "1024x1024": 0.040,
                "1024x1792": 0.080,
                "1792x1024": 0.080,
            },
            "hd": {
                "1024x1024": 0.080,
                "1024x1792": 0.120,
                "1792x1024": 0.120,
            }
        }
        
        quality_pricing = pricing.get(quality, pricing["standard"])
        return quality_pricing.get(size, 0.040)
