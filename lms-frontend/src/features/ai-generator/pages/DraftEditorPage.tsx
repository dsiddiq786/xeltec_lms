import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import {
    ArrowLeft, BookOpen, ChevronDown, ChevronRight, Upload, CheckCircle,
    Image, DollarSign, FileText, RefreshCw, Sparkles, X, MessageSquare,
} from 'lucide-react';

const PUBLISH_STEPS = ['Details', 'Thumbnail', 'Pricing'];

interface RegenTarget {
    section: 'slide' | 'module' | 'assessment' | 'image';
    level_order?: number;
    module_order?: number;
    slide_index?: number;
    label: string;
}

export function DraftEditorPage() {
    const { draftId } = useParams<{ draftId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
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

    const [regenTarget, setRegenTarget] = useState<RegenTarget | null>(null);
    const [regenPrompt, setRegenPrompt] = useState('');

    const { data: course, isLoading } = useQuery({
        queryKey: ['ai-course', draftId],
        queryFn: async () => {
            const { data } = await api.get(`course-generator/courses/${draftId}`);
            return data;
        },
        enabled: !!draftId,
    });

    const publishMutation = useMutation({
        mutationFn: async () => {
            let thumbnailUrl = pubThumbnail;
            if (pubThumbnailFile) {
                setUploading(true);
                const formData = new FormData();
                formData.append('file', pubThumbnailFile);
                const { data: uploadRes } = await api.post('/site-settings/upload', formData, {
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

    const regenMutation = useMutation({
        mutationFn: async (target: RegenTarget & { prompt?: string }) => {
            const { data } = await api.post(`course-generator/courses/${draftId}/regenerate`, {
                section: target.section,
                level_order: target.level_order,
                module_order: target.module_order,
                slide_index: target.slide_index,
                prompt: target.prompt || undefined,
            });
            return data;
        },
        onSuccess: (data) => {
            toast.success(`${data.section} regenerated successfully`);
            queryClient.invalidateQueries({ queryKey: ['ai-course', draftId] });
            setRegenTarget(null);
            setRegenPrompt('');
        },
        onError: (err: any) => {
            const detail = err?.response?.data?.detail;
            const msg = typeof detail === 'string' ? detail : detail?.message || 'Regeneration failed';
            if (err?.response?.status === 429) {
                toast.error('OpenAI quota exceeded. Check your billing.');
            } else {
                toast.error(msg);
            }
        },
    });

    const toggleModule = (key: string) => {
        setExpandedModules((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const openPublishModal = () => {
        setPubTitle(course?.course_title || '');
        setPubDescription(course?.description || '');
        setPubCategory(course?.category || '');
        setPubThumbnail('');
        setPubThumbnailFile(null);
        setPubBasePrice('0');
        setPubSeatPrice('');
        setPublishStep(0);
        setShowPublish(true);
    };

    const openRegen = (target: RegenTarget) => {
        setRegenTarget(target);
        setRegenPrompt('');
    };

    const submitRegen = () => {
        if (!regenTarget) return;
        regenMutation.mutate({ ...regenTarget, prompt: regenPrompt || undefined });
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
        );
    }

    if (!course) {
        return <div className="text-center py-16 text-gray-400">Course draft not found.</div>;
    }

    const levels = course.levels || [];
    const assessment = course.assessment;
    const isPublished = course.published_to_lms;

    return (
        <div>
            <button onClick={() => navigate('/admin/ai-generator')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to Jobs
            </button>

            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{course.course_title || 'Untitled Draft'}</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {course.category} &middot; {course.course_level}
                        {isPublished && (
                            <span className="ml-2 inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                                <CheckCircle className="w-3.5 h-3.5" /> Published
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => openRegen({ section: 'assessment', label: 'Assessment' })}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Regenerate Assessment
                    </button>
                    {!isPublished && (
                        <button onClick={openPublishModal} className="btn-lime inline-flex items-center gap-2">
                            <Upload className="w-4 h-4" /> Publish to LMS
                        </button>
                    )}
                </div>
            </div>

            {/* Course tree */}
            <div className="space-y-4">
                {levels.map((level: any, li: number) => (
                    <div key={li} className="bs-card overflow-hidden">
                        <div className="p-4 border-b border-gray-50" style={{ background: 'var(--bs-gray-50)' }}>
                            <h2 className="text-sm font-semibold text-gray-900">Level {li + 1}: {level.level_title || `Level ${li + 1}`}</h2>
                        </div>
                        {(level.modules || []).map((mod: any, mi: number) => {
                            const key = `${li}-${mi}`;
                            const isOpen = expandedModules.has(key);
                            const slides = mod.slides || [];
                            return (
                                <div key={mi}>
                                    <div
                                        className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                                        style={{ borderTop: mi > 0 ? '1px solid var(--bs-gray-100)' : 'none' }}
                                    >
                                        <button
                                            onClick={() => toggleModule(key)}
                                            className="flex items-center gap-3 flex-1 text-left"
                                        >
                                            {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                            <BookOpen className="w-4 h-4" style={{ color: 'var(--bs-teal)' }} />
                                            <span className="text-sm font-medium text-gray-900">{mod.module_title || mod.title || `Module ${mi + 1}`}</span>
                                            <span className="text-xs text-gray-400 ml-1">{slides.length} slides</span>
                                        </button>
                                        <button
                                            onClick={() => openRegen({
                                                section: 'module',
                                                level_order: level.level_order ?? li + 1,
                                                module_order: mod.module_order ?? mi + 1,
                                                label: mod.module_title || `Module ${mi + 1}`,
                                            })}
                                            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                            title="Regenerate module"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    {isOpen && slides.length > 0 && (
                                        <div className="border-t border-gray-50 bg-gray-50/50">
                                            {slides.map((slide: any, si: number) => (
                                                <div key={si} className="px-5 py-3 pl-14 flex items-start justify-between group" style={{ borderTop: si > 0 ? '1px solid #f5f5f5' : 'none' }}>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-gray-800 mb-1">
                                                            {slide.title || slide.slide_title || `Slide ${si + 1}`}
                                                        </div>
                                                        {(slide.slide_text || slide.content) && (
                                                            <p className="text-xs text-gray-500 line-clamp-2">{(slide.slide_text || slide.content || '').substring(0, 200)}</p>
                                                        )}
                                                        {slide.image_url && (
                                                            <div className="mt-2 flex items-center gap-2">
                                                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Has image</span>
                                                                <button
                                                                    onClick={() => openRegen({
                                                                        section: 'image',
                                                                        level_order: level.level_order ?? li + 1,
                                                                        module_order: mod.module_order ?? mi + 1,
                                                                        slide_index: si + 1,
                                                                        label: `Image: ${slide.title || slide.slide_title || `Slide ${si + 1}`}`,
                                                                    })}
                                                                    className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5"
                                                                >
                                                                    <RefreshCw className="w-2.5 h-2.5" /> Regen image
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => openRegen({
                                                            section: 'slide',
                                                            level_order: level.level_order ?? li + 1,
                                                            module_order: mod.module_order ?? mi + 1,
                                                            slide_index: si + 1,
                                                            label: slide.title || slide.slide_title || `Slide ${si + 1}`,
                                                        })}
                                                        className="p-1.5 rounded-md text-gray-300 opacity-0 group-hover:opacity-100 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                                        title="Regenerate slide"
                                                    >
                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}

                {assessment && (
                    <div className="bs-card p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-gray-900">Assessment</h2>
                            <button
                                onClick={() => openRegen({ section: 'assessment', label: 'Assessment' })}
                                className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Regenerate assessment"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">{assessment.questions?.length || 0} questions &middot; Pass: {assessment.pass_percentage || 85}%</p>
                        <div className="space-y-2">
                            {(assessment.questions || []).slice(0, 5).map((q: any, i: number) => (
                                <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                                    <strong className="text-gray-900">Q{i + 1}:</strong> {q.question}
                                </div>
                            ))}
                            {(assessment.questions?.length || 0) > 5 && (
                                <p className="text-xs text-gray-400 pl-3">...and {assessment.questions.length - 5} more questions</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Regenerate Modal */}
            {regenTarget && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setRegenTarget(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4" style={{ color: 'var(--bs-teal)' }} />
                                <h3 className="text-sm font-semibold text-gray-900">Regenerate {regenTarget.section}</h3>
                            </div>
                            <button onClick={() => setRegenTarget(null)} className="p-1 rounded-lg hover:bg-gray-100">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="p-3 rounded-lg bg-gray-50">
                                <p className="text-xs text-gray-500">Target</p>
                                <p className="text-sm font-medium text-gray-900">{regenTarget.label}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                                    <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                                    Custom prompt (optional)
                                </label>
                                <textarea
                                    className="bs-input !h-24 resize-none"
                                    value={regenPrompt}
                                    onChange={(e) => setRegenPrompt(e.target.value)}
                                    placeholder="e.g. Make it more beginner-friendly, add real-world examples..."
                                />
                                <p className="text-xs text-gray-400 mt-1">Leave empty to use default regeneration</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
                            <button
                                onClick={() => setRegenTarget(null)}
                                className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitRegen}
                                disabled={regenMutation.isPending}
                                className="btn-lime disabled:opacity-50"
                            >
                                {regenMutation.isPending ? (
                                    <><RefreshCw className="w-4 h-4 animate-spin" /> Regenerating...</>
                                ) : (
                                    <><Sparkles className="w-4 h-4" /> Regenerate</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Publish Modal */}
            {showPublish && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPublish(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex border-b border-gray-100">
                            {PUBLISH_STEPS.map((step, i) => (
                                <button
                                    key={step}
                                    onClick={() => setPublishStep(i)}
                                    className={`flex-1 py-3.5 text-sm font-medium text-center border-b-2 transition-colors ${
                                        publishStep === i
                                            ? 'border-[var(--bs-teal)] text-[var(--bs-teal)]'
                                            : 'border-transparent text-gray-400'
                                    }`}
                                >
                                    <span className="inline-flex items-center gap-1.5">
                                        {i === 0 && <FileText className="w-3.5 h-3.5" />}
                                        {i === 1 && <Image className="w-3.5 h-3.5" />}
                                        {i === 2 && <DollarSign className="w-3.5 h-3.5" />}
                                        {step}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="p-6">
                            {publishStep === 0 && (
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
                            {publishStep === 1 && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Thumbnail Image</label>
                                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                                            {pubThumbnailFile ? (
                                                <div>
                                                    <img src={URL.createObjectURL(pubThumbnailFile)} alt="Preview" className="w-40 h-28 object-cover rounded-lg mx-auto mb-3" />
                                                    <p className="text-sm text-gray-600">{pubThumbnailFile.name}</p>
                                                    <button onClick={() => setPubThumbnailFile(null)} className="text-xs text-red-500 mt-1">Remove</button>
                                                </div>
                                            ) : (
                                                <label className="cursor-pointer">
                                                    <Image className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                    <p className="text-sm text-gray-500 mb-1">Click to upload thumbnail</p>
                                                    <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPubThumbnailFile(f); }} />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Or paste image URL</label>
                                        <input className="bs-input" value={pubThumbnail} onChange={(e) => setPubThumbnail(e.target.value)} placeholder="https://..." disabled={!!pubThumbnailFile} />
                                    </div>
                                </div>
                            )}
                            {publishStep === 2 && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Individual Price ($)</label>
                                        <input type="number" step="0.01" min="0" className="bs-input" value={pubBasePrice} onChange={(e) => setPubBasePrice(e.target.value)} placeholder="0.00" />
                                        <p className="text-xs text-gray-400 mt-1">Set to 0 for free courses</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Per-Seat Price for Business ($)</label>
                                        <input type="number" step="0.01" min="0" className="bs-input" value={pubSeatPrice} onChange={(e) => setPubSeatPrice(e.target.value)} placeholder="Leave empty to use individual price" />
                                        <p className="text-xs text-gray-400 mt-1">Optional: business customers may get a different per-seat rate</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => publishStep > 0 ? setPublishStep(publishStep - 1) : setShowPublish(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                                >
                                    {publishStep > 0 ? 'Back' : 'Cancel'}
                                </button>
                                {publishStep < PUBLISH_STEPS.length - 1 ? (
                                    <button onClick={() => setPublishStep(publishStep + 1)} className="btn-lime">Next</button>
                                ) : (
                                    <button
                                        onClick={() => publishMutation.mutate()}
                                        disabled={publishMutation.isPending || uploading}
                                        className="btn-lime disabled:opacity-50 inline-flex items-center gap-2"
                                    >
                                        <Upload className="w-4 h-4" />
                                        {uploading ? 'Uploading...' : publishMutation.isPending ? 'Publishing...' : 'Publish Course'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
