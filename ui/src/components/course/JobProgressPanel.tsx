
import { useQuery } from '@tanstack/react-query';
import { api, JobStatusResponse } from '@/api/client';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface JobProgressPanelProps {
    jobId: string;
    onComplete: (courseId: string) => void;
}

export function JobProgressPanel({ jobId, onComplete }: JobProgressPanelProps) {
    const { data: job, error, isLoading } = useQuery<JobStatusResponse>({
        queryKey: ['job', jobId],
        queryFn: async () => {
            const response = await api.get(`/api/course-generator/jobs/${jobId}`);
            return response.data;
        },
        refetchInterval: (data) => {
            if (!data) return 1000;
            return ['completed', 'failed'].includes(data.state?.status || '') ? false : 2000;
        },
        enabled: !!jobId,
    });

    // Handle completion
    if (job?.status === 'completed' && job.course_id) {
        onComplete(job.course_id);
    }

    if (isLoading) return <div className="p-4 text-center">Loading job status...</div>;
    if (error) return <div className="p-4 text-red-500">Error loading job status</div>;
    if (!job) return null;

    const isCompleted = job.status === 'completed';
    const isFailed = job.status === 'failed';

    return (
        <Card className="w-full max-w-2xl mx-auto mt-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Generation Status: <span className="uppercase text-primary">{job.status}</span>
                </CardTitle>
                {job.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="text-2xl font-bold">{Math.round(job.progress.percentage)}%</div>
                    <Progress value={job.progress.percentage} className="w-full" />

                    <div className="text-xs text-muted-foreground">
                        {job.progress.current_step} ({job.progress.current_step_number}/{job.progress.total_steps})
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>Slides: {job.progress.slides_completed} / {job.progress.slides_total}</div>
                        {job.error_message && <div className="text-red-500 col-span-2">Error: {job.error_message}</div>}
                    </div>

                    {isCompleted && job.course_id && (
                        <div className="mt-4">
                            <p className="text-green-600 font-medium mb-2">Course Generated Successfully!</p>
                            <Button onClick={() => onComplete(job.course_id!)} className="w-full">
                                Open Course
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
