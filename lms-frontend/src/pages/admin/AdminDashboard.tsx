import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import {
    Users,
    Building2,
    BookOpen,
    CheckCircle2,
    DollarSign,
    CreditCard,
    Award,
} from 'lucide-react';

interface DashboardStats {
    totalUsers: number;
    totalBusinesses: number;
    totalCourses: number;
    activeEnrollments: number;
    completedEnrollments: number;
    totalRevenue: number;
    activeSubscriptions: number;
    certificatesIssued: number;
    featureFlagsEnabled: number;
}

const iconColors: Record<string, { bg: string; color: string }> = {
    users: { bg: 'rgba(0,77,64,0.1)', color: '#035A51' },
    business: { bg: 'rgba(33,150,243,0.1)', color: '#1565c0' },
    courses: { bg: 'rgba(0,150,136,0.1)', color: '#00695c' },
    enrolled: { bg: 'rgba(76,175,80,0.1)', color: '#2e7d32' },
    completed: { bg: 'rgba(255,152,0,0.1)', color: '#e65100' },
    revenue: { bg: 'rgba(203,255,0,0.15)', color: '#33691e' },
    subs: { bg: 'rgba(233,30,99,0.1)', color: '#ad1457' },
    certs: { bg: 'rgba(156,39,176,0.1)', color: '#7b1fa2' },
};

export function AdminDashboard() {
    const { data: stats, isLoading } = useQuery<DashboardStats>({
        queryKey: ['admin-dashboard'],
        queryFn: async () => {
            const { data } = await api.get('/admin/dashboard');
            return data;
        },
    });

    const cards = [
        { key: 'users', label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users },
        { key: 'business', label: 'Businesses', value: stats?.totalBusinesses ?? 0, icon: Building2 },
        { key: 'courses', label: 'Total Courses', value: stats?.totalCourses ?? 0, icon: BookOpen },
        { key: 'enrolled', label: 'Active Enrollments', value: stats?.activeEnrollments ?? 0, icon: BookOpen },
        { key: 'completed', label: 'Completed', value: stats?.completedEnrollments ?? 0, icon: CheckCircle2 },
        { key: 'revenue', label: 'Revenue', value: `$${(stats?.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign },
        { key: 'subs', label: 'Active Subs', value: stats?.activeSubscriptions ?? 0, icon: CreditCard },
        { key: 'certs', label: 'Certificates Issued', value: stats?.certificatesIssued ?? 0, icon: Award },
    ];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">Overview of your LMS platform</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {cards.map((card, index) => {
                    const ic = iconColors[card.key] || iconColors.users;
                    return (
                        <motion.div
                            key={card.key}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                            className="bs-card p-5"
                        >
                            {isLoading ? (
                                <div className="space-y-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse" />
                                    <div className="w-20 h-4 bg-gray-100 rounded animate-pulse" />
                                    <div className="w-16 h-7 bg-gray-100 rounded animate-pulse" />
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                                        style={{ background: ic.bg }}
                                    >
                                        <card.icon className="w-5 h-5" style={{ color: ic.color }} />
                                    </div>
                                    <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                                </>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
