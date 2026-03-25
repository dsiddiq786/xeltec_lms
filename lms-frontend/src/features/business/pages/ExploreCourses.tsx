import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import type { Course, PaginatedResponse } from '../../../types';
import { CourseCard } from '../../../components/shared/CourseCard';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export function ExploreCourses() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const { data: bizData } = useQuery({
        queryKey: ['my-business-id'],
        queryFn: async () => {
            const { data } = await api.get('/businesses/my/business');
            return Array.isArray(data) ? data[0] : data;
        },
    });
    const [purchaseModal, setPurchaseModal] = useState<{ courseId: string; title: string; businessId?: string } | null>(null);
    const [seats, setSeats] = useState(10);
    const [purchasing, setPurchasing] = useState(false);

    const { data, isLoading } = useQuery<PaginatedResponse<Course>>({
        queryKey: ['biz-catalog', page, search],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: '9', page: String(page) });
            if (search) params.set('search', search);
            const { data } = await api.get(`/courses/catalog?${params}`);
            return data;
        },
    });

    const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

    const handlePurchase = async () => {
        if (!purchaseModal) return;
        setPurchasing(true);
        try {
            await api.post('/purchase-requests', {
                course_id: purchaseModal.courseId,
                request_type: 'BUSINESS',
                business_id: purchaseModal.businessId,
                seats_requested: seats,
            });
            const toast = (await import('react-hot-toast')).default;
            toast.success('Purchase request submitted! You\'ll be notified when approved.');
            setPurchaseModal(null);
        } catch (err: any) {
            const toast = (await import('react-hot-toast')).default;
            toast.error(err?.response?.data?.message || 'Request failed');
        } finally {
            setPurchasing(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Explore Courses</h1>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text" placeholder="Search" value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-52 outline-none focus:border-[var(--bs-teal)]"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bs-card h-48 animate-pulse bg-gray-50" />
                    ))
                ) : (data?.data || []).map((course: any) => (
                    <CourseCard
                        key={course.id}
                        variant="horizontal"
                        title={course.title}
                        description={course.description}
                        price={Number(course.base_price) || 0}
                        rating={4.9}
                        reviewCount={200}
                        level="Intermediate"
                        imageUrl={course.thumbnail_url}
                        onViewCourse={() => setPurchaseModal({ courseId: course.id, title: course.title, businessId: bizData?.id })}
                    />
                ))}

                {!isLoading && (!data?.data || data.data.length === 0) && (
                    <div className="text-center py-16 text-gray-400">No courses found.</div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 text-sm text-gray-500">
                    <span>Page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="p-2 rounded-lg border disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                        <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-2 rounded-lg border disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            )}

            {/* Purchase Seats Modal */}
            {purchaseModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPurchaseModal(null)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Enter Number of seats</h2>
                        <p className="text-sm text-gray-500 mb-5">{purchaseModal.title}</p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Employees</label>
                            <input
                                type="number" min={1} value={seats}
                                onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value) || 1))}
                                className="bs-input"
                            />
                            <p className="text-xs text-gray-400 mt-1">Enter how many employees you want to enroll in this certification.</p>
                        </div>
                        <div className="flex items-center justify-between mt-6">
                            <button onClick={() => setPurchaseModal(null)} className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg">Cancel</button>
                            <button onClick={handlePurchase} disabled={purchasing} className="btn-lime disabled:opacity-50">
                                {purchasing ? 'Submitting...' : 'Request Purchase'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
