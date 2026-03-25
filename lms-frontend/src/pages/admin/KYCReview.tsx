import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Building2, CheckCircle, XCircle, AlertCircle, Clock, ChevronDown } from 'lucide-react';

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
    PENDING: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Pending' },
    UNDER_REVIEW: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Under Review' },
    APPROVED: { bg: 'bg-green-50', text: 'text-green-700', label: 'Approved' },
    REJECTED: { bg: 'bg-red-50', text: 'text-red-700', label: 'Rejected' },
    INFO_REQUESTED: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Info Requested' },
};

export function KYCReview() {
    const queryClient = useQueryClient();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [notes, setNotes] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['admin-kyc-pending'],
        queryFn: async () => {
            const { data } = await api.get('/kyc/admin/pending?limit=50');
            return data;
        },
    });

    const reviewMutation = useMutation({
        mutationFn: async ({ businessId, decision }: { businessId: string; decision: string }) => {
            const { data } = await api.patch(`/kyc/admin/${businessId}/review`, { decision, admin_notes: notes });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-kyc-pending'] });
            setExpandedId(null);
            setNotes('');
            toast.success('KYC review saved');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
    });

    const businesses = data?.data || [];

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">KYC Review</h1>
                <p className="text-sm text-gray-500 mt-1">Review and manage business verification applications</p>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : businesses.length === 0 ? (
                <div className="text-center py-16">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No pending KYC reviews</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {businesses.map((biz: any) => {
                        const badge = STATUS_BADGE[biz.kyc_status] || STATUS_BADGE.PENDING;
                        const isExpanded = expandedId === biz.id;

                        return (
                            <div key={biz.id} className="bs-card">
                                <button
                                    onClick={() => { setExpandedId(isExpanded ? null : biz.id); setNotes(''); }}
                                    className="w-full flex items-center justify-between p-5 text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,77,64,0.08)' }}>
                                            <Building2 className="w-5 h-5" style={{ color: 'var(--bs-teal)' }} />
                                        </div>
                                        <div>
                                            <div className="text-base font-semibold text-gray-900">{biz.name}</div>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {biz._count?.employees || 0} employees &middot; Created {new Date(biz.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span>
                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-gray-100 p-5 space-y-5">
                                        {biz.kyc ? (
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div><span className="text-gray-500">Registration #:</span> <span className="font-medium">{biz.kyc.company_registration_number || '—'}</span></div>
                                                <div><span className="text-gray-500">Tax ID:</span> <span className="font-medium">{biz.kyc.tax_id || '—'}</span></div>
                                                <div><span className="text-gray-500">Industry:</span> <span className="font-medium">{biz.kyc.industry || '—'}</span></div>
                                                <div><span className="text-gray-500">Website:</span> <span className="font-medium">{biz.kyc.website || '—'}</span></div>
                                                <div><span className="text-gray-500">Address:</span> <span className="font-medium">{[biz.kyc.address_line_1, biz.kyc.city, biz.kyc.postcode, biz.kyc.country].filter(Boolean).join(', ') || '—'}</span></div>
                                                <div><span className="text-gray-500">Contact:</span> <span className="font-medium">{[biz.kyc.contact_first_name, biz.kyc.contact_last_name].filter(Boolean).join(' ') || '—'}</span></div>
                                                <div><span className="text-gray-500">Contact Email:</span> <span className="font-medium">{biz.kyc.contact_email || '—'}</span></div>
                                                <div><span className="text-gray-500">Contact Phone:</span> <span className="font-medium">{biz.kyc.contact_phone || '—'}</span></div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400">No KYC details submitted yet.</p>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                                            <textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="Optional notes for the business owner..."
                                                className="bs-input !min-h-[80px] resize-none"
                                            />
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => reviewMutation.mutate({ businessId: biz.id, decision: 'APPROVED' })}
                                                disabled={reviewMutation.isPending}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                            >
                                                <CheckCircle className="w-4 h-4" /> Approve
                                            </button>
                                            <button
                                                onClick={() => reviewMutation.mutate({ businessId: biz.id, decision: 'REJECTED' })}
                                                disabled={reviewMutation.isPending}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                            >
                                                <XCircle className="w-4 h-4" /> Reject
                                            </button>
                                            <button
                                                onClick={() => reviewMutation.mutate({ businessId: biz.id, decision: 'INFO_REQUESTED' })}
                                                disabled={reviewMutation.isPending}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                                            >
                                                <AlertCircle className="w-4 h-4" /> Request Info
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
