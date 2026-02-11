
import * as React from "react"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, CourseDocument, Slide, getStaticUrl } from '@/api/client';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area" // You might want this later
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Play, Pause, SkipBack, SkipForward, VolumeX, Volume2, Save, FileImage, FileAudio, Eye, Edit3 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast"

export default function CourseDetailPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const [activeTab, setActiveTab] = React.useState("editor");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: course, isLoading, error } = useQuery<CourseDocument>({
        queryKey: ['course', courseId],
        queryFn: async () => {
            const response = await api.get(`/api/course-generator/courses/${courseId}`);
            return response.data;
        },
        enabled: !!courseId,
    });

    if (isLoading) return <div className="p-8 text-center">Loading course...</div>;
    if (error || !course) return <div className="p-8 text-center text-red-500">Error loading course</div>;

    return (
        <div className="container mx-auto py-6 h-screen flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold truncate max-w-xl">{course.metadata.title}</h1>
                    <p className="text-sm text-muted-foreground">{course.metadata.description}</p>
                </div>
                <div className="flex space-x-2">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="editor"><Edit3 className="mr-2 h-4 w-4" /> Editor</TabsTrigger>
                            <TabsTrigger value="preview"><Eye className="mr-2 h-4 w-4" /> Preview</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {activeTab === 'editor' ? (
                    <CourseEditor course={course} />
                ) : (
                    <CoursePreview course={course} />
                )}
            </div>
        </div>
    );
}

// ============================================================================
// EDITOR COMPONENT
// ============================================================================

