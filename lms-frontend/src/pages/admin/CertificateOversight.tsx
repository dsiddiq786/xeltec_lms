import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import { Award, Download, ExternalLink } from 'lucide-react';

export function CertificateOversight() {
    const { data: certificates, isLoading } = useQuery<any[]>({
        queryKey: ['admin-certificates'],
        queryFn: async () => {
            const { data } = await api.get('/admin/certificates');
            return Array.isArray(data) ? data : data?.data ?? [];
        },
        retry: false,
    });

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Certificate Oversight</h1>
                <p className="text-sm text-gray-500 mt-1">All issued certificates on the platform</p>
            </div>

            <div className="bs-card p-4 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(156,39,176,0.1)' }}>
                    <Award className="w-5 h-5" style={{ color: '#7b1fa2' }} />
                </div>
                <div>
                    <div className="text-[11px] text-gray-500">Total Certificates</div>
                    <div className="text-lg font-bold text-gray-900">{certificates?.length ?? 0}</div>
                </div>
            </div>

            <div className="bs-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr style={{ background: 'var(--bs-gray-50)' }}>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Certificate #</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Course</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Holder</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Issued</th>
                            <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <tr key={i} style={{ borderTop: '1px solid var(--bs-gray-100)' }}>
                                    <td className="px-5 py-4"><div className="w-40 h-5 bg-gray-100 rounded animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-48 h-5 bg-gray-100 rounded animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-32 h-5 bg-gray-100 rounded animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-24 h-5 bg-gray-100 rounded animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-16 h-5 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                </tr>
                            ))
                        ) : (certificates || []).map((cert: any, index: number) => (
                            <motion.tr
                                key={cert.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.02 }}
                                className="hover:bg-gray-50/50 transition-colors"
                                style={{ borderTop: '1px solid var(--bs-gray-100)' }}
                            >
                                <td className="px-5 py-4">
                                    <span className="text-sm font-mono text-gray-900">{cert.certificate_number}</span>
                                </td>
                                <td className="px-5 py-4">
                                    <span className="text-sm text-gray-900">{cert.enrollment?.course_version?.course?.title || '—'}</span>
                                </td>
                                <td className="px-5 py-4">
                                    <span className="text-sm text-gray-600">{cert.enrollment?.user?.email || '—'}</span>
                                </td>
                                <td className="px-5 py-4">
                                    <span className="text-sm text-gray-500">{new Date(cert.issued_at).toLocaleDateString()}</span>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-2 justify-end">
                                        <a
                                            href={`/api/certificates/download/${cert.certificate_number}`}
                                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                                            title="Download PDF"
                                        >
                                            <Download className="w-4 h-4" />
                                        </a>
                                        <a
                                            href={`/verify/${cert.certificate_number}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                                            title="Verify"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>

                {!isLoading && (!certificates || certificates.length === 0) && (
                    <div className="text-center py-16 text-gray-500">No certificates issued yet.</div>
                )}
            </div>
        </div>
    );
}
