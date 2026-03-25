import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../shared/Logo';
import { AnimatedOutlet } from '../shared/PageTransition';
import { Search, Bell, LogOut, BookOpen, HelpCircle, FileText, User, Menu } from 'lucide-react';

export function LearnerLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const displayName = user?.first_name || user?.email?.split('@')[0] || 'Learner';
    const initials = (user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase();

    const sidebarLinkClass = (isActive: boolean) =>
        `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive ? 'bg-[#CBFF2A] text-gray-900 font-semibold' : 'text-gray-400 hover:text-white'
        }`;

    return (
        <div className="flex min-h-screen">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[220px] bg-[#1a1f25] flex flex-col flex-shrink-0 transform transition-transform lg:transform-none ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}>
                <div className="px-5 py-5">
                    <Logo size="md" variant="light" linkTo="/dashboard" />
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 flex flex-col gap-0.5">
                    <NavLink to="/dashboard" end onClick={() => setSidebarOpen(false)} className={({ isActive }) => sidebarLinkClass(isActive)}>
                        <BookOpen className="w-[18px] h-[18px]" /> My Learning
                    </NavLink>
                    <NavLink to="/dashboard/profile" onClick={() => setSidebarOpen(false)} className={({ isActive }) => sidebarLinkClass(isActive)}>
                        <User className="w-[18px] h-[18px]" /> My Profile
                    </NavLink>
                    <NavLink to="/dashboard/certificates" onClick={() => setSidebarOpen(false)} className={({ isActive }) => sidebarLinkClass(isActive)}>
                        <FileText className="w-[18px] h-[18px]" /> Certificates
                    </NavLink>
                    <a href="#" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white">
                        <HelpCircle className="w-[18px] h-[18px]" /> FAQ's
                    </a>
                </nav>

                {/* Sign-out */}
                <div className="px-3 py-4 border-t border-white/10">
                    <button onClick={handleLogout}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg w-full text-sm font-medium text-gray-400 hover:text-white bg-transparent border-none cursor-pointer text-left">
                        <LogOut className="w-[18px] h-[18px]" /> Sign-out
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header */}
                <header className="h-16 flex items-center justify-between px-4 sm:px-8 bg-white border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <button className="lg:hidden p-2 text-gray-600" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                            <Menu className="w-6 h-6" />
                        </button>
                        <div>
                            <div className="text-xs text-gray-400">Welcome</div>
                            <div className="text-base font-bold text-gray-900">{displayName.charAt(0).toUpperCase() + displayName.slice(1)}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="relative hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="Search" className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-48 outline-none bg-gray-50 focus:border-[var(--bs-teal)]" />
                        </div>
                        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100">
                            <Bell className="w-5 h-5" />
                        </button>
                        <div onClick={() => navigate('/dashboard/profile')}
                            className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 cursor-pointer">
                            {initials}
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-8 bg-[#f8f9fa] overflow-y-auto">
                    <AnimatedOutlet />
                </main>

                {/* Footer */}
                <footer className="h-12 flex items-center justify-between px-4 sm:px-8 bg-[#1a1f25] text-gray-500 text-xs flex-shrink-0">
                    <span>&copy; 2026 brickSkill All rights reserved.</span>
                    <div className="hidden sm:flex gap-6">
                        <span className="cursor-pointer hover:text-gray-300">FAQs</span>
                        <span className="cursor-pointer hover:text-gray-300">Privacy Policy</span>
                        <span className="cursor-pointer hover:text-gray-300">Terms &amp; Condition</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}
