
# =============================================================================
# Course Editor Controller - Content Management Endpoints
# =============================================================================
# Handles updates to existing courses.
# - Full course updates
# - Partial slide updates
# - Media uploads (Images/Audio)
# =============================================================================

import os
import shutil
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Body, Path
from pydantic import BaseModel, Field

from app.schemas.editor_schema import CourseUpdateRequest, SlideUpdateRequest, MediaUploadResponse
from app.schemas.course_schema import CourseDocument
from app.db.course_repository import CourseRepository
from app.services.file_storage_service import FileStorageService, sanitize_name

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/course-generator",
    tags=["Course Editor"]
)

# Helper for locating slides
def _get_slide_path_info(course_doc: CourseDocument, level_order: int, module_order: int, slide_index: int) -> dict:
    """Helper to find the slide object and construct its directory path."""
    content = course_doc.content
    
    # 1. Locate Level
    level = next((l for l in content.levels if l.level_order == level_order), None)
    if not level:
        raise HTTPException(
            status_code=404, 
            detail=f"Level {level_order} not found (Course has {len(content.levels)} levels)"
        )
    
    # 2. Locate Module
    module = next((m for m in level.modules if m.module_order == module_order), None)
    if not module:
        raise HTTPException(
            status_code=404,
            detail=f"Module {module_order} not found in Level {level_order}"
        )
    
    # 3. Locate Slide
    if slide_index < 1 or slide_index > len(module.slides):
        raise HTTPException(
            status_code=404,
            detail=f"Slide {slide_index} not found (Module has {len(module.slides)} slides)"
        )
    
    slide = module.slides[slide_index - 1]
    
    # 4. Construct Path
    # Using existing logic from FileStorageService to reconstruct paths
    # WARNING: This assumes folder names haven't changed drastically or are reconstructible
    # Ideally, we should store absolute paths in DB, but we store relative for portability.
    # We'll use the course output directory from metadata if available.
    
    course_dir = course_doc.output_directory
    if not course_dir or not os.path.exists(course_dir):
        # Fallback: try to reconstruct based on title/id
        # This is risky if title changed. Ideally we use the ID.
        # But for POC we assume output_directory is correct.
        error = f"Course directory not found: {course_dir}"
        logger.error(error)
        raise HTTPException(status_code=500, detail=error)

    storage = FileStorageService()
    slide_dir = storage.get_slide_directory(
        course_dir=course_dir,
        level_order=level.level_order,
        level_title=level.level_title,
        module_order=module.module_order,
        module_title=module.module_title,
        slide_index=slide_index,
        slide_title=slide.slide_title
    )
    
    return {
        "slide": slide,
        "slide_dir": slide_dir,
        "absolute_path": slide_dir
    }

# =============================================================================
# Update Endpoints
# =============================================================================

@router.put(
    "/courses/{course_id}",
    response_model=CourseDocument,
    summary="Update full course"
)
async def update_course(
    course_id: str,
    update_data: CourseUpdateRequest
):
    """Update the entire course content object."""
    repo = CourseRepository()
    existing_course = repo.get_by_id(course_id)
    
    if not existing_course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Update content
    existing_course.content = update_data.course_content
    
    # Update metadata if provided
    if update_data.metadata:
        # Pydantic v2 model_dump/copy
        meta_dict = existing_course.metadata.model_dump()
        meta_dict.update(update_data.metadata)
        # Re-validate
        # existing_course.metadata = CourseMetadata(**meta_dict) 
        # (Assuming metadata structure doesn't change much for now)
        pass

    # Save to DB
    repo.update(course_id, existing_course)
    
    return existing_course

