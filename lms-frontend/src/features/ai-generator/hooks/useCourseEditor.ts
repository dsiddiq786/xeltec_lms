import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

export interface SlideUpdateRequest {
    level_order: number;
    module_order: number;
    slide_index: number;
    slide_title?: string;
    slide_text?: string;
    voiceover_script?: string;
    visual_prompt?: string;
    estimated_duration_sec?: number;
    quiz_question?: string;
    quiz_options?: string[];
    quiz_correct_index?: number;
    quiz_explanation?: string;
}

interface MediaUploadArgs {
    level: number;
    module: number;
    slide: number;
    file: File;
}

interface RegenArgs {
    section: string;
    level_order?: number;
    module_order?: number;
    slide_index?: number;
    prompt?: string;
}

export function useCourseEditor(courseId: string) {
    const qc = useQueryClient();
    const key = ['ai-course', courseId];

    const updateCourse = useMutation({
        mutationFn: async (data: { course_content: any; metadata?: Record<string, any> }) => {
            const res = await api.put(`course-generator/courses/${courseId}`, data);
            return res.data;
        },
        onSuccess: (data) => {
            qc.setQueryData(key, data);
            toast.success('Course structure updated');
        },
        onError: () => toast.error('Failed to save course structure'),
    });

    const updateSlide = useMutation({
        mutationFn: async (data: SlideUpdateRequest) => {
            await api.patch(`course-generator/courses/${courseId}/slides`, data);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: key });
            toast.success('Slide saved');
        },
        onError: () => toast.error('Failed to update slide'),
    });

    const uploadImage = useMutation({
        mutationFn: async ({ level, module, slide, file }: MediaUploadArgs) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('level', String(level));
            fd.append('module', String(module));
            fd.append('slide', String(slide));
            const res = await api.post(`course-generator/courses/${courseId}/slides/image`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: key });
            toast.success('Image uploaded');
        },
        onError: () => toast.error('Image upload failed'),
    });

    const uploadVideo = useMutation({
        mutationFn: async ({ level, module, slide, file }: MediaUploadArgs) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('level', String(level));
            fd.append('module', String(module));
            fd.append('slide', String(slide));
            const res = await api.post(`course-generator/courses/${courseId}/slides/video`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: key });
            toast.success('Video uploaded');
        },
        onError: () => toast.error('Video upload failed'),
    });

    const uploadAudio = useMutation({
        mutationFn: async ({ level, module, slide, file }: MediaUploadArgs) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('level', String(level));
            fd.append('module', String(module));
            fd.append('slide', String(slide));
            const res = await api.post(`course-generator/courses/${courseId}/slides/audio`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: key });
            toast.success('Audio uploaded');
        },
        onError: () => toast.error('Audio upload failed'),
    });

    const regenerate = useMutation({
        mutationFn: async (args: RegenArgs) => {
            const res = await api.post(`course-generator/courses/${courseId}/regenerate`, args);
            return res.data;
        },
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: key });
            toast.success(`${data.section || 'Content'} regenerated`);
        },
        onError: (err: any) => {
            if (err?.response?.status === 429) {
                toast.error('OpenAI quota exceeded — check billing');
            } else {
                const d = err?.response?.data?.detail;
                toast.error(typeof d === 'string' ? d : d?.message || 'Regeneration failed');
            }
        },
    });

    return { updateCourse, updateSlide, uploadImage, uploadVideo, uploadAudio, regenerate };
}
