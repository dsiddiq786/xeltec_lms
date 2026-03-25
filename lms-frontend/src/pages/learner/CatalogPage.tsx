import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { Course, PaginatedResponse } from '../../types';
import { BookOpen, ArrowRight, Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function CatalogPage() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const { data, isLoading } = useQuery<PaginatedResponse<Course>>({
        queryKey: ['catalog'],
        queryFn: async () => {
            const { data } = await api.get('/courses/catalog?limit=50');
            return data;
        },
    });

    const handleEnroll = async (course: Course) => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        const latestVersion = course.versions?.[0];
        if (!latestVersion) {
            toast.error('No version available');
            return;
        }

        const price = Number(course.base_price);
        if (price > 0) {
            try {
                const { data } = await api.post('/payments/checkout', {
                    course_version_id: latestVersion.id,
                    success_url: `${window.location.origin}/dashboard?enrolled=true`,
                    cancel_url: window.location.href,
                });
                if (data.session_url) {
                    window.location.href = data.session_url;
                } else if (data.free) {
                    toast.success('Enrolled successfully!');
                    navigate('/dashboard');
                }
            } catch (err: any) {
                toast.error(err.response?.data?.message || 'Enrollment failed');
            }
        } else {
            try {
                await api.post('/enrollments', { course_version_id: latestVersion.id });
                toast.success('Enrolled successfully!');
                navigate('/dashboard');
            } catch (err: any) {
                toast.error(err.response?.data?.message || 'Enrollment failed');
            }
        }
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Browse Courses</h1>
                <p className="text-sm text-gray-500 mt-1">Find the right course for your career</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bs-card overflow-hidden">
                            <div className="h-44 bg-gray-100 animate-pulse" />
                            <div className="p-5 space-y-3">
                                <div className="w-3/4 h-5 bg-gray-100 rounded animate-pulse" />
                                <div className="w-full h-4 bg-gray-100 rounded animate-pulse" />
                                <div className="w-1/3 h-6 bg-gray-100 rounded animate-pulse" />
                            </div>
                        </div>
                    ))
                    : data?.data.map((course: any, index: number) => (
                        <motion.div
                            key={course.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bs-card overflow-hidden group cursor-pointer"
                            onClick={() => handleEnroll(course)}
                        >
                            {/* Card Image */}
                            <div className="h-44 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' }}>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <BookOpen className="w-12 h-12" style={{ color: 'rgba(0,77,64,0.15)' }} />
                                </div>
                                {Number(course.base_price) > 0 && (
                                    <div className="absolute top-3 right-3">
                                        <span className="badge-lime text-xs">
                                            v{course.versions?.[0]?.version_number || 1}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Card Body */}
                            <div className="p-5">
                                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-base group-hover:text-[var(--bs-teal)] transition-colors">
                                    {course.title}
                                </h3>
                                <p className="text-xs text-gray-500 line-clamp-2 mb-4">
                                    {course.description || 'Start learning this course today'}
                                </p>

                                {/* Stars */}
                                <div className="flex items-center gap-1 mb-3">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star key={i} className="w-3.5 h-3.5" fill={i < 4 ? '#ffc107' : 'none'} stroke={i < 4 ? '#ffc107' : '#ddd'} />
                                    ))}
                                    <span className="text-xs text-gray-400 ml-1">(4.0)</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        {Number(course.base_price) > 0 ? (
                                            <span className="text-xl font-bold text-gray-900">
                                                ${Number(course.base_price).toFixed(2)}
                                            </span>
                                        ) : (
                                            <span className="text-xl font-bold" style={{ color: 'var(--bs-teal)' }}>Free</span>
                                        )}
                                    </div>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleEnroll(course); }}
                                        className="btn-lime !py-2 !px-4 !text-xs"
                                    >
                                        Enroll
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
            </div>

            {!isLoading && data?.data.length === 0 && (
                <div className="text-center py-20">
                    <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bs-lime-muted)' }}>
                        <BookOpen className="w-8 h-8" style={{ color: 'var(--bs-teal)' }} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses available</h3>
                    <p className="text-sm text-gray-500">Check back soon for new courses</p>
                </div>
            )}
        </div>
    );
}
