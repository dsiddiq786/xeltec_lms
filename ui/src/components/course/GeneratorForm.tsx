
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, CourseDocument } from '@/api/client';
import { JobStatusResponse, JobStatus } from '@/api/client'; // Assuming types exist or recreate
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'; // Use shadcn accordion
import { Progress } from '@/components/ui/progress';
import { Wand2, Loader2, CheckCircle, AlertCircle, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GeneratorFormProps {
    onJobStarted: (jobId: string) => void;
}

export function GeneratorForm({ onJobStarted }: GeneratorFormProps) {
    // State for form fields
    const [title, setTitle] = useState('');
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState('Beginner');
    const [duration, setDuration] = useState('30');

    // Advanced Settings
    const [levels, setLevels] = useState(3);
    const [modulesPerLevel, setModulesPerLevel] = useState(2);
    const [slidesPerModule, setSlidesPerModule] = useState(4);

    // New Features
    const [useModuleNames, setUseModuleNames] = useState(false);
    const [moduleNamesText, setModuleNamesText] = useState('');
    const [introSlides, setIntroSlides] = useState(false);

    const createJobMutation = useMutation({
        mutationFn: async () => {
            const moduleList = useModuleNames
                ? moduleNamesText.split('\n').map(s => s.trim()).filter(Boolean)
                : undefined;

            const payload = {
                course_title: title,
                category: topic,
                course_level: difficulty, // Now a string label
                target_course_duration_minutes: parseInt(duration),
                target_slide_duration_sec: 90, // default
                levels_count: levels,
                modules_per_level: modulesPerLevel,
                slides_per_module: slidesPerModule,

                // New fields
                module_names: moduleList,
                include_standard_intro_slides: introSlides
            };

            const response = await api.post('/api/course-generator/jobs', payload);
            return response.data;
        },
        onSuccess: (data) => {
            onJobStarted(data.job_id);
        },
        onError: (error) => {
            console.error("Job creation failed:", error);
            // Toast error here?
        }
    });

    return (
        <Card className="max-w-3xl mx-auto shadow-xl border-t-4 border-t-primary">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
                <CardTitle className="text-2xl flex items-center gap-2">
                    <Wand2 className="text-primary h-6 w-6" />
                    Create New Course
                </CardTitle>
                <p className="text-muted-foreground">
                    Configure your AI course generation parameters below.
                </p>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">

                {/* Main Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Course Title</Label>
                        <Input
                            id="title"
                            placeholder="e.g. Cybersecurity Fundamentals"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Topic / Category</Label>
                        <Input
                            id="category"
                            placeholder="e.g. IT Security"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="difficulty">Difficulty Level</Label>
                        <Select value={difficulty} onValueChange={setDifficulty}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Beginner">Beginner (Level 1)</SelectItem>
                                <SelectItem value="Intermediate">Intermediate (Level 2)</SelectItem>
                                <SelectItem value="Advanced">Advanced (Level 3)</SelectItem>
                                <SelectItem value="Expert">Expert (Level 4)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="duration">Total Duration (Minutes)</Label>
                        <div className="flex items-center gap-4">
                            <Input
                                id="duration"
                                type="number"
                                min={5}
                                max={480}
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                            />
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                                Est. {(levels * modulesPerLevel * slidesPerModule)} slides
                            </span>
                        </div>
                    </div>
                </div>

                {/* Intro Slides Checkbox */}
                <div className="flex items-start space-x-3 p-4 border rounded-md bg-muted/20">
                    <Checkbox
                        id="introSlides"
                        checked={introSlides}
                        onCheckedChange={(c) => setIntroSlides(c === true)}
                    />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="introSlides" className="font-semibold cursor-pointer">
                            Include Standard Intro Slides
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Adds "Title", "Learning Outcomes", and "Module Overview" slides to the start of the course.
                        </p>
                    </div>
                </div>

                {/* Module Names Toggle */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="useModuleNames"
                            checked={useModuleNames}
                            onCheckedChange={(c) => setUseModuleNames(c === true)}
                        />
                        <Label htmlFor="useModuleNames" className="cursor-pointer">Specify specific module names (Optional)</Label>
                    </div>

                    <AnimatePresence>
                        {useModuleNames && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden pl-6"
                            >
                                <Label className="mb-2 block text-xs text-muted-foreground">
                                    Enter one module title per line. The AI will use these first.
                                </Label>
                                <Textarea
                                    value={moduleNamesText}
                                    onChange={(e) => setModuleNamesText(e.target.value)}
                                    placeholder={`Introduction to ${topic}\nCore Concepts\nAdvanced Techniques...`}
                                    rows={5}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Advanced Accordion */}
                <Accordion type="single" collapsible className="w-full border rounded-md">
                    <AccordionItem value="structure" className="border-none">
                        <AccordionTrigger className="px-4 py-2 hover:bg-muted/50 text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Settings2 className="h-4 w-4" />
                                <span>Advanced Structure Settings</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-2">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">Levels</Label>
                                    <Input type="number" min={1} max={5} value={levels} onChange={e => setLevels(parseInt(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Modules / Level</Label>
                                    <Input type="number" min={1} max={10} value={modulesPerLevel} onChange={e => setModulesPerLevel(parseInt(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Slides / Module</Label>
                                    <Input type="number" min={1} max={15} value={slidesPerModule} onChange={e => setSlidesPerModule(parseInt(e.target.value))} />
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                <Button
                    className="w-full text-lg h-12 mt-4"
                    onClick={() => createJobMutation.mutate()}
                    disabled={createJobMutation.isPending || !title || !topic}
                >
                    {createJobMutation.isPending ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Initializing Generator...
                        </>
                    ) : (
                        <>
                            <Wand2 className="mr-2 h-5 w-5" />
                            Generate Course with AI
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
