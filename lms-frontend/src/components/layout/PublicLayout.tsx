import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../shared/Logo';
import { AnimatedOutlet } from '../shared/PageTransition';
import { MapPin, Mail, Phone, Menu, X, Facebook, Twitter, Instagram, Linkedin, Youtube } from 'lucide-react';
import api from '../../lib/api';

const NAV_LINKS = [
    { to: '/', label: 'Home' },
    { to: '/courses', label: 'Our courses' },
    { to: '#', label: 'Support' },
    { to: '#', label: 'Blog' },
    { to: '#', label: 'Contact' },
];

const CATEGORY_LINKS = [
    { label: 'Food Hygiene', to: '/courses?category=Food+Hygiene' },
    { label: 'Health and Safety', to: '/courses?category=Health+and+Safety' },
    { label: 'Fire Safety', to: '/courses?category=Fire+Safety' },
    { label: 'First Aid', to: '/courses?category=First+Aid' },
];

const QUICK_LINKS = [
    { label: 'Home', to: '/' },
    { label: 'Our Courses', to: '/courses' },
    { label: 'About Us', to: '#' },
    { label: 'Contact', to: '#' },
];

const SUPPORT_LINKS = [
    { label: 'Help Centre', to: '#' },
    { label: 'FAQs', to: '#' },
    { label: 'Privacy Policy', to: '#' },
    { label: 'Terms & Conditions', to: '#' },
];

