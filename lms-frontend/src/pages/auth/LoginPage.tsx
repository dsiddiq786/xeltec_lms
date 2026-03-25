import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../../components/shared/Logo';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = (location.state as any)?.from?.pathname || null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const user = await login(email, password);
            toast.success('Welcome back!');
            if (from) navigate(from, { replace: true });
            else if (user.role === 'ADMIN') navigate('/admin');
            else if (user.role === 'BUSINESS_ADMIN') navigate('/business');
            else navigate('/dashboard');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            <div className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-sm">
                <Logo size="md" linkTo="/" />
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 hidden sm:inline">Don't have account?</span>
                    <Link to="/register" className="px-5 py-2 rounded-full text-sm font-semibold text-white" style={{ background: '#035A51' }}>
                        Create Account
                    </Link>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:flex w-[42%] items-center justify-center relative overflow-hidden"
                style={{ background: 'linear-gradient(180deg, #edf7e1 0%, #dff0cc 40%, #d1e8b8 100%)' }}
            >
                <div className="absolute top-[5%] left-[5%] w-72 h-72 rounded-full opacity-40" style={{ background: 'radial-gradient(circle, rgba(203,255,42,0.3) 0%, transparent 70%)' }} />
                <div className="absolute bottom-[10%] right-[0%] w-96 h-96 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(3,90,81,0.15) 0%, transparent 70%)' }} />

                <div className="relative z-10 flex items-center justify-center">
                    <motion.img
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.5, type: 'spring' }}
                        src="/assets/images/mascot-reader.png"
                        alt="Learning mascot"
                        className="w-[340px] h-auto drop-shadow-2xl"
                    />
                </div>
            </motion.div>

            <div className="flex-1 flex items-center justify-center px-8 pt-20 pb-8 bg-white">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="w-full max-w-[400px]"
                >
                    <h1 className="text-[28px] font-bold text-gray-900 mb-10" style={{ fontFamily: 'Georgia, serif' }}>
                        Sign in to your account
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                                placeholder="Username or email address.."
                                className="bs-input"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    placeholder="Password"
                                    className="bs-input !pr-11"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <Link to="/forgot-password" className="text-sm font-medium hover:underline" style={{ color: '#035A51' }}>
                                Forgot your password?
                            </Link>
                            <button type="submit" disabled={loading} className="btn-lime !px-6">
                                <AnimatePresence mode="wait">
                                    {loading ? (
                                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1.5">
                                            Login <ArrowRight className="w-4 h-4" />
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </button>
                        </div>
                    </form>

                    <div className="mt-10 text-center">
                        <span className="text-sm text-gray-500">Have a company signup code? </span>
                        <Link to="/join" className="text-sm font-semibold hover:underline" style={{ color: '#035A51' }}>
                            Click here
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