function CourseEditor({ course }: { course: CourseDocument }) {
    const [selectedSlideId, setSelectedSlideId] = React.useState<string | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Find selected slide data
    const selectedSlideData = React.useMemo(() => {
        if (!selectedSlideId) return null;
        const [lIdx, mIdx, sIdx] = selectedSlideId.split('-').map(Number);
        const level = course.content.levels.find(l => l.level_order === lIdx);
        const module = level?.modules.find(m => m.module_order === mIdx);
        const slide = module?.slides[sIdx - 1]; // 0-indexed array vs 1-indexed ID
        return { level, module, slide, lIdx, mIdx, sIdx };
    }, [course, selectedSlideId]);

    // Mutation for saving slide text
    const updateSlideTextMutation = useMutation({
        mutationFn: async (data: any) => {
            await api.patch(`/api/course-generator/courses/${course._id}/slides`, {
                level_order: data.level,
                module_order: data.module,
                slide_index: data.slide,
                ...data.updates
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course', course._id] });
            toast({ title: "Saved", description: "Slide updated successfully." });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
        }
    });

    // Mutation for uploading media
    const uploadMediaMutation = useMutation({
        mutationFn: async ({ file, type }: { file: File, type: 'image' | 'audio' }) => {
            if (!selectedSlideData) return;
            const formData = new FormData();
            formData.append('file', file);
            formData.append('level', String(selectedSlideData.lIdx));
            formData.append('module', String(selectedSlideData.mIdx));
            formData.append('slide', String(selectedSlideData.sIdx));

            const endpoint = `/api/course-generator/courses/${course._id}/slides/${type}`;
            await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course', course._id] });
            toast({ title: "Uploaded", description: "Media replaced successfully." });
        },
        onError: () => {
            toast({ title: "Error", description: "Upload failed.", variant: "destructive" });
        }
    });


    // Local state for form fields to avoid jitter
    const [formData, setFormData] = React.useState<Slide | null>(null);

    React.useEffect(() => {
        if (selectedSlideData?.slide) {
            setFormData(selectedSlideData.slide);
        }
    }, [selectedSlideData]);

    const handleSave = () => {
        if (!selectedSlideData || !formData) return;
        updateSlideTextMutation.mutate({
            level: selectedSlideData.lIdx,
            module: selectedSlideData.mIdx,
            slide: selectedSlideData.sIdx,
            updates: {
                slide_title: formData.slide_title,
                slide_text: formData.slide_text,
                voiceover_script: formData.voiceover_script,
                visual_prompt: formData.visual_prompt
            }
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio') => {
        if (e.target.files && e.target.files[0]) {
            uploadMediaMutation.mutate({ file: e.target.files[0], type });
        }
    };

    return (
        <div className="grid grid-cols-12 gap-6 h-full">
            {/* Sidebar Tree */}
            <div className="col-span-3 border-r overflow-y-auto pr-4 h-full">
                <Accordion type="single" collapsible className="w-full">
                    {course.content.levels.map((level) => (
                        <AccordionItem value={`level-${level.level_order}`} key={level.level_order}>
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                                Level {level.level_order}: {level.level_title}
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="pl-4 space-y-2">
                                    {level.modules.map(module => (
                                        <div key={module.module_order} className="mb-4">
                                            <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                                                {module.module_title}
                                            </div>
                                            <div className="space-y-1">
                                                {module.slides.map((slide, idx) => {
                                                    const id = `${level.level_order}-${module.module_order}-${idx + 1}`;
                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setSelectedSlideId(id)}
                                                            className={`w-full text-left text-sm p-2 rounded-md transition-colors ${selectedSlideId === id
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : 'hover:bg-muted'
                                                                }`}
                                                        >
                                                            {idx + 1}. {slide.slide_title}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>

            {/* Editor Panel */}
            <div className="col-span-9 h-full overflow-y-auto pb-20">
                {selectedSlideData && formData ? (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Edit Slide</CardTitle>
                                <CardDescription>{selectedSlideData.level?.level_title} &gt; {selectedSlideData.module?.module_title}</CardDescription>
                            </div>
                            <Button onClick={handleSave} disabled={updateSlideTextMutation.isPending}>
                                <Save className="mr-2 h-4 w-4" /> Save Changes
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Slide Title</Label>
                                        <Input
                                            value={formData.slide_title}
                                            onChange={e => setFormData({ ...formData, slide_title: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Slide Text (Markdown allowed)</Label>
                                        <Textarea
                                            className="min-h-[200px]"
                                            value={formData.slide_text}
                                            onChange={e => setFormData({ ...formData, slide_text: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Voiceover Script</Label>
                                        <Textarea
                                            value={formData.voiceover_script}
                                            onChange={e => setFormData({ ...formData, voiceover_script: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Visual Prompt</Label>
                                        <Textarea
                                            value={formData.visual_prompt}
                                            onChange={e => setFormData({ ...formData, visual_prompt: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Media Column */}
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>Visual</Label>
                                        <div className="border rounded-lg p-2 bg-muted/20">
                                            {formData.image_url ? (
                                                <img
                                                    src={getStaticUrl(formData.image_url)}
                                                    alt="Slide Visual"
                                                    className="w-full h-auto rounded-md object-cover max-h-[300px]"
                                                />
                                            ) : (
                                                <div className="h-[200px] flex items-center justify-center text-muted-foreground bg-muted">
                                                    No Image Generated
                                                </div>
                                            )}
                                            <div className="mt-2 flex items-center gap-2">
                                                <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'image')} className="cursor-pointer" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Audio</Label>
                                        <div className="border rounded-lg p-4 bg-muted/20">
                                            {formData.voiceover_audio_url ? (
                                                <audio
                                                    controls
                                                    key={getStaticUrl(formData.voiceover_audio_url)} // Force reload on url change
                                                    className="w-full"
                                                >
                                                    <source src={getStaticUrl(formData.voiceover_audio_url)} type="audio/mpeg" />
                                                    Your browser does not support the audio element.
                                                </audio>
                                            ) : (
                                                <div className="text-sm text-muted-foreground p-2 text-center">No Audio Generated</div>
                                            )}
                                            <div className="mt-2 flex items-center gap-2">
                                                <Input type="file" accept="audio/*" onChange={(e) => handleFileChange(e, 'audio')} className="cursor-pointer" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        Select a slide to edit
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// PREVIEW COMPONENT
// ============================================================================

function CoursePreview({ course }: { course: CourseDocument }) {
    // Flatten slides for linear navigation
    const slides = React.useMemo(() => {
        const flat: any[] = [];
        course.content.levels.forEach(l => {
            l.modules.forEach(m => {
                m.slides.forEach(s => {
                    flat.push({ ...s, levelTitle: l.level_title, moduleTitle: m.module_title });
                });
            });
        });
        return flat;
    }, [course]);

    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [isPlaying, setIsPlaying] = React.useState(false); // Auto-advance logic optional, mostly for audio
    const [playbackRate, setPlaybackRate] = React.useState(1);
    const audioRef = React.useRef<HTMLAudioElement>(null);
    const [muted, setMuted] = React.useState(false);

    const currentSlide = slides[currentIndex];

    // Reset audio when slide changes
    React.useEffect(() => {
        if (audioRef.current) {
            audioRef.current.load();
            if (currentSlide.voiceover_audio_url) {
                audioRef.current.play().catch(() => { }); // Autoplay might be blocked
                setIsPlaying(true);
            } else {
                setIsPlaying(false);
            }
        }
    }, [currentIndex, currentSlide]);

    React.useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };
    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black text-white rounded-lg overflow-hidden shadow-2xl">
            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Visual Half */}
                <div className="w-1/2 bg-gray-900 flex items-center justify-center relative">
                    {currentSlide.image_url ? (
                        <img
                            src={getStaticUrl(currentSlide.image_url)}
                            alt="Visual"
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="text-gray-500">No Visual</div>
                    )}
                </div>
                {/* Text Half */}
                <div className="w-1/2 p-12 bg-gray-800 overflow-y-auto flex flex-col justify-center">
                    <div className="mb-4 text-xs tracking-widest text-blue-400 uppercase font-bold">
                        {currentSlide.levelTitle} / {currentSlide.moduleTitle}
                    </div>
                    <h2 className="text-3xl font-bold mb-6 text-white">{currentSlide.slide_title}</h2>
                    <div className="prose prose-invert max-w-none text-lg leading-relaxed text-gray-300">
                        {/* Simple markdown rendering or just whitespace-pre-wrap */}
                        <p className="whitespace-pre-wrap">{currentSlide.slide_text}</p>
                    </div>
                </div>
            </div>

            {/* Hidden Audio Player */}
            <audio
                ref={audioRef}
                src={getStaticUrl(currentSlide.voiceover_audio_url) || undefined}
                muted={muted}
                onEnded={() => setIsPlaying(false)}
            />

            {/* Controls Bar */}
            <div className="h-20 bg-gray-900 border-t border-gray-800 flex items-center justify-between px-8">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => setMuted(!muted)} className="text-white hover:bg-gray-800">
                        {muted ? <VolumeX /> : <Volume2 />}
                    </Button>
                    <div className="flex space-x-1">
                        {[0.75, 1, 1.25, 1.5].map(rate => (
                            <button
                                key={rate}
                                onClick={() => setPlaybackRate(rate)}
                                className={`text-xs px-2 py-1 rounded ${playbackRate === rate ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                            >
                                {rate}x
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center space-x-6">
                    <Button variant="ghost" size="icon" onClick={handlePrev} disabled={currentIndex === 0} className="text-white hover:bg-gray-800">
                        <SkipBack className="h-6 w-6" />
                    </Button>
                    <Button
                        size="icon"
                        className="rounded-full h-12 w-12 bg-white text-black hover:bg-gray-200"
                        onClick={() => {
                            if (audioRef.current) {
                                if (isPlaying) audioRef.current.pause();
                                else audioRef.current.play();
                                setIsPlaying(!isPlaying);
                            }
                        }}
                    >
                        {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current ml-1" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleNext} disabled={currentIndex === slides.length - 1} className="text-white hover:bg-gray-800">
                        <SkipForward className="h-6 w-6" />
                    </Button>
                </div>

                <div className="text-sm text-gray-400 font-mono w-[150px] text-right">
                    Slide {currentIndex + 1} / {slides.length}
                </div>
            </div>
        </div>
    );
}
