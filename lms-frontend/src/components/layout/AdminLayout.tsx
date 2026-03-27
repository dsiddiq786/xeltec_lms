import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../shared/Logo';
import { AnimatedOutlet } from '../shared/PageTransition';
import api from '../../lib/api';
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
    Bell,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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

export type AdminNotificationType =
    | 'user_created'
    | 'business_created'
    | 'enrollment'
    | 'purchase_request'
    | 'course_published';

export interface AdminNotificationItem {
    id?: string;
    type: AdminNotificationType;
    message: string;
    created_at: string;
    read?: boolean;
}

function timeAgo(dateStr: string): string {
    const then = new Date(dateStr).getTime();
    if (Number.isNaN(then)) return '—';
    const sec = Math.floor((Date.now() - then) / 1000);
    if (sec < 60) return `${Math.max(1, sec)}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d ago`;
    const week = Math.floor(day / 7);
    if (week < 5) return `${week}w ago`;
    const mo = Math.floor(day / 30);
    return `${Math.max(1, mo)}mo ago`;
}

const MOCK_NOTIFICATIONS: AdminNotificationItem[] = [
    {
        id: 'mock-1',
        type: 'user_created',
        message: 'New user registered: jane@example.com',
        created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        read: false,
    },
    {
        id: 'mock-2',
        type: 'course_published',
        message: 'Course “Safety Fundamentals” was published',
        created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        read: false,
    },
    {
        id: 'mock-3',
        type: 'purchase_request',
        message: 'Purchase request pending review — Acme Corp',
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        read: true,
    },
    {
        id: 'mock-4',
        type: 'business_created',
        message: 'New business account: Northwind Training',
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        read: false,
    },
    {
        id: 'mock-5',
        type: 'enrollment',
        message: '12 new enrollments in “Leadership 101”',
        created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        read: true,
    },
];

const NOTIFICATION_ICON: Record<
    AdminNotificationType,
    { Icon: LucideIcon; ring: string; iconColor: string }
> = {
    user_created: { Icon: Users, ring: 'bg-blue-50', iconColor: 'text-blue-600' },
    business_created: { Icon: Building2, ring: 'bg-purple-50', iconColor: 'text-purple-600' },
    enrollment: { Icon: BookOpen, ring: 'bg-green-50', iconColor: 'text-green-600' },
    purchase_request: { Icon: CreditCard, ring: 'bg-amber-50', iconColor: 'text-amber-600' },
    course_published: { Icon: Sparkles, ring: 'bg-teal-50', iconColor: 'text-teal-600' },
};

function isAdminNotificationType(t: string): t is AdminNotificationType {
    return (
        t === 'user_created' ||
        t === 'business_created' ||
        t === 'enrollment' ||
        t === 'purchase_request' ||
        t === 'course_published'
    );
}

function normalizeNotifications(raw: unknown[]): AdminNotificationItem[] {
    const results: AdminNotificationItem[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const o = item as Record<string, unknown>;
        const typeStr = String(o.type ?? 'user_created');
        const type = isAdminNotificationType(typeStr) ? typeStr : 'user_created';
        results.push({
            id: o.id != null ? String(o.id) : undefined,
            type,
            message: String(o.message ?? o.title ?? 'Notification'),
            created_at: String(o.created_at ?? o.createdAt ?? new Date().toISOString()),
            read: typeof o.read === 'boolean' ? o.read : undefined,
        });
    }
    return results;
}

function formatRole(role: string | undefined): string {
    if (!role) return 'Admin';
    const labels: Record<string, string> = {
        ADMIN: 'Administrator',
        BUSINESS_ADMIN: 'Business admin',
        EMPLOYEE: 'Employee',
        INDIVIDUAL: 'Individual',
    };
    return labels[role] ?? role.replace(/_/g, ' ');
}

