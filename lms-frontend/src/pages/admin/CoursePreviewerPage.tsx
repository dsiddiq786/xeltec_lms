import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import {
    ArrowLeft, Pencil, Eye, EyeOff, Play, Pause, SkipBack, SkipForward,
    VolumeX, Volume2, Clock, BookOpen, DollarSign, Tag, Layers,
    CheckCircle, HelpCircle, Image as ImageIcon,
} from 'lucide-react';
import type { Course, CourseVersion } from '../../types';

function getStaticUrl(path: string | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const clean = path.replace(/^Generated_Courses[/\\]/, '').replace(/\\/g, '/');
    return `/static/${clean}`;
}

function normalizeSlides(snapshot: any) {
    if (!snapshot) return [];
    const flat: any[] = [];
    (snapshot.levels || []).forEach((l: any) => {
        const lt = l.title || l.level_title || '';
        (l.modules || []).forEach((m: any) => {
            const mt = m.title || m.module_title || '';
            (m.slides || []).forEach((s: any) => {
                flat.push({
                    slide_title: s.title || s.slide_title || 'Untitled',
                    slide_type: s.type || s.slide_type || 'content',
                    slide_text: s.text || s.content || s.slide_text || '',
                    image_url: s.image_url || null,
                    voiceover_audio_url: s.audio_url || s.voiceover_audio_url || null,
                    video_url: s.video_url || null,
                    voiceover_script: s.voiceover_script || '',
                    visual_prompt: s.visual_prompt || '',
                    asset_type: s.asset_type || 'image',
                    quiz_question: s.question || s.quiz_question || null,
                    quiz_options: s.options || s.quiz_options || null,
                    quiz_correct_index: s.correct_option ?? s.quiz_correct_index ?? null,
                    quiz_explanation: s.quiz_explanation || null,
                    levelTitle: lt,
                    moduleTitle: mt,
                });
            });
        });
    });
    return flat;
}

