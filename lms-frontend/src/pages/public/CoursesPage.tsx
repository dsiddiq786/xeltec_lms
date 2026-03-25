/*
 * CoursesPage — PDF Page 2: "All Online Training Courses"
 *
 * Layout:
 *   - Breadcrumb: Home > All Online Training Courses
 *   - Title + subtitle
 *   - Filter bar: "Filter" | "Clear" | "Showing 1-9 of 50 results" | Search | Sort
 *   - Sidebar (left): Category checkboxes with counts
 *   - Main (right): Horizontal course cards
 *   - Pagination at bottom
 *   - FAQ section
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../lib/api';
import type { Course, PaginatedResponse } from '../../types';
import { CourseCard } from '../../components/shared/CourseCard';
import { FAQSection } from '../../components/shared/FAQSection';

const CATEGORIES = [
    { name: 'Food Hygiene', count: 29 },
    { name: 'Customer Service', count: 15 },
    { name: 'Fire Safety', count: 8 },
    { name: 'First Aid', count: 6 },
    { name: 'General', count: 2 },
    { name: 'Health and Safety', count: 51 },
    { name: 'Mental Health', count: 6 },
    { name: 'Business Essentials', count: 36 },
];

export function CoursesPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialSearch = searchParams.get('search') || '';
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [showMoreCategories, setShowMoreCategories] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => { setCurrentPage(1); }, [debouncedSearch, selectedCategories]);

    const { data, isLoading } = useQuery<PaginatedResponse<Course>>({
        queryKey: ['catalog', currentPage, debouncedSearch, selectedCategories],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: '9', page: String(currentPage) });
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (selectedCategories.length === 1) params.set('category', selectedCategories[0]);
            const { data } = await api.get(`/courses/catalog?${params}`);
            return data;
        },
    });

    const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

    const toggleCategory = (cat: string) => {
        setSelectedCategories((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        );
    };

    const clearFilters = () => {
        setSelectedCategories([]);
        setSearchQuery('');
    };

    const visibleCategories = showMoreCategories ? CATEGORIES : CATEGORIES.slice(0, 6);

    return (
        <div className="max-w-7xl mx-auto px-8 py-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                <button onClick={() => navigate('/')} className="hover:text-[var(--bs-teal)]">Home</button>
                <span>›</span>
                <span className="text-gray-900 font-medium">All Online Training Courses</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">All Online Training Courses</h1>
            <p className="text-sm text-gray-500 mb-8 max-w-2xl">
                Our entire range of online training courses. Use the filters to narrow down your area of interest or, if you know
                the course you want to take, use the search bar.
            </p>

            {/* Filter Bar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <SlidersHorizontal className="w-4 h-4" />
                        Filter
                    </button>
                    {selectedCategories.length > 0 && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                        >
                            <X className="w-3.5 h-3.5" />
                            Clear
                        </button>
                    )}
                    <span className="text-sm text-gray-400">
                        Showing 1-{data?.data.length || 9} of {data?.total || 50} results
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-48 outline-none focus:border-[var(--bs-teal)]"
                        />
                    </div>
                    <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 outline-none">
                        <option>Newly Published</option>
                        <option>Price: Low to High</option>
                        <option>Price: High to Low</option>
                        <option>Highest Rated</option>
                    </select>
                </div>
            </div>

            {/* Main Content: Sidebar + Courses */}
            <div className="flex gap-8">
                {/* Sidebar */}
                <aside className="w-64 flex-shrink-0">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Categories</h3>
                    <div className="space-y-2.5">
                        {visibleCategories.map((cat) => (
                            <label
                                key={cat.name}
                                className="flex items-center gap-2.5 cursor-pointer group"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedCategories.includes(cat.name)}
                                    onChange={() => toggleCategory(cat.name)}
                                    className="w-4 h-4 rounded border-gray-300 accent-[var(--bs-teal)]"
                                />
                                <span className="text-sm text-gray-600 group-hover:text-gray-900 flex-1">
                                    {cat.name}
                                </span>
                                <span className="text-xs text-gray-400">({cat.count})</span>
                            </label>
                        ))}
                    </div>
                    {!showMoreCategories && CATEGORIES.length > 6 && (
                        <button
                            onClick={() => setShowMoreCategories(true)}
                            className="text-sm font-medium mt-3 hover:underline"
                            style={{ color: 'var(--bs-teal)' }}
                        >
                            See More
                        </button>
                    )}
                </aside>

                {/* Course List */}
                <div className="flex-1 space-y-5">
                    {isLoading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="bs-card overflow-hidden flex h-48">
                                <div className="w-[280px] bg-gray-100 animate-pulse" />
                                <div className="flex-1 p-5 space-y-3">
                                    <div className="w-3/4 h-5 bg-gray-100 rounded animate-pulse" />
                                    <div className="w-full h-4 bg-gray-100 rounded animate-pulse" />
                                    <div className="w-full h-4 bg-gray-100 rounded animate-pulse" />
                                    <div className="w-1/3 h-6 bg-gray-100 rounded animate-pulse mt-auto" />
                                </div>
                            </div>
                        ))
                        : (data?.data || []).map((course: any, index: number) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <CourseCard
                                    variant="horizontal"
                                    title={course.title || 'Level 2 Food Hygiene and Safety for Catering'}
                                    description={course.description || 'Get certified, master modern tech skills, and level up your career whether you\'re starting out or a seasoned pro. 95% of eLearning learners report our hands-on content directly helped their careers.'}
                                    price={Number(course.base_price) || 14}
                                    rating={4.9}
                                    reviewCount={200}
                                    level="Intermediate"
                                    onViewCourse={() => navigate(`/courses/${course.id}`)}
                                />
                            </motion.div>
                        ))}

                    {/* Fallback: show sample cards when API returns empty */}
                    {!isLoading && (!data?.data || data.data.length === 0) && (
                        <>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <CourseCard
                                    key={i}
                                    variant="horizontal"
                                    title="Level 2 Food Hygiene and Safety for Catering"
                                    description="Get certified, master modern tech skills, and level up your career whether you're starting out or a seasoned pro. 95% of eLearning learners report our hands-on content directly helped their careers."
                                    price={14}
                                    rating={4.9}
                                    reviewCount={200}
                                    level="Intermediate"
                                    onViewCourse={() => navigate('/courses/1')}
                                />
                            ))}
                        </>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-6">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                                        currentPage === page
                                            ? 'text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                    style={currentPage === page ? { background: 'var(--bs-teal)' } : {}}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage >= totalPages}
                                className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* FAQ */}
            <FAQSection />
        </div>
    );
}
