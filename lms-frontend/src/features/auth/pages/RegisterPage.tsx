import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { Logo } from '../../../components/shared/Logo';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export function RegisterPage() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
        if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
        setLoading(true);
        try {
            await register({ email, password, first_name: firstName, last_name: lastName });
            navigate(`/check-email?email=${encodeURIComponent(email)}&type=register`);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            <div className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-sm">
                <Logo size="md" linkTo="/" />
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 hidden sm:inline">Already have an account?</span>
                    <Link to="/login" className="px-5 py-2 rounded-full text-sm font-semibold text-white" style={{ background: '#035A51' }}>Login</Link>
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
                <div className="relative z-10">
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
                    className="w-full max-w-md"
                >
                    <h1 className="text-[28px] font-bold text-gray-900 mb-8" style={{ fontFamily: 'Georgia, serif' }}>
                        Create Account
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1.5">First Name</label>
                                <input type="text" className="bs-input" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1.5">Last Name</label>
                                <input type="text" className="bs-input" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
                            <input type="email" className="bs-input" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="bs-input !pr-11"
                                    placeholder="Min 8 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors">
                                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Confirm Password</label>
                            <input type="password" className="bs-input" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
                        </div>
                        <button type="submit" className="btn-lime w-full justify-center !py-3 !mt-6" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Create Account →'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-500">
                        Want to register as a company?{' '}
                        <Link to="/register/business" className="font-semibold hover:underline" style={{ color: '#035A51' }}>Click here</Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
