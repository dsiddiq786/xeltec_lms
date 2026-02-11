
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, CourseGenerationRequest } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

interface GeneratorFormProps {
    onJobStarted: (jobId: string) => void;
}

export function GeneratorForm({ onJobStarted }: GeneratorFormProps) {
    const { toast } = useToast();
    const [formData, setFormData] = useState<CourseGenerationRequest>({
        course_title: "Introduction to Cybersecurity",
        category: "Information Security",
        course_level: "Beginner",
        regulatory_context: "NIST Cybersecurity Framework",
        target_course_duration_minutes: 60,
        target_slide_duration_sec: 120,
        words_per_minute: 150,
        levels_count: 2,
        modules_per_level: 2,
        slides_per_module: 3,
        pass_percentage: 85
    });

    const mutation = useMutation({
        mutationFn: async (data: CourseGenerationRequest) => {
            const response = await api.post('/api/course-generator/jobs', data);
            return response.data;
        },
        onSuccess: (data) => {
            toast({
                title: "Generation Started",
                description: `Job ID: ${data.job_id}`,
            });
            onJobStarted(data.job_id);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.response?.data?.detail?.message || "Failed to start generation",
                variant: "destructive",
            });
        }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: e.target.type === 'number' ? Number(value) : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>AI Course Generator</CardTitle>
                <CardDescription>Enter constraints to generate a new LMS-ready course.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="course_title">Course Title</Label>
                            <Input id="course_title" name="course_title" value={formData.course_title} onChange={handleChange} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Input id="category" name="category" value={formData.category} onChange={handleChange} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="course_level">Level</Label>
                            <Input id="course_level" name="course_level" value={formData.course_level} onChange={handleChange} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="regulatory_context">Regulatory Context</Label>
                            <Input id="regulatory_context" name="regulatory_context" value={formData.regulatory_context} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="levels_count">Levels</Label>
                            <Input type="number" id="levels_count" name="levels_count" value={formData.levels_count} onChange={handleChange} min={1} max={10} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="modules_per_level">Modules/Level</Label>
                            <Input type="number" id="modules_per_level" name="modules_per_level" value={formData.modules_per_level} onChange={handleChange} min={1} max={10} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slides_per_module">Slides/Module</Label>
                            <Input type="number" id="slides_per_module" name="slides_per_module" value={formData.slides_per_module} onChange={handleChange} min={1} max={20} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="target_course_duration_minutes">Total Duration (min)</Label>
                            <Input type="number" id="target_course_duration_minutes" name="target_course_duration_minutes" value={formData.target_course_duration_minutes} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="target_slide_duration_sec">Slide Duration (sec)</Label>
                            <Input type="number" id="target_slide_duration_sec" name="target_slide_duration_sec" value={formData.target_slide_duration_sec} onChange={handleChange} />
                        </div>
                    </div>

                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={mutation.isPending}>
                        {mutation.isPending ? "Generating..." : "Generate Course"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