@router.patch(
    "/courses/{course_id}/slides",
    summary="Update specific slide"
)
async def update_slide(
    course_id: str,
    patch_data: SlideUpdateRequest
):
    """Partial update of a slide's text fields."""
    repo = CourseRepository()
    course = repo.get_by_id(course_id)
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Find slide
    # Note: We implement custom search because we need to MODIFY the object in place
    found = False
    
    for level in course.content.levels:
        if level.level_order == patch_data.level_order:
            for module in level.modules:
                if module.module_order == patch_data.module_order:
                    if 1 <= patch_data.slide_index <= len(module.slides):
                        slide = module.slides[patch_data.slide_index - 1]
                        
                        # Apply updates
                        if patch_data.slide_title is not None:
                            slide.slide_title = patch_data.slide_title
                        if patch_data.slide_text is not None:
                            slide.slide_text = patch_data.slide_text
                        if patch_data.voiceover_script is not None:
                            slide.voiceover_script = patch_data.voiceover_script
                        if patch_data.visual_prompt is not None:
                            slide.visual_prompt = patch_data.visual_prompt
                        if patch_data.estimated_duration_sec is not None:
                            slide.estimated_duration_sec = patch_data.estimated_duration_sec
                        if patch_data.quiz_question is not None:
                            slide.quiz_question = patch_data.quiz_question
                        if patch_data.quiz_options is not None:
                            slide.quiz_options = patch_data.quiz_options
                        if patch_data.quiz_correct_index is not None:
                            slide.quiz_correct_index = patch_data.quiz_correct_index
                        if patch_data.quiz_explanation is not None:
                            slide.quiz_explanation = patch_data.quiz_explanation
                            
                        # Update slide content.json on disk as well?
                        # Ideally yes, to keep disk in sync with DB.
                        # For POC, we focus on DB as source of truth for UI.
                        
                        found = True
                    break
            break
            
    if not found:
         raise HTTPException(status_code=404, detail="Slide not found")

    repo.update(course_id, course)
    return {"status": "success", "message": "Slide updated"}

# =============================================================================
# Media Upload Endpoints
# =============================================================================

