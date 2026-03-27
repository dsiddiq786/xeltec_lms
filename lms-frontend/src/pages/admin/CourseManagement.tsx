import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column, type FilterOption } from '../../components/shared/DataTable';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { Course, PaginatedResponse } from '../../types';
import { Eye, EyeOff, Trash2, Plus, Pencil } from 'lucide-react';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

const filters: FilterOption[] = [
    {
        key: 'is_published',
        label: 'Status',
        options: [
            { value: 'true', label: 'Published' },
            { value: 'false', label: 'Draft' },
        ],
    },
];

const columns: Column<any>[] = [
    {
        key: 'title',
        label: 'Course',
        sortable: true,
        render: (course) => (
            <p className="font-medium text-gray-900 text-sm">{course.title}</p>
        ),
    },
    {
        key: 'is_published',
        label: 'Status',
        sortable: true,
        getValue: (course) => (course.is_published ? 1 : 0),
        render: (course) => (
            <span className={course.is_published ? 'badge-success' : 'badge-warning'}>
                {course.is_published ? 'Published' : 'Draft'}
            </span>
        ),
    },
    {
        key: 'base_price',
        label: 'Price',
        sortable: true,
        getValue: (course) => Number(course.base_price) || 0,
        render: (course) => (
            <span className="text-sm font-semibold text-gray-900">
                {Number(course.base_price) > 0 ? `$${Number(course.base_price).toFixed(2)}` : 'Free'}
            </span>
        ),
    },
    {
        key: 'versions',
        label: 'Versions',
        sortable: true,
        getValue: (course) => course.versions?.length ?? 0,
        render: (course) => (
            <span className="text-sm text-gray-500">{course.versions?.length ?? 0}</span>
        ),
    },
    { key: 'actions', label: 'Actions', headerClassName: 'text-right', className: 'text-right', render: () => null },
];

export function CourseManagement() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

    const { data, isLoading } = useQuery<PaginatedResponse<Course>>({
        queryKey: ['admin-courses'],
        queryFn: async () => {
            const { data } = await api.get('/courses?limit=50');
            return data;
        },
    });

    const publishMut = useMutation({
        mutationFn: async (id: string) => api.post(`/courses/${id}/publish`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-courses'] }); toast.success('Course published'); },
    });

    const unpublishMut = useMutation({
        mutationFn: async (id: string) => api.post(`/courses/${id}/unpublish`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-courses'] }); toast.success('Course unpublished'); },
    });

    const deleteMut = useMutation({
        mutationFn: async (id: string) => api.delete(`/courses/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-courses'] }); toast.success('Course deleted'); },
    });

    const courses = Array.isArray(data?.data) ? data.data : [];

    const createCourseMut = useMutation({
        mutationFn: async () => {
            const { data } = await api.post('/courses', { title: 'Untitled Course', base_price: 0 });
            return data;
        },
        onSuccess: (data: any) => {
            toast.success('Course created');
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
            navigate(`/admin/courses/${data.id}/edit`);
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create course'),
    });

    const columnsWithActions: Column<any>[] = columns.map((col) =>
        col.key === 'actions'
            ? {
                ...col,
                render: (course: any) => (
                    <div className="flex items-center gap-2 justify-end">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/courses/${course.id}/edit`); }}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                            title="Edit"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); course.is_published ? unpublishMut.mutate(course.id) : publishMut.mutate(course.id); }}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                            title={course.is_published ? 'Unpublish' : 'Publish'}
                        >
                            {course.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: course.id, title: course.title }); }}
                            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ),
              }
            : col,
    );

    return (
        <div>
            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Course?"
                message={`Are you sure you want to delete "${deleteTarget?.title || ''}"? This action cannot be undone.`}
                onConfirm={() => { if (deleteTarget) deleteMut.mutate(deleteTarget.id); setDeleteTarget(null); }}
                onCancel={() => setDeleteTarget(null)}
            />
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage all courses on the platform</p>
                </div>
                <button
                    type="button"
                    className="btn-lime"
                    onClick={() => createCourseMut.mutate()}
                    disabled={createCourseMut.isPending}
                >
                    <Plus className="w-4 h-4" />
                    {createCourseMut.isPending ? 'Creating...' : 'Add Course'}
                </button>
            </div>

            <DataTable
                data={courses}
                columns={columnsWithActions}
                isLoading={isLoading}
                searchKeys={['title']}
                searchPlaceholder="Search courses..."
                filters={filters}
                pageSize={10}
                emptyMessage="No courses found"
                onRowClick={(row) => navigate(`/admin/courses/${row.id}`)}
            />
        </div>
    );
}
