# =============================================================================
# TTS Service - OpenAI Text-to-Speech Generation
# =============================================================================
# Generates voiceover audio from text scripts using OpenAI's TTS API.
# Designed to run in ThreadPoolExecutor for parallel slide processing.
# Audio saved locally now, S3 migration planned for later.
# =============================================================================

import os
import logging
from typing import Optional

from openai import OpenAI

logger = logging.getLogger(__name__)

# Configuration
TTS_MODEL = os.getenv("TTS_MODEL", "tts-1")
TTS_VOICE = os.getenv("TTS_VOICE", "alloy")
TTS_RESPONSE_FORMAT = os.getenv("TTS_RESPONSE_FORMAT", "mp3")

# OpenAI TTS has a max input of 4096 characters per request
TTS_MAX_CHARS = 4096


class TTSService:
    """
    Service for generating speech from text using OpenAI's TTS API.
    
    WHY SYNC CLIENT:
    - Designed to run inside ThreadPoolExecutor
    - Each thread gets its own execution context
    - Simpler error handling in threaded environment
    
    VOICE OPTIONS:
    - alloy: Neutral, balanced
    - echo: Warm, conversational
    - fable: Expressive, storytelling
    - onyx: Deep, authoritative
    - nova: Friendly, upbeat
    - shimmer: Clear, gentle
    
    MODEL OPTIONS:
    - tts-1: Standard quality, lower latency
    - tts-1-hd: High definition, better quality
    """
    
    def __init__(self):
        """Initialize with OpenAI client."""
        self._client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self._model = TTS_MODEL
        self._voice = TTS_VOICE
        self._response_format = TTS_RESPONSE_FORMAT
    
    def generate_speech(
        self,
        text: str,
        output_path: str,
        voice: Optional[str] = None,
        model: Optional[str] = None
    ) -> dict:
        """
        Generate speech audio from text and save to disk.
        
        This method is SYNCHRONOUS - designed to be called from
        ThreadPoolExecutor via asyncio.to_thread() or loop.run_in_executor().
        
        Args:
            text: The text to convert to speech (max 4096 chars)
            output_path: Full path where audio will be saved (e.g., /path/voiceover.mp3)
            voice: Voice override (default from env: alloy)
            model: Model override (default from env: tts-1)
            
        Returns:
            dict with:
                - success: bool
                - output_path: str (path where audio was saved)
                - model: str
                - voice: str
                - character_count: int
                - file_size_bytes: int
                - cost_usd: float (estimated cost)
                
        Raises:
            Does NOT raise - returns success=False on failure
        """
        use_voice = voice or self._voice
        use_model = model or self._model
        
        try:
            # Truncate text if too long (OpenAI TTS limit)
            if len(text) > TTS_MAX_CHARS:
                logger.warning(
                    f"TTS text truncated from {len(text)} to {TTS_MAX_CHARS} chars"
                )
                text = text[:TTS_MAX_CHARS]
            
            char_count = len(text)
            logger.info(
                f"Generating TTS: {char_count} chars, "
                f"voice={use_voice}, model={use_model}"
            )
            
            # Ensure output directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Generate speech
            response = self._client.audio.speech.create(
                model=use_model,
                voice=use_voice,
                input=text,
                response_format=self._response_format
            )
            
            # Save to file
            audio_bytes = response.content
            with open(output_path, "wb") as f:
                f.write(audio_bytes)
            
            # Calculate cost
            cost = self._calculate_cost(char_count, use_model)
            
            logger.info(
                f"TTS saved: {output_path} "
                f"({len(audio_bytes) / 1024:.0f} KB, ${cost:.6f})"
            )
            
            return {
                "success": True,
                "output_path": output_path,
                "model": use_model,
                "voice": use_voice,
                "character_count": char_count,
                "file_size_bytes": len(audio_bytes),
                "cost_usd": cost
            }
            
        except Exception as e:
            logger.error(f"TTS generation failed: {e}")
            return {
                "success": False,
                "output_path": output_path,
                "error": str(e),
                "model": use_model,
                "voice": use_voice,
                "character_count": len(text),
                "cost_usd": 0.0
            }
    
    def _calculate_cost(self, character_count: int, model: str) -> float:
        """
        Calculate cost for TTS generation.
        
        Pricing (as of 2024):
        - tts-1: $15.00 / 1M characters
        - tts-1-hd: $30.00 / 1M characters
        """
        pricing_per_char = {
            "tts-1": 15.0 / 1_000_000,
            "tts-1-hd": 30.0 / 1_000_000,
        }
        
        cost_per_char = pricing_per_char.get(model, 15.0 / 1_000_000)
        return character_count * cost_per_char
