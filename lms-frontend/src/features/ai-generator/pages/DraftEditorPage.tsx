import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { useCourseEditor } from '../hooks/useCourseEditor';
import type { SlideUpdateRequest } from '../hooks/useCourseEditor';
import {
    ArrowLeft, ChevronDown, ChevronRight, BookOpen, Save, Plus,
    ArrowUp, ArrowDown, Trash2, Image as ImageIcon, FileVideo, FileAudio,
    Play, Pause, SkipBack, SkipForward, VolumeX, Volume2,
    RefreshCw, Sparkles, X, Upload, DollarSign, FileText, Eye, Pencil,
    MessageSquare, Clock, GripVertical, CheckCircle, ClipboardList, HelpCircle,
} from 'lucide-react';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';

// ---------------------------------------------------------------------------
// Static‑asset URL helper
// ---------------------------------------------------------------------------

function getStaticUrl(path: string | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const clean = path.replace(/^Generated_Courses[/\\]/, '').replace(/\\/g, '/');
    return `/static/${clean}`;
}

// ---------------------------------------------------------------------------
// Slide type
// ---------------------------------------------------------------------------

interface Slide {
    slide_title: string;
    slide_type?: 'content' | 'quiz';
    slide_text: string;
    visual_prompt: string;
    voiceover_script: string;
    estimated_duration_sec: number;
    image_url: string | null;
    voiceover_audio_url: string | null;
    video_url?: string | null;
    asset_type?: 'image' | 'video';
    quiz_question?: string | null;
    quiz_options?: string[] | null;
    quiz_correct_index?: number | null;
    quiz_explanation?: string | null;
}

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

const PUBLISH_STEPS = ['Details', 'Thumbnail', 'Pricing'];

