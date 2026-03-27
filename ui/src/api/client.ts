
import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Helper to fix static paths
export const getStaticUrl = (path: string | null) => {
    if (!path) return '';
    // Check if already absolute
    if (path.startsWith('http')) return path;

    // Backend returns "Generated_Courses/..." but static mount is "/static" mapping to "Generated_Courses"
    // So we need to strip "Generated_Courses/" from the path
    const cleanPath = path.replace(/^Generated_Courses[\/\\]/, '').replace(/\\/g, '/');

    let baseUrl = import.meta.env.VITE_API_URL;

    // Use empty string for relative paths in PROD if URL is not set, or localhost in DEV
    if (baseUrl === undefined || baseUrl === null) {
        baseUrl = import.meta.env.PROD ? '' : 'http://localhost:8000';
    }

    // Fix: If baseUrl is '/', make it empty to avoid '//static' which browsers interpret as "scheme-relative URL to domain 'static'"
    if (baseUrl === '/') {
        baseUrl = '';
    }

    // Strip trailing slash if present
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }

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