@router.post(
    "/courses/{course_id}/slides/image",
    response_model=MediaUploadResponse,
    summary="Upload/Replace slide image"
)
async def upload_slide_image(
    course_id: str = Path(...),
    level: int = Body(..., ge=1, embed=True),
    module: int = Body(..., ge=1, embed=True),
    slide: int = Body(..., ge=1, embed=True),
    file: UploadFile = File(...)
):
    """Upload a new image for a slide."""
    repo = CourseRepository()
    course = repo.get_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    # Validation
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Locate slide & directory
    info = _get_slide_path_info(course, level, module, slide)
    slide_obj = info["slide"]
    slide_dir = info["slide_dir"]
    
    # Save file
    # We rename it to ensure consistency, e.g., "image_uploaded.png" or overwrite "image.png"
    # Overwriting "image.png" is simplest for checking logic, but caching might be an issue.
    # Let's overwrite "image.png"
    filename = "image.png"
    file_path = os.path.join(slide_dir, filename)
    
    # Ensure directory exists
    os.makedirs(slide_dir, exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update DB relative path
    storage = FileStorageService()
    relative_path = storage.get_relative_path(file_path)
    
    slide_obj.image_url = relative_path
    repo.update(course_id, course)
    
    return MediaUploadResponse(
        slide_id=f"{level}-{module}-{slide}",
        media_type="image",
        url=relative_path
    )

@router.post(
    "/courses/{course_id}/slides/audio",
    response_model=MediaUploadResponse,
    summary="Upload/Replace slide audio"
)
async def upload_slide_audio(
    course_id: str = Path(...),
    level: int = Body(..., ge=1, embed=True),
    module: int = Body(..., ge=1, embed=True),
    slide: int = Body(..., ge=1, embed=True),
    file: UploadFile = File(...)
):
    """Upload a new audio file for a slide."""
    repo = CourseRepository()
    course = repo.get_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    # Validation
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be audio")

    # Locate slide & directory
    info = _get_slide_path_info(course, level, module, slide)
    slide_obj = info["slide"]
    slide_dir = info["slide_dir"]
    
    # Save file
    filename = "voiceover.mp3" # Force standard name for simplicity
    file_path = os.path.join(slide_dir, filename)
    
    os.makedirs(slide_dir, exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update DB relative path
    storage = FileStorageService()
    relative_path = storage.get_relative_path(file_path)
    
    slide_obj.voiceover_audio_url = relative_path
    repo.update(course_id, course)
    
    return MediaUploadResponse(
        slide_id=f"{level}-{module}-{slide}",
        media_type="audio",
        url=relative_path
    )

@router.post(
    "/courses/{course_id}/slides/video",
    response_model=MediaUploadResponse,
    summary="Upload/Replace slide video"
)
async def upload_slide_video(
    course_id: str = Path(...),
    level: int = Body(..., ge=1, embed=True),
    module: int = Body(..., ge=1, embed=True),
    slide: int = Body(..., ge=1, embed=True),
    file: UploadFile = File(...)
):
    """Upload a new video file for a slide."""
    repo = CourseRepository()
    course = repo.get_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    # Validation
    if not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")

    # Locate slide & directory
    info = _get_slide_path_info(course, level, module, slide)
    slide_obj = info["slide"]
    slide_dir = info["slide_dir"]
    
    # Save file
    filename = "video.mp4" # Force standard name
    file_path = os.path.join(slide_dir, filename)
    
    os.makedirs(slide_dir, exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update DB relative path
    storage = FileStorageService()
    relative_path = storage.get_relative_path(file_path)
    
    slide_obj.video_url = relative_path
    slide_obj.asset_type = "video"
    repo.update(course_id, course)
    
    return MediaUploadResponse(
        slide_id=f"{level}-{module}-{slide}",
        media_type="video",
        url=relative_path
    )


# =============================================================================
# Regeneration Endpoints
# =============================================================================

class RegenerateRequest(BaseModel):
    section: str = Field(..., description="Section type: 'slide', 'module', 'assessment', 'image', 'voiceover'")
    level_order: Optional[int] = None
    module_order: Optional[int] = None
    slide_index: Optional[int] = None
    prompt: Optional[str] = Field(None, description="Custom prompt for regeneration")


@router.post(
    "/courses/{course_id}/regenerate",
    summary="Regenerate a specific section of a course",
    description="Uses AI to regenerate a slide, module, assessment, or image with an optional custom prompt."
)
async def regenerate_section(course_id: str, req: RegenerateRequest):
    """Regenerate a specific part of the course using AI."""
    import openai
    client = openai.OpenAI()
    model = os.getenv("OPENAI_MODEL", "gpt-4o")

    repo = CourseRepository()
    course = repo.get_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    try:
        if req.section == "slide":
            return await _regenerate_slide(client, model, repo, course, req)
        elif req.section == "module":
            return await _regenerate_module(client, model, repo, course, req)
        elif req.section == "assessment":
            return await _regenerate_assessment(client, model, repo, course, req)
        elif req.section == "image":
            return await _regenerate_image(client, repo, course, req)
        elif req.section == "voiceover":
            return await _regenerate_voiceover(repo, course, req)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown section type: {req.section}")
    except openai.RateLimitError as e:
        raise HTTPException(status_code=429, detail=f"OpenAI rate limit: {str(e)[:200]}")
    except openai.APIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {str(e)[:200]}")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Regeneration failed: {e}")
        raise HTTPException(status_code=500, detail=str(e)[:300])


async def _regenerate_slide(client, model, repo, course, req):
    if not all([req.level_order, req.module_order, req.slide_index]):
        raise HTTPException(status_code=400, detail="level_order, module_order, slide_index required for slide regeneration")

    level = next((l for l in course.content.levels if l.level_order == req.level_order), None)
    if not level:
        raise HTTPException(status_code=404, detail=f"Level {req.level_order} not found")
    module = next((m for m in level.modules if m.module_order == req.module_order), None)
    if not module:
        raise HTTPException(status_code=404, detail=f"Module {req.module_order} not found")
    if req.slide_index < 1 or req.slide_index > len(module.slides):
        raise HTTPException(status_code=404, detail=f"Slide {req.slide_index} not found")

    slide = module.slides[req.slide_index - 1]
    context = f"Course: {course.course_title}\nLevel: {level.level_title}\nModule: {module.module_title}\nSlide: {slide.slide_title}"
    user_prompt = req.prompt or f"Regenerate the content for this slide with fresh, detailed educational content."

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": f"You are an expert course content writer. Regenerate the slide content. Context:\n{context}\n\nReturn JSON with fields: slide_title, slide_text, voiceover_script, visual_prompt"},
            {"role": "user", "content": user_prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.7,
    )

    import json
    data = json.loads(resp.choices[0].message.content)
    slide.slide_title = data.get("slide_title", slide.slide_title)
    slide.slide_text = data.get("slide_text", slide.slide_text)
    slide.voiceover_script = data.get("voiceover_script", slide.voiceover_script)
    slide.visual_prompt = data.get("visual_prompt", slide.visual_prompt)
    repo.update(course.id, course)

    return {"status": "regenerated", "section": "slide", "data": data}


async def _regenerate_module(client, model, repo, course, req):
    if not all([req.level_order, req.module_order]):
        raise HTTPException(status_code=400, detail="level_order and module_order required")

    level = next((l for l in course.content.levels if l.level_order == req.level_order), None)
    if not level:
        raise HTTPException(status_code=404, detail=f"Level {req.level_order} not found")
    module = next((m for m in level.modules if m.module_order == req.module_order), None)
    if not module:
        raise HTTPException(status_code=404, detail=f"Module {req.module_order} not found")

    context = f"Course: {course.course_title}\nLevel: {level.level_title}\nModule: {module.module_title}\nSlides count: {len(module.slides)}"
    user_prompt = req.prompt or f"Regenerate all slides for this module. Keep the same number of slides ({len(module.slides)})."

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": f"You are an expert course content writer. Regenerate the module slides. Context:\n{context}\n\nReturn JSON with field 'slides' as array. Each slide: {{slide_title, slide_text, voiceover_script, visual_prompt}}. Generate exactly {len(module.slides)} slides."},
            {"role": "user", "content": user_prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.7,
    )

    import json
    data = json.loads(resp.choices[0].message.content)
    new_slides = data.get("slides", [])

    for i, ns in enumerate(new_slides):
        if i < len(module.slides):
            module.slides[i].slide_title = ns.get("slide_title", module.slides[i].slide_title)
            module.slides[i].slide_text = ns.get("slide_text", module.slides[i].slide_text)
            module.slides[i].voiceover_script = ns.get("voiceover_script", module.slides[i].voiceover_script)
            module.slides[i].visual_prompt = ns.get("visual_prompt", module.slides[i].visual_prompt)

    repo.update(course.id, course)
    return {"status": "regenerated", "section": "module", "slides_updated": min(len(new_slides), len(module.slides))}


async def _regenerate_assessment(client, model, repo, course, req):
    context = f"Course: {course.course_title}\nLevels: {len(course.content.levels)}"
    module_topics = []
    for lv in course.content.levels:
        for md in lv.modules:
            module_topics.append(md.module_title)
    context += f"\nModule topics: {', '.join(module_topics)}"

    existing_count = len(course.content.assessment.questions) if course.content.assessment else 10
    user_prompt = req.prompt or f"Generate {existing_count} multiple-choice assessment questions covering all module topics."

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": f"You are an expert assessment writer. Generate assessment questions for this course. Context:\n{context}\n\nReturn JSON with field 'questions' as array. Each question: {{question, options (array of 4 strings), correct_answer (string matching one option), explanation}}. Generate exactly {existing_count} questions."},
            {"role": "user", "content": user_prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.7,
    )

    import json
    data = json.loads(resp.choices[0].message.content)
    new_questions = data.get("questions", [])

    if course.content.assessment and new_questions:
        course.content.assessment.questions = new_questions
        repo.update(course.id, course)

    return {"status": "regenerated", "section": "assessment", "questions_count": len(new_questions)}


async def _regenerate_image(client, repo, course, req):
    if not all([req.level_order, req.module_order, req.slide_index]):
        raise HTTPException(status_code=400, detail="level_order, module_order, slide_index required for image regeneration")

    level = next((l for l in course.content.levels if l.level_order == req.level_order), None)
    if not level:
        raise HTTPException(status_code=404, detail=f"Level {req.level_order} not found")
    module = next((m for m in level.modules if m.module_order == req.module_order), None)
    if not module:
        raise HTTPException(status_code=404, detail=f"Module {req.module_order} not found")
    if req.slide_index < 1 or req.slide_index > len(module.slides):
        raise HTTPException(status_code=404, detail=f"Slide {req.slide_index} not found")

    slide = module.slides[req.slide_index - 1]
    prompt = req.prompt or slide.visual_prompt or f"Educational illustration for: {slide.slide_title}"

    dalle_model = os.getenv("DALLE_MODEL", "dall-e-3")
    dalle_size = os.getenv("DALLE_SIZE", "1024x1024")

    resp = client.images.generate(model=dalle_model, prompt=prompt, size=dalle_size, quality="standard", n=1)
    image_url = resp.data[0].url

    # Download and save
    import httpx
    async with httpx.AsyncClient() as http_client:
        img_resp = await http_client.get(image_url)
        if img_resp.status_code == 200:
            course_dir = course.output_directory
            if course_dir and os.path.exists(course_dir):
                storage = FileStorageService()
                slide_dir = storage.get_slide_directory(
                    course_dir=course_dir, level_order=level.level_order,
                    level_title=level.level_title, module_order=module.module_order,
                    module_title=module.module_title, slide_index=req.slide_index,
                    slide_title=slide.slide_title
                )
                os.makedirs(slide_dir, exist_ok=True)
                file_path = os.path.join(slide_dir, "image.png")
                with open(file_path, "wb") as f:
                    f.write(img_resp.content)
                slide.image_url = storage.get_relative_path(file_path)
            else:
                slide.image_url = image_url

    repo.update(course.id, course)
    return {"status": "regenerated", "section": "image", "image_url": slide.image_url}


async def _regenerate_voiceover(repo, course, req):
    """Regenerate TTS audio for a specific slide."""
    if not all([req.level_order, req.module_order, req.slide_index]):
        raise HTTPException(status_code=400, detail="level_order, module_order, slide_index required for voiceover regeneration")

    level = next((l for l in course.content.levels if l.level_order == req.level_order), None)
    if not level:
        raise HTTPException(status_code=404, detail=f"Level {req.level_order} not found")
    module = next((m for m in level.modules if m.module_order == req.module_order), None)
    if not module:
        raise HTTPException(status_code=404, detail=f"Module {req.module_order} not found")
    if req.slide_index < 1 or req.slide_index > len(module.slides):
        raise HTTPException(status_code=404, detail=f"Slide {req.slide_index} not found")

    slide = module.slides[req.slide_index - 1]
    script = slide.voiceover_script
    if not script:
        raise HTTPException(status_code=400, detail="Slide has no voiceover script to generate audio from")

    from app.services.tts_service import TTSService
    tts = TTSService()

    course_dir = course.output_directory
    if not course_dir or not os.path.exists(course_dir):
        raise HTTPException(status_code=500, detail="Course directory not found")

    storage = FileStorageService()
    slide_dir = storage.get_slide_directory(
        course_dir=course_dir, level_order=level.level_order,
        level_title=level.level_title, module_order=module.module_order,
        module_title=module.module_title, slide_index=req.slide_index,
        slide_title=slide.slide_title
    )
    os.makedirs(slide_dir, exist_ok=True)
    voiceover_path = os.path.join(slide_dir, "voiceover.mp3")

    voice = req.prompt if req.prompt in {"alloy", "echo", "fable", "onyx", "nova", "shimmer"} else None
    result = tts.generate_speech(script, voiceover_path, voice=voice)

    if result.get("success"):
        slide.voiceover_audio_url = storage.get_relative_path(voiceover_path)
        repo.update(course.id, course)
        return {"status": "regenerated", "section": "voiceover", "audio_url": slide.voiceover_audio_url}
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "TTS generation failed"))


