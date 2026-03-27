import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import {
    ArrowLeft, ChevronDown, ChevronRight, BookOpen, Save, Plus,
    ArrowUp, ArrowDown, Trash2, Image as ImageIcon, FileVideo,
    Play, Pause, SkipBack, SkipForward, VolumeX, Volume2,
    DollarSign, FileText, Eye, Pencil, Clock, GripVertical,
    CheckCircle, ClipboardList, HelpCircle, Settings, Tag, Layers,
    Upload,
} from 'lucide-react';
import type { Course, CourseVersion } from '../../types';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStaticUrl(path: string | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const clean = path.replace(/^Generated_Courses[/\\]/, '').replace(/\\/g, '/');
    return `/static/${clean}`;
}

interface NormalizedSlide {
    slide_title: string;
    slide_type: 'content' | 'quiz';
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

function normalizeSnapshot(snapshot: any) {
    if (!snapshot) return { levels: [], assessment: null };
    return {
        levels: (snapshot.levels || []).map((level: any, li: number) => ({
            level_title: level.title || level.level_title || `Level ${li + 1}`,
            level_order: li + 1,
            modules: (level.modules || []).map((mod: any, mi: number) => ({
                module_title: mod.title || mod.module_title || `Module ${mi + 1}`,
                module_order: mi + 1,
                slides: (mod.slides || []).map((slide: any) => ({
                    slide_title: slide.title || slide.slide_title || 'Untitled',
                    slide_type: slide.type || slide.slide_type || 'content',
                    slide_text: slide.text || slide.content || slide.slide_text || '',
                    voiceover_script: slide.voiceover_script || '',
                    visual_prompt: slide.visual_prompt || '',
                    estimated_duration_sec: slide.estimated_duration_sec || 30,
                    image_url: slide.image_url || null,
                    voiceover_audio_url: slide.audio_url || slide.voiceover_audio_url || null,
                    video_url: slide.video_url || null,
                    asset_type: slide.asset_type || 'image',
                    quiz_question: slide.question || slide.quiz_question || null,
                    quiz_options: slide.options || slide.quiz_options || null,
                    quiz_correct_index: slide.correct_option ?? slide.quiz_correct_index ?? null,
                    quiz_explanation: slide.quiz_explanation || null,
                })),
            })),
        })),
        assessment: snapshot.assessment || null,
    };
}

function denormalizeToSnapshot(normalized: any) {
    return {
        levels: (normalized.levels || []).map((level: any) => ({
            title: level.level_title,
            modules: (level.modules || []).map((mod: any) => ({
                title: mod.module_title,
                slides: (mod.slides || []).map((slide: any) => ({
                    title: slide.slide_title,
                    content: slide.slide_text,
                    text: slide.slide_text,
                    image_url: slide.image_url,
                    audio_url: slide.voiceover_audio_url,
                    voiceover_script: slide.voiceover_script,
                    visual_prompt: slide.visual_prompt,
                    type: slide.slide_type || 'content',
                    question: slide.quiz_question,
                    options: slide.quiz_options,
                    correct_option: slide.quiz_correct_index,
                    quiz_explanation: slide.quiz_explanation,
                    estimated_duration_sec: slide.estimated_duration_sec,
                    video_url: slide.video_url,
                    asset_type: slide.asset_type,
                })),
            })),
        })),
        assessment: normalized.assessment || undefined,
    };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function CourseEditorPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'details' | 'editor' | 'preview'>('editor');

    const { data: course, isLoading } = useQuery<Course & { versions: CourseVersion[] }>({
        queryKey: ['admin-course-edit', courseId],
        queryFn: async () => {
            const { data } = await api.get(`/courses/${courseId}`);
            return data;
        },
        enabled: !!courseId,
    });

    const [selectedVersionIdx, setSelectedVersionIdx] = useState(0);
    const versions = course?.versions || [];
    const currentVersion = versions[selectedVersionIdx];
    const snapshot = currentVersion?.content_snapshot;

    const initialNormalized = useMemo(() => normalizeSnapshot(snapshot), [snapshot]);
    const [editedContent, setEditedContent] = useState<any>(null);

    useEffect(() => {
        setEditedContent(JSON.parse(JSON.stringify(initialNormalized)));
    }, [initialNormalized]);

    const hasContentChanges = useMemo(() => {
        if (!editedContent) return false;
        return JSON.stringify(editedContent) !== JSON.stringify(initialNormalized);
    }, [editedContent, initialNormalized]);

    // Metadata state
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDesc, setMetaDesc] = useState('');
    const [metaCategory, setMetaCategory] = useState('');
    const [metaDifficulty, setMetaDifficulty] = useState('');
    const [metaBasePrice, setMetaBasePrice] = useState('');
    const [metaSeatPrice, setMetaSeatPrice] = useState('');
    const [metaThumbnail, setMetaThumbnail] = useState('');
    const [thumbFile, setThumbFile] = useState<File | null>(null);

