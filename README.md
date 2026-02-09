# AI Course Generator

A clean, fast, scalable AI Course Generator backend in Python. This service generates full LMS-ready courses using OpenAI and stores them in MongoDB.

## Architecture Overview

This is the **FOUNDATION** of the LMS system. The architecture follows these principles:

- **Deterministic Generation**: AI follows strict system-owned constraints
- **Constraint-Driven**: Course structure (levels, modules, slides) is defined by the system, not AI
- **Agent-Ready**: Single orchestrator now, designed for future child-agent split
- **Clean Separation**: Controller → Agent → Services → Repository

```
/app
  /api
    course_generator_controller.py   # HTTP endpoints only
  /agent
    course_generation_agent.py       # Orchestration logic
  /services
    outline_service.py               # Generate course outline
    slide_content_service.py         # Generate slide content
    assessment_service.py            # Generate assessment questions
  /schemas
    request_schema.py                # Request validation schemas
    course_schema.py                 # Course data schemas
  /db
    nosql_client.py                  # MongoDB client singleton
    course_repository.py             # Database operations
  /utils
    duration.py                      # Duration calculations
    validators.py                    # Validation utilities
  main.py                            # FastAPI application entry
```

## Quick Start

### Prerequisites

- Python 3.11+
- MongoDB (local or Atlas)
- OpenAI API key

### Setup Instructions

1. **Create virtual environment:**
   ```bash
   python -m venv .venv
   ```

2. **Activate virtual environment:**
   
   Windows (PowerShell):
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
   
   Windows (CMD):
   ```cmd
   .venv\Scripts\activate.bat
   ```
   
   macOS/Linux:
   ```bash
   source .venv/bin/activate
   ```

3. **Install uv (faster package installer):**
   ```bash
   python -m pip install --upgrade uv
   ```

4. **Install dependencies using uv:**
   ```bash
   uv pip install -e .
   ```

5. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI API key and MongoDB URI
   ```

6. **Start MongoDB** (if running locally):
   ```bash
   mongod
   ```

7. **Run the application:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## API Usage

### Generate Course

**Endpoint:** `POST /api/course-generator/generate`

**Request Body:**
```json
{
  "course_title": "Introduction to Cybersecurity",
  "category": "Information Security",
  "course_level": "Beginner",
  "regulatory_context": "NIST Cybersecurity Framework",
  "target_course_duration_minutes": 60,
  "levels_count": 2,
  "modules_per_level": 2,
  "slides_per_module": 3,
  "target_slide_duration_sec": 120,
  "words_per_minute": 150,
  "pass_percentage": 85
}
```

**Response:** Complete course document with generated content.

### Health Check

**Endpoint:** `GET /health`

Returns service health status.

## Course Schema (LOCKED)

```json
{
  "_id": "ObjectId",
  "metadata": {
    "title": "string",
    "description": "string",
    "category": "string",
    "course_level": "string",
    "regulatory_context": "string",
    "version": 1,
    "created_at": "datetime"
  },
  "content": {
    "title": "string",
    "description": "string",
    "levels": [
      {
        "level_title": "string",
        "level_order": 1,
        "modules": [
          {
            "module_title": "string",
            "module_order": 1,
            "slides": [
              {
                "slide_title": "string",
                "slide_text": "string (long-form instructional)",
                "visual_prompt": "string",
                "voiceover_script": "string (natural narration)",
                "estimated_duration_sec": 120
              }
            ]
          }
        ]
      }
    ],
    "assessment": {
      "questions": [
        {
          "question": "string",
          "options": ["A", "B", "C", "D"],
          "correct_option_index": 0
        }
      ],
      "pass_percentage": 85
    }
  },
  "constraints": {
    "target_course_duration_minutes": 60,
    "levels_count": 2,
    "modules_per_level": 2,
    "slides_per_module": 3,
    "target_slide_duration_sec": 120,
    "words_per_minute": 150,
    "pass_percentage": 85
  }
}
```

## Content Rules (ENFORCED)

1. **Voiceover Word Count**: Must match `(target_slide_duration_sec / 60) * words_per_minute` ±10%
2. **Slide Text**: Long-form instructional content (not summaries)
3. **No Placeholders**: All content must be fully generated
4. **No Skipped Hierarchy**: Every level/module/slide must be populated
5. **Calculated Durations**: Based on actual word count, not guessed
6. **Assessment Alignment**: Questions must cover generated content

## Development

### Project Structure Rationale

- **Controller**: HTTP concerns only (routing, status codes)
- **Agent**: Orchestrates the generation pipeline
- **Services**: Individual generation steps (future child agents)
- **Repository**: Database abstraction for easy swap (MongoDB ↔ DynamoDB)
- **Schemas**: Pydantic models for validation and serialization

### Adding New Features

1. New generation step? Add a service in `/services`
2. New endpoint? Add to controller, delegate to agent
3. New validation? Add to `/utils/validators.py`
4. Schema change? Update `/schemas` (follow locked architecture)

## License

Proprietary - Xeltec LMS
