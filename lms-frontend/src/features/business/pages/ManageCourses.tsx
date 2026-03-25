import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { BookOpen, Users, Armchair, ArrowRight } from 'lucide-react';

interface CoursePurchase {
    id: string;
    course_id: string;
    seats_purchased: number;
    seats_assigned: number;
    course: { id: string; title: string; description?: string; base_price: string; seat_price?: string; thumbnail_url: string | null };
}

export function ManageCourses() {
    const navigate = useNavigate();

    const { data: purchases, isLoading } = useQuery<CoursePurchase[]>({
        queryKey: ['biz-course-purchases'],
        queryFn: async () => {
            const { data } = await api.get('/businesses/my/courses');
            return data;
        },
    });

    const totalSeats = (purchases || []).reduce((s, p) => s + p.seats_purchased, 0);
    const usedSeats = (purchases || []).reduce((s, p) => s + p.seats_assigned, 0);
    const availSeats = totalSeats - usedSeats;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Manage Courses</h1>
                <button onClick={() => navigate('/business/explore')} className="btn-lime">Buy More Courses</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[
                    { label: 'Total Courses', value: purchases?.length || 0, icon: BookOpen, color: '#1565c0' },
                    { label: 'Total Seats', value: totalSeats, icon: Armchair, color: '#6a1b9a' },
                    { label: 'Available Seats', value: availSeats, icon: Users, color: '#035A51' },
                ].map((stat) => (
                    <div key={stat.label} className="bs-card p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                            <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">{stat.label}</div>
                            <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bs-card h-52 animate-pulse bg-gray-50" />
                    ))}
                </div>
            ) : !purchases?.length ? (
                <div className="bs-card p-12 text-center">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-400 mb-4">No courses purchased yet.</p>
                    <button onClick={() => navigate('/business/explore')} className="btn-lime">Explore Courses</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {purchases.map((p) => {
                        const available = p.seats_purchased - p.seats_assigned;
                        const usagePct = p.seats_purchased > 0 ? (p.seats_assigned / p.seats_purchased) * 100 : 0;
                        return (
                            <div
                                key={p.id}
                                className="bs-card overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => navigate(`/business/courses/${p.course_id}/seats`)}
                            >
                                <div className="flex">
                                    <div className="w-36 h-36 flex-shrink-0 bg-gray-100">
                                        {p.course.thumbnail_url ? (
                                            <img src={p.course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <BookOpen className="w-8 h-8 text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 p-4 flex flex-col">
                                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">{p.course.title}</h3>
                                        <div className="text-xs text-gray-400 mb-3">
                                            {p.course.seat_price ? `$${p.course.seat_price}/seat` : `$${p.course.base_price}/seat`}
                                        </div>

                                        <div className="mt-auto">
                                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                                                <span>{p.seats_assigned} / {p.seats_purchased} seats used</span>
                                                <span className="font-medium text-[var(--bs-teal)]">{available} available</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{ width: `${usagePct}%`, background: usagePct > 80 ? '#e65100' : 'var(--bs-teal)' }}
                                                />
                                            </div>
                                        </div>

                                        <button className="mt-3 self-end text-xs font-medium text-[var(--bs-teal)] hover:underline inline-flex items-center gap-1">
                                            Manage Seats <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