export function PublicLayout() {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const { data: settings } = useQuery({
        queryKey: ['site-settings-public'],
        queryFn: async () => {
            const { data } = await api.get('/site-settings');
            return data as Record<string, any>;
        },
        staleTime: 60000,
    });

    const footerData = settings?.footer || {};
    const ctaData = settings?.cta_banner || {};

    const navLinkClass = (isActive: boolean) =>
        `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isActive ? 'text-[#035A51] bg-[rgba(203,255,42,0.15)]' : 'text-gray-600 hover:text-gray-900'
        }`;

    return (
        <div className="min-h-screen flex flex-col bg-white">
            {/* Announcement Bar */}
            <div className="h-10 flex items-center justify-center text-[13px] font-medium" style={{ background: '#CBFF2A', color: '#1a1f25' }}>
                Keep your team safe with our City &amp; Guilds Assured Fire Safety Course
            </div>

            {/* Navigation */}
            <header className="h-16 flex items-center justify-between px-4 sm:px-8 lg:px-16 border-b border-gray-100 bg-white sticky top-0 z-50">
                <Logo size="md" linkTo="/" />

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-1">
                    {NAV_LINKS.map(({ to, label }) => (
                        <NavLink
                            key={label}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) => navLinkClass(isActive && to !== '#')}
                        >
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Desktop Auth */}
                <div className="hidden md:flex items-center gap-3">
                    {isAuthenticated ? (
                        <>
                            <button onClick={() => navigate('/dashboard')} className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2">
                                My Learning
                            </button>
                            <div
                                onClick={() => navigate('/dashboard')}
                                className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 cursor-pointer"
                            >
                                {user?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                            </div>
                        </>
                    ) : (
                        <button onClick={() => navigate('/login')} className="btn-lime !py-2 !px-5 !text-sm">Sign In</button>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden p-2 text-gray-600"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </header>

            {/* Mobile Navigation Overlay */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 top-[104px] z-40 bg-white border-t border-gray-100 overflow-y-auto">
                    <nav className="flex flex-col p-4 gap-1">
                        {NAV_LINKS.map(({ to, label }) => (
                            <NavLink
                                key={label}
                                to={to}
                                end={to === '/'}
                                onClick={() => setMobileMenuOpen(false)}
                                className={({ isActive }) =>
                                    `px-4 py-3 rounded-lg text-base font-medium ${
                                        isActive && to !== '#' ? 'text-[#035A51] bg-[rgba(203,255,42,0.15)]' : 'text-gray-600'
                                    }`
                                }
                            >
                                {label}
                            </NavLink>
                        ))}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            {isAuthenticated ? (
                                <button onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                                    className="btn-lime w-full justify-center">
                                    My Learning
                                </button>
                            ) : (
                                <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                                    className="btn-lime w-full justify-center">
                                    Sign In
                                </button>
                            )}
                        </div>
                    </nav>
                </div>
            )}

            {/* Page Content */}
            <main className="flex-1">
                <AnimatedOutlet />
            </main>

            {/* Company CTA Banner */}
            <section className="relative py-16 px-8 text-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #035A51 0%, #023d36 50%, #012a25 100%)' }}>
                <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 30% 50%, rgba(203,255,42,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(203,255,42,0.15) 0%, transparent 50%)' }} />
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold text-white mb-3">{ctaData.title || 'Sign up as a Company'}</h2>
                    <p className="text-sm text-gray-300 mb-6 max-w-md mx-auto">
                        {ctaData.description || 'Top instructors from around the world teach millions of students on brickSkill'}
                    </p>
                    <button onClick={() => navigate(ctaData.button_link || '/register/business')} className="btn-lime">
                        {ctaData.button_text || 'Get Started'}
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ background: '#111418' }}>
                <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-12">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
                        {/* Logo + Description */}
                        <div className="lg:col-span-2">
                            <div className="mb-4">
                                <Logo size="sm" variant="light" linkTo="/" />
                            </div>
                            <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
                                {footerData.description || 'Platform designed to help organizations, educators, and learners manage, deliver, and track learning and training activities.'}
                            </p>
                            {/* Social Icons */}
                            <div className="flex items-center gap-3">
                                {[
                                    { icon: Facebook, key: 'facebook' },
                                    { icon: Twitter, key: 'twitter' },
                                    { icon: Instagram, key: 'instagram' },
                                    { icon: Linkedin, key: 'linkedin' },
                                    { icon: Youtube, key: 'youtube' },
                                ].map(({ icon: Icon, key }) => (
                                    <a
                                        key={key}
                                        href={footerData.social_links?.[key] || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                                        style={{ background: 'rgba(255,255,255,0.05)' }}
                                    >
                                        <Icon className="w-4 h-4" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Top 4 Category */}
                        <div>
                            <h4 className="text-sm font-semibold text-white mb-4">Top 4 Category</h4>
                            <div className="flex flex-col gap-2.5">
                                {CATEGORY_LINKS.map((link) => (
                                    <button key={link.label} onClick={() => navigate(link.to)}
                                        className="text-[13px] text-gray-500 hover:text-white text-left transition-colors">
                                        {link.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="text-sm font-semibold text-white mb-4">Quick Links</h4>
                            <div className="flex flex-col gap-2.5">
                                {QUICK_LINKS.map((link) => (
                                    <button key={link.label} onClick={() => navigate(link.to)}
                                        className="text-[13px] text-gray-500 hover:text-white text-left transition-colors">
                                        {link.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Support + Contact */}
                        <div>
                            <h4 className="text-sm font-semibold text-white mb-4">Support</h4>
                            <div className="flex flex-col gap-2.5 mb-6">
                                {SUPPORT_LINKS.map((link) => (
                                    <button key={link.label} onClick={() => navigate(link.to)}
                                        className="text-[13px] text-gray-500 hover:text-white text-left transition-colors">
                                        {link.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-col gap-2.5">
                                <div className="flex items-center gap-2 text-[13px] text-gray-500">
                                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                                    {footerData.email || 'brickskill@example.com'}
                                </div>
                                <div className="flex items-center gap-2 text-[13px] text-gray-500">
                                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                    {footerData.phone || '+19 123-456-7890'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Newsletter Row */}
                    <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <h4 className="text-sm font-semibold text-white mb-1">Subscribe to our newsletter</h4>
                            <p className="text-xs text-gray-500">Get the latest updates and offers</p>
                        </div>
                        <div className="flex gap-2">
                            <input type="email" placeholder="Enter your email address"
                                className="px-4 py-2.5 rounded-lg text-[13px] text-white outline-none w-64"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <button className="px-5 py-2.5 rounded-lg text-[13px] font-semibold" style={{ background: '#CBFF2A', color: '#1a1f25' }}>Subscribe</button>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/10 px-4 sm:px-8 py-4">
                    <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
                        <span>&copy; 2026 brickSkill All rights reserved</span>
                        <div className="flex gap-6">
                            <a href="#" className="text-gray-600 hover:text-gray-400 transition-colors">Terms &amp; Conditions</a>
                            <a href="#" className="text-gray-600 hover:text-gray-400 transition-colors">Privacy Policy</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