# =============================================================================
# Thumbnail Generation Endpoint
# =============================================================================

class ThumbnailGenerateRequest(BaseModel):
    prompt: Optional[str] = Field(None, description="Custom prompt for thumbnail generation")


@router.post(
    "/courses/{course_id}/generate-thumbnail",
    summary="Generate AI thumbnail for a course"
)
async def generate_thumbnail(course_id: str, req: ThumbnailGenerateRequest):
    """Generate a course thumbnail using DALL-E."""
    import openai

    repo = CourseRepository()
    course = repo.get_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    title = course.content.title if course.content else "Course"
    category = course.metadata.category if course.metadata else ""
    prompt = req.prompt or f"Professional course thumbnail for '{title}' ({category}). Modern, clean design with bold typography feel, suitable for an e-learning platform. No text in the image."

    dalle_model = os.getenv("DALLE_MODEL", "dall-e-3")
    client = openai.OpenAI()

    try:
        resp = client.images.generate(
            model=dalle_model, prompt=prompt,
            size="1792x1024", quality="standard", n=1
        )
        image_url = resp.data[0].url

        import httpx
        async with httpx.AsyncClient() as http_client:
            img_resp = await http_client.get(image_url)
            if img_resp.status_code == 200:
                course_dir = course.output_directory
                if course_dir and os.path.exists(course_dir):
                    file_path = os.path.join(course_dir, "thumbnail.png")
                    with open(file_path, "wb") as f:
                        f.write(img_resp.content)
                    storage = FileStorageService()
                    relative_path = storage.get_relative_path(file_path)
                    return {"status": "generated", "thumbnail_url": f"/static/{relative_path}"}

        return {"status": "generated", "thumbnail_url": image_url}

    except openai.RateLimitError as e:
        raise HTTPException(status_code=429, detail=f"Rate limit: {str(e)[:200]}")
    except openai.APIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {str(e)[:200]}")
    except Exception as e:
        logger.exception(f"Thumbnail generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e)[:300])
