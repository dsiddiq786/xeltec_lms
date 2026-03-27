import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import {
    ArrowRight, ChevronLeft, ChevronRight,
    Volume2, VolumeX, Menu, X, CheckCircle, Download, BookOpen,
    Lock, ArrowLeft, Loader2,
} from 'lucide-react';

function getStaticUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('/static/') || path.startsWith('/uploads/')) return path;
    const clean = path.replace(/^Generated_Courses[/\\]/, '').replace(/\\/g, '/');
    return `/static/${clean}`;
}

interface ProgressData {
    level_index: number;
    module_index: number;
    slide_index: number;
    progress_percentage: number;
}

interface LearningState {
    enrollment_id: string;
    status: string;
    strict_mode: boolean;
    progress: ProgressData;
    course_version: {
        content_snapshot: any;
        course?: { title: string };
    };
}

interface AssessmentQuestion {
    id: string;
    question: string;
    options: string[];
}

interface AttemptResult {
    id: string;
    score: number;
    passed: boolean;
    attempt_number: number;
    message: string;
}

type ViewMode = 'modules' | 'player' | 'assessment-intro' | 'assessment' | 'assessment-result';

export function CoursePlayer() {
    const { enrollmentId } = useParams<{ enrollmentId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const [viewMode, setViewMode] = useState<ViewMode>('modules');
    const [currentLevel, setCurrentLevel] = useState(0);
    const [currentModule, setCurrentModule] = useState(0);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showContentPanel, setShowContentPanel] = useState(false);
    const [slideUnlocked, setSlideUnlocked] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const DEFAULT_SLIDE_DURATION = 15;

    // Assessment state
    const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, number>>({});
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [lastResult, setLastResult] = useState<AttemptResult | null>(null);

    const { data: learningState, isLoading } = useQuery<LearningState>({
        queryKey: ['learning', enrollmentId],
        queryFn: async () => {
            const { data } = await api.get(`/learning/${enrollmentId}`);
            return data;
        },
    });

    const { data: questions } = useQuery<AssessmentQuestion[]>({
        queryKey: ['assessment-questions', enrollmentId],
        queryFn: async () => {
            const { data } = await api.get(`/learning/${enrollmentId}/assessment/questions`);
            return data;
        },
        enabled: viewMode === 'assessment' || viewMode === 'assessment-intro',
        retry: false,
    });

    const { data: attemptHistory } = useQuery<any[]>({
        queryKey: ['assessment-history', enrollmentId],
        queryFn: async () => {
            const { data } = await api.get(`/learning/${enrollmentId}/assessment/history`);
            return data;
        },
    });

    useEffect(() => {
        if (learningState?.progress) {
            setCurrentLevel(learningState.progress.level_index);
            setCurrentModule(learningState.progress.module_index);
            setCurrentSlide(learningState.progress.slide_index);
        }
    }, [learningState]);

    const progressMutation = useMutation({
        mutationFn: async (dto: { level_index: number; module_index: number; slide_index: number }) => {
            const { data } = await api.patch(`/learning/${enrollmentId}/progress`, dto);
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learning', enrollmentId] }),
    });

    const assessmentMutation = useMutation({
        mutationFn: async (answers: Array<{ question_id: string; selected_option: number }>) => {
            const { data } = await api.post(`/learning/${enrollmentId}/assessment`, { answers });
            return data as AttemptResult;
        },
        onSuccess: (data) => {
            setLastResult(data);
            setViewMode('assessment-result');
            queryClient.invalidateQueries({ queryKey: ['learning', enrollmentId] });
            queryClient.invalidateQueries({ queryKey: ['assessment-history', enrollmentId] });
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Assessment submission failed'),
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen" style={{ background: '#f8f9fa' }}>
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#035A51', borderTopColor: 'transparent' }} />
            </div>
        );
    }

    const snapshot = learningState?.course_version?.content_snapshot;
    const levels = snapshot?.levels || [];
    const courseTitle = learningState?.course_version?.course?.title || 'Course';
    const progressPct = learningState?.progress?.progress_percentage ?? 0;
    const isCompleted = learningState?.status === 'COMPLETED';
    const displayName = user?.first_name ? `${user.first_name} ${user.last_name}` : user?.email?.split('@')[0] || 'Learner';

    const allModules: { levelIdx: number; moduleIdx: number; title: string; slideCount: number }[] = [];
    levels.forEach((level: any, li: number) => {
        (level.modules || []).forEach((mod: any, mi: number) => {
            allModules.push({
                levelIdx: li, moduleIdx: mi,
                title: mod.title || `Module ${mi + 1}`,
                slideCount: mod.slides?.length || 0,
            });
        });
    });

    const currentLevelData = levels[currentLevel];
    const modules = currentLevelData?.modules || [];
    const currentModuleData = modules[currentModule];
    const slides = currentModuleData?.slides || [];
    const currentSlideData = slides[currentSlide];
    const totalSlides = allModules.reduce((sum, m) => sum + m.slideCount, 0) || 1;

    const maxLevel = learningState?.progress?.level_index ?? 0;
    const maxModule = learningState?.progress?.module_index ?? 0;
    const isModuleAccessible = (levelIdx: number, moduleIdx: number) => {
        if (!learningState?.strict_mode || isCompleted) return true;
        if (levelIdx < maxLevel) return true;
        if (levelIdx === maxLevel && moduleIdx <= maxModule) return true;
        return false;
    };

    const goToSlide = useCallback((level: number, module: number, slide: number) => {
        setCurrentLevel(level);
        setCurrentModule(module);
        setCurrentSlide(slide);
        setSlideUnlocked(false);
        setAudioProgress(0);
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        progressMutation.mutate({ level_index: level, module_index: module, slide_index: slide });
    }, [progressMutation]);

    const goNext = useCallback(() => {
        if (currentSlide < slides.length - 1) goToSlide(currentLevel, currentModule, currentSlide + 1);
        else if (currentModule < modules.length - 1) goToSlide(currentLevel, currentModule + 1, 0);
        else if (currentLevel < levels.length - 1) goToSlide(currentLevel + 1, 0, 0);
    }, [currentSlide, slides.length, currentModule, modules.length, currentLevel, levels.length, goToSlide]);

    const goPrev = useCallback(() => {
        if (currentSlide > 0) goToSlide(currentLevel, currentModule, currentSlide - 1);
        else if (currentModule > 0) {
            const prevModSlides = modules[currentModule - 1]?.slides || [];
            goToSlide(currentLevel, currentModule - 1, Math.max(0, prevModSlides.length - 1));
        } else if (currentLevel > 0) {
            const prevLevel = levels[currentLevel - 1];
            const prevMods = prevLevel?.modules || [];
            const lastMod = prevMods[prevMods.length - 1];
            goToSlide(currentLevel - 1, prevMods.length - 1, Math.max(0, (lastMod?.slides?.length || 1) - 1));
        }
    }, [currentSlide, currentModule, modules, currentLevel, levels, goToSlide]);

    // Audio management: play/stop audio when slide changes
    useEffect(() => {
        if (viewMode !== 'player') return;
        const audioUrl = getStaticUrl(currentSlideData?.audio_url);
        const slideDuration = (currentSlideData?.estimated_duration_sec || DEFAULT_SLIDE_DURATION) * 1000;
        const isStrict = learningState?.strict_mode && !isCompleted;
        const isQuiz = (currentSlideData?.type || currentSlideData?.slide_type) === 'quiz';

        if (isQuiz) { setSlideUnlocked(true); return; }

        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }

        if (!isStrict) { setSlideUnlocked(true); return; }

        setSlideUnlocked(false);
        setAudioProgress(0);

        if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.playbackRate = playbackSpeed;
            audio.muted = isMuted;
            audioRef.current = audio;

            audio.addEventListener('ended', () => setSlideUnlocked(true));
            audio.addEventListener('timeupdate', () => {
                if (audio.duration) setAudioProgress(Math.min(100, (audio.currentTime / audio.duration) * 100));
            });
            audio.addEventListener('error', () => {
                // If audio fails, fallback to timer
                timerRef.current = setTimeout(() => setSlideUnlocked(true), slideDuration);
            });
            audio.play().catch(() => {
                timerRef.current = setTimeout(() => setSlideUnlocked(true), slideDuration);
            });
        } else {
            // No audio: use estimated duration as timer
            const elapsed = { t: 0 };
            const interval = setInterval(() => {
                elapsed.t += 500;
                setAudioProgress(Math.min(100, (elapsed.t / slideDuration) * 100));
                if (elapsed.t >= slideDuration) { clearInterval(interval); setSlideUnlocked(true); }
            }, 500);
            timerRef.current = setTimeout(() => { clearInterval(interval); setSlideUnlocked(true); }, slideDuration);
        }

        return () => {
            if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
            if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        };
    }, [viewMode, currentLevel, currentModule, currentSlide]);

    // Sync mute/speed to playing audio
    useEffect(() => {
        if (audioRef.current) { audioRef.current.muted = isMuted; audioRef.current.playbackRate = playbackSpeed; }
    }, [isMuted, playbackSpeed]);

    const isFirstSlide = currentLevel === 0 && currentModule === 0 && currentSlide === 0;
    const isLastSlide = currentLevel === levels.length - 1 && currentModule === modules.length - 1 && currentSlide === slides.length - 1;

    const completedSteps = Math.floor((progressPct / 100) * (allModules.length || 1));

    const MODULES_LIST = allModules.length > 0 ? allModules : [
        { levelIdx: 0, moduleIdx: 0, title: 'Course Introduction', slideCount: 1 },
    ];

    // ═══ Shared sidebar + header ═══
    const Sidebar = () => (
        <aside className="w-[220px] flex flex-col flex-shrink-0" style={{ background: '#1a1f25' }}>
            <div className="px-5 py-5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black" style={{ background: '#035A51', color: '#fff' }}>b</div>
                <span className="text-base font-bold text-white">brick<span className="font-extrabold">Skill</span></span>
            </div>
            <nav className="flex-1 px-3 mt-1 space-y-0.5">
                <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-semibold" style={{ background: '#CBFF2A', color: '#1a1f25' }}>
                    <BookOpen className="w-[18px] h-[18px]" /> My Learning
                </button>
            </nav>
        </aside>
    );

    const Header = () => (
        <header className="h-16 flex items-center justify-between px-8 flex-shrink-0" style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
            <div>
                <div className="text-xs text-gray-400">Welcome</div>
                <div className="text-base font-bold text-gray-900">{displayName}</div>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: '#e0e0e0', color: '#616161' }}>
                {displayName.charAt(0).toUpperCase()}
            </div>
        </header>
    );

    const Footer = () => (
        <footer className="h-12 flex items-center justify-between px-8 flex-shrink-0 text-xs" style={{ background: '#1a1f25', color: '#757575' }}>
            <span>&copy; 2026 brickSkill All rights reserved.</span>
            <div className="flex gap-6">
                <span>FAQs</span><span>Privacy Policy</span><span>Terms &amp; Condition</span>
            </div>
        </footer>
    );

    /* ═══ VIEW: ASSESSMENT RESULT ═══ */
    if (viewMode === 'assessment-result' && lastResult) {
        return (
            <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1 flex flex-col">
                    <Header />
                    <main className="flex-1 p-8" style={{ background: '#f8f9fa' }}>
                        <div className="bg-white rounded-2xl p-8 border border-gray-100 max-w-lg mx-auto text-center">
                            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${lastResult.passed ? 'bg-green-50' : 'bg-red-50'}`}>
                                {lastResult.passed ? (
                                    <CheckCircle className="w-10 h-10 text-green-600" />
                                ) : (
                                    <X className="w-10 h-10 text-red-500" />
                                )}
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                {lastResult.passed ? 'Congratulations!' : 'Not Quite'}
                            </h1>
                            <p className="text-gray-500 mb-4">{lastResult.message}</p>
                            <div className="text-5xl font-black mb-2" style={{ color: lastResult.passed ? '#035A51' : '#f44336' }}>
                                {lastResult.score}%
                            </div>
                            <p className="text-sm text-gray-400 mb-6">Attempt #{lastResult.attempt_number}</p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setViewMode('modules')} className="px-6 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600">
                                    Back to Course
                                </button>
                                {!lastResult.passed && (
                                    <button onClick={() => { setViewMode('assessment-intro'); }} className="btn-lime">
                                        Try Again
                                    </button>
                                )}
                            </div>
                        </div>
                    </main>
                    <Footer />
                </div>
            </div>
        );
    }

    /* ═══ VIEW: ASSESSMENT MCQ ═══ */
    if (viewMode === 'assessment' && questions) {
        const q = questions[currentQuestionIdx];
        const totalQ = questions.length;
        const answered = Object.keys(assessmentAnswers).length;

        const handleSubmit = () => {
            const answersArray = Object.entries(assessmentAnswers).map(([question_id, selected_option]) => ({
                question_id, selected_option,
            }));
            assessmentMutation.mutate(answersArray);
        };

        return (
            <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1 flex flex-col">
                    <Header />
                    <main className="flex-1 p-8" style={{ background: '#f8f9fa' }}>
                        <div className="max-w-3xl mx-auto">
                            {/* Progress bar */}
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm text-gray-500">Question {currentQuestionIdx + 1} of {totalQ}</span>
                                <span className="text-sm text-gray-500">{answered}/{totalQ} answered</span>
                            </div>
                            <div className="flex gap-1 mb-6">
                                {questions.map((_, i) => (
                                    <div key={i} className="flex-1 h-1.5 rounded-full" style={{
                                        background: assessmentAnswers[questions[i].id] !== undefined ? '#035A51'
                                            : i === currentQuestionIdx ? '#CBFF2A' : '#e0e0e0',
                                    }} />
                                ))}
                            </div>

                            {q && (
                                <div className="bg-white rounded-2xl p-8 border border-gray-100">
                                    <h2 className="text-lg font-bold text-gray-900 mb-6">{q.question}</h2>
                                    <div className="space-y-3">
                                        {q.options.map((opt, idx) => {
                                            const isSelected = assessmentAnswers[q.id] === idx;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => setAssessmentAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all text-sm ${
                                                        isSelected
                                                            ? 'border-[#035A51] bg-[#f0faf8]'
                                                            : 'border-gray-100 hover:border-gray-200'
                                                    }`}
                                                >
                                                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full mr-3 text-xs font-bold ${
                                                        isSelected ? 'bg-[#035A51] text-white' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        {String.fromCharCode(65 + idx)}
                                                    </span>
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-6">
                                <button
                                    onClick={() => setCurrentQuestionIdx(Math.max(0, currentQuestionIdx - 1))}
                                    disabled={currentQuestionIdx === 0}
                                    className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-30"
                                >
                                    <ChevronLeft className="w-4 h-4 inline mr-1" /> Previous
                                </button>
                                {currentQuestionIdx < totalQ - 1 ? (
                                    <button
                                        onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                                        className="btn-lime"
                                    >
                                        Next <ChevronRight className="w-4 h-4 inline ml-1" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={answered < totalQ || assessmentMutation.isPending}
                                        className="btn-lime disabled:opacity-50"
                                    >
                                        {assessmentMutation.isPending ? 'Submitting...' : 'Submit Assessment'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </main>
                    <Footer />
                </div>
            </div>
        );
    }

    /* ═══ VIEW: ASSESSMENT INTRO ═══ */
    if (viewMode === 'assessment-intro') {
        const lastAttempt = attemptHistory?.[0];
        return (
            <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1 flex flex-col">
                    <Header />
                    <main className="flex-1 p-8" style={{ background: '#f8f9fa' }}>
                        <div className="bg-white rounded-2xl p-8 border border-gray-100 max-w-2xl">
                            <h1 className="text-xl font-bold text-gray-900 mb-5">Course Assessment</h1>
                            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 mb-6">
                                <li>You have chosen to take the assessment</li>
                                <li>You can exit the assessment at any time, then resume later</li>
                                <li>When you have completed the assessment you will be informed of your result immediately</li>
                                <li>You need <strong>70%</strong> to pass. Best of luck!</li>
                            </ul>

                            {lastAttempt && (
                                <div className="p-4 bg-gray-50 rounded-xl mb-6 text-sm">
                                    <span className="text-gray-500">Last attempt:</span>{' '}
                                    <span className={`font-semibold ${lastAttempt.passed ? 'text-green-600' : 'text-red-500'}`}>
                                        {lastAttempt.score}% — {lastAttempt.passed ? 'Passed' : 'Failed'}
                                    </span>
                                    <span className="text-gray-400 ml-2">(Attempt #{lastAttempt.attempt_number})</span>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button onClick={() => setViewMode('modules')} className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600">
                                    Back
                                </button>
                                <button
                                    onClick={() => {
                                        setAssessmentAnswers({});
                                        setCurrentQuestionIdx(0);
                                        setViewMode('assessment');
                                    }}
                                    className="btn-lime"
                                >
                                    Start Assessment <ArrowRight className="w-4 h-4 inline ml-1" />
                                </button>
                            </div>
                        </div>
                    </main>
                    <Footer />
                </div>
            </div>
        );
    }

    /* ═══ VIEW: MODULE LIST ═══ */
    if (viewMode === 'modules') {
        return (
            <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0">
                    <Header />
                    <main className="flex-1 p-8 overflow-y-auto" style={{ background: '#f8f9fa' }}>
                        <h1 className="text-xl font-bold text-gray-900 mb-3">{courseTitle}</h1>

                        <div className="p-3 bg-amber-50 rounded-lg mb-6 text-sm text-gray-600 leading-relaxed border border-amber-100">
                            Please complete each of the modules listed below. When a module has been completed, the status will change to 'Passed'.
                            You can still access each module once it has been completed by clicking 'Review'. When you have passed all of the modules,
                            you can then take the course assessment.
                        </div>

                        {isCompleted && (
                            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl mb-5 border border-green-100">
                                <span className="text-sm font-semibold text-green-700">You have completed this course.</span>
                                <button className="btn-lime inline-flex items-center gap-2" style={{ background: '#035A51', color: '#fff' }}>
                                    <Download className="w-4 h-4" /> Download Certificate
                                </button>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl p-6 border border-gray-100">
                            {/* Progress header */}
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-gray-400">{completedSteps} of {MODULES_LIST.length} steps completed</span>
                                <span className="text-sm font-semibold text-gray-900">{Math.round(progressPct)}%</span>
                            </div>
                            <div className="flex gap-1 mb-5">
                                {MODULES_LIST.map((_, i) => (
                                    <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i < completedSteps ? '#035A51' : '#e0e0e0' }} />
                                ))}
                            </div>

                            {/* Module rows */}
                            {MODULES_LIST.map((mod, i) => {
                                const isPassed = i < completedSteps;
                                const accessible = isModuleAccessible(mod.levelIdx, mod.moduleIdx);
                                return (
                                    <div key={i} className="flex items-center justify-between py-4" style={{ borderTop: i > 0 ? '1px solid #f5f5f5' : 'none' }}>
                                        <div className="flex items-center gap-3">
                                            {!accessible && <Lock className="w-4 h-4 text-gray-300" />}
                                            <span className={`text-sm font-medium ${accessible ? 'text-gray-900' : 'text-gray-400'}`}>{mod.title}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {isPassed ? (
                                                <span className="flex items-center gap-1.5 text-xs text-green-600">
                                                    <CheckCircle className="w-4 h-4" /> Passed
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">Not Passed</span>
                                            )}
                                            <button
                                                disabled={!accessible}
                                                onClick={() => {
                                                    setCurrentLevel(mod.levelIdx);
                                                    setCurrentModule(mod.moduleIdx);
                                                    setCurrentSlide(0);
                                                    setViewMode('player');
                                                }}
                                                className="btn-lime !py-2 !px-5 !text-xs disabled:opacity-30"
                                                style={isPassed ? { background: 'transparent', border: '1.5px solid #CBFF2A', color: '#035A51' } : {}}
                                            >
                                                {isPassed ? 'Review' : 'Start'} <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Assessment row */}
                            <div className="flex items-center justify-between py-4" style={{ borderTop: '1px solid #f5f5f5' }}>
                                <span className="text-sm font-medium text-gray-900">Course Assessment</span>
                                <div className="flex items-center gap-4">
                                    {isCompleted ? (
                                        <span className="flex items-center gap-1.5 text-xs text-green-600">
                                            <CheckCircle className="w-4 h-4" /> Passed
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400">{attemptHistory?.length ? `${attemptHistory.length} attempt(s)` : 'Not Taken'}</span>
                                    )}
                                    <button
                                        onClick={() => setViewMode('assessment-intro')}
                                        disabled={progressPct < 100 && learningState?.strict_mode && !isCompleted}
                                        className="btn-lime !py-2 !px-5 !text-xs disabled:opacity-30"
                                    >
                                        {isCompleted ? 'Review' : 'Start'} <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </main>
                    <Footer />
                </div>
            </div>
        );
    }

    /* ═══ VIEW: SLIDE PLAYER ═══ */
    const globalSlideIdx = (() => {
        let count = 0;
        for (let l = 0; l < levels.length; l++) {
            const mods = levels[l].modules || [];
            for (let m = 0; m < mods.length; m++) {
                const sCount = mods[m].slides?.length || 0;
                if (l === currentLevel && m === currentModule) return count + currentSlide + 1;
                count += sCount;
            }
        }
        return count + 1;
    })();

    const slideType = currentSlideData?.slide_type || currentSlideData?.type || 'content';

    return (
        <div className="h-screen flex flex-col" style={{ background: '#e8ede8' }}>
            {/* Slide Area */}
            <div className="flex-1 flex items-center justify-center p-6 relative">
                {/* Course content panel toggle */}
                <button
                    onClick={() => setShowContentPanel(!showContentPanel)}
                    className="absolute top-4 right-4 z-20 w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:shadow"
                >
                    <Menu className="w-5 h-5 text-gray-500" />
                </button>

                {/* Content Panel Overlay */}
                {showContentPanel && (
                    <div className="absolute top-4 right-4 z-30 w-72 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-50">
                            <div>
                                <div className="text-sm font-bold text-gray-900">Course Content</div>
                                <div className="text-xs text-gray-400">{MODULES_LIST.length} lessons</div>
                            </div>
                            <button onClick={() => setShowContentPanel(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {MODULES_LIST.map((mod, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        if (isModuleAccessible(mod.levelIdx, mod.moduleIdx)) {
                                            setCurrentLevel(mod.levelIdx);
                                            setCurrentModule(mod.moduleIdx);
                                            setCurrentSlide(0);
                                            setShowContentPanel(false);
                                        }
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm border-b border-gray-50 ${
                                        currentModule === mod.moduleIdx && currentLevel === mod.levelIdx
                                            ? 'bg-[#f0faf8] text-[#035A51] font-semibold' : 'text-gray-600'
                                    } ${!isModuleAccessible(mod.levelIdx, mod.moduleIdx) ? 'opacity-40' : ''}`}
                                >
                                    <span>Lesson {i + 1}</span>
                                    <span className="text-xs text-gray-400">{mod.slideCount} Slides</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Slide Card */}
                <div className="w-full max-w-[820px] rounded-2xl overflow-hidden bg-white shadow-lg">
                    {/* Exercise / MCQ slide type */}
                    {slideType === 'exercise' || slideType === 'mcq' || slideType === 'quiz' ? (
                        <ExerciseSlide
                            slide={currentSlideData}
                            onNext={goNext}
                            isLast={isLastSlide}
                        />
                    ) : currentSlide === 0 && currentModule === 0 && currentLevel === 0 ? (
                        /* Title slide */
                        <div className="h-[420px] relative flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a472a, #2d6a4f)' }}>
                            <div className="px-8 py-4 rounded-xl text-center" style={{ background: '#CBFF2A' }}>
                                <div className="text-xl font-bold" style={{ color: '#1a1f25' }}>{courseTitle}</div>
                                <div className="text-sm text-gray-700 mt-1">BrickSkill Training</div>
                            </div>
                            <SlideNav
                                onPrev={goPrev} onNext={goNext}
                                isFirst={isFirstSlide} isLast={isLastSlide}
                                current={globalSlideIdx} total={totalSlides}
                                locked={!slideUnlocked && learningState?.strict_mode && !isCompleted}
                            />
                        </div>
                    ) : (
                        /* Content slide — image left, text right */
                        <div className="flex min-h-[420px]">
                            <div className="w-[45%] relative overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)' }}>
                                {currentSlideData?.image_url ? (
                                    <img src={getStaticUrl(currentSlideData.image_url)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <BookOpen className="w-12 h-12 opacity-15" style={{ color: '#035A51' }} />
                                )}
                                <SlideNav
                                    onPrev={goPrev} onNext={goNext}
                                    isFirst={isFirstSlide} isLast={isLastSlide}
                                    current={globalSlideIdx} total={totalSlides}
                                    locked={!slideUnlocked && learningState?.strict_mode && !isCompleted}
                                    compact
                                />
                            </div>
                            <div className="flex-1 p-8 flex flex-col justify-center">
                                <h2 className="text-lg font-bold text-gray-900 mb-5">{currentSlideData?.title || 'Slide'}</h2>
                                <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{currentSlideData?.content || currentSlideData?.text || ''}</div>
                            </div>
                        </div>
                    )}

                    {/* Audio progress bar */}
                    {learningState?.strict_mode && !isCompleted && !slideUnlocked && slideType !== 'quiz' && (
                        <div className="h-1 bg-gray-100">
                            <div className="h-full bg-[#035A51] transition-all duration-300" style={{ width: `${audioProgress}%` }} />
                        </div>
                    )}

                    {/* Bottom Bar */}
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
                        <div>
                            <div className="text-sm font-semibold text-gray-900">{courseTitle}</div>
                            <div className="text-xs text-gray-400">Slide {globalSlideIdx}: {currentSlideData?.title || ''}</div>
                        </div>
                        <div className="flex items-center gap-4">
                            {!slideUnlocked && learningState?.strict_mode && !isCompleted && slideType !== 'quiz' && (
                                <span className="flex items-center gap-1.5 text-xs text-amber-600">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    {currentSlideData?.audio_url ? 'Listening...' : 'Please wait...'}
                                </span>
                            )}
                            <button onClick={() => setIsMuted(!isMuted)} className="text-gray-500 hover:text-gray-700">
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                            <div className="relative">
                                <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="text-sm font-semibold text-gray-500 hover:text-gray-700">
                                    {playbackSpeed}x
                                </button>
                                {showSpeedMenu && (
                                    <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg border border-gray-100 shadow-lg overflow-hidden min-w-[120px]">
                                        <div className="px-3 py-2 text-xs font-semibold text-gray-400 border-b border-gray-50">Playback Speed</div>
                                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                                            <button
                                                key={speed}
                                                onClick={() => { setPlaybackSpeed(speed); setShowSpeedMenu(false); }}
                                                className={`w-full px-3 py-2 text-left text-sm ${playbackSpeed === speed ? 'bg-[#f0faf8] text-[#035A51] font-semibold' : 'text-gray-600'}`}
                                            >
                                                {speed}x{speed === 1 ? ' (Normal)' : ''}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Back to modules */}
            <button
                onClick={() => setViewMode('modules')}
                className="fixed top-4 left-4 z-10 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-gray-200 shadow-sm text-sm text-gray-600 hover:shadow"
            >
                <ArrowLeft className="w-4 h-4" /> Back to modules
            </button>
        </div>
    );
}

/* ── Slide Navigation Overlay ── */
function SlideNav({ onPrev, onNext, isFirst, isLast, current, total, compact, locked }: {
    onPrev: () => void; onNext: () => void;
    isFirst: boolean; isLast: boolean;
    current: number; total: number;
    compact?: boolean;
    locked?: boolean;
}) {
    const py = compact ? 'py-1.5 px-3 text-xs' : 'py-2 px-4 text-sm';
    return (
        <>
            <button onClick={onPrev} disabled={isFirst} className={`absolute left-3 bottom-3 flex items-center gap-1 ${py} rounded-lg bg-white/90 border-none cursor-pointer disabled:opacity-30`}>
                <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: '#CBFF2A', color: '#1a1f25' }}>
                {current} / {total}
            </div>
            {locked ? (
                <div className={`absolute right-3 bottom-3 flex items-center gap-1 ${py} rounded-lg bg-gray-200/80 text-gray-400 cursor-not-allowed`}>
                    <Lock className="w-3.5 h-3.5" /> Complete slide
                </div>
            ) : (
                <button onClick={onNext} disabled={isLast} className={`absolute right-3 bottom-3 flex items-center gap-1 ${py} rounded-lg bg-white/90 border-none cursor-pointer disabled:opacity-30`}>
                    Next <ChevronRight className="w-4 h-4" />
                </button>
            )}
        </>
    );
}

/* ── Exercise / MCQ Inline Slide ── */
function ExerciseSlide({ slide, onNext, isLast }: { slide: any; onNext: () => void; isLast: boolean }) {
    const [selected, setSelected] = useState<number | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const question = slide?.quiz_question || slide?.question || slide?.title || 'Question';
    const options: string[] = slide?.quiz_options || slide?.options || ['Option A', 'Option B', 'Option C', 'Option D'];
    const correctIdx: number = slide?.quiz_correct_index ?? slide?.correct_option ?? 0;
    const explanation: string = slide?.quiz_explanation || '';
    const isCorrect = selected === correctIdx;

    const contextText = slide?.slide_text;

    return (
        <div className="p-8 min-h-[420px] flex flex-col">
            {contextText && <p className="text-sm text-gray-500 mb-3">{contextText}</p>}
            <h2 className="text-lg font-bold text-gray-900 mb-6">{question}</h2>
            <div className="space-y-3 flex-1">
                {options.map((opt: string, idx: number) => {
                    let borderColor = 'border-gray-100';
                    let bg = '';
                    if (submitted && idx === correctIdx) { borderColor = 'border-green-500'; bg = 'bg-green-50'; }
                    else if (submitted && idx === selected && !isCorrect) { borderColor = 'border-red-400'; bg = 'bg-red-50'; }
                    else if (selected === idx && !submitted) { borderColor = 'border-[#035A51]'; bg = 'bg-[#f0faf8]'; }

                    return (
                        <button
                            key={idx}
                            onClick={() => { if (!submitted) setSelected(idx); }}
                            className={`w-full text-left p-4 rounded-xl border-2 text-sm transition-all ${borderColor} ${bg}`}
                        >
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full mr-3 text-xs font-bold ${
                                selected === idx ? 'bg-[#035A51] text-white' : 'bg-gray-100 text-gray-500'
                            }`}>{String.fromCharCode(65 + idx)}</span>
                            {opt}
                        </button>
                    );
                })}
            </div>

            {submitted && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {isCorrect ? 'Correct!' : `Incorrect. The correct answer is ${String.fromCharCode(65 + correctIdx)}.`}
                    {explanation && <p className="mt-1 text-gray-600">{explanation}</p>}
                </div>
            )}

            <div className="flex justify-end mt-6 gap-3">
                {!submitted ? (
                    <button
                        onClick={() => setSubmitted(true)}
                        disabled={selected === null}
                        className="btn-lime disabled:opacity-50"
                    >
                        Check Answer
                    </button>
                ) : (
                    <button onClick={() => { setSelected(null); setSubmitted(false); onNext(); }} disabled={isLast} className="btn-lime disabled:opacity-50">
                        Next <ChevronRight className="w-4 h-4 inline ml-1" />
                    </button>
                )}
            </div>
        </div>
    );
}
