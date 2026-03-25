import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { Users, BookOpen, Award, Armchair, AlertCircle, CheckCircle, Clock, ArrowRight, Copy, Check, RefreshCw, Share2 } from 'lucide-react';

const KYC_STATUS_MAP: Record<string, { icon: any; color: string; bg: string; label: string; desc: string }> = {
    PENDING: { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Pending', desc: 'Please complete your business verification to activate your account.' },
    UNDER_REVIEW: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Under Review', desc: 'Your business verification is being reviewed. We\'ll notify you once it\'s complete.' },
    APPROVED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Approved', desc: 'Your business is verified. You can now manage courses and employees.' },
    REJECTED: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Rejected', desc: 'Your verification was not approved. Please update your details and resubmit.' },
    INFO_REQUESTED: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Additional Info Needed', desc: 'We need more information. Please update your KYC details.' },
};

export function BusinessDashboard() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [codeCopied, setCodeCopied] = useState(false);

    const { data: businessData, isLoading } = useQuery({
        queryKey: ['my-business'],
        queryFn: async () => {
            const { data } = await api.get('/businesses/my/business');
            return Array.isArray(data) ? data[0] : data;
        },
    });

    const { data: purchases } = useQuery({
        queryKey: ['biz-course-purchases'],
        queryFn: async () => {
            const { data } = await api.get('/businesses/my/courses');
            return data as any[];
        },
    });

    const biz = businessData;
    const kycStatus = biz?.kyc_status || 'PENDING';
    const kycInfo = KYC_STATUS_MAP[kycStatus] || KYC_STATUS_MAP.PENDING;
    const KycIcon = kycInfo.icon;

    const totalSeats = (purchases || []).reduce((s: number, p: any) => s + p.seats_purchased, 0);
    const usedSeats = (purchases || []).reduce((s: number, p: any) => s + p.seats_assigned, 0);
    const stats = [
        { label: 'Total Employees', value: biz?.employees?.length || 0, icon: Users, color: '#035A51' },
        { label: 'Courses Purchased', value: purchases?.length || 0, icon: BookOpen, color: '#1565c0' },
        { label: 'Seats Assigned', value: usedSeats, icon: Award, color: '#e65100' },
        { label: 'Available Seats', value: totalSeats - usedSeats, icon: Armchair, color: '#6a1b9a' },
    ];

    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div>
            {/* KYC Banner */}
            {kycStatus !== 'APPROVED' && (
                <div className={`${kycInfo.bg} rounded-xl p-5 mb-6 flex items-start gap-4`}>
                    <KycIcon className={`w-6 h-6 ${kycInfo.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1">
                        <div className={`text-sm font-semibold ${kycInfo.color}`}>Business Verification: {kycInfo.label}</div>
                        <p className="text-sm text-gray-600 mt-1">{kycInfo.desc}</p>
                    </div>
                    {(kycStatus === 'PENDING' || kycStatus === 'REJECTED' || kycStatus === 'INFO_REQUESTED') && (
                        <button onClick={() => navigate('/business/kyc')} className="btn-lime !py-2 !px-4 !text-xs flex-shrink-0">
                            {kycStatus === 'PENDING' ? 'Complete Verification' : 'Update Details'} <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat) => (
                    <div key={stat.label} className="bs-card p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                            <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">{stat.label}</div>
                            <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button onClick={() => navigate('/business/explore')} className="bs-card p-5 text-left hover:shadow-md transition-shadow">
                    <BookOpen className="w-6 h-6 text-[var(--bs-teal)] mb-2" />
                    <div className="text-sm font-semibold text-gray-900">Explore Courses</div>
                    <div className="text-xs text-gray-500 mt-1">Browse and purchase course seats</div>
                </button>
                <button onClick={() => navigate('/business/manage-courses')} className="bs-card p-5 text-left hover:shadow-md transition-shadow">
                    <Armchair className="w-6 h-6 text-purple-600 mb-2" />
                    <div className="text-sm font-semibold text-gray-900">Manage Courses</div>
                    <div className="text-xs text-gray-500 mt-1">View purchased courses and seats</div>
                </button>
                <button onClick={() => navigate('/business/employees')} className="bs-card p-5 text-left hover:shadow-md transition-shadow">
                    <Users className="w-6 h-6 text-blue-600 mb-2" />
                    <div className="text-sm font-semibold text-gray-900">Manage Employees</div>
                    <div className="text-xs text-gray-500 mt-1">Invite and manage your team</div>
                </button>
            </div>

            {/* Signup Code Section */}
            <div className="bs-card p-5 mb-8">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-[var(--bs-teal)]" />
                            Employee Signup Code
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Share this code with employees so they can create accounts and request to join your company.</p>
                    </div>
                </div>
                {biz?.signup_code ? (
                    <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed" style={{ borderColor: 'var(--bs-teal)', background: 'rgba(3,90,81,0.04)' }}>
                            <code className="text-xl font-bold tracking-widest" style={{ color: 'var(--bs-teal)' }}>{biz.signup_code}</code>
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(biz.signup_code);
                                setCodeCopied(true);
                                toast.success('Code copied!');
                                setTimeout(() => setCodeCopied(false), 2000);
                            }}
                            className="btn-lime !py-3 !px-5"
                        >
                            {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {codeCopied ? 'Copied' : 'Copy'}
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    await api.post('/businesses/my/signup-code');
                                    queryClient.invalidateQueries({ queryKey: ['my-business'] });
                                    toast.success('New code generated!');
                                } catch { toast.error('Failed to generate code'); }
                            }}
                            className="btn-outline !py-3 !px-4"
                            title="Generate new code"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={async () => {
                            try {
                                await api.post('/businesses/my/signup-code');
                                queryClient.invalidateQueries({ queryKey: ['my-business'] });
                                toast.success('Signup code generated!');
                            } catch { toast.error('Failed to generate code'); }
                        }}
                        className="btn-lime"
                    >
                        Generate Signup Code <ArrowRight className="w-4 h-4" />
                    </button>
                )}
                <p className="text-xs text-gray-400 mt-3">
                    Employees can use this code at <span className="font-medium text-gray-600">{window.location.origin}/join</span> to request access.
                    You'll be notified when someone requests to join and can approve/reject from the Employees page.
                </p>
            </div>

            {/* Recent Employees Table */}
            {biz?.employees && biz.employees.length > 0 && (
                <div className="bs-card">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-gray-900">Recent Employees</h2>
                        <button onClick={() => navigate('/business/employees')} className="text-xs font-medium text-[var(--bs-teal)] hover:underline">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                    <th className="px-5 py-3">Name</th>
                                    <th className="px-5 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {biz.employees.slice(0, 5).map((emp: any) => (
                                    <tr key={emp.id} className="border-b border-gray-50 last:border-0">
                                        <td className="px-5 py-3">
                                            <div className="font-medium text-gray-900">{emp.user?.first_name ? `${emp.user.first_name} ${emp.user.last_name}` : emp.user?.email}</div>
                                            <div className="text-xs text-gray-400">{emp.user?.email}</div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                emp.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
                                                emp.status === 'INVITED' ? 'bg-blue-50 text-blue-700' :
                                                emp.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700' :
                                                'bg-gray-100 text-gray-500'
                                            }`}>
                                                {emp.status === 'PENDING_APPROVAL' ? 'Pending Approval' : emp.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
