/*
 * CourseDetailPage — PDF Page 3.
 *
 * Layout:
 *   - Breadcrumb: Home > All Online Training Courses > Home
 *   - Course title + "3 in 1 Course..." subtitle
 *   - Meta: Duration, Last audited, Ratings
 *   - Tabs: Overview | Curriculum | Instructor | Review
 *   - Tab content area
 *   - Right sidebar: Price card, Add to Cart, Share, Recommended courses
 *   - FAQ section
 */

import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    Star, Clock, Calendar, ChevronDown, ChevronUp, Play,
    FileText, Copy, Check, ShoppingCart,
    Monitor, Smartphone, Award, Zap,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { CourseCard } from '../../components/shared/CourseCard';
import { FAQSection } from '../../components/shared/FAQSection';
import type { Course } from '../../types';

const TABS = ['Overview', 'Curriculum', 'Instructor', 'Review'] as const;
type Tab = typeof TABS[number];

const CURRICULUM = [
    { title: 'Getting Started', lectures: 4, duration: '51m', expanded: true, items: [
        { title: "What's is Webflow", duration: '07:30', type: 'video' },
        { title: 'Sign up in Webflow', duration: '07:30', type: 'video' },
        { title: 'Webflow Terms & Conditions', duration: '5.3 MB', type: 'file' },
        { title: 'Teaser of Webflow', duration: '07:30', type: 'video' },
    ]},
    { title: 'Practice Project', lectures: 0, duration: '5.3 MB', items: [] },
    { title: 'Secret of Good Design', lectures: 52, duration: '5h 49m', items: [] },
    { title: 'Practice Design Like an Artist', lectures: 43, duration: '53m', items: [] },
    { title: 'Web Development (webflow)', lectures: 137, duration: '10h 6m', items: [] },
    { title: 'Secrets of Making Money Freelancing', lectures: 21, duration: '38m', items: [] },
];