export function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [notifOpen, setNotifOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    const { data: notifications = [] } = useQuery<AdminNotificationItem[]>({
        queryKey: ['admin-notifications'],
        queryFn: async () => {
            try {
                const { data } = await api.get('/admin/notifications?limit=8');
                const raw = Array.isArray(data) ? data : data?.data ?? [];
                const list = normalizeNotifications(raw);
                return list;
            } catch {
                return MOCK_NOTIFICATIONS;
            }
        },
        refetchInterval: 30000,
    });

    const displayList = notifications.slice(0, 8);
    const unreadCount = notifications.filter((n) => n.read !== true).length;

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false);
            if (profileRef.current && !profileRef.current.contains(t)) setProfileOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const displayName =
        [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() ||
        user?.email?.split('@')[0] ||
        'Admin';

    const openNotif = () => {
        setNotifOpen((v) => !v);
        setProfileOpen(false);
    };

    const openProfile = () => {
        setProfileOpen((v) => !v);
        setNotifOpen(false);
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

                <nav className="flex-1 px-3 mt-2 space-y-1">
                    {navItems.map(({ to, icon: Icon, label, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                    isActive
                                        ? 'text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                            style={({ isActive }) => (isActive ? { background: 'var(--bs-teal)' } : {})}
                        >
                            <Icon className="w-5 h-5" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div
                    className="px-4 py-4 border-t"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                >
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
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign-out
                    </button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden">
                <header
                    className="h-16 flex items-center justify-between px-8 flex-shrink-0 relative z-20"
                    style={{
                        background: 'var(--bs-white)',
                        borderBottom: '1px solid var(--bs-gray-100)',
                    }}
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
                            <svg
                                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>

                        <div ref={notifRef} className="relative">
                            <button
                                type="button"
                                onClick={openNotif}
                                className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
                                aria-expanded={notifOpen}
                                aria-haspopup="true"
                                aria-label="Notifications"
                            >
                                <Bell className="h-5 w-5 text-gray-600" />
                                {unreadCount > 0 && (
                                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>
                            {notifOpen && (
                                <div
                                    className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl bg-white py-2 shadow-xl ring-1 ring-black/5"
                                    role="menu"
                                >
                                    <div className="border-b border-gray-100 px-4 pb-2">
                                        <p className="text-sm font-semibold text-gray-900">
                                            Notifications
                                        </p>
                                    </div>
                                    <ul className="max-h-80 overflow-y-auto py-1">
                                        {displayList.length === 0 ? (
                                            <li className="px-4 py-6 text-center text-sm text-gray-500">
                                                No notifications yet
                                            </li>
                                        ) : (
                                            displayList.map((n) => {
                                                const cfg = NOTIFICATION_ICON[n.type];
                                                const { Icon, ring, iconColor } = cfg;
                                                return (
                                                    <li
                                                        key={n.id ?? `${n.type}-${n.created_at}`}
                                                        className="flex gap-3 px-3 py-2.5 hover:bg-gray-50"
                                                    >
                                                        <div
                                                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${ring}`}
                                                        >
                                                            <Icon className={`h-5 w-5 ${iconColor}`} />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm text-gray-800">
                                                                {n.message}
                                                            </p>
                                                            <p className="mt-0.5 text-xs text-gray-400">
                                                                {timeAgo(n.created_at)}
                                                            </p>
                                                        </div>
                                                        {n.read !== true && (
                                                            <span
                                                                className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-teal-500"
                                                                aria-hidden
                                                            />
                                                        )}
                                                    </li>
                                                );
                                            })
                                        )}
                                    </ul>
                                    <div className="border-t border-gray-100 px-2 pt-2">
                                        <Link
                                            to="/admin/notifications"
                                            className="block rounded-xl px-3 py-2 text-center text-sm font-medium text-teal-700 hover:bg-gray-50"
                                            onClick={() => setNotifOpen(false)}
                                        >
                                            View All
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div ref={profileRef} className="relative">
                            <button
                                type="button"
                                onClick={openProfile}
                                className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-transparent transition ring-offset-2 ring-offset-white hover:ring-gray-200"
                                style={{ background: 'var(--bs-gray-200)' }}
                                aria-expanded={profileOpen}
                                aria-haspopup="true"
                                aria-label="Account menu"
                            >
                                <div
                                    className="flex h-full w-full items-center justify-center text-sm font-bold"
                                    style={{ color: 'var(--bs-gray-600)' }}
                                >
                                    {user?.email?.[0]?.toUpperCase() || 'A'}
                                </div>
                            </button>
                            {profileOpen && (
                                <div
                                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white py-2 shadow-xl ring-1 ring-black/5"
                                    role="menu"
                                >
                                    <div className="border-b border-gray-100 px-4 pb-3 pt-1">
                                        <p className="truncate text-sm font-semibold text-gray-900">
                                            {displayName}
                                        </p>
                                        <p className="truncate text-xs text-gray-500">{user?.email}</p>
                                        <p className="mt-1 text-xs font-medium text-teal-700">
                                            {formatRole(user?.role)}
                                        </p>
                                    </div>
                                    <div className="py-1">
                                        <Link
                                            to="/admin/profile"
                                            className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                                            onClick={() => setProfileOpen(false)}
                                        >
                                            Profile
                                        </Link>
                                        <button
                                            type="button"
                                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                                            onClick={() => {
                                                setProfileOpen(false);
                                                handleLogout();
                                            }}
                                        >
                                            <LogOut className="h-4 w-4 text-gray-500" />
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-8">
                    <AnimatedOutlet />
                </div>

                <footer
                    className="h-12 flex items-center justify-between px-8 text-xs flex-shrink-0"
                    style={{
                        borderTop: '1px solid var(--bs-gray-100)',
                        color: 'var(--bs-gray-400)',
                    }}
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