    useEffect(() => {
        if (course) {
            setMetaTitle(course.title || '');
            setMetaDesc(course.description || '');
            setMetaCategory(course.category || '');
            setMetaDifficulty(course.difficulty_level || '');
            setMetaBasePrice(String(Number(course.base_price) || 0));
            setMetaSeatPrice(course.seat_price ? String(Number(course.seat_price)) : '');
            setMetaThumbnail(course.thumbnail_url || '');
        }
    }, [course]);

    const updateMetaMut = useMutation({
        mutationFn: async () => {
            let thumbnailUrl = metaThumbnail;
            if (thumbFile) {
                const fd = new FormData();
                fd.append('file', thumbFile);
                const { data: uploadRes } = await api.post('/site-settings/upload', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                thumbnailUrl = uploadRes.url;
            }
            await api.patch(`/courses/${courseId}`, {
                title: metaTitle,
                description: metaDesc,
                category: metaCategory || undefined,
                difficulty_level: metaDifficulty || undefined,
                base_price: Number(metaBasePrice) || 0,
                seat_price: metaSeatPrice ? Number(metaSeatPrice) : undefined,
                thumbnail_url: thumbnailUrl || undefined,
            });
        },
        onSuccess: () => {
            toast.success('Course details saved');
            setThumbFile(null);
            queryClient.invalidateQueries({ queryKey: ['admin-course-edit', courseId] });
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save'),
    });

    const publishVersionMut = useMutation({
        mutationFn: async () => {
            if (!editedContent) throw new Error('No content');
            const snapshot = denormalizeToSnapshot(editedContent);
            await api.post(`/courses/${courseId}/publish`, { content_snapshot: snapshot });
        },
        onSuccess: () => {
            toast.success('New version saved');
            queryClient.invalidateQueries({ queryKey: ['admin-course-edit', courseId] });
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save version'),
    });

    const togglePublishMut = useMutation({
        mutationFn: async () => {
            if (course?.is_published) {
                await api.post(`/courses/${courseId}/unpublish`);
            } else {
                if (!versions.length) throw new Error('No version to publish');
                const snap = denormalizeToSnapshot(editedContent || initialNormalized);
                await api.post(`/courses/${courseId}/publish`, { content_snapshot: snap });
            }
        },
        onSuccess: () => {
            toast.success(course?.is_published ? 'Course unpublished' : 'Course published');
            queryClient.invalidateQueries({ queryKey: ['admin-course-edit', courseId] });
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
    });

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
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="min-w-0 flex-1">
                    <button onClick={() => navigate('/admin/courses')} className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-1">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Courses
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 truncate">{course.title}</h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {course.category}{course.category && course.difficulty_level ? ' · ' : ''}{course.difficulty_level}
                        {course.is_published ? (
                            <span className="ml-2 inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                                <CheckCircle className="w-3 h-3" /> Published
                            </span>
                        ) : (
                            <span className="ml-2 inline-flex items-center gap-1 text-amber-600 text-xs font-medium">Draft</span>
                        )}
                        {versions.length > 0 && (
                            <span className="ml-2 text-gray-400">· v{versions[0].version_number}</span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Tab switcher */}
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                        {(['details', 'editor', 'preview'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                                    activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab === 'details' && <Settings className="w-3.5 h-3.5" />}
                                {tab === 'editor' && <Pencil className="w-3.5 h-3.5" />}
                                {tab === 'preview' && <Eye className="w-3.5 h-3.5" />}
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => togglePublishMut.mutate()}
                        disabled={togglePublishMut.isPending}
                        className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
                            course.is_published
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                : 'btn-lime'
                        }`}
                    >
                        {course.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200">
                {activeTab === 'details' && (
                    <DetailsTab
                        metaTitle={metaTitle} setMetaTitle={setMetaTitle}
                        metaDesc={metaDesc} setMetaDesc={setMetaDesc}
                        metaCategory={metaCategory} setMetaCategory={setMetaCategory}
                        metaDifficulty={metaDifficulty} setMetaDifficulty={setMetaDifficulty}
                        metaBasePrice={metaBasePrice} setMetaBasePrice={setMetaBasePrice}
                        metaSeatPrice={metaSeatPrice} setMetaSeatPrice={setMetaSeatPrice}
                        metaThumbnail={metaThumbnail} setMetaThumbnail={setMetaThumbnail}
                        thumbFile={thumbFile} setThumbFile={setThumbFile}
                        onSave={() => updateMetaMut.mutate()}
                        isSaving={updateMetaMut.isPending}
                        versions={versions}
                        selectedVersionIdx={selectedVersionIdx}
                        setSelectedVersionIdx={setSelectedVersionIdx}
                    />
                )}
                {activeTab === 'editor' && editedContent && (
                    <ContentEditor
                        content={editedContent}
                        setContent={setEditedContent}
                        hasChanges={hasContentChanges}
                        onSaveVersion={() => publishVersionMut.mutate()}
                        isSaving={publishVersionMut.isPending}
                    />
                )}
                {activeTab === 'preview' && editedContent && (
                    <ContentPreview content={editedContent} />
                )}
                {activeTab !== 'details' && !editedContent && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <BookOpen className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm">No content yet. Create a version to start editing.</p>
                        <button
                            onClick={() => {
                                setEditedContent({
                                    levels: [{
                                        level_title: 'Level 1',
                                        level_order: 1,
                                        modules: [{
                                            module_title: 'Module 1',
                                            module_order: 1,
                                            slides: [{
                                                slide_title: 'Introduction',
                                                slide_type: 'content',
                                                slide_text: '',
                                                voiceover_script: '',
                                                visual_prompt: '',
                                                estimated_duration_sec: 30,
                                                image_url: null,
                                                voiceover_audio_url: null,
                                            }],
                                        }],
                                    }],
                                    assessment: null,
                                });
                            }}
                            className="mt-4 btn-lime text-sm"
                        >
                            <Plus className="w-4 h-4" /> Create Initial Content
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ===========================================================================
// DETAILS TAB
// ===========================================================================

function DetailsTab({
    metaTitle, setMetaTitle, metaDesc, setMetaDesc,
    metaCategory, setMetaCategory, metaDifficulty, setMetaDifficulty,
    metaBasePrice, setMetaBasePrice, metaSeatPrice, setMetaSeatPrice,
    metaThumbnail, setMetaThumbnail, thumbFile, setThumbFile,
    onSave, isSaving, versions, selectedVersionIdx, setSelectedVersionIdx,
}: {
    metaTitle: string; setMetaTitle: (s: string) => void;
    metaDesc: string; setMetaDesc: (s: string) => void;
    metaCategory: string; setMetaCategory: (s: string) => void;
    metaDifficulty: string; setMetaDifficulty: (s: string) => void;
    metaBasePrice: string; setMetaBasePrice: (s: string) => void;
    metaSeatPrice: string; setMetaSeatPrice: (s: string) => void;
    metaThumbnail: string; setMetaThumbnail: (s: string) => void;
    thumbFile: File | null; setThumbFile: (f: File | null) => void;
    onSave: () => void; isSaving: boolean;
    versions: CourseVersion[]; selectedVersionIdx: number; setSelectedVersionIdx: (n: number) => void;
}) {
    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto p-8 space-y-8">
                {/* Course Info */}
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <FileText className="w-5 h-5" style={{ color: 'var(--bs-teal)' }} />
                            Course Details
                        </h2>
                        <button onClick={onSave} disabled={isSaving} className="btn-lime inline-flex items-center gap-2 text-sm">
                            <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Details'}
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Course Title</label>
                        <input className="bs-input" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="Enter course title..." />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                        <textarea className="bs-input !min-h-[120px] resize-y" value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} placeholder="Course description..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                <Tag className="w-3.5 h-3.5 inline mr-1" />Category
                            </label>
                            <input className="bs-input" value={metaCategory} onChange={(e) => setMetaCategory(e.target.value)} placeholder="e.g. Food Hygiene" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                <Layers className="w-3.5 h-3.5 inline mr-1" />Difficulty Level
                            </label>
                            <select className="bs-input" value={metaDifficulty} onChange={(e) => setMetaDifficulty(e.target.value)}>
                                <option value="">Select level</option>
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Pricing */}
                <div className="border-t border-gray-100 pt-6 space-y-5">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <DollarSign className="w-5 h-5" style={{ color: 'var(--bs-teal)' }} />
                        Pricing
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Individual Price ($)</label>
                            <input type="number" step="0.01" min="0" className="bs-input" value={metaBasePrice} onChange={(e) => setMetaBasePrice(e.target.value)} />
                            <p className="text-xs text-gray-400 mt-1">Set to 0 for free courses</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Per-Seat Price ($)</label>
                            <input type="number" step="0.01" min="0" className="bs-input" value={metaSeatPrice} onChange={(e) => setMetaSeatPrice(e.target.value)} placeholder="Optional" />
                            <p className="text-xs text-gray-400 mt-1">For business bulk purchases</p>
                        </div>
                    </div>
                </div>

                {/* Thumbnail */}
                <div className="border-t border-gray-100 pt-6 space-y-5">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" style={{ color: 'var(--bs-teal)' }} />
                        Thumbnail
                    </h2>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                        {thumbFile ? (
                            <div>
                                <img src={URL.createObjectURL(thumbFile)} alt="Preview" className="w-full max-h-48 object-cover rounded-lg mx-auto mb-3" />
                                <p className="text-sm text-gray-600">{thumbFile.name}</p>
                                <button onClick={() => setThumbFile(null)} className="text-xs text-red-500 mt-1">Remove</button>
                            </div>
                        ) : metaThumbnail ? (
                            <div>
                                <img src={metaThumbnail} alt="Thumbnail" className="w-full max-h-48 object-cover rounded-lg mx-auto mb-3" />
                                <button onClick={() => setMetaThumbnail('')} className="text-xs text-red-500 mt-1">Remove</button>
                            </div>
                        ) : (
                            <label className="cursor-pointer">
                                <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500 mb-1">Click to upload thumbnail</p>
                                <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setThumbFile(f); }} />
                            </label>
                        )}
                    </div>
                    {!thumbFile && !metaThumbnail && (
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Or paste image URL</label>
                            <input className="bs-input" value={metaThumbnail} onChange={(e) => setMetaThumbnail(e.target.value)} placeholder="https://..." />
                        </div>
                    )}
                </div>

                {/* Version History */}
                <div className="border-t border-gray-100 pt-6 space-y-5">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Layers className="w-5 h-5" style={{ color: 'var(--bs-teal)' }} />
                        Version History
                    </h2>
                    {versions.length === 0 ? (
                        <p className="text-sm text-gray-400">No versions yet. Use the Editor tab to create content and save a version.</p>
                    ) : (
                        <div className="space-y-2">
                            {versions.map((v, idx) => {
                                const isSelected = idx === selectedVersionIdx;
                                const slideCount = (v.content_snapshot?.levels || []).reduce(
                                    (s: number, l: any) => s + (l.modules || []).reduce((ms: number, m: any) => ms + (m.slides || []).length, 0), 0
                                );
                                return (
                                    <button
                                        key={v.id}
                                        onClick={() => setSelectedVersionIdx(idx)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
                                            isSelected ? 'border-[var(--bs-teal)] bg-[var(--bs-teal)]/5' : 'border-gray-100 hover:border-gray-200'
                                        }`}
                                    >
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Version {v.version_number}</p>
                                            <p className="text-xs text-gray-500">{new Date(v.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400">{slideCount} slides</p>
                                            {isSelected && <span className="text-[10px] font-bold text-[var(--bs-teal)] uppercase">Active</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ===========================================================================
// CONTENT EDITOR
// ===========================================================================

function ContentEditor({
    content, setContent, hasChanges, onSaveVersion, isSaving,
}: {
    content: any;
    setContent: (c: any) => void;
    hasChanges: boolean;
    onSaveVersion: () => void;
    isSaving: boolean;
}) {
    const levels = content.levels || [];
    const assessment = content.assessment || null;

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [expandedLevels, setExpandedLevels] = useState<Set<number>>(() => new Set(levels.map((_: any, i: number) => i)));
    const [formData, setFormData] = useState<NormalizedSlide | null>(null);
    const [assetTab, setAssetTab] = useState<'image' | 'video'>('image');
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'level' | 'module' | 'slide'; levelIndex: number; moduleIndex?: number; slideIndex?: number; label: string } | null>(null);
    const [assessmentData, setAssessmentData] = useState<any>(null);

    useEffect(() => {
        if (assessment) setAssessmentData(JSON.parse(JSON.stringify(assessment)));
    }, [assessment?.questions?.length]);

    const selectedSlide = useMemo(() => {
        if (!selectedId || selectedId === 'assessment') return null;
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

    const handleSaveSlide = useCallback(() => {
        if (!selectedSlide || !formData) return;
        const updated = JSON.parse(JSON.stringify(content));
        const slide = updated.levels[selectedSlide.levelIndex].modules[selectedSlide.moduleIndex].slides[selectedSlide.sIdx - 1];
        Object.assign(slide, formData);
        setContent(updated);
        toast.success('Slide updated in editor');
    }, [selectedSlide, formData, content, setContent]);

    const handleAddSlide = useCallback((levelIndex: number, moduleIndex: number, type: 'content' | 'quiz' = 'content') => {
        const updated = JSON.parse(JSON.stringify(content));
        const mod = updated.levels[levelIndex].modules[moduleIndex];
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
        setContent(updated);
    }, [content, setContent]);

    const handleAddLevel = useCallback(() => {
        const updated = JSON.parse(JSON.stringify(content));
        const order = updated.levels.length + 1;
        updated.levels.push({
            level_title: `Level ${order}`,
            level_order: order,
            modules: [{
                module_title: 'Module 1',
                module_order: 1,
                slides: [{
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
                }],
            }],
        });
        setContent(updated);
        setExpandedLevels((prev) => new Set([...prev, updated.levels.length - 1]));
    }, [content, setContent]);

    const handleAddModule = useCallback((levelIndex: number) => {
        const updated = JSON.parse(JSON.stringify(content));
        const level = updated.levels[levelIndex];
        const order = level.modules.length + 1;
        level.modules.push({
            module_title: `Module ${order}`,
            module_order: order,
            slides: [{
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
            }],
        });
        setContent(updated);
    }, [content, setContent]);

    const handleDeleteLevel = useCallback((levelIndex: number) => {
        const updated = JSON.parse(JSON.stringify(content));
        updated.levels.splice(levelIndex, 1);
        updated.levels.forEach((l: any, i: number) => { l.level_order = i + 1; });
        setContent(updated);
        setSelectedId(null);
    }, [content, setContent]);

    const handleDeleteModule = useCallback((levelIndex: number, moduleIndex: number) => {
        const updated = JSON.parse(JSON.stringify(content));
        updated.levels[levelIndex].modules.splice(moduleIndex, 1);
        updated.levels[levelIndex].modules.forEach((m: any, i: number) => { m.module_order = i + 1; });
        setContent(updated);
        setSelectedId(null);
    }, [content, setContent]);

    const handleDeleteSlide = useCallback((levelIndex: number, moduleIndex: number, slideIndex: number) => {
        const updated = JSON.parse(JSON.stringify(content));
        updated.levels[levelIndex].modules[moduleIndex].slides.splice(slideIndex, 1);
        setContent(updated);
        setSelectedId(null);
    }, [content, setContent]);

    const handleMoveSlide = useCallback((levelIndex: number, moduleIndex: number, slideIndex: number, dir: 'up' | 'down') => {
        const updated = JSON.parse(JSON.stringify(content));
        const slides = updated.levels[levelIndex].modules[moduleIndex].slides;
        const target = dir === 'up' ? slideIndex - 1 : slideIndex + 1;
        if (target < 0 || target >= slides.length) return;
        [slides[slideIndex], slides[target]] = [slides[target], slides[slideIndex]];
        setContent(updated);
    }, [content, setContent]);

    const handleSaveAssessment = useCallback(() => {
        if (!assessmentData) return;
        const updated = JSON.parse(JSON.stringify(content));
        updated.assessment = assessmentData;
        setContent(updated);
        toast.success('Assessment updated');
    }, [assessmentData, content, setContent]);

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

    const handleConfirmDelete = () => {
        if (!deleteTarget) return;
        const { type, levelIndex, moduleIndex, slideIndex } = deleteTarget;
        if (type === 'level') handleDeleteLevel(levelIndex);
        else if (type === 'module' && moduleIndex !== undefined) handleDeleteModule(levelIndex, moduleIndex);
        else if (type === 'slide' && moduleIndex !== undefined && slideIndex !== undefined) handleDeleteSlide(levelIndex, moduleIndex, slideIndex);
        setDeleteTarget(null);
    };

    return (
        <div className="flex h-full">
            <ConfirmDialog
                open={!!deleteTarget}
                title={`Delete ${deleteTarget?.type || 'item'}?`}
                message={`Are you sure you want to delete "${deleteTarget?.label || ''}"? This action cannot be undone.`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
            {/* Sidebar */}
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
                                <div className="group/level flex items-center">
                                    <button
                                        onClick={() => toggleLevel(li)}
                                        className="flex-1 flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                        <span className="truncate">L{li + 1}: {level.level_title}</span>
                                    </button>
                                    <div className="opacity-0 group-hover/level:opacity-100 flex items-center gap-0.5 mr-1">
                                        <button onClick={() => handleAddModule(li)} className="p-0.5 rounded hover:bg-green-100 text-green-400 hover:text-green-600 transition-colors" title="Add module">
                                            <Plus className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => setDeleteTarget({ type: 'level', levelIndex: li, label: level.level_title })} className="p-0.5 rounded hover:bg-red-100 text-red-300 hover:text-red-500 transition-colors" title="Delete level">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                                {isOpen && (level.modules || []).map((mod: any, mi: number) => (
                                    <div key={mi} className="ml-3 mt-1 mb-2">
                                        <div className="group/mod flex items-center justify-between px-2 mb-1">
                                            <span className="text-[10px] font-semibold text-gray-400 uppercase truncate flex-1">{mod.module_title}</span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleAddSlide(li, mi, 'content')} className="p-0.5 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors" title="Add content slide">
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                                <button onClick={() => handleAddSlide(li, mi, 'quiz')} className="p-0.5 rounded hover:bg-amber-100 text-amber-400 hover:text-amber-600 transition-colors" title="Add quiz slide">
                                                    <HelpCircle className="w-3 h-3" />
                                                </button>
                                                <button onClick={() => setDeleteTarget({ type: 'module', levelIndex: li, moduleIndex: mi, label: mod.module_title })} className="p-0.5 rounded hover:bg-red-100 text-red-300 hover:text-red-500 transition-colors opacity-0 group-hover/mod:opacity-100" title="Delete module">
                                                    <Trash2 className="w-3 h-3" />
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
                                                                isSelected ? 'bg-[var(--bs-teal)] text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:shadow-sm'
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
                                                            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'slide', levelIndex: li, moduleIndex: mi, slideIndex: si, label: slide.slide_title || 'Untitled' }); }} className="p-1 hover:text-red-500" title="Delete"><Trash2 className="w-3 h-3" /></button>
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

                    {assessment && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                            <button
                                onClick={() => { setSelectedId('assessment'); setFormData(null); }}
                                className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                                    selectedId === 'assessment' ? 'bg-[var(--bs-teal)] text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'
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

                    <div className="mt-3 pt-3 border-t border-gray-200 px-1">
                        <button
                            onClick={handleAddLevel}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 hover:text-[var(--bs-teal)] border border-dashed border-gray-300 hover:border-[var(--bs-teal)] rounded-lg transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Level
                        </button>
                    </div>
                </div>

                {/* Save Version button at bottom */}
                <div className="p-3 border-t border-gray-100">
                    <button
                        onClick={onSaveVersion}
                        disabled={isSaving || !hasChanges}
                        className="w-full btn-lime inline-flex items-center justify-center gap-2 text-sm disabled:opacity-40"
                    >
                        <Upload className="w-4 h-4" />
                        {isSaving ? 'Saving...' : hasChanges ? 'Save as New Version' : 'No Changes'}
                    </button>
                </div>
            </div>

            {/* Editor Panel */}
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
                    />
                ) : selectedSlide && formData ? (
                    <div className="p-6">
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
                            <button onClick={handleSaveSlide} className="btn-lime inline-flex items-center gap-2 text-sm">
                                <Save className="w-4 h-4" /> Apply Changes
                            </button>
                        </div>

                        {formData.slide_type === 'quiz' ? (
                            <div className="space-y-5 max-w-2xl">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Slide Title</label>
                                    <input className="bs-input" value={formData.slide_title} onChange={(e) => setFormData({ ...formData, slide_title: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Context Paragraph</label>
                                    <textarea className="bs-input !min-h-[60px] text-sm resize-y" value={formData.slide_text} onChange={(e) => setFormData({ ...formData, slide_text: e.target.value })} placeholder="Brief context for the quiz question..." />
                                </div>
                                <div className="border border-amber-200 rounded-xl p-5 bg-amber-50/30">
                                    <label className="block text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                                        <HelpCircle className="w-3 h-3 inline mr-1" />Question
                                    </label>
                                    <textarea className="bs-input !min-h-[60px] text-sm font-medium resize-y" value={formData.quiz_question || ''} onChange={(e) => setFormData({ ...formData, quiz_question: e.target.value })} placeholder="Enter the quiz question..." />
                                    <div className="mt-4 space-y-2">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Answer Options</label>
                                        {(formData.quiz_options || ['', '', '', '']).map((opt, oi) => {
                                            const isCorrect = (formData.quiz_correct_index ?? 0) === oi;
                                            return (
                                                <div key={oi} className="flex items-center gap-2">
                                                    <button type="button" onClick={() => setFormData({ ...formData, quiz_correct_index: oi })} className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isCorrect ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-gray-400'}`}>
                                                        {isCorrect && <CheckCircle className="w-3 h-3 text-white" />}
                                                    </button>
                                                    <input className={`bs-input flex-1 text-sm ${isCorrect ? '!border-green-300 !bg-green-50/50' : ''}`} value={opt} onChange={(e) => {
                                                        const opts = [...(formData.quiz_options || ['', '', '', ''])];
                                                        opts[oi] = e.target.value;
                                                        setFormData({ ...formData, quiz_options: opts });
                                                    }} placeholder={`Option ${String.fromCharCode(65 + oi)}`} />
                                                    {isCorrect && <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded flex-shrink-0">CORRECT</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Explanation</label>
                                        <textarea className="bs-input !min-h-[60px] text-sm resize-y" value={formData.quiz_explanation || ''} onChange={(e) => setFormData({ ...formData, quiz_explanation: e.target.value })} placeholder="Explain why the correct answer is right..." />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Slide Title</label>
                                        <input className="bs-input" value={formData.slide_title} onChange={(e) => setFormData({ ...formData, slide_title: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Slide Content</label>
                                        <textarea className="bs-input !min-h-[180px] font-mono text-sm leading-relaxed resize-y mt-1.5" value={formData.slide_text} onChange={(e) => setFormData({ ...formData, slide_text: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Voiceover Script</label>
                                        <textarea className="bs-input !min-h-[120px] text-sm leading-relaxed resize-y mt-1.5" value={formData.voiceover_script} onChange={(e) => setFormData({ ...formData, voiceover_script: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                            <Clock className="w-3 h-3 inline mr-1" />Duration (seconds)
                                        </label>
                                        <input type="number" min="5" className="bs-input !w-24" value={formData.estimated_duration_sec} onChange={(e) => setFormData({ ...formData, estimated_duration_sec: Number(e.target.value) })} />
                                    </div>
                                </div>
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
                                                            <p className="text-xs">No video</p>
                                                        </div>
                                                    )
                                                ) : (
                                                    formData.image_url ? (
                                                        <img src={getStaticUrl(formData.image_url)} alt="Slide visual" className="max-h-[220px] object-contain rounded" />
                                                    ) : (
                                                        <div className="text-center text-gray-400 py-8">
                                                            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                                            <p className="text-xs">No image</p>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Audio Narration</label>
                                        <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 flex items-center gap-3 mt-1.5">
                                            {formData.voiceover_audio_url ? (
                                                <audio controls key={getStaticUrl(formData.voiceover_audio_url)} className="h-8 flex-1">
                                                    <source src={getStaticUrl(formData.voiceover_audio_url)} type="audio/mpeg" />
                                                </audio>
                                            ) : (
                                                <span className="text-xs text-gray-400 flex-1 px-2">No audio</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visual Prompt</label>
                                        <textarea className="bs-input !min-h-[80px] text-xs text-gray-500 resize-y mt-1.5" value={formData.visual_prompt} onChange={(e) => setFormData({ ...formData, visual_prompt: e.target.value })} placeholder="Describe the visual..." />
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
    );
}

// ===========================================================================
// ASSESSMENT EDITOR (Inline)
// ===========================================================================

function AssessmentEditor({
    data, onUpdateQuestion, onUpdateOption, onSetCorrect,
    onAddQuestion, onRemoveQuestion, onPassPercentageChange, onSave,
}: {
    data: any;
    onUpdateQuestion: (qi: number, field: string, value: any) => void;
    onUpdateOption: (qi: number, oi: number, value: string) => void;
    onSetCorrect: (qi: number, oi: number) => void;
    onAddQuestion: () => void;
    onRemoveQuestion: (qi: number) => void;
    onPassPercentageChange: (v: number) => void;
    onSave: () => void;
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
                <button onClick={onSave} className="btn-lime inline-flex items-center gap-2 text-sm">
                    <Save className="w-4 h-4" /> Apply Changes
                </button>
            </div>

            <div className="mb-6 flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pass Percentage</label>
                <input type="number" min="1" max="100" className="bs-input !w-20 text-center" value={data.pass_percentage || 85} onChange={(e) => onPassPercentageChange(Number(e.target.value))} />
                <span className="text-xs text-gray-400">%</span>
            </div>

            <div className="space-y-4">
                {questions.map((q: any, qi: number) => (
                    <div key={qi} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 hover:border-gray-300 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--bs-teal)] text-white text-xs font-bold flex items-center justify-center mt-0.5">{qi + 1}</span>
                                <textarea className="bs-input !min-h-[44px] flex-1 text-sm font-medium resize-y" value={q.question} onChange={(e) => onUpdateQuestion(qi, 'question', e.target.value)} placeholder="Enter question..." rows={1} />
                            </div>
                            <button onClick={() => setDeleteQIdx(qi)} disabled={questions.length <= 1} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-20 transition-colors flex-shrink-0" title="Remove">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="ml-9 space-y-2">
                            {(q.options || []).map((opt: string, oi: number) => {
                                const isCorrect = q.correct_option_index === oi;
                                return (
                                    <div key={oi} className="flex items-center gap-2">
                                        <button onClick={() => onSetCorrect(qi, oi)} className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isCorrect ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-gray-400'}`}>
                                            {isCorrect && <CheckCircle className="w-3 h-3 text-white" />}
                                        </button>
                                        <input className={`bs-input flex-1 text-sm ${isCorrect ? '!border-green-300 !bg-green-50/50' : ''}`} value={opt} onChange={(e) => onUpdateOption(qi, oi, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oi)}`} />
                                        {isCorrect && <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded flex-shrink-0">CORRECT</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={onAddQuestion} className="mt-4 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors inline-flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Question
            </button>
        </div>
    );
}

// ===========================================================================
// CONTENT PREVIEW
// ===========================================================================

function ContentPreview({ content }: { content: any }) {
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
