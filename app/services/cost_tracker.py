# =============================================================================
# Cost Tracker - API Usage and Cost Tracking
# =============================================================================
# Tracks OpenAI API usage (tokens, images, TTS) and calculates costs.
# Provides per-slide and per-course cost breakdowns.
# =============================================================================

import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# =============================================================================
# Pricing Configuration (USD)
# =============================================================================
# These are approximate prices as of 2024. Update as needed.

TEXT_MODEL_PRICING = {
    # model_name: {"input": cost_per_token, "output": cost_per_token}
    "gpt-4-turbo": {
        "input": 10.0 / 1_000_000,
        "output": 30.0 / 1_000_000,
    },
    "gpt-4-turbo-preview": {
        "input": 10.0 / 1_000_000,
        "output": 30.0 / 1_000_000,
    },
    "gpt-4o": {
        "input": 2.50 / 1_000_000,
        "output": 10.0 / 1_000_000,
    },
    "gpt-4o-mini": {
        "input": 0.15 / 1_000_000,
        "output": 0.60 / 1_000_000,
    },
    "gpt-4": {
        "input": 30.0 / 1_000_000,
        "output": 60.0 / 1_000_000,
    },
}

IMAGE_MODEL_PRICING = {
    # model: {quality: {size: cost_per_image}}
    "dall-e-3": {
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
    },
    "dall-e-2": {
        "standard": {
            "256x256": 0.016,
            "512x512": 0.018,
            "1024x1024": 0.020,
        }
    }
}

TTS_MODEL_PRICING = {
    # model: cost_per_character
    "tts-1": 15.0 / 1_000_000,
    "tts-1-hd": 30.0 / 1_000_000,
}


class CostEntry:
    """Single cost entry for tracking."""
    
    def __init__(
        self,
        category: str,
        label: str,
        model: str,
        cost_usd: float,
        details: Optional[dict] = None
    ):
        self.category = category  # "text", "image", "tts"
        self.label = label        # "outline", "slide_1", "assessment", etc.
        self.model = model
        self.cost_usd = cost_usd
        self.details = details or {}
        self.timestamp = datetime.utcnow()
    
    def to_dict(self) -> dict:
        return {
            "category": self.category,
            "label": self.label,
            "model": self.model,
            "cost_usd": round(self.cost_usd, 6),
            "details": self.details,
            "timestamp": self.timestamp.isoformat()
        }


