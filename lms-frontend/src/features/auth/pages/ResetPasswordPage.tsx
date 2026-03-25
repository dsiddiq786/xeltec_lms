import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo } from '../../../components/shared/Logo';
import { CheckCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (!token) {
            toast.error('Invalid reset link');
            return;
        }
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { token, new_password: password });
            setDone(true);
            toast.success('Password reset successfully');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'linear-gradient(135deg, #f0faf8 0%, #f8faf5 50%, #fffff0 100%)' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                    <div className="flex justify-center mb-8"><Logo size="lg" linkTo="/" /></div>
                    <div className="bs-card p-8 max-w-md">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
                        <p className="text-sm text-gray-500 mb-6">This password reset link is invalid or has expired.</p>
                        <Link to="/forgot-password" className="btn-lime inline-flex">Request New Link</Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'linear-gradient(135deg, #f0faf8 0%, #f8faf5 50%, #fffff0 100%)' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                    <div className="flex justify-center mb-8"><Logo size="lg" linkTo="/" /></div>
                    <div className="bs-card p-8 max-w-md">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)' }}
                        >
                            <CheckCircle className="w-8 h-8" style={{ color: '#035A51' }} />
                        </motion.div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Password Reset</h2>
                        <p className="text-sm text-gray-500 mb-6">Your password has been updated. You can now sign in.</p>
                        <Link to="/login" className="btn-lime inline-flex">Sign In</Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'linear-gradient(135deg, #f0faf8 0%, #f8faf5 50%, #fffff0 100%)' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="flex justify-center mb-8">
                    <Logo size="lg" linkTo="/" />
                </div>

                <div className="bs-card p-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>Set New Password</h1>
                    <p className="text-sm text-gray-500 mb-6">Enter your new password below.</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">New Password</label>
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
                        <button type="submit" className="btn-lime w-full justify-center !py-3" disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset Password →'}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
