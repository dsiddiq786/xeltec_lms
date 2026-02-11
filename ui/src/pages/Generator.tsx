
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, CourseDocument } from '@/api/client';
import { GeneratorForm } from '@/components/course/GeneratorForm';
import { JobProgressPanel } from '@/components/course/JobProgressPanel';
import { useNavigate } from 'react-router-dom';

export default function GeneratorPage() {
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleJobStarted = (jobId: string) => {
        setActiveJobId(jobId);
    };

    const handleComplete = (courseId: string) => {
        navigate(`/courses/${courseId}`);
    };

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Course Generator</h1>

            {!activeJobId ? (
                <GeneratorForm onJobStarted={handleJobStarted} />
            ) : (
                <JobProgressPanel jobId={activeJobId} onComplete={handleComplete} />
            )}
        </div>
    );
}
