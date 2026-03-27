import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ErrorBoundary } from './shared/components/common/ErrorBoundary';

// Layouts — loaded eagerly since they wrap many routes
import { AdminLayout } from './components/layout/AdminLayout';
import { LearnerLayout } from './components/layout/LearnerLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { BusinessLayout } from './components/layout/BusinessLayout';

/**
 * Wrapper around dynamic import() that auto-reloads on chunk-load failure.
 * After a new deploy the hashed filenames change; browsers with a stale
 * index.html will request the old chunk and get a 404. This retries once
 * via a full page reload so the user gets the fresh index.html.
 */
function retryImport<T>(factory: () => Promise<T>): Promise<T> {
    return factory().catch((err) => {
        const key = 'chunk_reload';
        const alreadyReloaded = sessionStorage.getItem(key);
        if (!alreadyReloaded) {
            sessionStorage.setItem(key, '1');
            window.location.reload();
            return new Promise<T>(() => {}); // never resolves; page is reloading
        }
        sessionStorage.removeItem(key);
        throw err;
    });
}

// ── Auth pages (lazy) ──
const LoginPage = lazy(() => retryImport(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage }))));
const RegisterPage = lazy(() => retryImport(() => import('./features/auth/pages/RegisterPage').then((m) => ({ default: m.RegisterPage }))));

