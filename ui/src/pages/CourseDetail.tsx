
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Play, Pause, SkipBack, SkipForward, VolumeX, Volume2, Save, FileImage, FileAudio, Video, FileVideo, Eye, Edit3, Trash2, Plus, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast"
import { useCourseEditor } from "@/hooks/useCourseEditor";
import { Badge } from "@/components/ui/badge";

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

    if (isLoading) return <div className="p-8 text-center flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
    if (error || !course) return <div className="p-8 text-center text-red-500">Error loading course</div>;

    return (
        <div className="container mx-auto py-6 h-screen flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold truncate max-w-xl flex items-center gap-2">
                        {course.metadata.title}
                        <Badge variant="outline">{course.metadata.course_level}</Badge>
                    </h1>
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
    const { updateSlide, uploadImage, uploadVideo, uploadAudio, updateCourse } = useCourseEditor(course._id);

    // Find selected slide data
    const selectedSlideData = React.useMemo(() => {
        if (!selectedSlideId) return null;
        const [lIdx, mIdx, sIdx] = selectedSlideId.split('-').map(Number);
        const level = course.content.levels.find(l => l.level_order === lIdx);
        const module = level?.modules.find(m => m.module_order === mIdx);
        const slide = module?.slides[sIdx - 1]; // 0-indexed array vs 1-indexed ID
        return { level, module, slide, lIdx, mIdx, sIdx };
    }, [course, selectedSlideId]);

    // Local state for form fields
    const [formData, setFormData] = React.useState<Slide | null>(null);

    React.useEffect(() => {
        if (selectedSlideData?.slide) {
            setFormData(selectedSlideData.slide);
        }
    }, [selectedSlideData]);

    const handleSave = () => {
        if (!selectedSlideData || !formData) return;
        updateSlide.mutate({
            level_order: selectedSlideData.lIdx,
            module_order: selectedSlideData.mIdx,
            slide_index: selectedSlideData.sIdx,
            ...formData
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio' | 'video') => {
        if (e.target.files && e.target.files[0] && selectedSlideData) {
            const file = e.target.files[0];
            const args = {
                level: selectedSlideData.lIdx,
                module: selectedSlideData.mIdx,
                slide: selectedSlideData.sIdx,
                file
            };

            if (type === 'image') uploadImage.mutate(args);
            else if (type === 'video') uploadVideo.mutate(args);
            else if (type === 'audio') uploadAudio.mutate(args);
        }
    };

    // Helper to add new slide
    const handleAddSlide = (levelIndex: number, moduleIndex: number) => {
        const newCourse = JSON.parse(JSON.stringify(course.content)); // Deep copy
        const module = newCourse.levels[levelIndex].modules[moduleIndex];

        const newSlide: Slide = {
            slide_title: "New Slide",
            slide_text: "New slide content...",
            voiceover_script: "New slide voiceover...",
            visual_prompt: "Visual description...",
            estimated_duration_sec: 30,
            image_url: null,
            voiceover_audio_url: null,
            video_url: null,
            asset_type: 'image'
        };

        module.slides.push(newSlide);
        updateCourse.mutate({ course_content: newCourse });
    };

    // Helper to delete slide
    const handleDeleteSlide = (levelIndex: number, moduleIndex: number, slideIndex: number) => {
        if (!confirm("Are you sure you want to delete this slide?")) return;

        const newCourse = JSON.parse(JSON.stringify(course.content));
        const module = newCourse.levels[levelIndex].modules[moduleIndex];

        module.slides.splice(slideIndex, 1);

        // If empty, warn/prevent? For now allow empty modules or add guard
        if (module.slides.length === 0) {
            // Optional: prevent empty modules
        }

        updateCourse.mutate({ course_content: newCourse });
        setSelectedSlideId(null);
    };

    // Helper to move slide
    const handleMoveSlide = (levelIndex: number, moduleIndex: number, slideIndex: number, direction: 'up' | 'down') => {
        const newCourse = JSON.parse(JSON.stringify(course.content));
        const module = newCourse.levels[levelIndex].modules[moduleIndex];
        const slides = module.slides;

        if (direction === 'up') {
            if (slideIndex === 0) return;
            [slides[slideIndex], slides[slideIndex - 1]] = [slides[slideIndex - 1], slides[slideIndex]];
        } else {
            if (slideIndex === slides.length - 1) return;
            [slides[slideIndex], slides[slideIndex + 1]] = [slides[slideIndex + 1], slides[slideIndex]];
        }

        updateCourse.mutate({ course_content: newCourse });
    };

    return (
        <div className="grid grid-cols-12 gap-6 h-full">
            {/* Sidebar Tree */}
            <div className="col-span-3 border-r overflow-y-auto pr-4 h-full bg-muted/10 p-2 rounded-l-lg">
                <Accordion type="single" collapsible className="w-full">
                    {course.content.levels.map((level, lIdx) => (
                        <AccordionItem value={`level-${level.level_order}`} key={level.level_order}>
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline px-2 hover:bg-muted/50 rounded-md">
                                Level {level.level_order}: {level.level_title}
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="pl-2 space-y-2 pt-2">
                                    {level.modules.map((module, mIdx) => (
                                        <div key={module.module_order} className="mb-4">
                                            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase mb-1 px-2">
                                                <span>{module.module_title}</span>
                                                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); handleAddSlide(lIdx, mIdx); }}>
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <div className="space-y-1">
                                                {module.slides.map((slide, sIdx) => {
                                                    const id = `${level.level_order}-${module.module_order}-${sIdx + 1}`;
                                                    return (
                                                        <div key={sIdx} className="flex group relative">
                                                            <button
                                                                onClick={() => setSelectedSlideId(id)}
                                                                className={`flex-1 text-left text-sm p-2 rounded-md transition-colors truncate ${selectedSlideId === id
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : 'hover:bg-muted'
                                                                    }`}
                                                            >
                                                                <span className="font-mono opacity-50 mr-2">{sIdx + 1}.</span>
                                                                {slide.slide_title}
                                                            </button>

                                                            {/* Actions (visible on hover) */}
                                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md px-1 shadow-sm border">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleMoveSlide(lIdx, mIdx, sIdx, 'up'); }}
                                                                    className="p-1 hover:text-primary transition-opacity disabled:opacity-20"
                                                                    disabled={sIdx === 0}
                                                                    title="Move Up"
                                                                >
                                                                    <ArrowUp className="h-3 w-3" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleMoveSlide(lIdx, mIdx, sIdx, 'down'); }}
                                                                    className="p-1 hover:text-primary transition-opacity disabled:opacity-20"
                                                                    disabled={sIdx === module.slides.length - 1}
                                                                    title="Move Down"
                                                                >
                                                                    <ArrowDown className="h-3 w-3" />
                                                                </button>
                                                                <div className="w-px h-3 bg-border mx-0.5"></div>
                                                                <button
                                                                    className="p-1 hover:text-destructive transition-opacity"
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteSlide(lIdx, mIdx, sIdx); }}
                                                                    title="Delete Slide"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        </div>
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
            </div >

            {/* Editor Panel */}
            < div className="col-span-9 h-full overflow-y-auto pb-20 px-2" >
                {selectedSlideData && formData ? (
                    <Card className="h-full border-none shadow-none">
                        <CardHeader className="flex flex-row items-center justify-between px-0 pt-0">
                            <div>
                                <CardTitle className="text-xl">Edit Slide: {formData.slide_title}</CardTitle>
                                <CardDescription className="flex items-center gap-2">
                                    {selectedSlideData.level?.level_title} &gt; {selectedSlideData.module?.module_title}
                                </CardDescription>
                            </div>
                            <Button onClick={handleSave} disabled={updateSlide.isPending}>
                                <Save className="mr-2 h-4 w-4" /> Save Changes
                            </Button>
                        </CardHeader>
                        <CardContent className="px-0 space-y-6">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-6">
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
                                            className="min-h-[200px] font-mono text-sm leading-relaxed"
                                            value={formData.slide_text}
                                            onChange={e => setFormData({ ...formData, slide_text: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Voiceover Script</Label>
                                        <Textarea
                                            className="min-h-[100px]"
                                            value={formData.voiceover_script}
                                            onChange={e => setFormData({ ...formData, voiceover_script: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Media Configuration */}
                                <div className="space-y-6">
                                    {/* Asset Type Selector */}
                                    <Tabs value={formData.asset_type || "image"} onValueChange={(v: any) => setFormData({ ...formData, asset_type: v })}>
                                        <div className="flex justify-between items-center mb-2">
                                            <Label>Visual Asset</Label>
                                            <TabsList className="h-8">
                                                <TabsTrigger value="image" className="text-xs">Image</TabsTrigger>
                                                <TabsTrigger value="video" className="text-xs">Video</TabsTrigger>
                                            </TabsList>
                                        </div>

                                        <div className="border rounded-lg p-4 bg-muted/10 min-h-[300px] flex flex-col justify-between">
                                            <div className="flex-1 flex items-center justify-center bg-black/5 rounded overflow-hidden mb-4">
                                                {formData.asset_type === 'video' ? (
                                                    formData.video_url ? (
                                                        <video
                                                            src={getStaticUrl(formData.video_url)}
                                                            controls
                                                            className="max-h-[250px] w-full"
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center text-muted-foreground">
                                                            <Video className="h-10 w-10 mb-2 opacity-50" />
                                                            <span>No Video Uploaded</span>
                                                        </div>
                                                    )
                                                ) : (
                                                    formData.image_url ? (
                                                        <img
                                                            src={getStaticUrl(formData.image_url)}
                                                            className="max-h-[250px] object-contain"
                                                            alt="Slide Visual"
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center text-muted-foreground">
                                                            <FileImage className="h-10 w-10 mb-2 opacity-50" />
                                                            <span>No Image Generated</span>
                                                        </div>
                                                    )
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                {/* <Label className="text-xs text-muted-foreground">Replacement Source</Label> */}
                                                <div className="flex gap-2">
                                                    {formData.asset_type === 'video' ? (
                                                        <div className="w-full">
                                                            <Label htmlFor="video-upload" className="cursor-pointer flex items-center justify-center w-full h-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors">
                                                                <FileVideo className="h-4 w-4 mr-2" /> Upload Video (MP4)
                                                            </Label>
                                                            <Input id="video-upload" type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => handleFileChange(e, 'video')} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-full">
                                                            <Label htmlFor="image-upload" className="cursor-pointer flex items-center justify-center w-full h-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors">
                                                                <FileImage className="h-4 w-4 mr-2" /> Replace Image
                                                            </Label>
                                                            <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'image')} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Tabs>

                                    {/* Audio Section */}
                                    <div className="space-y-2">
                                        <Label>Audio Narration</Label>
                                        <div className="border rounded-lg p-3 bg-muted/10 flex items-center gap-3">
                                            {formData.voiceover_audio_url ? (
                                                <audio
                                                    controls
                                                    key={getStaticUrl(formData.voiceover_audio_url)}
                                                    className="h-8 w-full"
                                                >
                                                    <source src={getStaticUrl(formData.voiceover_audio_url)} type="audio/mpeg" />
                                                </audio>
                                            ) : (
                                                <span className="text-xs text-muted-foreground px-2">No Audio</span>
                                            )}
                                            <div className="shrink-0">
                                                <Label htmlFor="audio-upload" className="cursor-pointer flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Replace Audio">
                                                    <FileAudio className="h-4 w-4" />
                                                </Label>
                                                <Input id="audio-upload" type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileChange(e, 'audio')} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Visual Prompt Edit */}
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Original Visual Prompt (Reference)</Label>
                                        <Textarea
                                            value={formData.visual_prompt}
                                            onChange={e => setFormData({ ...formData, visual_prompt: e.target.value })}
                                            className="text-xs text-muted-foreground min-h-[80px]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/5 rounded-lg border-2 border-dashed border-muted">
                        <Edit3 className="h-12 w-12 mb-4 opacity-20" />
                        <p>Select a slide from the left to start editing</p>
                    </div>
                )
                }
            </div >
        </div >
    );
}

// ============================================================================
// PREVIEW COMPONENT
// ============================================================================

function CoursePreview({ course }: { course: CourseDocument }) {
    // Flatten slides logic
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
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [playbackRate, setPlaybackRate] = React.useState(1);
    const audioRef = React.useRef<HTMLAudioElement>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [muted, setMuted] = React.useState(false);

    const currentSlide = slides[currentIndex];
    const isVideo = currentSlide.asset_type === 'video' && currentSlide.video_url;

    // Reset media when slide changes
    React.useEffect(() => {
        if (audioRef.current && !isVideo) {
            audioRef.current.load();
            if (currentSlide.voiceover_audio_url) {
                audioRef.current.play().catch(() => { });
                setIsPlaying(true);
            } else {
                setIsPlaying(false);
            }
        }
    }, [currentIndex, currentSlide, isVideo]);

    React.useEffect(() => {
        if (audioRef.current) audioRef.current.playbackRate = playbackRate;
        if (videoRef.current) videoRef.current.playbackRate = playbackRate;
    }, [playbackRate]);

    // Sync video play state with button
    React.useEffect(() => {
        if (isVideo && videoRef.current) {
            if (isPlaying) videoRef.current.play().catch(() => { });
            else videoRef.current.pause();
        }
    }, [isPlaying, isVideo]);

    const handleNext = () => { if (currentIndex < slides.length - 1) setCurrentIndex(prev => prev + 1); };
    const handlePrev = () => { if (currentIndex > 0) setCurrentIndex(prev => prev - 1); };

    return (
        <div className="flex flex-col h-full bg-black text-white rounded-lg overflow-hidden shadow-2xl">
            {/* 50/50 Split */}
            <div className="flex-1 flex overflow-hidden">
                {/* Visual Half */}
                <div className="w-1/2 bg-gray-950 flex items-center justify-center relative border-r border-gray-900">
                    {isVideo ? (
                        <video
                            ref={videoRef}
                            src={getStaticUrl(currentSlide.video_url)}
                            className="w-full h-full object-contain"
                            muted={muted} // Muting video audio if using separate VO? Usually video has its own audio. 
                            // Assumption: Video slides use video audio, or VO audio. 
                            // Implementation: If video exists, play it. If VO exists, it plays in bg. 
                            // Ideally for video slide, VO might be silent or strictly bg music.
                            // Let's assume video has sound and we might want to mute it if VO is separate.
                            // For simplicity: Video plays its own sound.
                            onEnded={() => setIsPlaying(false)}
                        />
                    ) : (
                        currentSlide.image_url ? (
                            <img
                                src={getStaticUrl(currentSlide.image_url)}
                                alt="Visual"
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="flex flex-col items-center text-gray-600">
                                <Sparkles className="h-16 w-16 mb-4 opacity-20" />
                                <span>No Visual Content</span>
                            </div>
                        )
                    )}
                </div>

                {/* Content Half */}
                <div className="w-1/2 p-12 bg-gray-900 overflow-y-auto flex flex-col justify-center relative">
                    {/* Decorative bg gradient */}
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-blue-900/10 to-transparent pointer-events-none" />

                    <div className="relative z-10">
                        <div className="mb-6 flex items-center gap-2 text-xs tracking-widest text-blue-400 uppercase font-bold">
                            <span className="opacity-50">{currentSlide.levelTitle}</span>
                            <span>/</span>
                            <span>{currentSlide.moduleTitle}</span>
                        </div>
                        <h2 className="text-3xl font-bold mb-8 text-white leading-tight">{currentSlide.slide_title}</h2>
                        <div className="prose prose-invert max-w-none text-lg leading-relaxed text-gray-300">
                            <p className="whitespace-pre-wrap">{currentSlide.slide_text}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Audio Player (Only used if NOT video, or specific behavior) */}
            {!isVideo && (
                <audio
                    ref={audioRef}
                    src={getStaticUrl(currentSlide.voiceover_audio_url) || undefined}
                    muted={muted}
                    onEnded={() => setIsPlaying(false)}
                />
            )}

            {/* Controls Bar */}
            <div className="h-24 bg-gray-950 border-t border-gray-900 flex items-center justify-between px-8 z-20">
                <div className="flex items-center space-x-6">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 font-mono uppercase">Control</span>
                        <div className="flex items-center space-x-2 mt-1">
                            <Button variant="ghost" size="icon" onClick={() => setMuted(!muted)} className="text-gray-400 hover:text-white hover:bg-gray-800">
                                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                            </Button>
                            <div className="flex bg-gray-900 rounded-md p-0.5">
                                {[1, 1.25, 1.5].map(rate => (
                                    <button
                                        key={rate}
                                        onClick={() => setPlaybackRate(rate)}
                                        className={`text-[10px] px-2 py-1 rounded-sm font-bold transition-all ${playbackRate === rate ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        {rate}x
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-8">
                    <Button variant="ghost" size="icon" onClick={handlePrev} disabled={currentIndex === 0} className="text-gray-400 hover:text-white hover:bg-gray-800 transform hover:scale-110 transition-all">
                        <SkipBack className="h-8 w-8" />
                    </Button>
                    <Button
                        size="icon"
                        className="rounded-full h-16 w-16 bg-white text-black hover:bg-gray-200 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                        onClick={() => {
                            if (isVideo && videoRef.current) {
                                if (isPlaying) videoRef.current.pause();
                                else videoRef.current.play();
                            } else if (audioRef.current) {
                                if (isPlaying) audioRef.current.pause();
                                else audioRef.current.play();
                            }
                            setIsPlaying(!isPlaying);
                        }}
                    >
                        {isPlaying ? <Pause className="fill-current h-6 w-6" /> : <Play className="fill-current ml-1 h-6 w-6" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleNext} disabled={currentIndex === slides.length - 1} className="text-gray-400 hover:text-white hover:bg-gray-800 transform hover:scale-110 transition-all">
                        <SkipForward className="h-8 w-8" />
                    </Button>
                </div>

                <div className="flex flex-col items-end w-[150px]">
                    <span className="text-xs text-gray-500 font-mono uppercase">Progress</span>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                        {String(currentIndex + 1).padStart(2, '0')} <span className="text-gray-600">/</span> {String(slides.length).padStart(2, '0')}
                    </div>
                </div>
            </div>
        </div>
    );
}
