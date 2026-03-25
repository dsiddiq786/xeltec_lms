import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../shared/Logo';
import { AnimatedOutlet } from '../shared/PageTransition';
import {
    LayoutDashboard,
    BookOpen,
    Building2,
    Users,
    UserCheck,
    ShieldCheck,
    Receipt,
    Award,
    BarChart3,
    Sparkles,
    Settings,
    LogOut,
    Home,
    CreditCard,
} from 'lucide-react';

const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/courses', icon: BookOpen, label: 'Courses' },
    { to: '/admin/ai-generator', icon: Sparkles, label: 'AI Generator' },
    { to: '/admin/purchase-requests', icon: CreditCard, label: 'Purchase Requests' },
    { to: '/admin/businesses', icon: Building2, label: 'Businesses' },
    { to: '/admin/kyc-review', icon: ShieldCheck, label: 'KYC Review' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/employees', icon: UserCheck, label: 'Employees' },
    { to: '/admin/transactions', icon: Receipt, label: 'Transactions' },
    { to: '/admin/certificates', icon: Award, label: 'Certificates' },
    { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
    { to: '/admin/homepage', icon: Home, label: 'Homepage Content' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen" style={{ background: 'var(--bs-off-white)' }}>
            {/* Sidebar */}
            <aside
                className="w-[260px] flex flex-col flex-shrink-0"
                style={{ background: 'var(--bs-dark)' }}
            >
                <div className="px-6 py-6">
                    <Logo size="lg" variant="light" linkTo="/admin" />
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 mt-2 space-y-1">
                    {navItems.map(({ to, icon: Icon, label, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                    ? 'text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                            style={({ isActive }) =>
                                isActive
                                    ? { background: 'var(--bs-teal)' }
                                    : {}
                            }
                        >
                            <Icon className="w-5 h-5" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-3 mb-3 px-2">
                        <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{ background: 'var(--bs-lime)', color: 'var(--bs-dark)' }}
                        >
                            {user?.email?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {user?.email || 'Admin'}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--bs-gray-500)' }}>
                                Admin
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign-out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header
                    className="h-16 flex items-center justify-between px-8 flex-shrink-0"
                    style={{ background: 'var(--bs-white)', borderBottom: '1px solid var(--bs-gray-100)' }}
                >
                    <div>
                        <p className="text-xs text-gray-400">Welcome</p>
                        <p className="text-sm font-semibold text-gray-900">
                            {user?.email?.split('@')[0] || 'Admin'}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search..."
                                className="bs-input !py-2 !px-4 !pl-9 w-60 !text-sm !rounded-full"
                                style={{ background: 'var(--bs-gray-50)' }}
                            />
                            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div
                            className="w-10 h-10 rounded-full overflow-hidden"
                            style={{ background: 'var(--bs-gray-200)' }}
                        >
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: 'var(--bs-gray-600)' }}>
                                {user?.email?.[0]?.toUpperCase() || 'A'}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-8">
                    <AnimatedOutlet />
                </div>

                {/* Footer */}
                <footer
                    className="h-12 flex items-center justify-between px-8 text-xs flex-shrink-0"
                    style={{ borderTop: '1px solid var(--bs-gray-100)', color: 'var(--bs-gray-400)' }}
                >
                    <span>© 2026 brickSkill All rights reserved.</span>
                    <div className="flex gap-6">
                        <span className="cursor-pointer hover:text-gray-600">FAQs</span>
                        <span className="cursor-pointer hover:text-gray-600">Privacy Policy</span>
                        <span className="cursor-pointer hover:text-gray-600">Terms & Condition</span>
                    </div>
                </footer>
            </main>
        </div>
    );
}
