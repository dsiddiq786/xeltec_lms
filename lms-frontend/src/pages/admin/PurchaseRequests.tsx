import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, DollarSign, Users, User, Eye } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700',
    APPROVED: 'bg-green-50 text-green-700',
    REJECTED: 'bg-red-50 text-red-700',
};

export function PurchaseRequests() {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [approvedPrice, setApprovedPrice] = useState('');
    const [adminNotes, setAdminNotes] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['admin-purchase-requests', statusFilter],
        queryFn: async () => {
            const { data } = await api.get(`/purchase-requests?limit=100&status=${statusFilter}`);
            return data;
        },
    });

    const requests = Array.isArray(data) ? data : data?.data ?? [];

    const approveMut = useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/purchase-requests/${id}/approve`, {
                approved_price: approvedPrice ? Number(approvedPrice) : undefined,
                admin_notes: adminNotes || undefined,
            });
        },
        onSuccess: () => {
            toast.success('Purchase request approved');
            setSelectedRequest(null);
            setApprovedPrice('');
            setAdminNotes('');
            queryClient.invalidateQueries({ queryKey: ['admin-purchase-requests'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to approve'),
    });

    const rejectMut = useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/purchase-requests/${id}/reject`, {
                admin_notes: adminNotes || undefined,
            });
        },
        onSuccess: () => {
            toast.success('Purchase request rejected');
            setSelectedRequest(null);
            setAdminNotes('');
            queryClient.invalidateQueries({ queryKey: ['admin-purchase-requests'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to reject'),
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Purchase Requests</h1>
                    <p className="text-sm text-gray-500 mt-1">Review and approve course purchase requests</p>
                </div>
            </div>

            <div className="flex gap-2 mb-6">
                {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            statusFilter === s
                                ? 'bg-[var(--bs-teal)] text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            <div className="bs-card">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : requests.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
                        No {statusFilter.toLowerCase()} requests
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                    <th className="px-5 py-3">User</th>
                                    <th className="px-5 py-3">Course</th>
                                    <th className="px-5 py-3">Type</th>
                                    <th className="px-5 py-3 text-center">Seats</th>
                                    <th className="px-5 py-3 text-right">Price</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Date</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((req: any) => (
                                    <tr key={req.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                        <td className="px-5 py-3">
                                            <div className="font-medium text-gray-900">
                                                {req.user?.first_name ? `${req.user.first_name} ${req.user.last_name}` : req.user?.email}
                                            </div>
                                            {req.business && <div className="text-xs text-gray-400">{req.business.name}</div>}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                {req.course?.thumbnail_url ? (
                                                    <img src={req.course.thumbnail_url} className="w-8 h-8 rounded object-cover" alt="" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-xs opacity-40">📚</div>
                                                )}
                                                <span className="font-medium text-gray-900 line-clamp-1">{req.course?.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="inline-flex items-center gap-1 text-xs">
                                                {req.request_type === 'BUSINESS' ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                                {req.request_type}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-center">{req.seats_requested}</td>
                                        <td className="px-5 py-3 text-right font-medium">
                                            ${Number(req.approved_price ?? req.original_price).toFixed(2)}
                                            {req.approved_price && req.approved_price !== req.original_price && (
                                                <span className="text-xs text-gray-400 line-through ml-1">${Number(req.original_price).toFixed(2)}</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[req.status] || ''}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-gray-400">
                                            {new Date(req.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            {req.status === 'PENDING' ? (
                                                <button
                                                    onClick={() => {
                                                        setSelectedRequest(req);
                                                        setApprovedPrice(String(Number(req.original_price)));
                                                        setAdminNotes('');
                                                    }}
                                                    className="text-xs font-medium text-[var(--bs-teal)] hover:underline"
                                                >
                                                    Review
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setSelectedRequest(req)}
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedRequest && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedRequest(null)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">
                            {selectedRequest.status === 'PENDING' ? 'Review Purchase Request' : 'Request Details'}
                        </h2>
                        <p className="text-sm text-gray-500 mb-5">
                            {selectedRequest.user?.first_name || selectedRequest.user?.email} wants to purchase <strong>{selectedRequest.course?.title}</strong>
                        </p>

                        <div className="space-y-3 mb-5">
                            <div className="flex justify-between text-sm p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-500">Type</span>
                                <span className="font-medium">{selectedRequest.request_type}</span>
                            </div>
                            <div className="flex justify-between text-sm p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-500">Seats</span>
                                <span className="font-medium">{selectedRequest.seats_requested}</span>
                            </div>
                            <div className="flex justify-between text-sm p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-500">Original Price</span>
                                <span className="font-medium">${Number(selectedRequest.original_price).toFixed(2)}</span>
                            </div>
                            {selectedRequest.business && (
                                <div className="flex justify-between text-sm p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-500">Business</span>
                                    <span className="font-medium">{selectedRequest.business.name}</span>
                                </div>
                            )}
                        </div>

                        {selectedRequest.status === 'PENDING' && (
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-600 mb-1.5">
                                        <DollarSign className="w-3.5 h-3.5 inline mr-1" />
                                        Approved Price (override)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={approvedPrice}
                                        onChange={(e) => setApprovedPrice(e.target.value)}
                                        className="bs-input"
                                        placeholder="Leave as is or enter new price"
                                    />
                                </div>
                                <div className="mb-5">
                                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Admin Notes</label>
                                    <textarea
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        className="bs-input !min-h-[60px]"
                                        placeholder="Optional notes..."
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => rejectMut.mutate(selectedRequest.id)}
                                        disabled={rejectMut.isPending}
                                        className="px-5 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        {rejectMut.isPending ? 'Rejecting...' : 'Reject'}
                                    </button>
                                    <button
                                        onClick={() => approveMut.mutate(selectedRequest.id)}
                                        disabled={approveMut.isPending}
                                        className="btn-lime disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        {approveMut.isPending ? 'Approving...' : 'Approve'}
                                    </button>
                                </div>
                            </>
                        )}

                        {selectedRequest.status !== 'PENDING' && (
                            <div className="space-y-3">
                                {selectedRequest.approved_price && (
                                    <div className="flex justify-between text-sm p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-500">Approved Price</span>
                                        <span className="font-medium">${Number(selectedRequest.approved_price).toFixed(2)}</span>
                                    </div>
                                )}
                                {selectedRequest.admin_notes && (
                                    <div className="text-sm p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-500 block text-xs mb-1">Admin Notes</span>
                                        <span className="text-gray-900">{selectedRequest.admin_notes}</span>
                                    </div>
                                )}
                                <button onClick={() => setSelectedRequest(null)} className="btn-lime w-full justify-center mt-4">Close</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
