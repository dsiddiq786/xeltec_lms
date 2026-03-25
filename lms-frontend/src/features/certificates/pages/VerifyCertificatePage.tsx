import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../../lib/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface CertData {
    valid: boolean;
    certificate_number?: string;
    issued_at?: string;
    course_title?: string;
    holder_email?: string;
    message?: string;
}

export function VerifyCertificatePage() {
    const { certificateNumber } = useParams<{ certificateNumber: string }>();
    const [loading, setLoading] = useState(true);
    const [certificate, setCertificate] = useState<CertData | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!certificateNumber) return;
        api.get(`/certificates/verify/${certificateNumber}`)
            .then(({ data }) => setCertificate(data))
            .catch(() => setError('Certificate not found or invalid.'))
            .finally(() => setLoading(false));
    }, [certificateNumber]);

    return (
        <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bs-off-white)' }}>
            <div className="bs-card p-10 max-w-md text-center">
                <div className="flex items-center justify-center gap-2.5 mb-8">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-black" style={{ background: 'var(--bs-teal)', color: '#fff' }}>b</div>
                    <span className="text-lg font-bold text-gray-900">brick<span className="font-extrabold">Skill</span></span>
                </div>

                {loading ? (
                    <div className="py-10">
                        <Loader2 className="w-10 h-10 mx-auto animate-spin text-gray-400" />
                        <p className="mt-4 text-sm text-gray-500">Verifying certificate...</p>
                    </div>
                ) : error || !certificate?.valid ? (
                    <>
                        <XCircle className="w-14 h-14 mx-auto text-red-500 mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Certificate</h2>
                        <p className="text-sm text-gray-500 mb-6">{error || certificate?.message || 'This certificate could not be verified.'}</p>
                    </>
                ) : (
                    <>
                        <CheckCircle className="w-14 h-14 mx-auto text-green-600 mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Certificate Verified</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            This certificate is authentic and was issued by brickSkill.
                        </p>
                        <div className="bg-gray-50 rounded-xl p-5 text-left text-sm space-y-3 mb-6">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Certificate #</span>
                                <span className="font-medium text-gray-900">{certificate.certificate_number}</span>
                            </div>
                            {certificate.course_title && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Course</span>
                                    <span className="font-medium text-gray-900">{certificate.course_title}</span>
                                </div>
                            )}
                            {certificate.holder_email && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Holder</span>
                                    <span className="font-medium text-gray-900">{certificate.holder_email}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-500">Issued</span>
                                <span className="font-medium text-gray-900">
                                    {certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                                </span>
                            </div>
                        </div>
                        <a
                            href={`/api/certificates/download/${certificate.certificate_number}`}
                            className="btn-lime inline-flex items-center gap-2"
                        >
                            Download PDF
                        </a>
                    </>
                )}

                <div className="mt-6">
                    <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">Back to Home</Link>
                </div>
            </div>
        </div>
    );
}
