import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { UserPlus, RefreshCw, Trash2, Search, Users, UserCheck, Clock, CheckCircle, Ban } from 'lucide-react';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';

interface Employee {
    id: string;
    status: string;
    created_at: string;
    user: {
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
    };
}

export function EmployeeManagement() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

    const { data: biz, isLoading } = useQuery({
        queryKey: ['my-business'],
        queryFn: async () => {
            const { data } = await api.get('/businesses/my/business');
            return Array.isArray(data) ? data[0] : data;
        },
    });

    const employees: Employee[] = biz?.employees || [];
    const filtered = employees.filter((e) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return e.user?.email?.toLowerCase().includes(q) ||
            e.user?.first_name?.toLowerCase().includes(q) ||
            e.user?.last_name?.toLowerCase().includes(q);
    });

    const pendingCount = employees.filter((e) => e.status === 'PENDING_APPROVAL').length;

    const stats = [
        { label: 'Total', value: employees.length, icon: Users, color: '#035A51' },
        { label: 'Active', value: employees.filter((e) => e.status === 'ACTIVE').length, icon: UserCheck, color: '#1565c0' },
        { label: 'Pending', value: pendingCount, icon: Clock, color: '#e65100' },
        { label: 'Invited', value: employees.filter((e) => e.status === 'INVITED').length, icon: Clock, color: '#6a1b9a' },
    ];

    const inviteMutation = useMutation({
        mutationFn: async (email: string) => {
            await api.post('/businesses/my/employees/invite', { email });
        },
        onSuccess: () => {
            toast.success('Invite sent!');
            setInviteEmail('');
            setShowInvite(false);
            queryClient.invalidateQueries({ queryKey: ['my-business'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Invite failed'),
    });

    const removeMutation = useMutation({
        mutationFn: async (employeeId: string) => {
            await api.delete(`/businesses/my/employees/${employeeId}`);
        },
        onSuccess: () => {
            toast.success('Employee removed');
            queryClient.invalidateQueries({ queryKey: ['my-business'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Remove failed'),
    });

    const approveMutation = useMutation({
        mutationFn: async (employeeId: string) => {
            await api.post(`/businesses/my/employees/${employeeId}/approve`);
        },
        onSuccess: () => {
            toast.success('Employee approved!');
            queryClient.invalidateQueries({ queryKey: ['my-business'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Approval failed'),
    });

    const rejectMutation = useMutation({
        mutationFn: async (employeeId: string) => {
            await api.post(`/businesses/my/employees/${employeeId}/reject`);
        },
        onSuccess: () => {
            toast.success('Request rejected');
            queryClient.invalidateQueries({ queryKey: ['my-business'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Rejection failed'),
    });

    return (
        <div>
            <ConfirmDialog
                open={!!removeTarget}
                title="Remove Employee?"
                message={`Are you sure you want to remove "${removeTarget?.name || ''}"? They will lose access to all assigned courses.`}
                confirmLabel="Remove"
                onConfirm={() => { if (removeTarget) removeMutation.mutate(removeTarget.id); setRemoveTarget(null); }}
                onCancel={() => setRemoveTarget(null)}
            />
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
                <button onClick={() => setShowInvite(true)} className="btn-lime inline-flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Invite Employee
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {stats.map((stat) => (
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

            {/* Search */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search employees..."
                    className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-64 outline-none focus:border-[var(--bs-teal)]"
                />
            </div>

            {/* Employee Table */}
            <div className="bs-card">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        {employees.length === 0 ? (
                            <>
                                <p className="mb-4">No employees yet.</p>
                                <button onClick={() => setShowInvite(true)} className="btn-lime">Invite your first employee</button>
                            </>
                        ) : (
                            <p>No employees match your search.</p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                    <th className="px-5 py-3">Employee</th>
                                    <th className="px-5 py-3">Email</th>
                                    <th className="px-5 py-3 text-center">Status</th>
                                    <th className="px-5 py-3">Joined</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((emp) => (
                                    <tr key={emp.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[var(--bs-teal)] flex items-center justify-center text-white text-xs font-bold">
                                                    {emp.user?.first_name?.[0] || emp.user?.email?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <span className="font-medium text-gray-900">
                                                    {emp.user?.first_name ? `${emp.user.first_name} ${emp.user.last_name}` : '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-gray-500">{emp.user?.email}</td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                emp.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
                                                emp.status === 'INVITED' ? 'bg-blue-50 text-blue-700' :
                                                emp.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700' :
                                                emp.status === 'DEACTIVATED' ? 'bg-red-50 text-red-600' :
                                                'bg-gray-100 text-gray-500'
                                            }`}>
                                                {emp.status === 'PENDING_APPROVAL' ? 'Pending Approval' : emp.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-gray-400 text-xs">
                                            {new Date(emp.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {emp.status === 'PENDING_APPROVAL' && (
                                                    <>
                                                        <button
                                                            onClick={() => approveMutation.mutate(emp.id)}
                                                            disabled={approveMutation.isPending}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => rejectMutation.mutate(emp.id)}
                                                            disabled={rejectMutation.isPending}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                            title="Reject"
                                                        >
                                                            <Ban className="w-3.5 h-3.5 inline mr-1" />
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {emp.status === 'INVITED' && (
                                                    <button
                                                        onClick={() => inviteMutation.mutate(emp.user?.email)}
                                                        className="text-blue-500 hover:text-blue-700"
                                                        title="Resend invite"
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {emp.status !== 'PENDING_APPROVAL' && (
                                                    <button
                                                        onClick={() => setRemoveTarget({ id: emp.id, name: emp.user?.email || 'this employee' })}
                                                        className="text-red-400 hover:text-red-600"
                                                        title="Remove"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            {showInvite && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Invite Employee</h2>
                        <p className="text-sm text-gray-500 mb-5">The employee will receive an email with an invite link.</p>
                        <input
                            type="email" value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="employee@company.com"
                            className="bs-input mb-4"
                        />
                        <div className="flex items-center justify-between">
                            <button onClick={() => setShowInvite(false)} className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg">Cancel</button>
                            <button
                                onClick={() => inviteEmail && inviteMutation.mutate(inviteEmail)}
                                disabled={!inviteEmail || inviteMutation.isPending}
                                className="btn-lime disabled:opacity-50"
                            >
                                {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
