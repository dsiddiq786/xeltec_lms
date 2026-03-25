import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Logo } from '../../../components/shared/Logo';
import api from '../../../lib/api';

export function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link');
            return;
        }

        api.post('/auth/verify-email', { token })
            .then(() => {
                setStatus('success');
                setMessage('Your email has been verified successfully!');
            })
            .catch((err) => {
                setStatus('error');
                setMessage(err?.response?.data?.message || 'Verification failed');
            });
    }, [token]);

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
                    {status === 'loading' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: '#035A51' }} />
                            <h2 className="text-xl font-bold text-gray-900">Verifying your email...</h2>
                        </motion.div>
                    )}
                    {status === 'success' && (
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)' }}>
                                <CheckCircle className="w-8 h-8" style={{ color: '#035A51' }} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Email Verified</h2>
                            <p className="text-sm text-gray-500 mb-6">{message}</p>
                            <Link to="/login" className="btn-lime inline-flex">Sign In</Link>
                        </motion.div>
                    )}
                    {status === 'error' && (
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(244,67,54,0.1)' }}>
                                <XCircle className="w-8 h-8 text-red-500" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h2>
                            <p className="text-sm text-gray-500 mb-6">{message}</p>
                            <Link to="/login" className="btn-lime inline-flex">Go to Login</Link>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