export function CoursePreviewerPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: course, isLoading } = useQuery<Course & { versions: CourseVersion[] }>({
        queryKey: ['admin-course-preview', courseId],
        queryFn: async () => {
            const { data } = await api.get(`/courses/${courseId}`);
            return data;
        },
        enabled: !!courseId,
    });

    const [selectedVersionIdx, setSelectedVersionIdx] = useState(0);
    const versions = course?.versions || [];
    const currentVersion = versions[selectedVersionIdx];
    const slides = useMemo(() => normalizeSlides(currentVersion?.content_snapshot), [currentVersion]);

    const togglePublishMut = useMutation({
        mutationFn: async () => {
            if (course?.is_published) {
                await api.post(`/courses/${courseId}/unpublish`);
            } else {
                if (!currentVersion) throw new Error('No version');
                await api.post(`/courses/${courseId}/publish`, { content_snapshot: currentVersion.content_snapshot });
            }
        },
        onSuccess: () => {
            toast.success(course?.is_published ? 'Course unpublished' : 'Course published');
            queryClient.invalidateQueries({ queryKey: ['admin-course-preview', courseId] });
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
    });

    const totalSlides = slides.length;
    const totalDuration = slides.reduce((s: number, sl: any) => s + (sl.estimated_duration_sec || 30), 0);
    const durationMin = Math.round(totalDuration / 60);
    const coursePrice = Number(course?.base_price) || 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[70vh]">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--bs-teal)', borderTopColor: 'transparent' }} />
            </div>
        );
    }

    if (!course) {
        return <div className="text-center py-16 text-gray-400">Course not found.</div>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-80px)]">
            {/* Header */}
            <div className="flex-shrink-0 mb-4">
                <button onClick={() => navigate('/admin/courses')} className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-2">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Courses
                </button>

                <div className="flex items-start gap-6">
                    {/* Thumbnail */}
                    <div className="w-48 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                        {course.thumbnail_url ? (
                            <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <BookOpen className="w-8 h-8" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 truncate">{course.title}</h1>
                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{course.description || 'No description'}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                <button
                                    onClick={() => navigate(`/admin/courses/${courseId}/edit`)}
                                    className="btn-lime inline-flex items-center gap-2 text-sm"
                                >
                                    <Pencil className="w-4 h-4" /> Edit Course
                                </button>
                                <button
                                    onClick={() => togglePublishMut.mutate()}
                                    disabled={togglePublishMut.isPending}
                                    className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-colors border ${
                                        course.is_published
                                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                            : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                    }`}
                                >
                                    {course.is_published ? <><EyeOff className="w-4 h-4" /> Unpublish</> : <><Eye className="w-4 h-4" /> Publish</>}
                                </button>
                            </div>
                        </div>

                        {/* Meta badges */}
                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                            {course.is_published ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                                    <CheckCircle className="w-3 h-3" /> Published
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">Draft</span>
                            )}
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <DollarSign className="w-3 h-3" /> {coursePrice > 0 ? `$${coursePrice.toFixed(2)}` : 'Free'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <BookOpen className="w-3 h-3" /> {totalSlides} slides
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" /> ~{durationMin} min
                            </span>
                            {course.category && (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                    <Tag className="w-3 h-3" /> {course.category}
                                </span>
                            )}
                            {course.difficulty_level && (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                    <Layers className="w-3 h-3" /> {course.difficulty_level}
                                </span>
                            )}
                            {versions.length > 0 && (
                                <select
                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                                    value={selectedVersionIdx}
                                    onChange={(e) => setSelectedVersionIdx(Number(e.target.value))}
                                >
                                    {versions.map((v, idx) => (
                                        <option key={v.id} value={idx}>Version {v.version_number}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Player */}
            <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200">
                {slides.length > 0 ? (
                    <SlidePlayer slides={slides} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <BookOpen className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm">No content in this version</p>
                        <button onClick={() => navigate(`/admin/courses/${courseId}/edit`)} className="mt-3 text-sm font-medium hover:underline" style={{ color: 'var(--bs-teal)' }}>
                            Open Editor
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ===========================================================================
// SLIDE PLAYER
// ===========================================================================

function SlidePlayer({ slides }: { slides: any[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [muted, setMuted] = useState(false);
    const [quizSelected, setQuizSelected] = useState<number | null>(null);
    const [quizRevealed, setQuizRevealed] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const slide = slides[currentIndex];
    const isQuiz = slide?.slide_type === 'quiz';
    const isVideo = !isQuiz && slide?.asset_type === 'video' && slide?.video_url;

    useEffect(() => {
        setIsPlaying(false);
        setQuizSelected(null);
        setQuizRevealed(false);
        if (!isQuiz && !isVideo && audioRef.current) {
            audioRef.current.load();
            if (slide?.voiceover_audio_url) {
                audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
        }
    }, [currentIndex]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.playbackRate = playbackRate;
        if (videoRef.current) videoRef.current.playbackRate = playbackRate;
    }, [playbackRate]);

    useEffect(() => {
        if (isVideo && videoRef.current) {
            if (isPlaying) videoRef.current.play().catch(() => {});
            else videoRef.current.pause();
        }
    }, [isPlaying, isVideo]);

    const handlePlayPause = () => {
        if (isQuiz) return;
        if (isVideo && videoRef.current) {
            isPlaying ? videoRef.current.pause() : videoRef.current.play();
        } else if (audioRef.current) {
            isPlaying ? audioRef.current.pause() : audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const prev = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };
    const next = () => {
        if (isQuiz && !quizRevealed) return;
        if (currentIndex < slides.length - 1) setCurrentIndex(currentIndex + 1);
    };

    const handleQuizAnswer = (idx: number) => {
        if (quizRevealed) return;
        setQuizSelected(idx);
        setQuizRevealed(true);
    };

    if (!slide) return null;

    return (
        <div className="flex flex-col h-full bg-gray-950 text-white">
            <div className="flex-1 flex overflow-hidden">
                {isQuiz ? (
                    <div className="w-full p-10 bg-gray-900 overflow-y-auto flex flex-col justify-center relative">
                        <div className="absolute inset-0 bg-gradient-to-bl from-amber-500/5 to-transparent pointer-events-none" />
                        <div className="relative z-10 max-w-2xl mx-auto w-full">
                            <div className="mb-5 flex items-center gap-2 text-[10px] tracking-widest uppercase font-bold" style={{ color: 'var(--bs-lime)' }}>
                                <span className="opacity-60">{slide.levelTitle}</span>
                                <span className="opacity-40">/</span>
                                <span>{slide.moduleTitle}</span>
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
                                <HelpCircle className="w-3.5 h-3.5" /> Module Check
                            </div>
                            {slide.slide_text && <p className="text-sm text-gray-400 mb-6">{slide.slide_text}</p>}
                            <h2 className="text-xl font-bold mb-8 text-white leading-tight">{slide.quiz_question}</h2>
                            <div className="space-y-3">
                                {(slide.quiz_options || []).map((opt: string, oi: number) => {
                                    const isCorrect = oi === (slide.quiz_correct_index ?? 0);
                                    const wasSelected = quizSelected === oi;
                                    let optClass = 'border-gray-700 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800 cursor-pointer';
                                    if (quizRevealed) {
                                        if (isCorrect) optClass = 'border-green-500 bg-green-500/10';
                                        else if (wasSelected) optClass = 'border-red-500 bg-red-500/10';
                                        else optClass = 'border-gray-800 bg-gray-800/30 opacity-50';
                                    }
                                    return (
                                        <button key={oi} onClick={() => handleQuizAnswer(oi)} disabled={quizRevealed} className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${optClass}`}>
                                            <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${quizRevealed && isCorrect ? 'bg-green-500 text-white' : quizRevealed && wasSelected ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
                                                {String.fromCharCode(65 + oi)}
                                            </span>
                                            <span className="text-sm text-gray-200">{opt}</span>
                                            {quizRevealed && isCorrect && <CheckCircle className="w-5 h-5 text-green-400 ml-auto flex-shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                            {quizRevealed && slide.quiz_explanation && (
                                <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                                    <p className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">Explanation</p>
                                    <p className="text-sm text-gray-300">{slide.quiz_explanation}</p>
                                </div>
                            )}
                            {quizRevealed && (
                                <button onClick={next} disabled={currentIndex === slides.length - 1} className="mt-6 px-6 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-40" style={{ background: 'var(--bs-teal)', color: 'white' }}>
                                    Continue &rarr;
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="w-1/2 bg-black flex items-center justify-center border-r border-gray-800">
                            {isVideo ? (
                                <video ref={videoRef} src={getStaticUrl(slide.video_url)} className="w-full h-full object-contain" muted={muted} onEnded={() => setIsPlaying(false)} />
                            ) : slide.image_url ? (
                                <img src={getStaticUrl(slide.image_url)} alt="Slide visual" className="w-full h-full object-contain" />
                            ) : (
                                <div className="text-center text-gray-600">
                                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p className="text-sm">No Visual Content</p>
                                </div>
                            )}
                        </div>
                        <div className="w-1/2 p-10 bg-gray-900 overflow-y-auto flex flex-col justify-center relative">
                            <div className="absolute inset-0 bg-gradient-to-bl from-[var(--bs-teal)]/5 to-transparent pointer-events-none" />
                            <div className="relative z-10">
                                <div className="mb-5 flex items-center gap-2 text-[10px] tracking-widest uppercase font-bold" style={{ color: 'var(--bs-lime)' }}>
                                    <span className="opacity-60">{slide.levelTitle}</span>
                                    <span className="opacity-40">/</span>
                                    <span>{slide.moduleTitle}</span>
                                </div>
                                <h2 className="text-2xl font-bold mb-6 text-white leading-tight">{slide.slide_title}</h2>
                                <div className="text-base leading-relaxed text-gray-300 whitespace-pre-wrap">{slide.slide_text}</div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {!isQuiz && !isVideo && (
                <audio ref={audioRef} src={getStaticUrl(slide.voiceover_audio_url) || undefined} muted={muted} onEnded={() => setIsPlaying(false)} />
            )}

            <div className="h-20 bg-gray-950 border-t border-gray-800 flex items-center justify-between px-8 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setMuted(!muted)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <div className="flex bg-gray-900 rounded-md p-0.5">
                        {[1, 1.25, 1.5].map((rate) => (
                            <button key={rate} onClick={() => setPlaybackRate(rate)} className={`px-2.5 py-1 text-[10px] font-bold rounded-sm transition-all ${playbackRate === rate ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`} style={playbackRate === rate ? { background: 'var(--bs-teal)' } : undefined}>
                                {rate}x
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={prev} disabled={currentIndex === 0} className="p-2 text-gray-400 hover:text-white disabled:opacity-20 transition-colors"><SkipBack className="w-6 h-6" /></button>
                    <button onClick={handlePlayPause} disabled={isQuiz} className="w-14 h-14 rounded-full bg-white text-gray-900 flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-40">
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <button onClick={next} disabled={currentIndex === slides.length - 1 || (isQuiz && !quizRevealed)} className="p-2 text-gray-400 hover:text-white disabled:opacity-20 transition-colors"><SkipForward className="w-6 h-6" /></button>
                </div>
                <div className="text-right w-[120px]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Progress</p>
                    <p className="text-xl font-bold font-mono text-white">
                        {String(currentIndex + 1).padStart(2, '0')} <span className="text-gray-600">/</span> {String(slides.length).padStart(2, '0')}
                    </p>
                </div>
            </div>
        </div>
    );
}
