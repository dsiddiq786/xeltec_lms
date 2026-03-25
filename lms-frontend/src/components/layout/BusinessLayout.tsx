import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../shared/Logo';
import { AnimatedOutlet } from '../shared/PageTransition';
import {
    LayoutDashboard,
    BookOpen,
    FolderOpen,
    Users,
    CreditCard,
    LogOut,
    Search,
    Bell,
    Building2,
} from 'lucide-react';

const navItems = [
    { to: '/business', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/business/explore', icon: BookOpen, label: 'Explore Courses' },
    { to: '/business/manage-courses', icon: FolderOpen, label: 'Manage Courses' },
    { to: '/business/employees', icon: Users, label: 'Employees' },
    { to: '/business/subscription', icon: CreditCard, label: 'Subscription' },
];

export function BusinessLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const displayName = user?.email?.split('@')[0] || 'Business';
    const initials = displayName.charAt(0).toUpperCase();

    return (
        <div className="flex h-screen" style={{ background: 'var(--bs-off-white)' }}>
            {/* Sidebar */}
            <aside
                className="w-[220px] flex flex-col flex-shrink-0"
                style={{ background: 'var(--bs-dark)' }}
            >
                <div className="px-5 py-5">
                    <Logo size="md" variant="light" linkTo="/business" />
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 mt-1 space-y-0.5">
                    {navItems.map(({ to, icon: Icon, label, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    isActive
                                        ? 'font-semibold'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                            style={({ isActive }) =>
                                isActive
                                    ? { background: 'var(--bs-lime)', color: 'var(--bs-dark)' }
                                    : {}
                            }
                        >
                            <Icon className="w-[18px] h-[18px]" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Sign-out */}
                <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <LogOut className="w-[18px] h-[18px]" />
                        Sign-out
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header
                    className="h-16 flex items-center justify-between px-8 flex-shrink-0"
                    style={{ background: 'var(--bs-white)', borderBottom: '1px solid var(--bs-gray-100)' }}
                >
                    <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" style={{ color: 'var(--bs-teal)' }} />
                        <span className="text-sm font-semibold text-gray-900">
                            {/* Business name will come from context/API */}
                            {displayName}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search"
                                className="bs-input !py-2 !px-4 !pl-9 w-52 !text-sm !rounded-full"
                                style={{ background: 'var(--bs-gray-50)' }}
                            />
                        </div>
                        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                            <Bell className="w-5 h-5" />
                        </button>
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer"
                            style={{ background: 'var(--bs-gray-200)', color: 'var(--bs-gray-600)' }}
                        >
                            {initials}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-8">
                    <AnimatedOutlet />
                </main>

                {/* Footer */}
                <footer
                    className="h-12 flex items-center justify-between px-8 text-xs flex-shrink-0"
                    style={{ borderTop: '1px solid var(--bs-gray-100)', color: 'var(--bs-gray-400)' }}
                >
                    <span>&copy; 2026 brickSkill All rights reserved.</span>
                    <div className="flex gap-6">
                        <span className="cursor-pointer hover:text-gray-600">FAQs</span>
                        <span className="cursor-pointer hover:text-gray-600">Privacy Policy</span>
                        <span className="cursor-pointer hover:text-gray-600">Terms &amp; Condition</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}
