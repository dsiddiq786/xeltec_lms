import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Logo } from '../../../components/shared/Logo';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

export function CheckEmailPage() {
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email') || '';
    const type = searchParams.get('type') || 'register';
    const [resending, setResending] = useState(false);

    const handleResend = async () => {
        setResending(true);
        try {
            await api.post('/auth/resend-verification');
            toast.success('Verification email resent!');
        } catch {
            toast.error('Could not resend. Try logging in first.');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'linear-gradient(135deg, #f0faf8 0%, #f8faf5 50%, #fffff0 100%)' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md text-center"
            >
                <div className="flex justify-center mb-8">
                    <Logo size="lg" linkTo="/" />
                </div>

                <div className="bs-card p-10">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)' }}
                    >
                        <Mail className="w-10 h-10" style={{ color: '#035A51' }} />
                    </motion.div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                        Check your email
                    </h1>

                    <p className="text-sm text-gray-500 mb-2">
                        We've sent a verification link to
                    </p>
                    {email && (
                        <p className="text-sm font-semibold text-gray-900 mb-6">{email}</p>
                    )}
                    <p className="text-sm text-gray-500 mb-8">
                        {type === 'business'
                            ? 'Please verify your email to access your business portal. This helps us ensure the security of your account.'
                            : 'Click the link in your email to verify your account and start learning. The link expires in 24 hours.'}
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={handleResend}
                            disabled={resending}
                            className="btn-lime w-full justify-center !py-3"
                        >
                            <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                            {resending ? 'Sending...' : 'Resend Verification Email'}
                        </button>

                        <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-medium py-3 rounded-xl transition-colors hover:bg-gray-50" style={{ color: '#035A51' }}>
                            <ArrowLeft className="w-4 h-4" />
                            Back to Login
                        </Link>
                    </div>
                </div>

                <p className="mt-6 text-xs text-gray-400">
                    Didn't receive the email? Check your spam folder or try resending.
                </p>
            </motion.div>
        </div>
    );
}
