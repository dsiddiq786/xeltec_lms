import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    Search, Star, BookOpen, Award, Users,
    Globe, GraduationCap, TrendingUp, Calendar,
    ArrowRight, ChevronLeft, ChevronRight,
    ShieldCheck, Utensils, HeartPulse, HardHat,
    Flame, Brain, Briefcase, BadgeCheck,
} from 'lucide-react';
import api from '../../lib/api';
import { CourseCard } from '../../components/shared/CourseCard';
import { FAQSection } from '../../components/shared/FAQSection';
import type { Course, PaginatedResponse } from '../../types';

const DEFAULT_STATS = [
    { value: '4.9', sublabel: '/ 200 Reviews', icon: Star },
    { value: '10K+', sublabel: 'Online Courses', icon: BookOpen },
    { value: '6K+', sublabel: 'Certified Courses', icon: Award },
    { value: '2K+', sublabel: 'Experienced Tutors', icon: Users },
];

const DEFAULT_CATEGORIES = [
    { name: 'Food Hygiene', icon: Utensils },
    { name: 'Health and Safety', icon: ShieldCheck },
    { name: 'Safeguarding', icon: ShieldCheck },
    { name: 'HACCP', icon: BadgeCheck },
    { name: 'First Aid', icon: HeartPulse },
    { name: 'Education', icon: GraduationCap },
    { name: 'Fire Safety', icon: Flame },
    { name: 'Mental Health', icon: Brain },
    { name: 'Health and Social Care', icon: HeartPulse },
    { name: 'Business Essentials', icon: Briefcase },
    { name: 'City & Guilds Assured', icon: Award },
];

const DEFAULT_TESTIMONIALS = [
    {
        text: "I often felt like the mentor's answers were too detailed, which made it hard for me to keep up. Sometimes, a simpler explanation would have helped me understand things faster.",
        name: 'Martin Harn',
        role: 'Docker Development',
        rating: 4.5,
        avatar: null,
    },
    {
        text: "As a writer, I've learned so much about structure and storytelling from my mentor. Their feedback helped me tighten up my writing and make my characters more compelling.",
        name: 'Sarah Chen',
        role: 'Content Writer',
        rating: 5.0,
        avatar: null,
    },
    {
        text: "I've become more organized, confident, and focused thanks to my life coach. They helped me set realistic goals and break them down into actionable steps. I've accomplished so much already!",
        name: 'James Wilson',
        role: 'Project Manager',
        rating: 4.5,
        avatar: null,
    },
];

const DEFAULT_ARTICLES = [
    {
        title: 'Mastering Programming with a Technical Mentor',
        excerpt: 'Learning to code can be overwhelming, but a mentor can make the journey smoother...',
        author: 'Reni Saro',
        date: '09 Aug 2025',
        image: null,
    },
    {
        title: 'How to Level Up Your Coding Skills with the Help of a Mentor',
        excerpt: "Whether you're a beginner or an advanced coder, this blog will explore how...",
        author: 'Christoper Daniel',
        date: '15 Jul 2025',
        image: null,
    },
    {
        title: 'Navigating the Tech World: The Ultimate Guide',
        excerpt: 'The tech industry is vast and ever-changing, but a mentor can help you stay ahead...',
        author: 'Andrew Jerm',
        date: '20 Jun 2025',
        image: null,
    },
];

const DEFAULT_ORG_LOGOS = [
    'Waterstones', 'Centara', 'Whitakers', 'Premier Education',
    'deliveroo', 'Premier Foods', 'Staedtler', 'Taylors',
];

function GlowDot({ className, size = 347 }: { className?: string; size?: number }) {
    return (
        <div
            className={`absolute rounded-full pointer-events-none ${className}`}
            style={{
                width: size,
                height: size,
                background: 'radial-gradient(circle, #CBFF2A 0%, rgba(203,255,42,0) 70%)',
                opacity: 0.18,
                filter: `blur(${size * 0.3}px)`,
            }}
        />
    );
}

const ICON_MAP: Record<string, any> = {
    Utensils, ShieldCheck, BadgeCheck, HeartPulse, GraduationCap,
    Flame, Brain, Briefcase, Award, Star, BookOpen, Users, HardHat,
};

