
import { api, CourseDocument, Slide } from '@/api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/components/ui/use-toast";

// Types corresponding to backend schemas
export interface CourseUpdateRequest {
    course_content: CourseDocument['content'];
    metadata?: Record<string, any>;
}

export interface SlideUpdateRequest {
    level_order: int;
    module_order: int;
    slide_index: int;

    slide_title?: string;
    slide_text?: string;
    voiceover_script?: string;
    visual_prompt?: string;
    estimated_duration_sec?: number;
}

export interface MediaUploadResponse {
    slide_id: string;
    media_type: string;
    url: string;
}

// React Hook for efficient updates
export function useCourseEditor(courseId: string) {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // 1. Full Course Update (for structure changes: add/delete/reorder slides)
    const updateCourseMutation = useMutation({
        mutationFn: async (data: CourseUpdateRequest) => {
            const res = await api.put<CourseDocument>(`/api/course-generator/courses/${courseId}`, data);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['course', courseId], data);
            toast({ title: "Saved", description: "Course structure updated." });
        },
        onError: (err) => {
            console.error(err);
            toast({ title: "Error", description: "Failed to save course structure.", variant: "destructive" });
        }
    });

    // 2. Partial Slide Update (for text edits)
    const updateSlideMutation = useMutation({
        mutationFn: async (data: SlideUpdateRequest) => {
            await api.patch(`/api/course-generator/courses/${courseId}/slides`, data);
        },
        onSuccess: () => {
            // Invalidate to refetch fresh data or update optimistically if we had ID
            queryClient.invalidateQueries({ queryKey: ['course', courseId] });
            toast({ title: "Saved", description: "Slide content updated." });
        },
        onError: (err) => {
            console.error(err);
            toast({ title: "Error", description: "Failed to update slide.", variant: "destructive" });
        }
    });

    // 3. Media Upload (Image)
    const uploadImageMutation = useMutation({
        mutationFn: async ({ level, module, slide, file }: { level: number, module: number, slide: number, file: File }) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('level', String(level));
            formData.append('module', String(module));
            formData.append('slide', String(slide));

            const res = await api.post<MediaUploadResponse>(
                `/api/course-generator/courses/${courseId}/slides/image`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course', courseId] });
            toast({ title: "Uploaded", description: "Image replaced successfully." });
        }
    });

    // 4. Media Upload (Video)
    const uploadVideoMutation = useMutation({
        mutationFn: async ({ level, module, slide, file }: { level: number, module: number, slide: number, file: File }) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('level', String(level));
            formData.append('module', String(module));
            formData.append('slide', String(slide));

            const res = await api.post<MediaUploadResponse>(
                `/api/course-generator/courses/${courseId}/slides/video`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course', courseId] });
            toast({ title: "Uploaded", description: "Video uploaded successfully." });
        }
    });

    // 5. Media Upload (Audio)
    const uploadAudioMutation = useMutation({
        mutationFn: async ({ level, module, slide, file }: { level: number, module: number, slide: number, file: File }) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('level', String(level));
            formData.append('module', String(module));
            formData.append('slide', String(slide));

            const res = await api.post<MediaUploadResponse>(
                `/api/course-generator/courses/${courseId}/slides/audio`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course', courseId] });
            toast({ title: "Uploaded", description: "Voiceover replaced successfully." });
        }
    });

    return {
        updateCourse: updateCourseMutation,
        updateSlide: updateSlideMutation,
        uploadImage: uploadImageMutation,
        uploadVideo: uploadVideoMutation,
        uploadAudio: uploadAudioMutation
    };
}