const REVIEWS = [
    { name: 'Guy Hawkins', time: '1 week ago', text: "I appreciate the precise short videos (10 mins or less each) because overly long videos tend to make me lose focus. The instructor is very knowledgeable in Web Design and it shows as he shares his knowledge. These were my best 6 months of training. Thanks, Vako!", stars: 5 },
    { name: 'Dianne Russell', time: '51 mins ago', text: "This course is just amazing! has great course content, the best practices, and a lot of real-world knowledge. I love the way of giving examples, the best tips by the instructor which are pretty interesting, fun and knowledgeable. Highly recommend!", stars: 5 },
    { name: 'Bessie Cooper', time: '6 hours ago', text: "Webflow course was good, it covers design secrets, and to build responsive web pages, blog, and some more tricks and tips about webflow. I enjoyed the course and it helped me to add web development skills.", stars: 4 },
    { name: 'Eleanor Pena', time: '1 days ago', text: "I appreciate the precise short videos (10 mins or less each) because overly long videos tend to make me lose focus. The instructor is very knowledgeable in Web Design. These were my best 6 months of training.", stars: 5 },
];

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

    const handleBuyCourse = async () => {
        if (!course) return;

        if (!isAuthenticated) {
            toast.error('Please sign in to purchase this course');
            navigate('/login', { state: { from: location } });
            return;
        }

        if (coursePrice <= 0) {
            const latestVersion = course.versions?.[0];
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

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
                <button onClick={() => navigate('/')} className="hover:text-[var(--bs-teal)]">Home</button>
                <span>›</span>
                <button onClick={() => navigate('/courses')} className="hover:text-[var(--bs-teal)]">All Online Training Courses</button>
                <span>›</span>
                <span className="text-gray-900 font-medium line-clamp-1">{courseTitle}</span>
            </div>

            {/* Two-column layout */}
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{courseTitle}</h1>
                    <p className="text-sm text-gray-500 mb-5">
                        {courseDesc || '3 in 1 Course: Learn to design websites with Figma, build with Webflow, and make a living freelancing.'}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-6 mb-6 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>Course Duration</span>
                            <span className="font-medium text-gray-900">2-3 hours</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>Last audited</span>
                            <span className="font-medium text-gray-900">6th March 2025</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="font-semibold text-gray-900">4.5</span>
                            <span className="text-gray-400">(451,444 Ratings)</span>
                        </div>
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
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 mb-3">Description</h3>
                                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                                    It gives you a huge self-satisfaction when you look at your work and say, "I made this!". I love that feeling after I'm done working on something. When I lean back in my chair, look at the final result with a smile, and have this little "spark joy" moment. It's especially satisfying when I know I just made $5,000.
                                </p>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    I do! And that's why I got into this field. Not for the love of Web Design, which I do now. But for the LIFESTYLE! There are many ways one can achieve this lifestyle. This is my way. This is how I achieved a lifestyle I've been fantasizing about for five years.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-semibold text-gray-900 mb-3">What you will learn in this course</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                        'You will learn how to design beautiful websites using Figma, an interface design tool used by designers at Uber, Airbnb and Microsoft.',
                                        'You will learn how to take your designs and build them into powerful websites using Webflow.',
                                        'You will learn secret tips of Freelance Web Designers and how they make great money freelancing online.',
                                        'Learn to use Python professionally, learning both Python 2 and Python 3.',
                                        'Understand how to use both the Jupyter Notebook and create .py files.',
                                        'Get an understanding of how to create GUIs in the Jupyter Notebook system.',
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-2.5">
                                            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--bs-teal)' }} />
                                            <span className="text-sm text-gray-600">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-base font-semibold text-gray-900 mb-3">Who this course is for</h3>
                                <ul className="space-y-2">
                                    {[
                                        'This course is for those who want to launch a Freelance Web Design career.',
                                        'Praesent eget consequat elit. Duis a pretium purus.',
                                        'Those who are looking to reboot their work life and try a new profession.',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                                            <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--bs-teal)' }} />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-base font-semibold text-gray-900 mb-3">Course requirements</h3>
                                <ul className="space-y-2">
                                    {[
                                        'Nunc auctor consequat lorem, in posuere enim hendrerit sed.',
                                        'Sed sagittis suscipit condimentum pellentesque vulputate feugiat libero nec accumsan.',
                                        'Duis ornare enim ullamcorper congue consectetur suspendisse interdum.',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                                            <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--bs-teal)' }} />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Curriculum' && (
                        <div>
                            <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
                                <span>6 Sections</span>
                                <span>•</span>
                                <span>202 lectures</span>
                                <span>•</span>
                                <span>19h 37m</span>
                            </div>
                            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-200">
                                {CURRICULUM.map((section, idx) => (
                                    <div key={idx}>
                                        <button
                                            onClick={() => toggleSection(idx)}
                                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                {expandedSections.includes(idx) ? (
                                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                                )}
                                                <span className="text-sm font-medium text-gray-900">{section.title}</span>
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {section.lectures > 0 && `${section.lectures} lectures • `}{section.duration}
                                            </span>
                                        </button>
                                        {expandedSections.includes(idx) && section.items.length > 0 && (
                                            <div className="bg-gray-50/50 divide-y divide-gray-100">
                                                {section.items.map((item, i) => (
                                                    <div key={i} className="flex items-center justify-between px-5 py-3 pl-12">
                                                        <div className="flex items-center gap-3">
                                                            {item.type === 'video' ? (
                                                                <Play className="w-3.5 h-3.5 text-gray-400" />
                                                            ) : (
                                                                <FileText className="w-3.5 h-3.5 text-gray-400" />
                                                            )}
                                                            <span className="text-sm text-gray-600">{item.title}</span>
                                                        </div>
                                                        <span className="text-xs text-gray-400">{item.duration}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'Instructor' && (
                        <div className="space-y-6">
                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Written by experts</div>
                            <div className="flex items-start gap-5">
                                <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0" />
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">Vako Shvili</h3>
                                    <p className="text-sm text-gray-500 mb-2">Web Designer & Best-Selling Instructor</p>
                                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                                        <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> 4.9 Course rating</span>
                                        <span>236,568 Students</span>
                                        <span>09 Courses</span>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        One day Vako had enough with the 9-to-5 grind, or more like 9-to-9 in his case, and quit his job. He decided to work on his dream: be his own boss, travel the world, only do the work he enjoyed.
                                    </p>
                                    <button className="text-sm font-medium mt-2 hover:underline" style={{ color: 'var(--bs-teal)' }}>
                                        READ MORE
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Review' && (
                        <div className="space-y-6">
                            {/* Rating Summary */}
                            <div className="flex items-start gap-8">
                                <div className="text-center">
                                    <div className="text-5xl font-bold text-gray-900">4.5</div>
                                    <div className="text-sm text-gray-500 mt-1">Course Rating</div>
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    {[75, 21, 3, 1, 0].map((pct, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 w-16">{5 - i} Star</span>
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--bs-teal)' }} />
                                            </div>
                                            <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Reviews */}
                            <div className="space-y-5 pt-4">
                                <h4 className="text-sm font-semibold text-gray-900">Students Feedback</h4>
                                {REVIEWS.map((review, i) => (
                                    <div key={i} className="pb-5 border-b border-gray-100 last:border-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-9 h-9 rounded-full bg-gray-200" />
                                            <div>
                                                <span className="text-sm font-medium text-gray-900">{review.name}</span>
                                                <span className="text-xs text-gray-400 ml-2">{review.time}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-0.5 mb-2">
                                            {Array.from({ length: 5 }).map((_, j) => (
                                                <Star key={j} className={`w-3.5 h-3.5 ${j < review.stars ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                                            ))}
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
                                    </div>
                                ))}
                                <button className="text-sm font-medium hover:underline" style={{ color: 'var(--bs-teal)' }}>
                                    Load more
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar */}
                <aside className="w-full lg:w-[340px] flex-shrink-0">
                    <div className="sticky top-24 space-y-5">
                        {/* Price Card */}
                        <div className="bs-card p-5">
                            <div className="flex items-baseline gap-3 mb-1">
                                <span className="text-3xl font-bold text-gray-900">${coursePrice.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-gray-400 mb-5">Include Vat</p>

                            <div className="space-y-3 mb-5">
                                <h4 className="text-sm font-medium text-gray-900">This course includes:</h4>
                                {[
                                    { icon: Monitor, text: '100% online training' },
                                    { icon: Zap, text: 'Start when you like' },
                                    { icon: Smartphone, text: 'Learn on any device (desktop, mobile or tablet)' },
                                    { icon: Award, text: 'Instant assessment and results' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                                        <item.icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        {item.text}
                                    </div>
                                ))}
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
                                            rating={4.9}
                                            reviewCount={154}
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

            {/* FAQ */}
            <FAQSection />
        </div>
    );
}