export function HomePage() {
    const navigate = useNavigate();
    const [heroSearch, setHeroSearch] = useState('');
    const [testimonialIdx, setTestimonialIdx] = useState(0);
    const [activeCategory, setActiveCategory] = useState(0);

    const { data: settings } = useQuery({
        queryKey: ['site-settings-public'],
        queryFn: async () => {
            const { data } = await api.get('/site-settings');
            return data as Record<string, any>;
        },
        staleTime: 60000,
    });

    const { data: catalogData } = useQuery<PaginatedResponse<Course>>({
        queryKey: ['featured-courses'],
        queryFn: async () => {
            const { data } = await api.get('/courses/catalog?limit=8');
            return data;
        },
    });

    const hero = settings?.hero || {};
    const STATS = (settings?.stats?.items || DEFAULT_STATS).map((s: any, i: number) => ({
        ...s,
        icon: s.icon ? ICON_MAP[s.icon] || Star : DEFAULT_STATS[i]?.icon || Star,
    }));
    const CATEGORIES = (settings?.categories?.items || DEFAULT_CATEGORIES).map((c: any) => ({
        ...c,
        icon: c.icon ? ICON_MAP[c.icon] || ShieldCheck : DEFAULT_CATEGORIES.find((dc: any) => dc.name === c.name)?.icon || ShieldCheck,
    }));
    const TESTIMONIALS = settings?.testimonials?.items || DEFAULT_TESTIMONIALS;
    const ARTICLES = settings?.articles?.items || DEFAULT_ARTICLES;
    const ORG_LOGOS = settings?.trusted_by?.logos || DEFAULT_ORG_LOGOS;
    const community = settings?.community || {};

    const featuredCourses = catalogData?.data?.slice(0, 4) || [];
    const bestSelling = catalogData?.data || [];

    const handleHeroSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (heroSearch.trim()) navigate(`/courses?search=${encodeURIComponent(heroSearch.trim())}`);
        else navigate('/courses');
    };

    return (
        <div className="bg-white">
            {/* ═══════ HERO ═══════ */}
            <section className="relative overflow-hidden" style={{ borderRadius: '0 0 32px 32px' }}>
                <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(135deg, #035A51 0%, #023d36 50%, #012a25 100%)' }}
                />

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-10 sm:pt-14 pb-10 sm:pb-14">
                    <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                        {/* Left content */}
                        <div className="flex-1 max-w-xl">
                            <div className="flex items-center gap-2 mb-4 flex-wrap">
                                <span className="text-xs font-medium text-white/70">Trusted by 4 million learners</span>
                                <span className="text-xs text-white/30">|</span>
                                <span className="text-xs font-medium text-white/70">Money back guarantee</span>
                                <span className="text-xs text-white/30">|</span>
                                <span className="text-xs font-medium text-white/70">24/7 online training</span>
                            </div>

                            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-white mb-5 leading-[1.15]">
                                {hero.title || <>Online training and<br />compliance made{' '}<span style={{ color: '#CBFF2A' }}>easy</span></>}
                            </h1>

                            <p className="text-sm sm:text-[15px] text-white/65 mb-7 leading-relaxed">
                                {hero.description || "Get certified, master modern tech skills, and level up your career whether you're starting out or a seasoned pro. 95% of eLearning learners report our hands-on content directly helped their careers."}
                            </p>

                            <form onSubmit={handleHeroSearch} className="flex max-w-xl mb-6">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search for Courses, Instructors..."
                                        value={heroSearch}
                                        onChange={(e) => setHeroSearch(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-white border-0 rounded-l-xl text-sm outline-none text-gray-800"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="px-6 py-3.5 rounded-r-xl text-sm font-semibold flex-shrink-0"
                                    style={{ background: '#CBFF2A', color: '#1a1f25' }}
                                >
                                    Search
                                </button>
                            </form>

                            <div className="flex flex-wrap items-center gap-3">
                                <button onClick={() => navigate('/register')} className="btn-lime !py-3 !px-6">
                                    Start Learning <ArrowRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => navigate('/register/business')}
                                    className="px-6 py-3 rounded-full text-sm font-semibold border-2 transition-colors text-white hover:bg-white/10"
                                    style={{ borderColor: 'rgba(255,255,255,0.3)' }}
                                >
                                    Register Your Business
                                </button>
                            </div>
                        </div>

                        {/* Right hero image */}
                        <div className="flex-shrink-0 hidden lg:block">
                            <motion.img
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.15 }}
                                src={hero.image_url || "/assets/images/hero-chef.png"}
                                alt="Certified professional"
                                className="w-[340px] h-auto rounded-3xl object-cover"
                                style={{ maxHeight: 420 }}
                            />
                        </div>
                    </div>

                    {/* Stats inside hero */}
                    <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {STATS.map((stat: any) => (
                            <div
                                key={stat.value}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                                style={{ background: 'rgba(255,255,255,0.08)' }}
                            >
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'rgba(203,255,42,0.2)' }}
                                >
                                    <stat.icon className="w-5 h-5" style={{ color: '#CBFF2A' }} />
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-white">{stat.value}</div>
                                    <div className="text-[11px] text-white/50">{stat.sublabel}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ BROWSE TOP CATEGORIES ═══════ */}
            <section className="py-14 bg-white relative overflow-hidden">
                <GlowDot className="-top-20 -left-32" size={400} />
                <GlowDot className="bottom-0 right-[-100px]" size={350} />

                <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                        Browse top <span style={{ color: '#035A51' }}>category</span>
                    </h2>
                    <p className="text-sm text-gray-500 text-center mb-8 max-w-lg mx-auto">
                        Explore our wide range of professional training categories
                    </p>

                    {/* Category tab pills */}
                    <div className="flex flex-wrap justify-center gap-2.5 mb-6">
                        {CATEGORIES.map((cat: any, i: number) => {
                            const isActive = activeCategory === i;
                            return (
                                <button
                                    key={cat.name}
                                    onClick={() => setActiveCategory(i)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                                    style={{
                                        background: isActive ? '#035A51' : '#f3f4f6',
                                        color: isActive ? '#fff' : '#374151',
                                    }}
                                >
                                    <cat.icon className="w-4 h-4" />
                                    {cat.name}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                        <span>We have more category & subcategory.</span>
                        <button
                            onClick={() => navigate('/courses')}
                            className="font-semibold hover:underline"
                            style={{ color: '#035A51' }}
                        >
                            Browse All
                        </button>
                    </div>
                </div>
            </section>

            {/* ═══════ CAN'T-MISS DEALS / FEATURED COURSES ═══════ */}
            <section className="py-14 bg-gray-50 relative overflow-hidden">
                <GlowDot className="top-10 right-[-60px]" size={300} />

                <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Can't-miss <span style={{ color: '#035A51' }}>deals</span>
                        </h2>
                        <p className="text-sm text-gray-500 max-w-2xl mx-auto">
                            Get certified, master modern tech skills, and level up your career whether you're starting out or a
                            seasoned pro.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {(featuredCourses.length > 0
                            ? featuredCourses
                            : Array.from({ length: 4 }, (_, i) => ({
                                  id: `placeholder-${i}`,
                                  title: 'Level 2 Food Hygiene and Safety for Catering',
                                  base_price: '147',
                                  thumbnail_url: null,
                              }))
                        ).map((course: any, i: number) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <CourseCard
                                    title={course.title}
                                    price={Number(course.base_price) || 0}
                                    rating={5.0}
                                    reviewCount={154}
                                    certifications={['EHO', 'CPD', 'IoH', 'RoSPA']}
                                    imageUrl={course.thumbnail_url}
                                    onViewCourse={() => navigate(`/courses/${course.id}`)}
                                />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ BEST SELLING COURSES ═══════ */}
            <section className="py-14 bg-white relative overflow-hidden">
                <GlowDot className="bottom-[-80px] left-[-40px]" size={380} />

                <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Best selling <span style={{ color: '#035A51' }}>courses</span>
                    </h2>
                    <p className="text-sm text-gray-500 mb-8 max-w-2xl">
                        Get certified, master modern tech skills, and level up your career whether you're starting out or a seasoned
                        pro. 95% of eLearning learners report our hands-on content directly helped their careers.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {(bestSelling.length > 0
                            ? bestSelling
                            : Array.from({ length: 8 }, (_, i) => ({
                                  id: `best-${i}`,
                                  title: 'Level 2 Food Hygiene and Safety for Catering',
                                  base_price: '147',
                                  thumbnail_url: null,
                              }))
                        ).map((course: any, i: number) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <CourseCard
                                    title={course.title}
                                    price={Number(course.base_price) || 0}
                                    rating={5.0}
                                    reviewCount={154}
                                    certifications={['EHO', 'CPD', 'IoH', 'RoSPA']}
                                    imageUrl={course.thumbnail_url}
                                    onViewCourse={() => navigate(`/courses/${course.id}`)}
                                />
                            </motion.div>
                        ))}
                    </div>
                    <div className="mt-8 flex items-center gap-2 text-sm text-gray-500">
                        <span>We have more category & subcategory</span>
                        <button
                            onClick={() => navigate('/courses')}
                            className="font-semibold hover:underline"
                            style={{ color: '#035A51' }}
                        >
                            Browse All
                        </button>
                    </div>
                </div>
            </section>

            {/* ═══════ TRUSTED BY 50,000+ ORGANISATIONS ═══════ */}
            <section className="py-14 bg-[#f5f7fa]">
                <div className="max-w-7xl mx-auto px-4 sm:px-8">
                    <div className="flex flex-col md:flex-row items-start gap-12">
                        <div className="md:w-1/4">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Trusted by 50,000+ Organisations
                            </h2>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Nullam egestas tellus at enim ornare tristique. Class aptent taciti sociosqu ad litora torquent per
                                conubia nostra.
                            </p>
                        </div>
                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {ORG_LOGOS.map((org: any) => (
                                <div
                                    key={org}
                                    className="bg-white rounded-xl p-5 flex items-center justify-center h-20 border border-gray-100"
                                >
                                    <span className="text-sm font-semibold text-gray-400 tracking-wide">{org}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════ COMMUNITY / FEATURES ═══════ */}
            <section className="py-14 bg-white relative overflow-hidden">
                <GlowDot className="top-[5%] right-[-120px]" size={450} />
                <GlowDot className="bottom-[-80px] left-[40%]" size={350} />

                <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-12">
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                {community.title || <>Creating a community of{' '}<span style={{ color: '#035A51' }}>learners.</span></>}
                            </h2>
                            <p className="text-sm text-gray-500 mb-8 max-w-lg leading-relaxed">
                                {community.description || "We're dedicated to transforming education by providing a diverse range of high-quality courses that cater to learners of all levels."}
                            </p>

                            <div className="space-y-6">
                                {[
                                    {
                                        icon: Globe,
                                        title: 'Learn from anywhere',
                                        desc: 'Learning from anywhere has become a transform aspect of modern education, allowing individuals.',
                                        color: '#e8f5e9',
                                    },
                                    {
                                        icon: GraduationCap,
                                        title: 'Expert Mentors',
                                        desc: 'Expert mentors are invaluable assets in any field, providing seasoned guidance knowledge.',
                                        color: '#e3f2fd',
                                    },
                                    {
                                        icon: TrendingUp,
                                        title: 'Learn in demand skills',
                                        desc: "In today's rapidly evolving job market, learning in demand skills is crucial for career advancement.",
                                        color: '#fff3e0',
                                    },
                                ].map((feature) => (
                                    <div key={feature.title} className="flex items-start gap-4">
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: feature.color }}
                                        >
                                            <feature.icon className="w-5 h-5" style={{ color: '#035A51' }} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-gray-900 mb-1">{feature.title}</h3>
                                            <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => navigate('/register')} className="btn-lime mt-8">
                                Create an Account <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Community images — matching Figma layout */}
                        <div className="flex-shrink-0 hidden lg:flex items-end gap-4">
                            <div className="w-[240px] h-[320px] rounded-2xl overflow-hidden shadow-lg">
                                <img
                                    src="/assets/images/hero-chef.png"
                                    alt="Chef with certificate"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="w-[200px] h-[260px] rounded-2xl overflow-hidden bg-gradient-to-br from-[#e8f5e9] to-[#c8e6c9] relative -mb-4 shadow-lg flex items-center justify-center">
                                <HardHat className="w-20 h-20 text-[#035A51] opacity-30" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════ TESTIMONIALS ═══════ */}
            <section
                className="py-14 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #035A51 0%, #023d36 60%, #012a25 100%)' }}
            >
                <GlowDot className="top-[-50px] left-[30%]" size={350} />
                <GlowDot className="bottom-[-50px] right-[20%]" size={300} />

                <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
                    <div className="flex flex-col md:flex-row gap-12">
                        <div className="md:w-1/3">
                            <p
                                className="text-xs font-semibold uppercase tracking-wider mb-3"
                                style={{ color: '#CBFF2A' }}
                            >
                                Trusted By Many
                            </p>
                            <h2 className="text-2xl font-bold text-white mb-4">
                                We are very happy because we have happy{' '}
                                <span style={{ color: '#CBFF2A' }}>Learners</span>
                            </h2>
                            <p className="text-sm text-white/60 mb-6">Join Our Community</p>
                            <button onClick={() => navigate('/register')} className="btn-lime">
                                Join Community <ArrowRight className="w-4 h-4" />
                            </button>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setTestimonialIdx((p) => Math.max(0, p - 1))}
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors"
                                    style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() =>
                                        setTestimonialIdx((p) => Math.min(TESTIMONIALS.length - 1, p + 1))
                                    }
                                    className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                                    style={{ background: '#CBFF2A', color: '#035A51' }}
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex items-center">
                            <div className="relative w-full flex gap-5 overflow-hidden">
                                {TESTIMONIALS.map((t: any, i: number) => {
                                    const offset = i - testimonialIdx;
                                    return (
                                        <motion.div
                                            key={i}
                                            animate={{
                                                x: `${offset * 10}%`,
                                                scale: offset === 0 ? 1 : 0.92,
                                                opacity: Math.abs(offset) > 1 ? 0 : offset === 0 ? 1 : 0.6,
                                                zIndex: offset === 0 ? 10 : 5 - Math.abs(offset),
                                            }}
                                            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                                            className="bg-white rounded-2xl p-6 min-w-[300px] flex-shrink-0"
                                            style={{ width: 'calc(100% - 40px)', maxWidth: 380 }}
                                        >
                                            <svg
                                                width="40"
                                                height="30"
                                                viewBox="0 0 40 30"
                                                fill="none"
                                                className="mb-4"
                                            >
                                                <path
                                                    d="M0 30V18C0 12.4 1.2 8.1 3.6 5.1C6 1.7 9.8 0 15 0V8C12.2 8 10.2 8.8 9 10.4C7.8 12 7.2 14.2 7.2 17H15V30H0ZM25 30V18C25 12.4 26.2 8.1 28.6 5.1C31 1.7 34.8 0 40 0V8C37.2 8 35.2 8.8 34 10.4C32.8 12 32.2 14.2 32.2 17H40V30H25Z"
                                                    fill="#CBFF2A"
                                                />
                                            </svg>
                                            <p className="text-sm text-gray-600 leading-relaxed mb-5">{t.text}</p>
                                            <div className="flex items-center gap-1 mb-4">
                                                {Array.from({ length: 5 }).map((_, j) => (
                                                    <Star
                                                        key={j}
                                                        className="w-4 h-4 fill-amber-400 text-amber-400"
                                                    />
                                                ))}
                                                <span className="text-xs text-gray-400 ml-1.5">
                                                    {t.rating} ratings
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                                                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                                                    <div className="text-xs text-gray-500">{t.role}</div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════ LATEST ARTICLES & NEWS ═══════ */}
            <section className="py-14 bg-white relative overflow-hidden">
                <GlowDot className="top-[-60px] left-[20%]" size={300} />
                <GlowDot className="bottom-[-40px] right-[10%]" size={280} />

                <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Latest <span style={{ color: '#035A51' }}>Articles</span> & News
                        </h2>
                        <p className="text-sm text-gray-500">
                            Explore curated content to enlighten, entertain and engage global readers
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {ARTICLES.map((article: any, i: number) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="bs-card overflow-hidden cursor-pointer group"
                            >
                                <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-200" />
                                <div className="p-5">
                                    <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-[#035A51] transition-colors">
                                        {article.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{article.excerpt}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <div className="w-6 h-6 rounded-full bg-gray-200" />
                                        <span>{article.author}</span>
                                        <span className="text-gray-300">|</span>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {article.date}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ FAQ ═══════ */}
            <div className="bg-gray-50 relative overflow-hidden">
                <GlowDot className="top-[30%] right-[-80px]" size={320} />
                <GlowDot className="bottom-[-40px] left-[-60px]" size={280} />

                <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
                    <FAQSection />
                </div>
            </div>
        </div>
    );
}
