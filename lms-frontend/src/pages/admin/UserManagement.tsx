import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type Column, type FilterOption } from '../../components/shared/DataTable';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Ban, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

const roleBadge: Record<string, string> = {
    ADMIN: 'badge-danger',
    BUSINESS_ADMIN: 'badge-warning',
    EMPLOYEE: 'badge-lime',
    INDIVIDUAL: 'badge-success',
};

const filters: FilterOption[] = [
    {
        key: 'role',
        label: 'Role',
        options: [
            { value: 'ADMIN', label: 'Admin' },
            { value: 'BUSINESS_ADMIN', label: 'Business Admin' },
            { value: 'EMPLOYEE', label: 'Employee' },
            { value: 'INDIVIDUAL', label: 'Individual' },
        ],
    },
    {
        key: 'is_active',
        label: 'Status',
        options: [
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
        ],
    },
];

function UserActions({ user, onToggle, onDelete }: { user: any; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
    return (
        <div className="flex items-center gap-2 justify-end">
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggle(user.id); }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                title={user.is_active ? 'Deactivate' : 'Activate'}
            >
                <Ban className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(user.id); }}
                className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                title="Delete"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}

const columns: Column<any>[] = [
    {
        key: 'email',
        label: 'User',
        sortable: true,
        render: (user) => (
            <div className="flex items-center gap-3">
                <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--bs-gray-100)', color: 'var(--bs-gray-600)' }}
                >
                    {user.email?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900">{user.email}</span>
            </div>
        ),
    },
    {
        key: 'role',
        label: 'Role',
        sortable: true,
        render: (user) => (
            <span className={roleBadge[user.role] || 'badge-lime'}>{user.role}</span>
        ),
    },
    {
        key: 'is_active',
        label: 'Status',
        sortable: true,
        getValue: (user) => (user.is_active ? 1 : 0),
        render: (user) => (
            <span className={user.is_active ? 'badge-success' : 'badge-danger'}>
                {user.is_active ? 'Active' : 'Inactive'}
            </span>
        ),
    },
    {
        key: 'created_at',
        label: 'Joined',
        sortable: true,
        getValue: (user) => new Date(user.created_at).getTime(),
        render: (user) => (
            <span className="text-sm text-gray-500">
                {new Date(user.created_at).toLocaleDateString()}
            </span>
        ),
    },
    {
        key: 'actions',
        label: 'Actions',
        headerClassName: 'text-right',
        className: 'text-right',
        render: () => null,
    },
];

export function UserManagement() {
    const queryClient = useQueryClient();
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);

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

    const handleToggle = useCallback((id: string) => toggleMut.mutate(id), [toggleMut.mutate]);
    const handleDelete = useCallback((id: string, email: string) => setDeleteTarget({ id, email }), []);

    const columnsWithActions: Column<any>[] = columns.map((col) =>
        col.key === 'actions'
            ? { ...col, render: (user: any) => <UserActions user={user} onToggle={handleToggle} onDelete={(id: string) => handleDelete(id, user.email)} /> }
            : col,
    );

    return (
        <div>
            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete User?"
                message={`Are you sure you want to delete "${deleteTarget?.email || ''}"? This action cannot be undone.`}
                onConfirm={() => { if (deleteTarget) deleteMut.mutate(deleteTarget.id); setDeleteTarget(null); }}
                onCancel={() => setDeleteTarget(null)}
            />
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage platform users</p>
                </div>
            </div>

            <DataTable
                data={users || []}
                columns={columnsWithActions}
                isLoading={isLoading}
                searchKeys={['email', 'first_name', 'last_name']}
                searchPlaceholder="Search users..."
                filters={filters}
                pageSize={10}
                emptyMessage="No users found"
            />
        </div>
    );
}
