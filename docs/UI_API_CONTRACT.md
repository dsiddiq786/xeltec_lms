# UI API Integration Contract

## Overview

This document outlines the API contract for the **AI Course Generator** backend. The system uses a **job-based asynchronous architecture**.

### Base URL
`http://localhost:8000` (Development)

### Authentication
*Currently unauthenticated.*

---

## 1. Course Generation Workflow

### Flow Map
1. **User** fills form → **UI** POSTs to `/api/course-generator/jobs`
2. **UI** receives `job_id` → **UI** Polls `/api/course-generator/jobs/{job_id}` every 2-5s
3. **Backend** updates status (`queued` → `processing` → `completed`)
4. **UI** shows progress bar based on `progress.percentage` and `progress.current_step`
5. **Job Completes** → Response includes `course_id`
6. **UI** fetches full course from `/api/course-generator/courses/{course_id}`
7. **UI** renders course

---

## 2. API Endpoints

### 2.1 Start Course Generation
Create a new generation job.

- **Endpoint**: `POST /api/course-generator/jobs`
- **Content-Type**: `application/json`

#### Request Body (`CourseGenerationRequest`)
```json
{
  "course_title": "Introduction to Python",
  "category": "Software Engineering",
  "course_level": "Beginner",
  "regulatory_context": "None",
  "target_course_duration_minutes": 60,
  "target_slide_duration_sec": 120,
  "words_per_minute": 150,
  "levels_count": 3,
  "modules_per_level": 2,
  "slides_per_module": 3,
  "pass_percentage": 85
}
```

#### Response (`JobCreateResponse`)
```json
{
  "job_id": "65c3f...",
  "status": "queued",
  "message": "Job queued for processing",
  "queue_position": 1
}
```

### 2.2 Check Job Status (Polling)
Get the status of a running job. Use this for the progress bar.

- **Endpoint**: `GET /api/course-generator/jobs/{job_id}`

#### Response (`JobStatusResponse`)
```json
{
  "job_id": "65c3f...",
  "status": "processing",
  "progress": {
    "current_step": "Generating slide content",
    "total_steps": 5,
    "current_step_number": 2,
    "slides_completed": 4,
    "slides_total": 18,
    "percentage": 22.5
  },
  "course_title": "Introduction to Python",
  "course_id": null, 
  "error_message": null
}
```

**Status Values:**
- `queued`: Waiting for worker.
- `processing`: actively generating.
- `completed`: Finished. `course_id` is now populated.
- `failed`: Check `error_message`.

### 2.3 Get Draft Content (Optional)
Get partial content while the job is still running. Useful for "streaming" slides as they appear.

- **Endpoint**: `GET /api/course-generator/jobs/{job_id}/draft`

#### Response
Returns a partial `Course` object (see Schema below).

### 2.4 Get Complete Course
Fetch the final generated course.

- **Endpoint**: `GET /api/course-generator/courses/{course_id}`

#### Response (`CourseDocument`)
```json
{
  "_id": "65d2a...",
  "metadata": {
    "title": "Introduction to Python",
    "description": "A complete guide...",
    "created_at": "2024-02-11T12:00:00Z"
  },
  "content": { ... }, // See Course Schema
  "constraints": { ... },
  "generation_costs": { ... }
}
```

### 2.5 List Courses
- **Endpoint**: `GET /api/course-generator/courses?skip=0&limit=50`

---

## 3. Data Schemas

### 3.1 Course Schema (LOCKED)
The `content` field in the response follows this strict hierarchy.

```typescript
interface Course {
  title: string;
  description: string;
  levels: CourseLevel[];
  assessment: Assessment;
}

interface CourseLevel {
  level_title: string;
  level_order: number;
  modules: CourseModule[];
}

interface CourseModule {
  module_title: string;
  module_order: number;
  slides: Slide[];
}

interface Slide {
  slide_title: string;
  slide_text: string;           // Long-form instructional text
  visual_prompt: string;        // Prompt used for image generation
  voiceover_script: string;     // Script for TTS
  estimated_duration_sec: number;
  
  // Asset Paths (Critical)
  image_url: string | null;           // e.g., "Generated_Courses/Title_ID/Level_1.../image.png"
  voiceover_audio_url: string | null; // e.g., "Generated_Courses/Title_ID/Level_1.../voiceover.mp3"
}

interface Assessment {
  questions: AssessmentQuestion[];
  pass_percentage: number;
}

interface AssessmentQuestion {
  question: string;
  options: string[]; // [A, B, C, D]
  correct_option_index: number; // 0-3
}
```

---

## 4. Asset Handling & Storage

### Storage Location
- **Type**: Local Filesystem (currently).
- **Format**:
  - Images: `.png` (1024x1024)
  - Audio: `.mp3` (OpenAI TTS)
- **Path structure**: `Generated_Courses/{course_title}_{job_id}/Level_X/Module_Y/Slide_Z/{asset}`

### ⚠️ Critical Integration Note
The backend currently returns **relative file system paths** for `image_url` and `voiceover_audio_url`.
**The API does NOT currently serve these static files.**

**Action Required:**
1.  **Backend**: Must mount `StaticFiles` in `app/main.py` pointing to `Generated_Courses` directory.
    - Example: `app.mount("/static", StaticFiles(directory="Generated_Courses"), name="static")`
2.  **Frontend**: Must prepend the base URL to the paths returned by the API.
    - API returns: `Generated_Courses/MyCourse/image.png`
    - Frontend fetches: `http://localhost:8000/static/Generated_Courses/MyCourse/image.png` (path adjustment needed).

---

## 5. Missing / Future Endpoints

The following features were requested but are **NOT** currently implemented in the backend:

- **Update Course**: `PUT /courses/{id}` (No endpoint).
- **Update Slide**: `PATCH /courses/{id}/slides/{slide_id}` (No endpoint).
- **Replace Image**: Upload/replace slide image (No endpoint).
- **Replace Audio**: Upload/replace slide audio (No endpoint).

*The current system is "Generate & View" only.*
