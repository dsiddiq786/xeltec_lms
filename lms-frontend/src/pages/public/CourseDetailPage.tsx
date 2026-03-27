import { useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    Star, Clock, Calendar, ChevronDown, ChevronUp, Play,
    FileText, Copy, Check, ShoppingCart,
    Monitor, Smartphone, Award, Zap, BookOpen, Layers,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { CourseCard } from '../../components/shared/CourseCard';
import { FAQSection } from '../../components/shared/FAQSection';
import type { Course } from '../../types';

const TABS = ['Overview', 'Curriculum', 'Review'] as const;
type Tab = typeof TABS[number];

export function CourseDetailPage() {
    const { courseId: id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('Overview');
    const [expandedSections, setExpandedSections] = useState<number[]>([0]);
    const [copied, setCopied] = useState(false);
    const [enrollLoading, setEnrollLoading] = useState(false);

    const { data: course, isLoading } = useQuery<Course & { versions?: any[] }>({
        queryKey: ['course-detail', id],
        queryFn: async () => {
            const { data } = await api.get(`/courses/catalog/${id}`);
            return data;
        },
        enabled: !!id,
    });

    const { data: recommendedData } = useQuery({
        queryKey: ['recommended-courses'],
        queryFn: async () => {
            const { data } = await api.get('/courses/catalog?limit=3');
            return data;
        },
    });

    const recommended = (recommendedData as any)?.data?.filter((c: any) => c.id !== id)?.slice(0, 2) || [];

    const latestVersion = course?.versions?.[0];
    const snapshot = latestVersion?.content_snapshot;

    const curriculum = useMemo(() => {
        if (!snapshot?.levels) return [];
        return snapshot.levels.map((level: any) => ({
            title: level.title || level.level_title || 'Untitled Level',
            modules: (level.modules || []).map((mod: any) => ({
                title: mod.title || mod.module_title || 'Untitled Module',
                slides: (mod.slides || []).map((s: any) => ({
                    title: s.title || s.slide_title || 'Untitled',
                    type: s.type || s.slide_type || 'content',
                    duration: s.estimated_duration_sec || 30,
                })),
            })),
        }));
    }, [snapshot]);

    const totalSlides = useMemo(() =>
        curriculum.reduce((s: number, l: any) => s + l.modules.reduce((ms: number, m: any) => ms + m.slides.length, 0), 0),
        [curriculum],
    );

    const totalModules = useMemo(() =>
        curriculum.reduce((s: number, l: any) => s + l.modules.length, 0),
        [curriculum],
    );

    const totalDurationSec = useMemo(() =>
        curriculum.reduce((s: number, l: any) => s + l.modules.reduce(
            (ms: number, m: any) => ms + m.slides.reduce((ss: number, sl: any) => ss + sl.duration, 0), 0,
        ), 0),
        [curriculum],
    );

    const durationDisplay = useMemo(() => {
        const hrs = Math.floor(totalDurationSec / 3600);
        const mins = Math.round((totalDurationSec % 3600) / 60);
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return `${mins} min`;
    }, [totalDurationSec]);

    const handleBuyCourse = async () => {
        if (!course) return;

        if (!isAuthenticated) {
            toast.error('Please sign in to purchase this course');
            navigate('/login', { state: { from: location } });
            return;
        }

        if (coursePrice <= 0) {
            if (!latestVersion) {
                toast.error('Course is not available yet');
                return;
            }
            setEnrollLoading(true);
            try {
                const { data } = await api.post('/payments/checkout', {
                    course_version_id: latestVersion.id,
                    success_url: `${window.location.origin}/checkout/success?course=${course.id}`,
                    cancel_url: `${window.location.origin}/courses/${course.id}`,
                });
                if (data.free) {
                    toast.success('Enrolled successfully!');
                    navigate('/dashboard');
                }
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Failed to enroll');
            } finally {
                setEnrollLoading(false);
            }
            return;
        }

        setEnrollLoading(true);
        try {
            await api.post('/purchase-requests', {
                course_id: course.id,
                request_type: 'INDIVIDUAL',
            });
            toast.success('Purchase request submitted! You\'ll be notified when approved.');
        } catch (err: any) {
            if (err?.response?.status === 401) {
                toast.error('Session expired. Please sign in again.');
                navigate('/login', { state: { from: location } });
            } else {
                toast.error(err?.response?.data?.message || 'Failed to submit request');
            }
        } finally {
            setEnrollLoading(false);
        }
    };

    const toggleSection = (idx: number) => {
        setExpandedSections((prev) =>
            prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
        );
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-8 py-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 w-48 bg-gray-200 rounded" />
                    <div className="h-8 w-96 bg-gray-200 rounded" />
                    <div className="h-4 w-64 bg-gray-200 rounded" />
                    <div className="flex gap-8 mt-8">
                        <div className="flex-1 h-96 bg-gray-100 rounded-xl" />
                        <div className="w-[340px] h-80 bg-gray-100 rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    const courseTitle = course?.title || 'Course Detail';
    const courseDesc = course?.description || '';
    const coursePrice = Number(course?.base_price) || 0;
    const courseCategory = course?.category || '';
    const courseDifficulty = course?.difficulty_level || '';
    const updatedAt = course?.published_at || course?.created_at;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
                <button onClick={() => navigate('/')} className="hover:text-[var(--bs-teal)]">Home</button>
                <span>&rsaquo;</span>
                <button onClick={() => navigate('/courses')} className="hover:text-[var(--bs-teal)]">All Online Training Courses</button>
                <span>&rsaquo;</span>
                <span className="text-gray-900 font-medium line-clamp-1">{courseTitle}</span>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    {/* Thumbnail */}
                    {course?.thumbnail_url && (
                        <div className="w-full h-56 mb-6 rounded-xl overflow-hidden bg-gray-100">
                            <img src={course.thumbnail_url} alt={courseTitle} className="w-full h-full object-cover" />
                        </div>
                    )}

                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{courseTitle}</h1>
                    {courseDesc && (
                        <p className="text-sm text-gray-500 mb-5">{courseDesc}</p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-6 mb-6 text-sm flex-wrap">
                        {totalSlides > 0 && (
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <Clock className="w-4 h-4" />
                                <span>Duration</span>
                                <span className="font-medium text-gray-900">{durationDisplay}</span>
                            </div>
                        )}
                        {updatedAt && (
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <Calendar className="w-4 h-4" />
                                <span>Last updated</span>
                                <span className="font-medium text-gray-900">
                                    {new Date(updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                        )}
                        {courseCategory && (
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <BookOpen className="w-4 h-4" />
                                <span className="font-medium text-gray-900">{courseCategory}</span>
                            </div>
                        )}
                        {courseDifficulty && (
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <Layers className="w-4 h-4" />
                                <span className="font-medium text-gray-900">{courseDifficulty}</span>
                            </div>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 mb-6">
                        {TABS.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === tab
                                        ? 'border-[var(--bs-teal)] text-[var(--bs-teal)]'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'Overview' && (
                        <div className="space-y-8">
                            {courseDesc && (
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 mb-3">About this course</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{courseDesc}</p>
                                </div>
                            )}

                            {/* Course Stats */}
                            {totalSlides > 0 && (
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 mb-3">What&apos;s included</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--bs-teal)', opacity: 0.1 }}>
                                                <BookOpen className="w-5 h-5" style={{ color: 'var(--bs-teal)' }} />
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-gray-900">{totalSlides}</p>
                                                <p className="text-xs text-gray-500">Slides</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--bs-teal)', opacity: 0.1 }}>
                                                <Layers className="w-5 h-5" style={{ color: 'var(--bs-teal)' }} />
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-gray-900">{totalModules}</p>
                                                <p className="text-xs text-gray-500">Modules</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--bs-teal)', opacity: 0.1 }}>
                                                <Clock className="w-5 h-5" style={{ color: 'var(--bs-teal)' }} />
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-gray-900">{durationDisplay}</p>
                                                <p className="text-xs text-gray-500">Total Duration</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Curriculum levels overview */}
                            {curriculum.length > 0 && (
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 mb-3">Course Structure</h3>
                                    <div className="space-y-2">
                                        {curriculum.map((level: any, idx: number) => (
                                            <div key={idx} className="flex items-start gap-2.5">
                                                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--bs-teal)' }} />
                                                <span className="text-sm text-gray-600">
                                                    <span className="font-medium text-gray-900">{level.title}</span>
                                                    {' — '}
                                                    {level.modules.length} module{level.modules.length !== 1 ? 's' : ''},{' '}
                                                    {level.modules.reduce((s: number, m: any) => s + m.slides.length, 0)} slides
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'Curriculum' && (
                        <div>
                            <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
                                <span>{curriculum.length} Level{curriculum.length !== 1 ? 's' : ''}</span>
                                <span>&bull;</span>
                                <span>{totalModules} Modules</span>
                                <span>&bull;</span>
                                <span>{totalSlides} Slides</span>
                                <span>&bull;</span>
                                <span>{durationDisplay}</span>
                            </div>

                            {curriculum.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">Curriculum not available yet</p>
                                </div>
                            ) : (
                                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-200">
                                    {curriculum.map((level: any, li: number) => (
                                        level.modules.map((mod: any, mi: number) => {
                                            const sectionIdx = li * 100 + mi;
                                            const isExpanded = expandedSections.includes(sectionIdx);
                                            const contentSlides = mod.slides.filter((s: any) => s.type !== 'quiz');
                                            const quizSlides = mod.slides.filter((s: any) => s.type === 'quiz');
                                            const totalSec = mod.slides.reduce((s: number, sl: any) => s + sl.duration, 0);
                                            const durStr = totalSec >= 3600 ? `${Math.floor(totalSec / 3600)}h ${Math.round((totalSec % 3600) / 60)}m` : `${Math.round(totalSec / 60)}m`;

                                            return (
                                                <div key={sectionIdx}>
                                                    <button
                                                        onClick={() => toggleSection(sectionIdx)}
                                                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                                            <div className="text-left">
                                                                <span className="text-sm font-medium text-gray-900">{mod.title}</span>
                                                                <span className="text-[10px] text-gray-400 block">{level.title}</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-gray-400">
                                                            {contentSlides.length} slides{quizSlides.length > 0 ? ` · ${quizSlides.length} quiz` : ''} &bull; {durStr}
                                                        </span>
                                                    </button>
                                                    {isExpanded && mod.slides.length > 0 && (
                                                        <div className="bg-gray-50/50 divide-y divide-gray-100">
                                                            {mod.slides.map((slide: any, si: number) => (
                                                                <div key={si} className="flex items-center justify-between px-5 py-3 pl-12">
                                                                    <div className="flex items-center gap-3">
                                                                        {slide.type === 'quiz' ? (
                                                                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                                                                        ) : (
                                                                            <Play className="w-3.5 h-3.5 text-gray-400" />
                                                                        )}
                                                                        <span className="text-sm text-gray-600">{slide.title}</span>
                                                                        {slide.type === 'quiz' && (
                                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">QUIZ</span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-xs text-gray-400">{Math.round(slide.duration / 60)}m</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'Review' && (
                        <div className="text-center py-12 text-gray-400">
                            <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No reviews yet</p>
                            <p className="text-xs mt-1">Reviews will appear here once students complete the course</p>
                        </div>
                    )}
                </div>

                {/* Right Sidebar */}
                <aside className="w-full lg:w-[340px] flex-shrink-0">
                    <div className="sticky top-24 space-y-5">
                        {/* Price Card */}
                        <div className="bs-card p-5">
                            {course?.thumbnail_url && (
                                <div className="w-full h-40 -mt-5 -mx-5 mb-4 overflow-hidden rounded-t-xl" style={{ width: 'calc(100% + 2.5rem)' }}>
                                    <img src={course.thumbnail_url} alt={courseTitle} className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div className="flex items-baseline gap-3 mb-1">
                                <span className="text-3xl font-bold text-gray-900">
                                    {coursePrice > 0 ? `$${coursePrice.toFixed(2)}` : 'Free'}
                                </span>
                            </div>
                            {coursePrice > 0 && <p className="text-xs text-gray-400 mb-5">Include VAT</p>}

                            <div className="space-y-3 mb-5">
                                <h4 className="text-sm font-medium text-gray-900">This course includes:</h4>
                                {[
                                    { icon: Monitor, text: '100% online training' },
                                    { icon: Zap, text: 'Start when you like' },
                                    { icon: Smartphone, text: 'Learn on any device' },
                                    { icon: Award, text: 'Assessment and certification' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                                        <item.icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        {item.text}
                                    </div>
                                ))}
                                {totalSlides > 0 && (
                                    <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                        <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        {totalSlides} slides across {totalModules} modules
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleBuyCourse}
                                disabled={enrollLoading}
                                className="w-full btn-lime justify-center !py-3 mb-2 disabled:opacity-50"
                            >
                                <ShoppingCart className="w-4 h-4" />
                                {enrollLoading ? 'Submitting...' : coursePrice > 0 ? 'Request Purchase' : 'Enrol Free'}
                            </button>
                            <p className="text-xs text-gray-400 text-center">
                                Note: all courses have 30-days money-back guarantee
                            </p>
                        </div>

                        {/* Share */}
                        <div className="bs-card p-5">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Share this course</h4>
                            <button
                                onClick={handleCopyLink}
                                className="flex items-center gap-2 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied!' : 'Copy link'}
                            </button>
                        </div>

                        {/* Recommended */}
                        {recommended.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-4">Recommended courses</h4>
                                <div className="space-y-4">
                                    {recommended.map((rc: any) => (
                                        <CourseCard
                                            key={rc.id}
                                            title={rc.title}
                                            price={Number(rc.base_price) || 0}
                                            rating={0}
                                            reviewCount={0}
                                            imageUrl={rc.thumbnail_url}
                                            onViewCourse={() => navigate(`/courses/${rc.id}`)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            <FAQSection />
        </div>
    );
}
