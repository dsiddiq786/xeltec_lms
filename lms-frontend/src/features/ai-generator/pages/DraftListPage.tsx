import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Clock, CheckCircle, XCircle, Loader2, Trash2, RefreshCw, Eye, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    queued: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Queued' },
    processing: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Processing' },
    completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Completed' },
    failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Failed' },
};

function formatDuration(seconds: number | null) {
    if (!seconds) return '—';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function DraftListPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const { data: jobs, isLoading } = useQuery<any[]>({
        queryKey: ['ai-jobs'],
        queryFn: async () => {
            const { data } = await api.get('course-generator/jobs');
            return data;
        },
        refetchInterval: 3000,
    });

    const deleteMut = useMutation({
        mutationFn: async (jobId: string) => api.delete(`course-generator/jobs/${jobId}`),
        onSuccess: () => {
            toast.success('Job deleted');
            queryClient.invalidateQueries({ queryKey: ['ai-jobs'] });
            setDeleteTarget(null);
        },
        onError: () => toast.error('Failed to delete job'),
    });

    const retryMut = useMutation({
        mutationFn: async (jobId: string) => api.post(`course-generator/jobs/${jobId}/retry`),
        onSuccess: () => {
            toast.success('Job re-queued for processing');
            queryClient.invalidateQueries({ queryKey: ['ai-jobs'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.detail?.message || 'Retry failed'),
    });

    const hasActive = (jobs || []).some((j: any) => j.status === 'processing' || j.status === 'queued');

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">AI Course Generator</h1>
                    <p className="text-sm text-gray-500 mt-1">Generate and manage AI-powered course content</p>
                </div>
                <button onClick={() => navigate('/admin/ai-generator/new')} className="btn-lime">
                    <Plus className="w-4 h-4" /> New Course
                </button>
            </div>

            {/* Active job progress banner */}
            {(jobs || []).filter((j: any) => j.status === 'processing').map((job: any) => (
                <div key={job.job_id} className="bs-card p-5 mb-6 border-l-4" style={{ borderLeftColor: 'var(--bs-teal)' }}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                            <div>
                                <p className="text-sm font-semibold text-gray-900">{job.course_title || 'Untitled'}</p>
                                <p className="text-xs text-gray-500">{job.progress?.current_step || 'Processing...'}</p>
                            </div>
                        </div>
                        <span className="text-sm font-bold" style={{ color: 'var(--bs-teal)' }}>
                            {Math.round(job.progress?.percentage || 0)}%
                        </span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${job.progress?.percentage || 0}%`, background: 'var(--bs-teal)' }}
                        />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                        <span>Slides: {job.progress?.slides_completed || 0} / {job.progress?.slides_total || 0}</span>
                        <span>Step {job.progress?.current_step_number || 0} of {job.progress?.total_steps || 5}</span>
                    </div>
                </div>
            ))}

            {/* Jobs table */}
            <div className="bs-card overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between" style={{ background: 'var(--bs-gray-50)' }}>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Generation Jobs</span>
                    <span className="text-xs text-gray-400">{(jobs || []).length} total</span>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Course</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Progress</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Duration</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Created</th>
                            <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i} className="border-b border-gray-50">
                                    <td className="px-5 py-4"><div className="w-48 h-5 bg-gray-100 rounded animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-24 h-5 bg-gray-100 rounded-full animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-32 h-5 bg-gray-100 rounded animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-16 h-5 bg-gray-100 rounded animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-24 h-5 bg-gray-100 rounded animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-20 h-5 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                </tr>
                            ))
                        ) : (jobs || []).map((job: any) => {
                            const sc = statusConfig[job.status] || statusConfig.queued;
                            const Icon = sc.icon;
                            return (
                                <tr key={job.job_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <td className="px-5 py-4">
                                        <p className="text-sm font-medium text-gray-900">{job.course_title || 'Untitled'}</p>
                                        {job.error_message && (
                                            <p className="text-xs text-red-500 mt-1 flex items-start gap-1 max-w-xs">
                                                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                <span className="line-clamp-2">{job.error_message}</span>
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                                            <Icon className={`w-3.5 h-3.5 ${job.status === 'processing' ? 'animate-spin' : ''}`} />
                                            {sc.label}
                                        </span>
                                        {job.retry_count > 0 && (
                                            <span className="ml-1.5 text-[10px] text-gray-400">×{job.retry_count}</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${job.progress?.percentage || 0}%`,
                                                        background: job.status === 'failed' ? '#ef4444' : 'var(--bs-teal)',
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-500 tabular-nums">{Math.round(job.progress?.percentage || 0)}%</span>
                                        </div>
                                        {job.status === 'processing' && (
                                            <p className="text-[10px] text-gray-400 mt-1 truncate max-w-[180px]">{job.progress?.current_step}</p>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-sm text-gray-500 tabular-nums">{formatDuration(job.elapsed_seconds)}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-sm text-gray-500">{formatDate(job.created_at)}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            {job.status === 'completed' && job.course_id && (
                                                <button
                                                    onClick={() => navigate(`/admin/ai-generator/${job.course_id}`)}
                                                    className="p-2 rounded-lg text-[var(--bs-teal)] hover:bg-[var(--bs-teal)]/10 transition-colors"
                                                    title="View / Publish"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            )}
                                            {job.status === 'failed' && (
                                                <button
                                                    onClick={() => retryMut.mutate(job.job_id)}
                                                    disabled={retryMut.isPending}
                                                    className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                                    title="Retry"
                                                >
                                                    <RefreshCw className={`w-4 h-4 ${retryMut.isPending ? 'animate-spin' : ''}`} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setDeleteTarget(job.job_id)}
                                                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {!isLoading && (!jobs || jobs.length === 0) && (
                    <div className="text-center py-16">
                        <p className="text-gray-500 mb-4">No generation jobs yet.</p>
                        <button onClick={() => navigate('/admin/ai-generator/new')} className="btn-lime">
                            Create Your First AI Course
                        </button>
                    </div>
                )}
            </div>

            {/* Delete confirmation modal */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Delete Job</h3>
                                <p className="text-xs text-gray-500">This will permanently delete the job and its draft content.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteMut.mutate(deleteTarget)}
                                disabled={deleteMut.isPending}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
                            >
                                {deleteMut.isPending ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