export function DraftEditorPage() {
    const { draftId } = useParams<{ draftId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

    // Publish modal state
    const [showPublish, setShowPublish] = useState(false);
    const [publishStep, setPublishStep] = useState(0);
    const [pubTitle, setPubTitle] = useState('');
    const [pubDescription, setPubDescription] = useState('');
    const [pubCategory, setPubCategory] = useState('');
    const [pubThumbnail, setPubThumbnail] = useState('');
    const [pubThumbnailFile, setPubThumbnailFile] = useState<File | null>(null);
    const [pubBasePrice, setPubBasePrice] = useState('0');
    const [pubSeatPrice, setPubSeatPrice] = useState('');
    const [uploading, setUploading] = useState(false);

    const { data: course, isLoading } = useQuery({
        queryKey: ['ai-course', draftId],
        queryFn: async () => {
            const { data } = await api.get(`course-generator/courses/${draftId}`);
            return data;
        },
        enabled: !!draftId,
    });

    const meta = course?.metadata || {};
    const content = course?.content || {};
    const courseTitle = content.title || meta.title || 'Untitled Draft';
    const courseCategory = meta.category || content.category || '';
    const courseLevel = meta.course_level || content.course_level || '';
    const courseDescription = content.description || meta.description || '';
    const isPublished = course?.published_to_lms;

    const existingThumbnailUrl = useMemo(() => {
        const outDir = course?.output_directory;
        if (!outDir) return '';
        const dirName = outDir.replace(/.*[/\\]/, '');
        return `/static/${dirName}/thumbnail.png`;
    }, [course]);

    const publishMutation = useMutation({
        mutationFn: async () => {
            let thumbnailUrl = pubThumbnail;
            if (pubThumbnailFile) {
                setUploading(true);
                const fd = new FormData();
                fd.append('file', pubThumbnailFile);
                const { data: uploadRes } = await api.post('/site-settings/upload', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                thumbnailUrl = uploadRes.url;
                setUploading(false);
            }
            const { data } = await api.post('/courses/publish-from-draft', {
                draft_id: draftId,
                title: pubTitle || undefined,
                description: pubDescription || undefined,
                category: pubCategory || undefined,
                thumbnail_url: thumbnailUrl || undefined,
                base_price: pubBasePrice ? Number(pubBasePrice) : 0,
                seat_price: pubSeatPrice ? Number(pubSeatPrice) : undefined,
            });
            return data;
        },
        onSuccess: () => {
            toast.success('Course published to LMS!');
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
            setShowPublish(false);
            navigate('/admin/courses');
        },
        onError: (err: any) => {
            setUploading(false);
            toast.error(err?.response?.data?.message || 'Publish failed');
        },
    });

    const openPublishModal = () => {
        setPubTitle(courseTitle);
        setPubDescription(courseDescription);
        setPubCategory(courseCategory);
        setPubThumbnail(existingThumbnailUrl);
        setPubThumbnailFile(null);
        setPubBasePrice('0');
        setPubSeatPrice('');
        setPublishStep(0);
        setShowPublish(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[70vh]">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--bs-teal)', borderTopColor: 'transparent' }} />
            </div>
        );
    }

    if (!course) {
        return <div className="text-center py-16 text-gray-400">Course draft not found.</div>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-80px)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="min-w-0 flex-1">
                    <button onClick={() => navigate('/admin/ai-generator')} className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-1">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Jobs
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 truncate">{courseTitle}</h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {courseCategory}{courseCategory && courseLevel ? ' · ' : ''}{courseLevel}
                        {isPublished && (
                            <span className="ml-2 inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                                <CheckCircle className="w-3 h-3" /> Published
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Tab switcher */}
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                        <button
                            onClick={() => setActiveTab('editor')}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                                activeTab === 'editor' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Pencil className="w-3.5 h-3.5" /> Editor
                        </button>
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                                activeTab === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Eye className="w-3.5 h-3.5" /> Preview
                        </button>
                    </div>
                    {!isPublished && (
                        <button onClick={openPublishModal} className="btn-lime inline-flex items-center gap-2 text-sm">
                            <Upload className="w-4 h-4" /> Publish to LMS
                        </button>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200">
                {activeTab === 'editor' ? (
                    <CourseEditor course={course} courseId={draftId!} />
                ) : (
                    <CoursePreview course={course} />
                )}
            </div>

            {/* Publish Modal */}
            {showPublish && (
                <PublishModal
                    step={publishStep}
                    setStep={setPublishStep}
                    pubTitle={pubTitle}
                    setPubTitle={setPubTitle}
                    pubDescription={pubDescription}
                    setPubDescription={setPubDescription}
                    pubCategory={pubCategory}
                    setPubCategory={setPubCategory}
                    pubThumbnail={pubThumbnail}
                    setPubThumbnail={setPubThumbnail}
                    pubThumbnailFile={pubThumbnailFile}
                    setPubThumbnailFile={setPubThumbnailFile}
                    pubBasePrice={pubBasePrice}
                    setPubBasePrice={setPubBasePrice}
                    pubSeatPrice={pubSeatPrice}
                    setPubSeatPrice={setPubSeatPrice}
                    uploading={uploading}
                    isPending={publishMutation.isPending}
                    onPublish={() => publishMutation.mutate()}
                    onClose={() => setShowPublish(false)}
                    courseId={draftId!}
                />
            )}
        </div>
    );
}

// ===========================================================================
// COURSE EDITOR
// ===========================================================================

function CourseEditor({ course, courseId }: { course: any; courseId: string }) {
    const { updateSlide, uploadImage, uploadVideo, uploadAudio, updateCourse, regenerate } = useCourseEditor(courseId);
    const content = course.content || {};
    const levels = content.levels || [];

    const assessment = content.assessment || null;

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [expandedLevels, setExpandedLevels] = useState<Set<number>>(() => new Set(levels.map((_: any, i: number) => i)));
    const [formData, setFormData] = useState<Slide | null>(null);
    const [assetTab, setAssetTab] = useState<'image' | 'video'>('image');
    const [assessmentData, setAssessmentData] = useState<any>(null);

    useEffect(() => {
        if (assessment) setAssessmentData(JSON.parse(JSON.stringify(assessment)));
    }, [assessment?.questions?.length]);

    // Regen modal
    const [regenTarget, setRegenTarget] = useState<{ section: string; level_order?: number; module_order?: number; slide_index?: number; label: string } | null>(null);
    const [regenPrompt, setRegenPrompt] = useState('');

    const selectedSlide = useMemo(() => {
        if (!selectedId) return null;
        const [lIdx, mIdx, sIdx] = selectedId.split('-').map(Number);
        const level = levels.find((l: any) => l.level_order === lIdx);
        const mod = level?.modules?.find((m: any) => m.module_order === mIdx);
        const slide = mod?.slides?.[sIdx - 1];
        if (!slide) return null;
        return { level, mod, slide, lIdx, mIdx, sIdx, levelIndex: levels.indexOf(level), moduleIndex: level?.modules?.indexOf(mod) };
    }, [levels, selectedId]);

    useEffect(() => {
        if (selectedSlide?.slide) {
            setFormData({ ...selectedSlide.slide });
            setAssetTab(selectedSlide.slide.asset_type === 'video' ? 'video' : 'image');
        }
    }, [selectedSlide?.slide?.slide_title, selectedId]);

    const toggleLevel = (idx: number) => {
        setExpandedLevels((prev) => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });
    };

    const handleSave = useCallback(() => {
        if (!selectedSlide || !formData) return;
        const payload: SlideUpdateRequest = {
            level_order: selectedSlide.lIdx,
            module_order: selectedSlide.mIdx,
            slide_index: selectedSlide.sIdx,
            slide_title: formData.slide_title,
            slide_text: formData.slide_text,
            voiceover_script: formData.voiceover_script,
            visual_prompt: formData.visual_prompt,
            estimated_duration_sec: formData.estimated_duration_sec,
        };
        if (formData.slide_type === 'quiz') {
            payload.quiz_question = formData.quiz_question || '';
            payload.quiz_options = formData.quiz_options || ['', '', '', ''];
            payload.quiz_correct_index = formData.quiz_correct_index ?? 0;
            payload.quiz_explanation = formData.quiz_explanation || '';
        }
        updateSlide.mutate(payload);
    }, [selectedSlide, formData, updateSlide]);

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
        const file = e.target.files?.[0];
        if (!file || !selectedSlide) return;
        const args = { level: selectedSlide.lIdx, module: selectedSlide.mIdx, slide: selectedSlide.sIdx, file };
        if (type === 'image') uploadImage.mutate(args);
        else if (type === 'video') uploadVideo.mutate(args);
        else uploadAudio.mutate(args);
        e.target.value = '';
    }, [selectedSlide, uploadImage, uploadVideo, uploadAudio]);

    const handleAddSlide = useCallback((levelIndex: number, moduleIndex: number, type: 'content' | 'quiz' = 'content') => {
        const newContent = JSON.parse(JSON.stringify(content));
        const mod = newContent.levels[levelIndex].modules[moduleIndex];
        if (type === 'quiz') {
            mod.slides.push({
                slide_title: 'New Quiz',
                slide_type: 'quiz',
                slide_text: '',
                voiceover_script: '',
                visual_prompt: '',
                estimated_duration_sec: 30,
                image_url: null,
                voiceover_audio_url: null,
                quiz_question: '',
                quiz_options: ['', '', '', ''],
                quiz_correct_index: 0,
                quiz_explanation: '',
            });
        } else {
            mod.slides.push({
                slide_title: 'New Slide',
                slide_type: 'content',
                slide_text: '',
                voiceover_script: '',
                visual_prompt: '',
                estimated_duration_sec: 30,
                image_url: null,
                voiceover_audio_url: null,
                video_url: null,
                asset_type: 'image',
            });
        }
        updateCourse.mutate({ course_content: newContent });
    }, [content, updateCourse]);

    const [deleteTarget, setDeleteTarget] = useState<{ levelIndex: number; moduleIndex: number; slideIndex: number; label: string } | null>(null);

    const handleDeleteSlide = useCallback((levelIndex: number, moduleIndex: number, slideIndex: number) => {
        const newContent = JSON.parse(JSON.stringify(content));
        newContent.levels[levelIndex].modules[moduleIndex].slides.splice(slideIndex, 1);
        updateCourse.mutate({ course_content: newContent });
        setSelectedId(null);
    }, [content, updateCourse]);

    const handleMoveSlide = useCallback((levelIndex: number, moduleIndex: number, slideIndex: number, dir: 'up' | 'down') => {
        const newContent = JSON.parse(JSON.stringify(content));
        const slides = newContent.levels[levelIndex].modules[moduleIndex].slides;
        const target = dir === 'up' ? slideIndex - 1 : slideIndex + 1;
        if (target < 0 || target >= slides.length) return;
        [slides[slideIndex], slides[target]] = [slides[target], slides[slideIndex]];
        updateCourse.mutate({ course_content: newContent });
    }, [content, updateCourse]);

    const submitRegen = () => {
        if (!regenTarget) return;
        regenerate.mutate({ ...regenTarget, prompt: regenPrompt || undefined });
        setRegenTarget(null);
        setRegenPrompt('');
    };

    const handleSaveAssessment = useCallback(() => {
        if (!assessmentData) return;
        const newContent = JSON.parse(JSON.stringify(content));
        newContent.assessment = assessmentData;
        updateCourse.mutate({ course_content: newContent });
    }, [assessmentData, content, updateCourse]);

    const updateQuestion = (qi: number, field: string, value: any) => {
        if (!assessmentData) return;
        const updated = JSON.parse(JSON.stringify(assessmentData));
        updated.questions[qi][field] = value;
        setAssessmentData(updated);
    };

    const updateOption = (qi: number, oi: number, value: string) => {
        if (!assessmentData) return;
        const updated = JSON.parse(JSON.stringify(assessmentData));
        updated.questions[qi].options[oi] = value;
        setAssessmentData(updated);
    };

    const addQuestion = () => {
        if (!assessmentData) return;
        const updated = JSON.parse(JSON.stringify(assessmentData));
        updated.questions.push({ question: '', options: ['', '', '', ''], correct_option_index: 0 });
        setAssessmentData(updated);
    };

    const removeQuestion = (qi: number) => {
        if (!assessmentData || assessmentData.questions.length <= 1) return;
        const updated = JSON.parse(JSON.stringify(assessmentData));
        updated.questions.splice(qi, 1);
        setAssessmentData(updated);
    };

    const totalSlides = levels.reduce((sum: number, l: any) => sum + (l.modules || []).reduce((s: number, m: any) => s + (m.slides || []).length, 0), 0);

    return (
        <>
            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Slide?"
                message={`Are you sure you want to delete "${deleteTarget?.label || ''}"? This cannot be undone.`}
                onConfirm={() => { if (deleteTarget) handleDeleteSlide(deleteTarget.levelIndex, deleteTarget.moduleIndex, deleteTarget.slideIndex); setDeleteTarget(null); }}
                onCancel={() => setDeleteTarget(null)}
            />
            <div className="flex h-full">
                {/* ─── Sidebar ──────────────────────────────────── */}
                <div className="w-72 flex-shrink-0 border-r border-gray-100 bg-gray-50/60 flex flex-col h-full">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Course Structure</span>
                        <span className="text-[10px] text-gray-400">{totalSlides} slides</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {levels.map((level: any, li: number) => {
                            const isOpen = expandedLevels.has(li);
                            return (
                                <div key={li} className="mb-1">
                                    <button
                                        onClick={() => toggleLevel(li)}
                                        className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                        <span className="truncate">L{li + 1}: {level.level_title}</span>
                                    </button>
                                    {isOpen && (level.modules || []).map((mod: any, mi: number) => (
                                        <div key={mi} className="ml-3 mt-1 mb-2">
                                            <div className="flex items-center justify-between px-2 mb-1">
                                                <span className="text-[10px] font-semibold text-gray-400 uppercase truncate flex-1">{mod.module_title}</span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleAddSlide(li, mi, 'content')}
                                                        className="p-0.5 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors"
                                                        title="Add content slide"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleAddSlide(li, mi, 'quiz')}
                                                        className="p-0.5 rounded hover:bg-amber-100 text-amber-400 hover:text-amber-600 transition-colors"
                                                        title="Add quiz slide"
                                                    >
                                                        <HelpCircle className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                {(mod.slides || []).map((slide: any, si: number) => {
                                                    const id = `${level.level_order}-${mod.module_order}-${si + 1}`;
                                                    const isSelected = selectedId === id;
                                                    const isQuiz = slide.slide_type === 'quiz';
                                                    return (
                                                        <div key={si} className="group relative">
                                                            <button
                                                                onClick={() => setSelectedId(id)}
                                                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md transition-all text-left ${
                                                                    isSelected
                                                                        ? 'bg-[var(--bs-teal)] text-white shadow-sm'
                                                                        : 'text-gray-600 hover:bg-white hover:shadow-sm'
                                                                }`}
                                                            >
                                                                <GripVertical className="w-3 h-3 opacity-30 flex-shrink-0" />
                                                                <span className="font-mono opacity-50 text-[10px]">{si + 1}.</span>
                                                                <span className="truncate flex-1">{slide.slide_title || 'Untitled'}</span>
                                                                {isQuiz && (
                                                                    <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                                                        QUIZ
                                                                    </span>
                                                                )}
                                                            </button>
                                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm rounded-md px-0.5 shadow border border-gray-200 z-10">
                                                                <button onClick={(e) => { e.stopPropagation(); handleMoveSlide(li, mi, si, 'up'); }} disabled={si === 0} className="p-1 hover:text-[var(--bs-teal)] disabled:opacity-20" title="Move up"><ArrowUp className="w-3 h-3" /></button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleMoveSlide(li, mi, si, 'down'); }} disabled={si === mod.slides.length - 1} className="p-1 hover:text-[var(--bs-teal)] disabled:opacity-20" title="Move down"><ArrowDown className="w-3 h-3" /></button>
                                                                <div className="w-px h-3 bg-gray-200" />
                                                                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ levelIndex: li, moduleIndex: mi, slideIndex: si, label: slide.slide_title || 'Untitled' }); }} className="p-1 hover:text-red-500" title="Delete"><Trash2 className="w-3 h-3" /></button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}

                        {/* Assessment in sidebar */}
                        {assessment && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                                <button
                                    onClick={() => { setSelectedId('assessment'); setFormData(null); }}
                                    className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                                        selectedId === 'assessment'
                                            ? 'bg-[var(--bs-teal)] text-white shadow-sm'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    <ClipboardList className="w-3.5 h-3.5" />
                                    <span>Assessment</span>
                                    <span className={`ml-auto text-[10px] ${selectedId === 'assessment' ? 'text-white/70' : 'text-gray-400'}`}>
                                        {assessment.questions?.length || 0}q · {assessment.pass_percentage || 85}%
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Editor Panel ─────────────────────────────── */}
                <div className="flex-1 overflow-y-auto bg-white">
                    {selectedId === 'assessment' && assessmentData ? (
                        <AssessmentEditor
                            data={assessmentData}
                            onUpdateQuestion={updateQuestion}
                            onUpdateOption={updateOption}
                            onSetCorrect={(qi: number, oi: number) => updateQuestion(qi, 'correct_option_index', oi)}
                            onAddQuestion={addQuestion}
                            onRemoveQuestion={removeQuestion}
                            onPassPercentageChange={(v: number) => setAssessmentData({ ...assessmentData, pass_percentage: v })}
                            onSave={handleSaveAssessment}
                            isSaving={updateCourse.isPending}
                            onRegenerate={() => setRegenTarget({ section: 'assessment', label: 'Assessment' })}
                        />
                    ) : selectedSlide && formData ? (
                        <div className="p-6">
                            {/* Breadcrumb + save */}
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <p className="text-[11px] text-gray-400 mb-0.5">{selectedSlide.level?.level_title} &gt; {selectedSlide.mod?.module_title}</p>
                                        <h2 className="text-lg font-bold text-gray-900">
                                            {formData.slide_type === 'quiz' ? 'Edit Quiz Slide' : 'Edit Slide'}
                                        </h2>
                                    </div>
                                    {formData.slide_type === 'quiz' && (
                                        <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 uppercase tracking-wider">Quiz</span>
                                    )}
                                </div>
                                <button onClick={handleSave} disabled={updateSlide.isPending} className="btn-lime inline-flex items-center gap-2 text-sm">
                                    <Save className="w-4 h-4" /> {updateSlide.isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>

                            {formData.slide_type === 'quiz' ? (
                                /* ─── Quiz Slide Editor ─── */
                                <div className="space-y-5 max-w-2xl">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Slide Title</label>
                                        <input className="bs-input" value={formData.slide_title} onChange={(e) => setFormData({ ...formData, slide_title: e.target.value })} />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Context Paragraph</label>
                                        <textarea
                                            className="bs-input !min-h-[60px] text-sm resize-y"
                                            value={formData.slide_text}
                                            onChange={(e) => setFormData({ ...formData, slide_text: e.target.value })}
                                            placeholder="Brief context for the quiz question..."
                                        />
                                    </div>

                                    <div className="border border-amber-200 rounded-xl p-5 bg-amber-50/30">
                                        <label className="block text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                                            <HelpCircle className="w-3 h-3 inline mr-1" />Question
                                        </label>
                                        <textarea
                                            className="bs-input !min-h-[60px] text-sm font-medium resize-y"
                                            value={formData.quiz_question || ''}
                                            onChange={(e) => setFormData({ ...formData, quiz_question: e.target.value })}
                                            placeholder="Enter the quiz question..."
                                        />

                                        <div className="mt-4 space-y-2">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Answer Options</label>
                                            {(formData.quiz_options || ['', '', '', '']).map((opt, oi) => {
                                                const isCorrect = (formData.quiz_correct_index ?? 0) === oi;
                                                return (
                                                    <div key={oi} className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, quiz_correct_index: oi })}
                                                            className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                                isCorrect ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-gray-400'
                                                            }`}
                                                            title={isCorrect ? 'Correct answer' : 'Mark as correct'}
                                                        >
                                                            {isCorrect && <CheckCircle className="w-3 h-3 text-white" />}
                                                        </button>
                                                        <input
                                                            className={`bs-input flex-1 text-sm ${isCorrect ? '!border-green-300 !bg-green-50/50' : ''}`}
                                                            value={opt}
                                                            onChange={(e) => {
                                                                const opts = [...(formData.quiz_options || ['', '', '', ''])];
                                                                opts[oi] = e.target.value;
                                                                setFormData({ ...formData, quiz_options: opts });
                                                            }}
                                                            placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                                        />
                                                        {isCorrect && (
                                                            <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded flex-shrink-0">CORRECT</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="mt-4">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Explanation</label>
                                            <textarea
                                                className="bs-input !min-h-[60px] text-sm resize-y"
                                                value={formData.quiz_explanation || ''}
                                                onChange={(e) => setFormData({ ...formData, quiz_explanation: e.target.value })}
                                                placeholder="Explain why the correct answer is right..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* ─── Content Slide Editor (existing) ─── */
                                <div className="grid grid-cols-2 gap-6">
                                    {/* Left: text fields */}
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Slide Title</label>
                                            <input className="bs-input" value={formData.slide_title} onChange={(e) => setFormData({ ...formData, slide_title: e.target.value })} />
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Slide Content</label>
                                                <button
                                                    onClick={() => setRegenTarget({
                                                        section: 'slide',
                                                        level_order: selectedSlide.lIdx,
                                                        module_order: selectedSlide.mIdx,
                                                        slide_index: selectedSlide.sIdx,
                                                        label: `Content: ${formData.slide_title}`,
                                                    })}
                                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-500 hover:text-blue-700"
                                                >
                                                    <Sparkles className="w-3 h-3" /> AI Regenerate
                                                </button>
                                            </div>
                                            <textarea
                                                className="bs-input !min-h-[180px] font-mono text-sm leading-relaxed resize-y"
                                                value={formData.slide_text}
                                                onChange={(e) => setFormData({ ...formData, slide_text: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Voiceover Script</label>
                                                <button
                                                    onClick={() => setRegenTarget({
                                                        section: 'slide',
                                                        level_order: selectedSlide.lIdx,
                                                        module_order: selectedSlide.mIdx,
                                                        slide_index: selectedSlide.sIdx,
                                                        label: `Voiceover: ${formData.slide_title}`,
                                                    })}
                                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-500 hover:text-blue-700"
                                                >
                                                    <Sparkles className="w-3 h-3" /> AI Regenerate
                                                </button>
                                            </div>
                                            <textarea
                                                className="bs-input !min-h-[120px] text-sm leading-relaxed resize-y"
                                                value={formData.voiceover_script}
                                                onChange={(e) => setFormData({ ...formData, voiceover_script: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                                <Clock className="w-3 h-3 inline mr-1" />Duration (seconds)
                                            </label>
                                            <input
                                                type="number"
                                                min="5"
                                                className="bs-input !w-24"
                                                value={formData.estimated_duration_sec}
                                                onChange={(e) => setFormData({ ...formData, estimated_duration_sec: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>

                                    {/* Right: media */}
                                    <div className="space-y-5">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visual Asset</label>
                                                <div className="flex bg-gray-100 rounded-md p-0.5">
                                                    <button onClick={() => { setAssetTab('image'); setFormData({ ...formData, asset_type: 'image' }); }} className={`px-2.5 py-1 text-[10px] font-semibold rounded-sm transition-all ${assetTab === 'image' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Image</button>
                                                    <button onClick={() => { setAssetTab('video'); setFormData({ ...formData, asset_type: 'video' }); }} className={`px-2.5 py-1 text-[10px] font-semibold rounded-sm transition-all ${assetTab === 'video' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Video</button>
                                                </div>
                                            </div>
                                            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 min-h-[260px] flex flex-col">
                                                <div className="flex-1 flex items-center justify-center bg-black/5 rounded-lg overflow-hidden mb-3">
                                                    {assetTab === 'video' ? (
                                                        formData.video_url ? (
                                                            <video src={getStaticUrl(formData.video_url)} controls className="max-h-[220px] w-full rounded" />
                                                        ) : (
                                                            <div className="text-center text-gray-400 py-8">
                                                                <FileVideo className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                                                <p className="text-xs">No video uploaded</p>
                                                            </div>
                                                        )
                                                    ) : (
                                                        formData.image_url ? (
                                                            <img src={getStaticUrl(formData.image_url)} alt="Slide visual" className="max-h-[220px] object-contain rounded" />
                                                        ) : (
                                                            <div className="text-center text-gray-400 py-8">
                                                                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                                                <p className="text-xs">No image generated</p>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    {assetTab === 'video' ? (
                                                        <label className="flex-1 cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition-colors">
                                                            <FileVideo className="w-3.5 h-3.5" /> Upload Video
                                                            <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => handleFileUpload(e, 'video')} />
                                                        </label>
                                                    ) : (
                                                        <>
                                                            <label className="flex-1 cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition-colors">
                                                                <ImageIcon className="w-3.5 h-3.5" /> Replace Image
                                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'image')} />
                                                            </label>
                                                            <button
                                                                onClick={() => setRegenTarget({
                                                                    section: 'image',
                                                                    level_order: selectedSlide.lIdx,
                                                                    module_order: selectedSlide.mIdx,
                                                                    slide_index: selectedSlide.sIdx,
                                                                    label: `Image: ${formData.slide_title}`,
                                                                })}
                                                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                                                            >
                                                                <Sparkles className="w-3.5 h-3.5" /> AI Regen
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Audio Narration</label>
                                                <button
                                                    onClick={() => setRegenTarget({
                                                        section: 'voiceover',
                                                        level_order: selectedSlide.lIdx,
                                                        module_order: selectedSlide.mIdx,
                                                        slide_index: selectedSlide.sIdx,
                                                        label: `Voiceover Audio: ${formData.slide_title}`,
                                                    })}
                                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-500 hover:text-blue-700"
                                                >
                                                    <Sparkles className="w-3 h-3" /> Regenerate TTS
                                                </button>
                                            </div>
                                            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 flex items-center gap-3">
                                                {formData.voiceover_audio_url ? (
                                                    <audio controls key={getStaticUrl(formData.voiceover_audio_url)} className="h-8 flex-1">
                                                        <source src={getStaticUrl(formData.voiceover_audio_url)} type="audio/mpeg" />
                                                    </audio>
                                                ) : (
                                                    <span className="text-xs text-gray-400 flex-1 px-2">No audio</span>
                                                )}
                                                <label className="cursor-pointer p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Upload audio">
                                                    <FileAudio className="w-4 h-4" />
                                                    <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileUpload(e, 'audio')} />
                                                </label>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visual Prompt</label>
                                            </div>
                                            <textarea
                                                className="bs-input !min-h-[80px] text-xs text-gray-500 resize-y"
                                                value={formData.visual_prompt}
                                                onChange={(e) => setFormData({ ...formData, visual_prompt: e.target.value })}
                                                placeholder="Describe the visual for AI image generation..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <BookOpen className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-sm">Select a slide from the left to start editing</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Regenerate Modal */}
            {regenTarget && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setRegenTarget(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4" style={{ color: 'var(--bs-teal)' }} />
                                <h3 className="text-sm font-semibold text-gray-900">AI Regenerate</h3>
                            </div>
                            <button onClick={() => setRegenTarget(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-400" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="p-3 rounded-lg bg-gray-50">
                                <p className="text-xs text-gray-500">Target</p>
                                <p className="text-sm font-medium text-gray-900">{regenTarget.label}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                                    <MessageSquare className="w-3.5 h-3.5 inline mr-1" />Custom prompt (optional)
                                </label>
                                <textarea className="bs-input !h-24 resize-none" value={regenPrompt} onChange={(e) => setRegenPrompt(e.target.value)} placeholder="e.g. Make it more beginner-friendly..." />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
                            <button onClick={() => setRegenTarget(null)} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button onClick={submitRegen} disabled={regenerate.isPending} className="btn-lime disabled:opacity-50 inline-flex items-center gap-2">
                                {regenerate.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Regenerating...</> : <><Sparkles className="w-4 h-4" /> Regenerate</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ===========================================================================
// ASSESSMENT EDITOR
// ===========================================================================

function AssessmentEditor({
    data, onUpdateQuestion, onUpdateOption, onSetCorrect,
    onAddQuestion, onRemoveQuestion, onPassPercentageChange,
    onSave, isSaving, onRegenerate,
}: {
    data: any;
    onUpdateQuestion: (qi: number, field: string, value: any) => void;
    onUpdateOption: (qi: number, oi: number, value: string) => void;
    onSetCorrect: (qi: number, oi: number) => void;
    onAddQuestion: () => void;
    onRemoveQuestion: (qi: number) => void;
    onPassPercentageChange: (v: number) => void;
    onSave: () => void;
    isSaving: boolean;
    onRegenerate: () => void;
}) {
    const questions = data.questions || [];
    const [deleteQIdx, setDeleteQIdx] = useState<number | null>(null);

    return (
        <div className="p-6">
            <ConfirmDialog
                open={deleteQIdx !== null}
                title="Remove Question?"
                message={`Are you sure you want to remove question ${(deleteQIdx ?? 0) + 1}?`}
                confirmLabel="Remove"
                variant="warning"
                onConfirm={() => { if (deleteQIdx !== null) onRemoveQuestion(deleteQIdx); setDeleteQIdx(null); }}
                onCancel={() => setDeleteQIdx(null)}
            />
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Assessment Editor</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{questions.length} questions · Pass threshold: {data.pass_percentage}%</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onRegenerate}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                    >
                        <Sparkles className="w-3.5 h-3.5" /> AI Regenerate
                    </button>
                    <button onClick={onSave} disabled={isSaving} className="btn-lime inline-flex items-center gap-2 text-sm">
                        <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Assessment'}
                    </button>
                </div>
            </div>

            {/* Pass percentage */}
            <div className="mb-6 flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pass Percentage</label>
                <input
                    type="number"
                    min="1"
                    max="100"
                    className="bs-input !w-20 text-center"
                    value={data.pass_percentage || 85}
                    onChange={(e) => onPassPercentageChange(Number(e.target.value))}
                />
                <span className="text-xs text-gray-400">%</span>
            </div>

            {/* Questions */}
            <div className="space-y-4">
                {questions.map((q: any, qi: number) => (
                    <div key={qi} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 hover:border-gray-300 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--bs-teal)] text-white text-xs font-bold flex items-center justify-center mt-0.5">
                                    {qi + 1}
                                </span>
                                <textarea
                                    className="bs-input !min-h-[44px] flex-1 text-sm font-medium resize-y"
                                    value={q.question}
                                    onChange={(e) => onUpdateQuestion(qi, 'question', e.target.value)}
                                    placeholder="Enter question..."
                                    rows={1}
                                />
                            </div>
                            <button
                                onClick={() => setDeleteQIdx(qi)}
                                disabled={questions.length <= 1}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-20 transition-colors flex-shrink-0"
                                title="Remove question"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="ml-9 space-y-2">
                            {(q.options || []).map((opt: string, oi: number) => {
                                const isCorrect = q.correct_option_index === oi;
                                return (
                                    <div key={oi} className="flex items-center gap-2">
                                        <button
                                            onClick={() => onSetCorrect(qi, oi)}
                                            className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                isCorrect
                                                    ? 'border-green-500 bg-green-500'
                                                    : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                            title={isCorrect ? 'Correct answer' : 'Mark as correct'}
                                        >
                                            {isCorrect && <CheckCircle className="w-3 h-3 text-white" />}
                                        </button>
                                        <input
                                            className={`bs-input flex-1 text-sm ${isCorrect ? '!border-green-300 !bg-green-50/50' : ''}`}
                                            value={opt}
                                            onChange={(e) => onUpdateOption(qi, oi, e.target.value)}
                                            placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                        />
                                        {isCorrect && (
                                            <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded flex-shrink-0">CORRECT</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add question */}
            <button
                onClick={onAddQuestion}
                className="mt-4 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors inline-flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" /> Add Question
            </button>
        </div>
    );
}

// ===========================================================================
// COURSE PREVIEW (Player)
// ===========================================================================

function CoursePreview({ course }: { course: any }) {
    const content = course.content || {};
    const levels = content.levels || [];

    const slides = useMemo(() => {
        const flat: any[] = [];
        levels.forEach((l: any) => {
            (l.modules || []).forEach((m: any) => {
                (m.slides || []).forEach((s: any) => {
                    flat.push({ ...s, levelTitle: l.level_title, moduleTitle: m.module_title });
                });
            });
        });
        return flat;
    }, [levels]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [muted, setMuted] = useState(false);
    const [quizSelected, setQuizSelected] = useState<number | null>(null);
    const [quizRevealed, setQuizRevealed] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const slide = slides[currentIndex];
    if (!slide) return <div className="flex items-center justify-center h-full text-gray-400">No slides to preview</div>;

    const isQuiz = slide.slide_type === 'quiz';
    const isVideo = !isQuiz && slide.asset_type === 'video' && slide.video_url;

    useEffect(() => {
        setIsPlaying(false);
        setQuizSelected(null);
        setQuizRevealed(false);
        if (!isQuiz && !isVideo && audioRef.current) {
            audioRef.current.load();
            if (slide.voiceover_audio_url) {
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

    return (
        <div className="flex flex-col h-full bg-gray-950 text-white">
            <div className="flex-1 flex overflow-hidden">
                {isQuiz ? (
                    /* ─── Quiz Slide Preview ─── */
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
                            {slide.slide_text && (
                                <p className="text-sm text-gray-400 mb-6">{slide.slide_text}</p>
                            )}
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
                                        <button
                                            key={oi}
                                            onClick={() => handleQuizAnswer(oi)}
                                            disabled={quizRevealed}
                                            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${optClass}`}
                                        >
                                            <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                                quizRevealed && isCorrect ? 'bg-green-500 text-white' :
                                                quizRevealed && wasSelected ? 'bg-red-500 text-white' :
                                                'bg-gray-700 text-gray-300'
                                            }`}>
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
                                <button
                                    onClick={next}
                                    disabled={currentIndex === slides.length - 1}
                                    className="mt-6 px-6 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-40"
                                    style={{ background: 'var(--bs-teal)', color: 'white' }}
                                >
                                    Continue &rarr;
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ─── Content Slide Preview (existing) ─── */
                    <>
                        <div className="w-1/2 bg-black flex items-center justify-center border-r border-gray-800">
                            {isVideo ? (
                                <video
                                    ref={videoRef}
                                    src={getStaticUrl(slide.video_url)}
                                    className="w-full h-full object-contain"
                                    muted={muted}
                                    onEnded={() => setIsPlaying(false)}
                                />
                            ) : slide.image_url ? (
                                <img src={getStaticUrl(slide.image_url)} alt="Slide visual" className="w-full h-full object-contain" />
                            ) : (
                                <div className="text-center text-gray-600">
                                    <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
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

            {/* Controls */}
            <div className="h-20 bg-gray-950 border-t border-gray-800 flex items-center justify-between px-8 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setMuted(!muted)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <div className="flex bg-gray-900 rounded-md p-0.5">
                        {[1, 1.25, 1.5].map((rate) => (
                            <button
                                key={rate}
                                onClick={() => setPlaybackRate(rate)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-sm transition-all ${
                                    playbackRate === rate ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                                }`}
                                style={playbackRate === rate ? { background: 'var(--bs-teal)' } : undefined}
                            >
                                {rate}x
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <button onClick={prev} disabled={currentIndex === 0} className="p-2 text-gray-400 hover:text-white disabled:opacity-20 transition-colors">
                        <SkipBack className="w-6 h-6" />
                    </button>
                    <button
                        onClick={handlePlayPause}
                        disabled={isQuiz}
                        className="w-14 h-14 rounded-full bg-white text-gray-900 flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-40"
                    >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <button onClick={next} disabled={currentIndex === slides.length - 1 || (isQuiz && !quizRevealed)} className="p-2 text-gray-400 hover:text-white disabled:opacity-20 transition-colors">
                        <SkipForward className="w-6 h-6" />
                    </button>
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

// ===========================================================================
// PUBLISH MODAL
// ===========================================================================

function PublishModal({
    step, setStep, pubTitle, setPubTitle, pubDescription, setPubDescription,
    pubCategory, setPubCategory, pubThumbnail, setPubThumbnail,
    pubThumbnailFile, setPubThumbnailFile, pubBasePrice, setPubBasePrice,
    pubSeatPrice, setPubSeatPrice, uploading, isPending, onPublish, onClose,
    courseId,
}: {
    step: number; setStep: (n: number) => void;
    pubTitle: string; setPubTitle: (s: string) => void;
    pubDescription: string; setPubDescription: (s: string) => void;
    pubCategory: string; setPubCategory: (s: string) => void;
    pubThumbnail: string; setPubThumbnail: (s: string) => void;
    pubThumbnailFile: File | null; setPubThumbnailFile: (f: File | null) => void;
    pubBasePrice: string; setPubBasePrice: (s: string) => void;
    pubSeatPrice: string; setPubSeatPrice: (s: string) => void;
    uploading: boolean; isPending: boolean;
    onPublish: () => void; onClose: () => void;
    courseId: string;
}) {
    const [thumbPrompt, setThumbPrompt] = useState('');
    const [generatingThumb, setGeneratingThumb] = useState(false);
    const [generatedThumbUrl, setGeneratedThumbUrl] = useState('');

    const handleGenerateThumbnail = async () => {
        setGeneratingThumb(true);
        try {
            const { data } = await api.post(`course-generator/courses/${courseId}/generate-thumbnail`, {
                prompt: thumbPrompt || undefined,
            });
            if (data.thumbnail_url) {
                setGeneratedThumbUrl(data.thumbnail_url);
                setPubThumbnail(data.thumbnail_url);
                setPubThumbnailFile(null);
                toast.success('Thumbnail generated!');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Thumbnail generation failed');
        } finally {
            setGeneratingThumb(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex border-b border-gray-100">
                    {PUBLISH_STEPS.map((s, i) => (
                        <button
                            key={s}
                            onClick={() => setStep(i)}
                            className={`flex-1 py-3.5 text-sm font-medium text-center border-b-2 transition-colors ${
                                step === i ? 'border-[var(--bs-teal)] text-[var(--bs-teal)]' : 'border-transparent text-gray-400'
                            }`}
                        >
                            <span className="inline-flex items-center gap-1.5">
                                {i === 0 && <FileText className="w-3.5 h-3.5" />}
                                {i === 1 && <ImageIcon className="w-3.5 h-3.5" />}
                                {i === 2 && <DollarSign className="w-3.5 h-3.5" />}
                                {s}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="p-6">
                    {step === 0 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1.5">Course Title</label>
                                <input className="bs-input" value={pubTitle} onChange={(e) => setPubTitle(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1.5">Description</label>
                                <textarea className="bs-input !min-h-[100px]" value={pubDescription} onChange={(e) => setPubDescription(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1.5">Category</label>
                                <input className="bs-input" value={pubCategory} onChange={(e) => setPubCategory(e.target.value)} placeholder="e.g. Food Hygiene" />
                            </div>
                        </div>
                    )}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1.5">Thumbnail Image</label>
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                                    {pubThumbnailFile ? (
                                        <div>
                                            <img src={URL.createObjectURL(pubThumbnailFile)} alt="Preview" className="w-full max-h-40 object-cover rounded-lg mx-auto mb-3" />
                                            <p className="text-sm text-gray-600">{pubThumbnailFile.name}</p>
                                            <button onClick={() => setPubThumbnailFile(null)} className="text-xs text-red-500 mt-1">Remove</button>
                                        </div>
                                    ) : generatedThumbUrl ? (
                                        <div>
                                            <img src={generatedThumbUrl} alt="AI Thumbnail" className="w-full max-h-40 object-cover rounded-lg mx-auto mb-3" />
                                            <p className="text-xs text-green-600 font-medium">AI-generated thumbnail</p>
                                            <button onClick={() => { setGeneratedThumbUrl(''); setPubThumbnail(''); }} className="text-xs text-red-500 mt-1">Remove</button>
                                        </div>
                                    ) : pubThumbnail ? (
                                        <div>
                                            <img src={pubThumbnail} alt="Course Thumbnail" className="w-full max-h-40 object-cover rounded-lg mx-auto mb-3" />
                                            <p className="text-xs text-teal-600 font-medium">Existing course thumbnail</p>
                                            <button onClick={() => setPubThumbnail('')} className="text-xs text-red-500 mt-1">Remove</button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer">
                                            <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500 mb-1">Click to upload thumbnail</p>
                                            <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPubThumbnailFile(f); }} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-x-0 top-0 flex items-center">
                                    <div className="flex-1 border-t border-gray-200" />
                                    <span className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">or generate with AI</span>
                                    <div className="flex-1 border-t border-gray-200" />
                                </div>
                                <div className="pt-5">
                                    <textarea
                                        className="bs-input !h-16 resize-none text-sm mb-2"
                                        value={thumbPrompt}
                                        onChange={(e) => setThumbPrompt(e.target.value)}
                                        placeholder="Describe the thumbnail style (optional - defaults to auto-generated from course title)..."
                                    />
                                    <button
                                        onClick={handleGenerateThumbnail}
                                        disabled={generatingThumb}
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors disabled:opacity-50"
                                    >
                                        {generatingThumb ? (
                                            <><RefreshCw className="w-4 h-4 animate-spin" /> Generating Thumbnail...</>
                                        ) : (
                                            <><Sparkles className="w-4 h-4" /> Generate AI Thumbnail</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1.5">Or paste image URL</label>
                                <input className="bs-input" value={pubThumbnail} onChange={(e) => setPubThumbnail(e.target.value)} placeholder="https://..." disabled={!!pubThumbnailFile} />
                            </div>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1.5">Individual Price ($)</label>
                                <input type="number" step="0.01" min="0" className="bs-input" value={pubBasePrice} onChange={(e) => setPubBasePrice(e.target.value)} />
                                <p className="text-xs text-gray-400 mt-1">Set to 0 for free courses</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1.5">Per-Seat Price for Business ($)</label>
                                <input type="number" step="0.01" min="0" className="bs-input" value={pubSeatPrice} onChange={(e) => setPubSeatPrice(e.target.value)} placeholder="Leave empty to use individual price" />
                            </div>
                        </div>
                    )}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                        <button onClick={() => (step > 0 ? setStep(step - 1) : onClose())} className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                            {step > 0 ? 'Back' : 'Cancel'}
                        </button>
                        {step < PUBLISH_STEPS.length - 1 ? (
                            <button onClick={() => setStep(step + 1)} className="btn-lime">Next</button>
                        ) : (
                            <button onClick={onPublish} disabled={isPending || uploading} className="btn-lime disabled:opacity-50 inline-flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                {uploading ? 'Uploading...' : isPending ? 'Publishing...' : 'Publish Course'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
