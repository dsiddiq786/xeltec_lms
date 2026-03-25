import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Ban, Trash2 } from 'lucide-react';

const roleBadge: Record<string, string> = {
    ADMIN: 'badge-danger',
    BUSINESS_ADMIN: 'badge-warning',
    EMPLOYEE: 'badge-lime',
    INDIVIDUAL: 'badge-success',
};

export function UserManagement() {
    const queryClient = useQueryClient();

    const { data: users, isLoading } = useQuery<any[]>({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const { data } = await api.get('/users?limit=100');
            return Array.isArray(data) ? data : data?.data ?? [];
        },
    });

    const toggleMut = useMutation({
        mutationFn: async (id: string) => api.patch(`/users/${id}/toggle-active`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success('User status updated');
        },
    });

    const deleteMut = useMutation({
        mutationFn: async (id: string) => api.delete(`/users/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success('User deleted');
        },
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage platform users</p>
                </div>
            </div>

            <div className="bs-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr style={{ background: 'var(--bs-gray-50)' }}>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">User</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Role</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Joined</th>
                            <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading
                            ? Array.from({ length: 4 }).map((_, i) => (
                                <tr key={i} style={{ borderTop: '1px solid var(--bs-gray-100)' }}>
                                    <td className="px-5 py-4"><div className="w-48 h-5 bg-gray-100 rounded animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-24 h-5 bg-gray-100 rounded-full animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-16 h-5 bg-gray-100 rounded-full animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-24 h-5 bg-gray-100 rounded animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-20 h-5 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                </tr>
                            ))
                            : users?.map((user: any, index: number) => (
                                <motion.tr
                                    key={user.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="hover:bg-gray-50/50 transition-colors"
                                    style={{ borderTop: '1px solid var(--bs-gray-100)' }}
                                >
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--bs-gray-100)', color: 'var(--bs-gray-600)' }}>
                                                {user.email?.[0]?.toUpperCase()}
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={roleBadge[user.role] || 'badge-lime'}>{user.role}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={user.is_active ? 'badge-success' : 'badge-danger'}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-sm text-gray-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2 justify-end">
                                            <button
                                                onClick={() => toggleMut.mutate(user.id)}
                                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                                                title={user.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                <Ban className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteMut.mutate(user.id)}
                                                className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
