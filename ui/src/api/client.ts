
import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Helper to fix static paths
export const getStaticUrl = (path: string | null) => {
    if (!path) return '';
    // Check if already absolute
    if (path.startsWith('http')) return path;
    // If no static prefix, assume it needs one
    // Backend returns "Generated_Courses/..." but static mount is "/static/Generated_Courses"
    // Actually wait, let's verify backend mount.
    // Backend Mount: app.mount("/static", StaticFiles(directory="Generated_Courses"), name="static")
    // Backend Return: "Generated_Courses/Title/Level/..." (relative to base dir)

    // So if backend returns "Generated_Courses/foo.png", we need "http://localhost:8000/static/foo.png" ???
    // Wait, backend mount serves "Generated_Courses" folder AS "/static".
    // So "/static/foo.png" maps to "Generated_Courses/foo.png".
    // But backend return includes "Generated_Courses/" prefix in the relative path?

    // Let's check FileStorageService.get_relative_path
    // return os.path.relpath(absolute_path, self._base_dir)
    // Base dir IS "Generated_Courses" root.
    // So relative path is just "Title/Level/..." (NO "Generated_Courses" prefix).

    // EXCEPT: create_course_directory uses course_dir_name = ...
    // os.path.join(self._base_dir, course_dir_name)
    // So relative path IS "Title_JobId/Level/..."

    // Therefore: URL = baseURL + "/static/" + relativePath

    // Handling both cases just to be safe
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const cleanPath = path.replace(/^Generated_Courses\//, '');
    return `${baseUrl}/static/${cleanPath}`;
};

export interface CourseGenerationRequest {
    course_title: string;
    category: string;
    course_level: string;
    regulatory_context: string;
    target_course_duration_minutes: number;
    target_slide_duration_sec: number;
    words_per_minute: number;
    levels_count: number;
    modules_per_level: number;
    slides_per_module: number;
    pass_percentage: number;
}

export interface JobStatusResponse {
    job_id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress: {
        current_step: string;
        total_steps: number;
        current_step_number: number;
        slides_completed: number;
        slides_total: number;
        percentage: number;
    };
    course_id: string | null;
    error_message: string | null;
}

export interface CourseDocument {
    _id: string;
    metadata: {
        title: string;
        description: string;
        created_at: string;
        category: string;
        course_level: string;
    };
    content: CourseContent;
}

export interface CourseContent {
    title: string;
    description: string;
    levels: CourseLevel[];
}

export interface CourseLevel {
    level_title: string;
    level_order: number;
    modules: CourseModule[];
}

export interface CourseModule {
    module_title: string;
    module_order: number;
    slides: Slide[];
}

export interface Slide {
    slide_title: string;
    slide_text: string;
    visual_prompt: string;
    voiceover_script: string;
    estimated_duration_sec: number;
    image_url: string | null;
    voiceover_audio_url: string | null;
    video_url?: string | null;
    asset_type?: 'image' | 'video';
}
