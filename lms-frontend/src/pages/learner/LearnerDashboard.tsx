import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import type { Enrollment, Course, PaginatedResponse } from '../../types';
import { ArrowRight, Award, Download, ExternalLink } from 'lucide-react';
import { CourseCard } from '../../components/shared/CourseCard';

type DashboardTab = 'active' | 'completed' | 'certificates';

const TABS: { key: DashboardTab; label: string; icon: string }[] = [
    { key: 'active', label: 'Active Training', icon: '📋' },
    { key: 'completed', label: 'Completed Training', icon: '✅' },
    { key: 'certificates', label: 'Certificates', icon: '🏆' },
];

export function LearnerDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<DashboardTab>('active');

    const { data: enrollments, isLoading } = useQuery<Enrollment[]>({
        queryKey: ['my-enrollments'],
        queryFn: async () => {
            const { data } = await api.get('/enrollments');
            return data;
        },
    });

    const { data: certificates, isLoading: certsLoading } = useQuery<any[]>({
        queryKey: ['my-certificates'],
        queryFn: async () => {
            const { data } = await api.get('/certificates/my');
            return data;
        },
    });

    const { data: recommendedData } = useQuery<PaginatedResponse<Course>>({
        queryKey: ['recommended-dashboard'],
        queryFn: async () => {
            const { data } = await api.get('/courses/catalog?limit=4');
            return data;
        },
    });

    const activeEnrollments = enrollments?.filter((e: any) => e.status !== 'COMPLETED') || [];
    const completedEnrollments = enrollments?.filter((e: any) => e.status === 'COMPLETED') || [];
    const recommended = recommendedData?.data || [];

    return (
        <div>
            {/* Tabs */}
            <div className="flex gap-0 border-b-2 border-gray-100 mb-4">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className="flex items-center gap-2 px-6 py-3.5 text-sm font-medium border-b-2 -mb-0.5 transition-colors"
                        style={{
                            borderBottomColor: activeTab === tab.key ? '#035A51' : 'transparent',
                            color: activeTab === tab.key ? '#035A51' : '#757575',
                        }}
                    >
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            <p className="text-[13px] text-gray-500 leading-relaxed px-4 py-3 mb-6 rounded-lg"
               style={{ background: '#fffde7', border: '1px solid #fff9c4' }}>
                Below Is A List Of Your Active Training. Use The 'Start Course' Button Below To Start A New Course.
                Or The 'Continue Course' Button To Pick Up Where You Left Off.
            </p>

            {activeTab === 'active' && (
                <div>
                    <div className="flex flex-col gap-3">
                        {isLoading ? (
                            Array.from({ length: 2 }).map((_, i) => (
                                <div key={i} className="bg-white rounded-xl border border-gray-100 h-20 animate-pulse" />
                            ))
                        ) : activeEnrollments.length > 0 ? (
                            activeEnrollments.map((enrollment: any) => (
                                <div key={enrollment.id} className="bg-white rounded-xl border border-gray-100 px-6 py-5 flex items-center justify-between">
                                    <div>
                                        <div className="text-base font-semibold text-gray-900 mb-1">
                                            {enrollment.course_version?.course?.title || 'Course Module'}
                                        </div>
                                        <div className="text-[13px] text-gray-400">
                                            Status: <span className="text-amber-600 font-medium">In Progress</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/learn/${enrollment.id}`)}
                                        className="btn-lime"
                                    >
                                        Continue Course <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-gray-400">
                                <p className="text-base font-medium text-gray-600 mb-2">No active training</p>
                                <p className="text-sm">Browse our catalog to start a new course.</p>
                                <button onClick={() => navigate('/courses')} className="btn-lime mt-4">
                                    Browse Courses <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {recommended.length > 0 && (
                        <div className="mt-12">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">You may also be interested in....</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                {recommended.map((course: any) => (
                                    <CourseCard
                                        key={course.id}
                                        title={course.title}
                                        price={Number(course.base_price) || 0}
                                        rating={4.9}
                                        reviewCount={154}
                                        imageUrl={course.thumbnail_url}
                                        onViewCourse={() => navigate(`/courses/${course.id}`)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'completed' && (
                <div>
                    {completedEnrollments.length > 0 ? (
                        completedEnrollments.map((enrollment: any) => (
                            <div key={enrollment.id} className="bg-white rounded-xl border border-gray-100 px-6 py-5 mb-3 flex items-center justify-between">
                                <div>
                                    <div className="text-base font-semibold text-gray-900">
                                        {enrollment.course_version?.course?.title || 'Course Module'}
                                    </div>
                                    <div className="text-[13px] text-gray-400 mt-1">
                                        Status: <span className="text-green-600 font-medium">Completed</span>
                                    </div>
                                </div>
                                <button onClick={() => navigate(`/learn/${enrollment.id}`)} className="btn-outline !py-2 !px-5 !text-sm">
                                    Review
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            No completed training yet.
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'certificates' && (
                <div>
                    {certsLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Array.from({ length: 2 }).map((_, i) => (
                                <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : certificates && certificates.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {certificates.map((cert: any) => (
                                <div key={cert.id} className="bg-white rounded-xl border border-gray-100 p-5" style={{ borderLeft: '4px solid var(--bs-lime)' }}>
                                    <div className="text-base font-semibold text-gray-900 mb-1">
                                        {cert.enrollment?.course_version?.course?.title || 'Certificate'}
                                    </div>
                                    <div className="text-[13px] text-gray-400 mb-3">
                                        Issued: {new Date(cert.issued_at).toLocaleDateString()}
                                    </div>
                                    <div className="flex gap-3">
                                        {cert.pdf_url && (
                                            <a href={cert.pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: 'var(--bs-teal)' }}>
                                                <Download className="w-4 h-4" /> Download
                                            </a>
                                        )}
                                        <a href={`/verify-certificate?code=${cert.certificate_number}`} className="flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: 'var(--bs-teal)' }}>
                                            <ExternalLink className="w-4 h-4" /> Verify
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(203,255,0,0.15)' }}>
                                <Award className="w-7 h-7" style={{ color: '#035A51' }} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No certificates yet</h3>
                            <p className="text-sm text-gray-400">Complete a course to earn your certificate</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
