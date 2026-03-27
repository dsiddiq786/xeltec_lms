import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type Column } from '../../components/shared/DataTable';
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

    const columns: Column<any>[] = useMemo(
        () => [
            {
                key: 'certificate_number',
                label: 'Certificate #',
                sortable: true,
                render: (cert) => (
                    <span className="text-sm font-mono text-gray-900">
                        {cert.certificate_number}
                    </span>
                ),
            },
            {
                key: 'course_title',
                label: 'Course',
                sortable: true,
                getValue: (cert) =>
                    cert.enrollment?.course_version?.course?.title ?? '',
                render: (cert) => (
                    <span className="text-sm text-gray-900">
                        {cert.enrollment?.course_version?.course?.title || '—'}
                    </span>
                ),
            },
            {
                key: 'holder_email',
                label: 'Holder',
                sortable: true,
                getValue: (cert) => cert.enrollment?.user?.email ?? '',
                render: (cert) => (
                    <span className="text-sm text-gray-600">
                        {cert.enrollment?.user?.email || '—'}
                    </span>
                ),
            },
            {
                key: 'issued_at',
                label: 'Issued',
                sortable: true,
                getValue: (cert) => new Date(cert.issued_at).getTime(),
                render: (cert) => (
                    <span className="text-sm text-gray-500">
                        {new Date(cert.issued_at).toLocaleDateString()}
                    </span>
                ),
            },
            {
                key: 'actions',
                label: 'Actions',
                headerClassName: 'text-right',
                className: 'text-right',
                render: (cert) => (
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
                ),
            },
        ],
        [],
    );

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Certificate Oversight</h1>
                <p className="text-sm text-gray-500 mt-1">All issued certificates on the platform</p>
            </div>

            <div className="bs-card p-4 mb-6 flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(156,39,176,0.1)' }}
                >
                    <Award className="w-5 h-5" style={{ color: '#7b1fa2' }} />
                </div>
                <div>
                    <div className="text-[11px] text-gray-500">Total Certificates</div>
                    <div className="text-lg font-bold text-gray-900">{certificates?.length ?? 0}</div>
                </div>
            </div>

            <DataTable
                data={certificates || []}
                columns={columns}
                isLoading={isLoading}
                searchKeys={[
                    'certificate_number',
                    'enrollment.user.email',
                    'enrollment.course_version.course.title',
                ]}
                searchPlaceholder="Search certificates..."
                pageSize={10}
                emptyMessage="No certificates issued yet."
            />
        </div>
    );
}
