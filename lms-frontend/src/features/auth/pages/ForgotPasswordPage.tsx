import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { Logo } from '../../../components/shared/Logo';
import api from '../../../lib/api';

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setSent(true);
            toast.success('Reset link sent to your email');
        } catch {
            toast.error('Failed to send reset link');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'linear-gradient(135deg, #f0faf8 0%, #f8faf5 50%, #fffff0 100%)' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="flex items-center justify-center mb-10">
                    <Logo size="lg" linkTo="/" />
                </div>

                <div className="bs-card p-8">
                    {sent ? (
                        <div className="text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200 }}
                                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)' }}
                            >
                                <Mail className="w-8 h-8" style={{ color: '#035A51' }} />
                            </motion.div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                We've sent a password reset link to <strong>{email}</strong>
                            </p>
                            <Link to="/login" className="btn-lime inline-flex">Back to Login</Link>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                                Forgot your password?
                            </h1>
                            <p className="text-sm text-gray-500 mb-6">
                                Enter your email and we'll send you a link to reset your password.
                            </p>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
                                    <input type="email" className="bs-input" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                                </div>
                                <button type="submit" className="btn-lime w-full justify-center !py-3" disabled={loading}>
                                    {loading ? 'Sending...' : 'Send Reset Link →'}
                                </button>
                            </form>
                            <p className="mt-5 text-center">
                                <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: '#035A51' }}>
                                    <ArrowLeft className="w-4 h-4" /> Back to Login
                                </Link>
                            </p>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