class CostTracker:
    """
    Tracks all API costs during course generation.
    
    WHY CENTRALIZED TRACKING:
    - Single source of truth for all costs
    - Per-slide and per-course breakdowns
    - Easy to export as JSON report
    - Supports cost budgeting in future
    
    USAGE:
    - Create one CostTracker per course generation
    - Pass to services that make API calls
    - Services call add_* methods after each API call
    - Get report at the end
    """
    
    def __init__(self):
        self._entries: list[CostEntry] = []
        self._text_tokens = {
            "total_prompt_tokens": 0,
            "total_completion_tokens": 0,
            "total_tokens": 0
        }
        self._image_count = 0
        self._tts_total_chars = 0
    
    # =========================================================================
    # Text Generation Cost Tracking
    # =========================================================================
    
    def add_text_generation(
        self,
        prompt_tokens: int,
        completion_tokens: int,
        model: str,
        label: str = "text_generation"
    ) -> float:
        """
        Track cost for a text generation API call.
        
        Args:
            prompt_tokens: Number of input tokens
            completion_tokens: Number of output tokens
            model: Model name (e.g., "gpt-4-turbo")
            label: Description (e.g., "outline", "slide_3", "assessment")
            
        Returns:
            Cost in USD for this call
        """
        pricing = TEXT_MODEL_PRICING.get(model, TEXT_MODEL_PRICING.get("gpt-4-turbo"))
        
        input_cost = prompt_tokens * pricing["input"]
        output_cost = completion_tokens * pricing["output"]
        total_cost = input_cost + output_cost
        
        # Update totals
        self._text_tokens["total_prompt_tokens"] += prompt_tokens
        self._text_tokens["total_completion_tokens"] += completion_tokens
        self._text_tokens["total_tokens"] += (prompt_tokens + completion_tokens)
        
        entry = CostEntry(
            category="text",
            label=label,
            model=model,
            cost_usd=total_cost,
            details={
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens,
                "input_cost_usd": round(input_cost, 6),
                "output_cost_usd": round(output_cost, 6),
            }
        )
        self._entries.append(entry)
        
        logger.debug(
            f"Cost tracked [{label}]: {prompt_tokens}+{completion_tokens} tokens = "
            f"${total_cost:.6f} ({model})"
        )
        
        return total_cost
    
    # =========================================================================
    # Image Generation Cost Tracking
    # =========================================================================
    
    def add_image_generation(
        self,
        model: str = "dall-e-3",
        size: str = "1024x1024",
        quality: str = "standard",
        label: str = "image_generation"
    ) -> float:
        """
        Track cost for an image generation API call.
        
        Args:
            model: DALL-E model name
            size: Image dimensions
            quality: "standard" or "hd"
            label: Description (e.g., "slide_3_image")
            
        Returns:
            Cost in USD for this call
        """
        model_pricing = IMAGE_MODEL_PRICING.get(model, {})
        quality_pricing = model_pricing.get(quality, {})
        cost = quality_pricing.get(size, 0.040)
        
        self._image_count += 1
        
        entry = CostEntry(
            category="image",
            label=label,
            model=model,
            cost_usd=cost,
            details={
                "size": size,
                "quality": quality,
                "image_number": self._image_count,
            }
        )
        self._entries.append(entry)
        
        logger.debug(f"Cost tracked [{label}]: image ${cost:.4f} ({model}, {quality}, {size})")
        
        return cost
    
    # =========================================================================
    # TTS Cost Tracking
    # =========================================================================
    
    def add_tts_generation(
        self,
        character_count: int,
        model: str = "tts-1",
        label: str = "tts_generation"
    ) -> float:
        """
        Track cost for a TTS API call.
        
        Args:
            character_count: Number of characters in input text
            model: TTS model name
            label: Description (e.g., "slide_3_tts")
            
        Returns:
            Cost in USD for this call
        """
        cost_per_char = TTS_MODEL_PRICING.get(model, 15.0 / 1_000_000)
        cost = character_count * cost_per_char
        
        self._tts_total_chars += character_count
        
        entry = CostEntry(
            category="tts",
            label=label,
            model=model,
            cost_usd=cost,
            details={
                "character_count": character_count,
                "cost_per_1m_chars": round(cost_per_char * 1_000_000, 2),
            }
        )
        self._entries.append(entry)
        
        logger.debug(f"Cost tracked [{label}]: {character_count} chars = ${cost:.6f} ({model})")
        
        return cost
    
    # =========================================================================
    # Cost Reports
    # =========================================================================
    
    def get_total_cost(self) -> float:
        """Get total cost across all categories."""
        return sum(e.cost_usd for e in self._entries)
    
    def get_cost_by_category(self) -> dict[str, float]:
        """Get cost breakdown by category."""
        costs = {"text": 0.0, "image": 0.0, "tts": 0.0}
        for entry in self._entries:
            costs[entry.category] = costs.get(entry.category, 0.0) + entry.cost_usd
        return {k: round(v, 6) for k, v in costs.items()}
    
    def get_slide_costs(self) -> dict[str, dict]:
        """
        Get cost breakdown per slide.
        
        Groups entries by slide label prefix.
        Returns dict of slide_label -> {text, image, tts, total}
        """
        slide_costs = {}
        
        for entry in self._entries:
            # Extract slide identifier from label
            label = entry.label
            slide_key = None
            
            if label.startswith("slide_"):
                # e.g., "slide_3_content", "slide_3_image", "slide_3_tts"
                parts = label.split("_")
                if len(parts) >= 2:
                    slide_key = f"slide_{parts[1]}"
            
            if slide_key:
                if slide_key not in slide_costs:
                    slide_costs[slide_key] = {
                        "text": 0.0,
                        "image": 0.0,
                        "tts": 0.0,
                        "total": 0.0
                    }
                slide_costs[slide_key][entry.category] += entry.cost_usd
                slide_costs[slide_key]["total"] += entry.cost_usd
        
        # Round values
        for slide_key in slide_costs:
            for k in slide_costs[slide_key]:
                slide_costs[slide_key][k] = round(slide_costs[slide_key][k], 6)
        
        return slide_costs
    
    def get_report(self) -> dict:
        """
        Generate comprehensive cost report.
        
        Returns:
            Complete cost breakdown with totals and per-entry details
        """
        category_costs = self.get_cost_by_category()
        slide_costs = self.get_slide_costs()
        
        return {
            "summary": {
                "total_cost_usd": round(self.get_total_cost(), 6),
                "text_generation_cost_usd": category_costs.get("text", 0.0),
                "image_generation_cost_usd": category_costs.get("image", 0.0),
                "tts_generation_cost_usd": category_costs.get("tts", 0.0),
            },
            "token_usage": {
                "total_prompt_tokens": self._text_tokens["total_prompt_tokens"],
                "total_completion_tokens": self._text_tokens["total_completion_tokens"],
                "total_tokens": self._text_tokens["total_tokens"],
            },
            "media_stats": {
                "images_generated": self._image_count,
                "tts_total_characters": self._tts_total_chars,
            },
            "per_slide_costs": slide_costs,
            "detailed_entries": [e.to_dict() for e in self._entries],
            "generated_at": datetime.utcnow().isoformat()
        }
