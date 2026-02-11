
import { api, JobStatusResponse } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, AlertCircle, Sparkles, Image as ImageIcon, FileText, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface JobProgressPanelProps {
    jobId: string;
    onComplete: (courseId: string) => void;
}

export function JobProgressPanel({ jobId, onComplete }: JobProgressPanelProps) {
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);

    const { data: job, isError } = useQuery<JobStatusResponse>({
        queryKey: ['job', jobId],
        queryFn: async () => {
            const res = await api.get(`/api/course-generator/jobs/${jobId}`);
            return res.data;
        },
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            return (status === 'completed' || status === 'failed') ? false : 2000;
        }
    });

    useEffect(() => {
        if (job) {
            // Animate progress smoothly
            setProgress(job.progress.percentage);

            // Add logs if step changes (simulated log for now based on step)
            if (job.progress.current_step && !logs.includes(job.progress.current_step)) {
                setLogs(prev => [job.progress.current_step, ...prev].slice(0, 5));
            }

            if (job.status === 'completed' && job.result?.course_id) {
                setTimeout(() => onComplete(job.result!.course_id), 1000);
            }
        }
    }, [job, onComplete, logs]);

    const steps = [
        { id: 1, label: 'Queued', icon: Loader2 },
        { id: 2, label: 'Structure', icon: FileText },
        { id: 3, label: 'Content', icon: Sparkles },
        { id: 4, label: 'Media', icon: ImageIcon },
        { id: 5, label: 'Done', icon: CheckCircle },
    ];

    // Determine active step index based on progress/status (heuristic)
    let activeStepIndex = 0;
    if (job?.status === 'queued') activeStepIndex = 0;
    else if (job?.progress.percentage < 20) activeStepIndex = 1;
    else if (job?.progress.percentage < 60) activeStepIndex = 2;
    else if (job?.progress.percentage < 90) activeStepIndex = 3;
    else if (job?.status === 'completed') activeStepIndex = 4;


    if (isError) {
        return (
            <Card className="border-destructive/50 bg-destructive/10">
                <CardContent className="pt-6 flex items-center gap-4 text-destructive">
                    <AlertCircle className="h-8 w-8" />
                    <div>
                        <h3 className="font-semibold">Generation Failed</h3>
                        <p className="text-sm">There was an error processing your request.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-2xl mx-auto overflow-hidden border-2 border-primary/20 shadow-lg">
            <div className="absolute top-0 left-0 w-full h-1 bg-muted">
                <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "easeInOut" }}
                />
            </div>

            <CardHeader className="text-center pb-2">
                <CardTitle className="flex justify-center items-center gap-2 text-xl">
                    {job?.status === 'completed' ? (
                        <CheckCircle className="text-green-500 h-6 w-6" />
                    ) : (
                        <Loader2 className="animate-spin text-primary h-6 w-6" />
                    )}
                    {job?.status === 'completed' ? 'Course Generated!' : 'Generating Course...'}
                </CardTitle>
                <CardDescription>
                    {job?.progress.current_step || 'Initializing worker...'}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-8">
                {/* Stepper */}
                <div className="flex justify-between relative px-4">
                    {/* Connecting Line */}
                    <div className="absolute top-4 left-0 w-full h-0.5 bg-muted -z-10" />

                    {steps.map((step, idx) => {
                        const isActive = idx === activeStepIndex;
                        const isCompleted = idx < activeStepIndex;
                        const Icon = step.icon;

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2 bg-background px-2">
                                <motion.div
                                    className={`
                                        h-8 w-8 rounded-full flex items-center justify-center border-2 
                                        ${isActive || isCompleted ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30 text-muted-foreground'}
                                    `}
                                    initial={false}
                                    animate={{
                                        scale: isActive ? 1.2 : 1,
                                        borderColor: isActive || isCompleted ? 'var(--primary)' : 'var(--muted)',
                                    }}
                                >
                                    {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                                </motion.div>
                                <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Logs Panel */}
                <div className="bg-muted/30 rounded-lg p-4 h-32 overflow-hidden relative font-mono text-xs text-muted-foreground">
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-gradient-to-b from-transparent via-transparent to-background/50" />
                    <AnimatePresence mode='popLayout'>
                        {logs.map((log, i) => (
                            <motion.div
                                key={`${log}-${i}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1 - (i * 0.2), x: 0 }}
                                exit={{ opacity: 0 }}
                                className="mb-1 truncate"
                            >
                                <span className="text-primary mr-2">➜</span>
                                {log}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </CardContent>
        </Card>
    );
}