const ForgotPasswordPage = lazy(() => retryImport(() => import('./features/auth/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))));
const ResetPasswordPage = lazy(() => retryImport(() => import('./features/auth/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))));
const InviteAcceptPage = lazy(() => retryImport(() => import('./features/auth/pages/InviteAcceptPage').then((m) => ({ default: m.InviteAcceptPage }))));
const VerifyEmailPage = lazy(() => retryImport(() => import('./features/auth/pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage }))));
const CheckEmailPage = lazy(() => retryImport(() => import('./features/auth/pages/CheckEmailPage').then((m) => ({ default: m.CheckEmailPage }))));
const JoinCompanyPage = lazy(() => retryImport(() => import('./features/auth/pages/JoinCompanyPage').then((m) => ({ default: m.JoinCompanyPage }))));
const BusinessRegistrationPage = lazy(() => retryImport(() => import('./features/kyc/pages/BusinessRegistrationPage').then((m) => ({ default: m.BusinessRegistrationPage }))));

// ── Public pages (lazy) ──
const HomePage = lazy(() => retryImport(() => import('./pages/public/HomePage').then((m) => ({ default: m.HomePage }))));
const CoursesPage = lazy(() => retryImport(() => import('./pages/public/CoursesPage').then((m) => ({ default: m.CoursesPage }))));
const CourseDetailPage = lazy(() => retryImport(() => import('./pages/public/CourseDetailPage').then((m) => ({ default: m.CourseDetailPage }))));

// ── Learner pages (lazy) ──
const LearnerDashboard = lazy(() => retryImport(() => import('./pages/learner/LearnerDashboard').then((m) => ({ default: m.LearnerDashboard }))));
const CoursePlayer = lazy(() => retryImport(() => import('./pages/learner/CoursePlayer').then((m) => ({ default: m.CoursePlayer }))));
const CertificatesPage = lazy(() => retryImport(() => import('./pages/learner/CertificatesPage').then((m) => ({ default: m.CertificatesPage }))));
const ProfilePage = lazy(() => retryImport(() => import('./pages/learner/ProfilePage').then((m) => ({ default: m.ProfilePage }))));
const CatalogPage = lazy(() => retryImport(() => import('./pages/learner/CatalogPage').then((m) => ({ default: m.CatalogPage }))));

// ── Business pages (lazy) ──
const BusinessDashboard = lazy(() => retryImport(() => import('./features/business/pages/BusinessDashboard').then((m) => ({ default: m.BusinessDashboard }))));
const ExploreCourses = lazy(() => retryImport(() => import('./features/business/pages/ExploreCourses').then((m) => ({ default: m.ExploreCourses }))));
const ManageCourses = lazy(() => retryImport(() => import('./features/business/pages/ManageCourses').then((m) => ({ default: m.ManageCourses }))));
const CourseSeats = lazy(() => retryImport(() => import('./features/business/pages/CourseSeats').then((m) => ({ default: m.CourseSeats }))));
const SubscriptionManagement = lazy(() => retryImport(() => import('./features/business/pages/SubscriptionManagement').then((m) => ({ default: m.SubscriptionManagement }))));
const BizEmployeeManagement = lazy(() => retryImport(() => import('./features/business/pages/EmployeeManagement').then((m) => ({ default: m.EmployeeManagement }))));
const KycFormPage = lazy(() => retryImport(() => import('./features/kyc/pages/KycFormPage').then((m) => ({ default: m.KycFormPage }))));

// ── Admin pages (lazy) ──
const AdminDashboard = lazy(() => retryImport(() => import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))));
const CourseManagement = lazy(() => retryImport(() => import('./pages/admin/CourseManagement').then((m) => ({ default: m.CourseManagement }))));
const CoursePreviewerPage = lazy(() => retryImport(() => import('./pages/admin/CoursePreviewerPage').then((m) => ({ default: m.CoursePreviewerPage }))));
const CourseEditorPage = lazy(() => retryImport(() => import('./pages/admin/CourseEditorPage').then((m) => ({ default: m.CourseEditorPage }))));
const AdminProfilePage = lazy(() => retryImport(() => import('./pages/admin/AdminProfilePage').then((m) => ({ default: m.AdminProfilePage }))));
const BusinessManagement = lazy(() => retryImport(() => import('./pages/admin/BusinessManagement').then((m) => ({ default: m.BusinessManagement }))));
const UserManagement = lazy(() => retryImport(() => import('./pages/admin/UserManagement').then((m) => ({ default: m.UserManagement }))));
const EmployeeManagement = lazy(() => retryImport(() => import('./pages/admin/EmployeeManagement').then((m) => ({ default: m.EmployeeManagement }))));
const KYCReview = lazy(() => retryImport(() => import('./pages/admin/KYCReview').then((m) => ({ default: m.KYCReview }))));
const TransactionList = lazy(() => retryImport(() => import('./pages/admin/TransactionList').then((m) => ({ default: m.TransactionList }))));
const CertificateOversight = lazy(() => retryImport(() => import('./pages/admin/CertificateOversight').then((m) => ({ default: m.CertificateOversight }))));
const ReportingDashboard = lazy(() => retryImport(() => import('./pages/admin/ReportingDashboard').then((m) => ({ default: m.ReportingDashboard }))));
const SettingsPage = lazy(() => retryImport(() => import('./pages/admin/SettingsPage').then((m) => ({ default: m.SettingsPage }))));
const HomepageEditor = lazy(() => retryImport(() => import('./pages/admin/HomepageEditor').then((m) => ({ default: m.HomepageEditor }))));
const PurchaseRequests = lazy(() => retryImport(() => import('./pages/admin/PurchaseRequests').then((m) => ({ default: m.PurchaseRequests }))));

// ── AI Generator (lazy) ──
const DraftListPage = lazy(() => retryImport(() => import('./features/ai-generator/pages/DraftListPage').then((m) => ({ default: m.DraftListPage }))));
const GeneratorPage = lazy(() => retryImport(() => import('./features/ai-generator/pages/GeneratorPage').then((m) => ({ default: m.GeneratorPage }))));
const DraftEditorPage = lazy(() => retryImport(() => import('./features/ai-generator/pages/DraftEditorPage').then((m) => ({ default: m.DraftEditorPage }))));

// ── Payments (lazy) ──
const CheckoutSuccessPage = lazy(() => retryImport(() => import('./features/payments/pages/CheckoutSuccessPage').then((m) => ({ default: m.CheckoutSuccessPage }))));
const CheckoutCancelPage = lazy(() => retryImport(() => import('./features/payments/pages/CheckoutCancelPage').then((m) => ({ default: m.CheckoutCancelPage }))));

// ── Certificates (lazy) ──
const VerifyCertificatePage = lazy(() => retryImport(() => import('./features/certificates/pages/VerifyCertificatePage').then((m) => ({ default: m.VerifyCertificatePage }))));


const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30000,
        },
    },
});

function SuspenseFallback() {
    return (
        <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bs-off-white)' }}>
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--bs-teal)', borderTopColor: 'transparent' }} />
        </div>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <AuthProvider>
                        <Suspense fallback={<SuspenseFallback />}>
                            <Routes>
                                {/* ── Auth (standalone, no layout) ── */}
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/register" element={<RegisterPage />} />
                                <Route path="/register/business" element={<BusinessRegistrationPage />} />
                                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                                <Route path="/reset-password" element={<ResetPasswordPage />} />
                                <Route path="/accept-invite" element={<InviteAcceptPage />} />
                                <Route path="/verify-email" element={<VerifyEmailPage />} />
                                <Route path="/check-email" element={<CheckEmailPage />} />
                                <Route path="/join" element={<JoinCompanyPage />} />
                                {/* ── Admin Portal ── */}
                                <Route
                                    path="/admin"
                                    element={
                                        <ProtectedRoute roles={['ADMIN']}>
                                            <AdminLayout />
                                        </ProtectedRoute>
                                    }
                                >
                                    <Route index element={<AdminDashboard />} />
                                    <Route path="courses" element={<CourseManagement />} />
                                    <Route path="courses/:courseId" element={<CoursePreviewerPage />} />
                                    <Route path="courses/:courseId/edit" element={<CourseEditorPage />} />
                                    <Route path="profile" element={<AdminProfilePage />} />
                                    <Route path="businesses" element={<BusinessManagement />} />
                                    <Route path="users" element={<UserManagement />} />
                                    <Route path="employees" element={<EmployeeManagement />} />
                                    <Route path="kyc-review" element={<KYCReview />} />
                                    <Route path="transactions" element={<TransactionList />} />
                                    <Route path="certificates" element={<CertificateOversight />} />
                                    <Route path="reports" element={<ReportingDashboard />} />
                                    <Route path="settings" element={<SettingsPage />} />
                                    <Route path="purchase-requests" element={<PurchaseRequests />} />
                                    <Route path="homepage" element={<HomepageEditor />} />
                                    <Route path="ai-generator" element={<DraftListPage />} />
                                    <Route path="ai-generator/new" element={<GeneratorPage />} />
                                    <Route path="ai-generator/:draftId" element={<DraftEditorPage />} />
                                </Route>

                                {/* ── Business Portal ── */}
                                <Route
                                    path="/business"
                                    element={
                                        <ProtectedRoute roles={['BUSINESS_ADMIN']}>
                                            <BusinessLayout />
                                        </ProtectedRoute>
                                    }
                                >
                                    <Route index element={<BusinessDashboard />} />
                                    <Route path="kyc" element={<KycFormPage />} />
                                    <Route path="explore" element={<ExploreCourses />} />
                                    <Route path="manage-courses" element={<ManageCourses />} />
                                    <Route path="courses/:courseId/seats" element={<CourseSeats />} />
                                    <Route path="employees" element={<BizEmployeeManagement />} />
                                    <Route path="subscription" element={<SubscriptionManagement />} />
                                </Route>

                                {/* ── Course Player (full-screen, no layout chrome) ── */}
                                <Route
                                    path="/learn/:enrollmentId"
                                    element={
                                        <ProtectedRoute>
                                            <CoursePlayer />
                                        </ProtectedRoute>
                                    }
                                />

                                {/* ── Learner Portal ── */}
                                <Route
                                    path="/dashboard"
                                    element={
                                        <ProtectedRoute>
                                            <LearnerLayout />
                                        </ProtectedRoute>
                                    }
                                >
                                    <Route index element={<LearnerDashboard />} />
                                    <Route path="certificates" element={<CertificatesPage />} />
                                    <Route path="profile" element={<ProfilePage />} />
                                    <Route path="catalog" element={<CatalogPage />} />
                                </Route>

                                {/* ── Payment callbacks ── */}
                                <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
                                <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />

                                {/* ── Public certificate verification ── */}
                                <Route path="/verify/:certificateNumber" element={<VerifyCertificatePage />} />

                                {/* ── Public routes (with nav/footer) ── */}
                                <Route element={<PublicLayout />}>
                                    <Route path="/" element={<HomePage />} />
                                    <Route path="/courses" element={<CoursesPage />} />
                                    <Route path="/courses/:courseId" element={<CourseDetailPage />} />
                                </Route>

                                {/* ── Redirects ── */}
                                <Route path="/catalog" element={<Navigate to="/courses" replace />} />
                                <Route path="/checkout" element={<Navigate to="/courses" replace />} />
                            </Routes>
                        </Suspense>

                        <Toaster
                            position="top-right"
                            toastOptions={{
                                style: {
                                    background: '#ffffff',
                                    color: '#212121',
                                    border: '1px solid #eeeeee',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                },
                                success: { iconTheme: { primary: '#035A51', secondary: '#fff' } },
                                error: { iconTheme: { primary: '#f44336', secondary: '#fff' } },
                            }}
                        />
                    </AuthProvider>
                </BrowserRouter>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}

export default App;
