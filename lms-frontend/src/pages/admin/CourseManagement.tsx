import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { Course, PaginatedResponse } from '../../types';
import { Eye, EyeOff, Trash2, Plus } from 'lucide-react';

export function CourseManagement() {
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery<PaginatedResponse<Course>>({
        queryKey: ['admin-courses'],
        queryFn: async () => {
            const { data } = await api.get('/courses?limit=50');
            return data;
        },
    });

    const publishMut = useMutation({
        mutationFn: async (id: string) => api.post(`/courses/${id}/publish`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
            toast.success('Course published');
        },
    });

    const unpublishMut = useMutation({
        mutationFn: async (id: string) => api.post(`/courses/${id}/unpublish`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
            toast.success('Course unpublished');
        },
    });

    const deleteMut = useMutation({
        mutationFn: async (id: string) => api.delete(`/courses/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
            toast.success('Course deleted');
        },
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage all courses on the platform</p>
                </div>
                <button className="btn-lime">
                    <Plus className="w-4 h-4" />
                    Add Course
                </button>
            </div>

            <div className="bs-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr style={{ background: 'var(--bs-gray-50)' }}>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Course</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Price</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Versions</th>
                            <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading
                            ? Array.from({ length: 4 }).map((_, i) => (
                                <tr key={i} style={{ borderTop: '1px solid var(--bs-gray-100)' }}>
                                    <td className="px-5 py-4"><div className="w-48 h-5 bg-gray-100 rounded animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-20 h-5 bg-gray-100 rounded-full animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-16 h-5 bg-gray-100 rounded animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-8 h-5 bg-gray-100 rounded animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-20 h-5 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                </tr>
                            ))
                            : (Array.isArray(data?.data) ? data.data : []).map((course: any, index: number) => (
                                <motion.tr
                                    key={course.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="hover:bg-gray-50/50 transition-colors"
                                    style={{ borderTop: '1px solid var(--bs-gray-100)' }}
                                >
                                    <td className="px-5 py-4">
                                        <p className="font-medium text-gray-900 text-sm">{course.title}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={course.is_published ? 'badge-success' : 'badge-warning'}>
                                            {course.is_published ? 'Published' : 'Draft'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-sm font-semibold text-gray-900">
                                            {Number(course.base_price) > 0 ? `$${Number(course.base_price).toFixed(2)}` : 'Free'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-sm text-gray-500">{course.versions?.length ?? 0}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2 justify-end">
                                            <button
                                                onClick={() => course.is_published ? unpublishMut.mutate(course.id) : publishMut.mutate(course.id)}
                                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                                                title={course.is_published ? 'Unpublish' : 'Publish'}
                                            >
                                                {course.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => deleteMut.mutate(course.id)}
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

                {!isLoading && (!data?.data || data.data.length === 0) && (
                    <div className="text-center py-16">
                        <p className="text-gray-500">No courses found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
