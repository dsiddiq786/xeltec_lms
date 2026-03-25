import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import { Award, Download, ExternalLink } from 'lucide-react';

export function CertificatesPage() {
    const { data: certificates, isLoading } = useQuery<any[]>({
        queryKey: ['my-certificates'],
        queryFn: async () => {
            const { data } = await api.get('/certificates/my');
            return data;
        },
    });

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
                <p className="text-sm text-gray-500 mt-1">Your earned certificates of completion</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {isLoading
                    ? Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="bs-card p-5">
                            <div className="w-48 h-5 bg-gray-100 rounded animate-pulse mb-3" />
                            <div className="w-32 h-4 bg-gray-100 rounded animate-pulse" />
                        </div>
                    ))
                    : certificates?.map((cert: any, index: number) => (
                        <motion.div
                            key={cert.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bs-card p-5"
                            style={{ borderLeft: '4px solid var(--bs-lime)' }}
                        >
                            <div className="flex items-start gap-4">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'rgba(203,255,0,0.15)' }}
                                >
                                    <Award className="w-6 h-6" style={{ color: 'var(--bs-teal)' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 mb-0.5">
                                        {cert.enrollment?.course_version?.course?.title || 'Course'}
                                    </h3>
                                    <p className="text-xs text-gray-400 mb-0.5">
                                        Certificate #{cert.certificate_number}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Issued: {new Date(cert.issued_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4">
                                <a
                                    href={`/api/certificates/download/${cert.certificate_number}`}
                                    className="btn-lime !py-2 !px-4 !text-xs"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Download
                                </a>
                                <a
                                    href={`/api/certificates/verify/${cert.certificate_number}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-outline !py-2 !px-4 !text-xs"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Verify
                                </a>
                            </div>
                        </motion.div>
                    ))}
            </div>

            {!isLoading && certificates?.length === 0 && (
                <div className="text-center py-20">
                    <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bs-lime-muted)' }}>
                        <Award className="w-8 h-8" style={{ color: 'var(--bs-teal)' }} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No certificates yet</h3>
                    <p className="text-sm text-gray-500">Complete a course to earn your certificate</p>
                </div>
            )}
        </div>
    );
}
