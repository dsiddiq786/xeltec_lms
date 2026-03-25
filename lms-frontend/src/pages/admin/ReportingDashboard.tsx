import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { BarChart3, Users, BookOpen, Award, TrendingUp, DollarSign, ShieldCheck, ClipboardCheck, Calendar } from 'lucide-react';

interface DashboardStats {
    totalUsers: number;
    totalCourses: number;
    publishedCourses: number;
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    certificatesIssued: number;
    totalBusinesses: number;
    totalRevenue: number;
    activeSubscriptions: number;
}

interface ReportingData {
    enrollmentsLast30d: number;
    enrollmentsLast7d: number;
    revenueThisMonth: number;
    topCourses: Array<{ courseTitle: string; enrollments: number }>;
    kycPending: number;
    assessmentAttempts: number;
    avgAssessmentScore: number;
}

export function ReportingDashboard() {
    const { data: stats, isLoading } = useQuery<DashboardStats>({
        queryKey: ['admin-dashboard'],
        queryFn: async () => (await api.get('/admin/dashboard')).data,
    });

    const { data: reporting } = useQuery<ReportingData>({
        queryKey: ['admin-reporting'],
        queryFn: async () => (await api.get('/admin/reporting')).data,
    });

    const completionRate = stats && stats.totalEnrollments
        ? Math.round((stats.completedEnrollments / stats.totalEnrollments) * 100) : 0;

    const cards = [
        { label: 'Total Enrollments', value: stats?.totalEnrollments ?? '—', icon: BookOpen, color: '#035A51', sub: 'All time' },
        { label: 'Completion Rate', value: `${completionRate}%`, icon: TrendingUp, color: '#1565c0', sub: 'Of all enrollments' },
        { label: 'Certificates Issued', value: stats?.certificatesIssued ?? '—', icon: Award, color: '#6a1b9a', sub: 'All time' },
        { label: 'Active Learners', value: stats?.totalUsers ?? '—', icon: Users, color: '#e65100', sub: 'Registered users' },
        { label: 'Published Courses', value: stats?.publishedCourses ?? '—', icon: BarChart3, color: '#2e7d32', sub: `${stats?.totalCourses ?? 0} total` },
        { label: 'Total Revenue', value: `$${(stats?.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: '#ad1457', sub: 'All time' },
    ];

    const trendCards = [
        { label: 'Enrollments (7d)', value: reporting?.enrollmentsLast7d ?? '—', icon: Calendar, color: '#00695c' },
        { label: 'Enrollments (30d)', value: reporting?.enrollmentsLast30d ?? '—', icon: Calendar, color: '#00838f' },
        { label: 'Revenue This Month', value: `$${(reporting?.revenueThisMonth ?? 0).toLocaleString()}`, icon: DollarSign, color: '#c62828' },
        { label: 'KYC Pending', value: reporting?.kycPending ?? '—', icon: ShieldCheck, color: '#ef6c00' },
        { label: 'Assessment Attempts', value: reporting?.assessmentAttempts ?? '—', icon: ClipboardCheck, color: '#4527a0' },
        { label: 'Avg. Assessment Score', value: `${reporting?.avgAssessmentScore ?? 0}%`, icon: TrendingUp, color: '#1b5e20' },
    ];

    const Skeleton = () => (
        <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse" />
            <div className="w-24 h-4 bg-gray-100 rounded animate-pulse" />
            <div className="w-16 h-7 bg-gray-100 rounded animate-pulse" />
        </div>
    );

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Reporting</h1>
                <p className="text-sm text-gray-500 mt-1">Platform analytics, trends, and compliance tracking</p>
            </div>

            {/* Primary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                {cards.map((card) => (
                    <div key={card.label} className="bs-card p-5">
                        {isLoading ? <Skeleton /> : (
                            <>
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: `${card.color}15` }}>
                                    <card.icon className="w-5 h-5" style={{ color: card.color }} />
                                </div>
                                <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                                <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Trend cards */}
            <div className="mb-8">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Trends &amp; Activity</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {trendCards.map((card) => (
                        <div key={card.label} className="bs-card p-4 text-center">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: `${card.color}12` }}>
                                <card.icon className="w-4 h-4" style={{ color: card.color }} />
                            </div>
                            <p className="text-xl font-bold text-gray-900">{card.value}</p>
                            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Enrollment funnel */}
                <div className="bs-card p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">Enrollment Funnel</h2>
                    <div className="space-y-4">
                        {[
                            { label: 'Total Enrollments', value: stats?.totalEnrollments ?? 0, pct: 100, color: '#035A51' },
                            { label: 'In Progress', value: (stats?.totalEnrollments ?? 0) - (stats?.completedEnrollments ?? 0), pct: stats?.totalEnrollments ? Math.round(((stats.totalEnrollments - (stats.completedEnrollments ?? 0)) / stats.totalEnrollments) * 100) : 0, color: '#1565c0' },
                            { label: 'Completed', value: stats?.completedEnrollments ?? 0, pct: completionRate, color: '#2e7d32' },
                            { label: 'Certified', value: stats?.certificatesIssued ?? 0, pct: stats?.totalEnrollments ? Math.round(((stats.certificatesIssued ?? 0) / stats.totalEnrollments) * 100) : 0, color: '#6a1b9a' },
                        ].map((step) => (
                            <div key={step.label}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-gray-600">{step.label}</span>
                                    <span className="font-semibold text-gray-900">{step.value} ({step.pct}%)</span>
                                </div>
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${step.pct}%`, background: step.color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top courses */}
                <div className="bs-card p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">Top Courses by Enrollment</h2>
                    {reporting?.topCourses && reporting.topCourses.length > 0 ? (
                        <div className="space-y-3">
                            {reporting.topCourses.map((course, i) => {
                                const maxEnrollments = reporting.topCourses[0]?.enrollments ?? 1;
                                const pct = Math.round((course.enrollments / maxEnrollments) * 100);
                                return (
                                    <div key={i}>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="text-gray-700 font-medium truncate max-w-[70%]">{course.courseTitle}</span>
                                            <span className="text-gray-500 font-semibold">{course.enrollments}</span>
                                        </div>
                                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-8">No enrollment data yet</p>
                    )}
                </div>
            </div>
        </div>
    );
}
