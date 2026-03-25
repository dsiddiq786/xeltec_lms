import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, UserPlus, Trash2, BookOpen, Users, Armchair, CheckCircle } from 'lucide-react';

interface Assignment {
    employee_id: string;
    user_id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    status: string;
    enrollment: { id: string; status: string } | null;
    progress: { progress_percentage: number } | null;
    certificate: { id: string } | null;
}

interface PurchaseDetail {
    purchase: {
        id: string;
        seats_purchased: number;
        seats_assigned: number;
        course: { id: string; title: string; description?: string; base_price: string; seat_price?: string; thumbnail_url: string | null };
    };
    assignments: Assignment[];
}

export function CourseSeats() {
    const { courseId } = useParams<{ courseId: string }>();
    const queryClient = useQueryClient();
    const [showAssign, setShowAssign] = useState(false);
    const [assignEmail, setAssignEmail] = useState('');

    const { data, isLoading } = useQuery<PurchaseDetail>({
        queryKey: ['biz-course-assignments', courseId],
        queryFn: async () => {
            const { data } = await api.get(`/businesses/my/courses/${courseId}/assignments`);
            return data;
        },
        enabled: !!courseId,
    });

    const assignMutation = useMutation({
        mutationFn: async (email: string) => {
            await api.post(`/businesses/my/courses/${courseId}/assign`, { email });
        },
        onSuccess: () => {
            toast.success('Employee assigned');
            setAssignEmail('');
            setShowAssign(false);
            queryClient.invalidateQueries({ queryKey: ['biz-course-assignments', courseId] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to assign'),
    });

    const unassignMutation = useMutation({
        mutationFn: async (employeeUserId: string) => {
            await api.delete(`/businesses/my/courses/${courseId}/assign/${employeeUserId}`);
        },
        onSuccess: () => {
            toast.success('Employee unassigned');
            queryClient.invalidateQueries({ queryKey: ['biz-course-assignments', courseId] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to unassign'),
    });

    const purchase = data?.purchase;
    const assignments = data?.assignments || [];
    const assigned = assignments.filter((a) => a.enrollment);
    const unassigned = assignments.filter((a) => !a.enrollment);
    const availableSeats = purchase ? purchase.seats_purchased - purchase.seats_assigned : 0;

    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
        );
    }

    if (!purchase) return <div className="text-center py-16 text-gray-400">Purchase not found.</div>;

    const usagePct = purchase.seats_purchased > 0 ? (purchase.seats_assigned / purchase.seats_purchased) * 100 : 0;

    return (
        <div>
            <Link to="/business/manage-courses" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to Manage Courses
            </Link>

            {/* Course Preview Header */}
            <div className="bs-card overflow-hidden mb-6">
                <div className="flex">
                    <div className="w-48 h-40 flex-shrink-0 bg-gray-100">
                        {purchase.course.thumbnail_url ? (
                            <img src={purchase.course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-10 h-10 text-gray-300" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 p-5">
                        <h1 className="text-xl font-bold text-gray-900 mb-1">{purchase.course.title}</h1>
                        {purchase.course.description && (
                            <p className="text-sm text-gray-500 line-clamp-2 mb-3">{purchase.course.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                            <span className="font-medium text-[var(--bs-teal)]">
                                {purchase.course.seat_price ? `$${purchase.course.seat_price}` : `$${purchase.course.base_price}`}/seat
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                                <span>{purchase.seats_assigned} / {purchase.seats_purchased} seats used</span>
                                <span className="font-medium">{availableSeats} available</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                                <div
                                    className="h-full rounded-full"
                                    style={{ width: `${usagePct}%`, background: usagePct > 80 ? '#e65100' : 'var(--bs-teal)' }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="p-5 flex items-start">
                        <button
                            onClick={() => setShowAssign(true)}
                            disabled={availableSeats <= 0}
                            className="btn-lime disabled:opacity-50 inline-flex items-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" /> Assign Employee
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Purchased', value: purchase.seats_purchased, icon: Armchair, color: '#6a1b9a' },
                    { label: 'Assigned', value: purchase.seats_assigned, icon: Users, color: '#1565c0' },
                    { label: 'Available', value: availableSeats, icon: BookOpen, color: '#035A51' },
                    { label: 'Completed', value: assigned.filter((a) => a.enrollment?.status === 'COMPLETED').length, icon: CheckCircle, color: '#e65100' },
                ].map((stat) => (
                    <div key={stat.label} className="bs-card p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                            <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                        </div>
                        <div>
                            <div className="text-[11px] text-gray-500">{stat.label}</div>
                            <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Assigned Employees */}
            <div className="bs-card mb-6">
                <div className="p-5 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">Assigned Employees ({assigned.length})</h2>
                </div>
                {assigned.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">No employees assigned yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                    <th className="px-5 py-3">Employee</th>
                                    <th className="px-5 py-3 text-center">Progress</th>
                                    <th className="px-5 py-3 text-center">Status</th>
                                    <th className="px-5 py-3 text-center">Certificate</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assigned.map((a) => {
                                    const progress = a.progress?.progress_percentage ?? 0;
                                    return (
                                        <tr key={a.employee_id} className="border-b border-gray-50 last:border-0">
                                            <td className="px-5 py-3">
                                                <div className="font-medium text-gray-900">
                                                    {a.first_name ? `${a.first_name} ${a.last_name}` : a.email}
                                                </div>
                                                {a.first_name && <div className="text-xs text-gray-400">{a.email}</div>}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2 justify-center">
                                                    <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'var(--bs-lime)' }} />
                                                    </div>
                                                    <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    a.enrollment?.status === 'COMPLETED' ? 'bg-green-50 text-green-700' :
                                                    a.enrollment?.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' :
                                                    'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {a.enrollment?.status?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                {a.certificate ? (
                                                    <span className="text-green-600 text-xs font-medium">Issued</span>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">&mdash;</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button
                                                    onClick={() => { if (window.confirm('Unassign this employee?')) unassignMutation.mutate(a.user_id); }}
                                                    className="text-red-400 hover:text-red-600"
                                                    title="Unassign"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Unassigned employees */}
            {unassigned.length > 0 && (
                <div className="bs-card">
                    <div className="p-5 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-900">Not Assigned ({unassigned.length})</h2>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {unassigned.map((a) => (
                            <div key={a.employee_id} className="px-5 py-3 flex items-center justify-between">
                                <div>
                                    <span className="text-sm text-gray-700">{a.first_name ? `${a.first_name} ${a.last_name}` : a.email}</span>
                                    <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                        a.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
                                        a.status === 'INVITED' ? 'bg-blue-50 text-blue-700' :
                                        'bg-gray-100 text-gray-500'
                                    }`}>{a.status}</span>
                                </div>
                                {a.status === 'ACTIVE' && availableSeats > 0 && (
                                    <button
                                        onClick={() => assignMutation.mutate(a.email)}
                                        className="text-xs text-[var(--bs-teal)] font-medium hover:underline"
                                    >
                                        Assign
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {showAssign && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAssign(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Assign Employee</h2>
                        <p className="text-sm text-gray-500 mb-5">Enter the employee email to assign a seat.</p>
                        <input
                            type="email" value={assignEmail}
                            onChange={(e) => setAssignEmail(e.target.value)}
                            placeholder="employee@company.com"
                            className="bs-input mb-4"
                        />
                        <div className="flex items-center justify-between">
                            <button onClick={() => setShowAssign(false)} className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg">Cancel</button>
                            <button
                                onClick={() => assignEmail && assignMutation.mutate(assignEmail)}
                                disabled={!assignEmail || assignMutation.isPending}
                                className="btn-lime disabled:opacity-50"
                            >
                                {assignMutation.isPending ? 'Assigning...' : 'Assign Seat'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
