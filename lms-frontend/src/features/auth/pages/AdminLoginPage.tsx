import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { Logo } from '../../../components/shared/Logo';
import toast from 'react-hot-toast';

export function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { adminLogin } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await adminLogin(email, password);
            navigate('/admin');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bs-dark)' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-sm"
            >
                <div className="flex items-center justify-center mb-10">
                    <Logo size="lg" variant="light" linkTo="/" />
                </div>

                <div className="bs-card p-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center" style={{ fontFamily: 'Georgia, serif' }}>
                        Admin Portal
                    </h1>
                    <p className="text-sm text-gray-500 text-center mb-6">
                        Sign in to access the administration panel
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
                            <input
                                type="email"
                                className="bs-input"
                                placeholder="admin@brickskill.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
                            <input
                                type="password"
                                className="bs-input"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-dark w-full justify-center !py-3 !rounded-xl" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In →'}
                        </button>
                    </form>
                </div>

                <p className="mt-6 text-center text-xs text-gray-500">
                    &copy; 2026 brickSkill. Admin access only.
                </p>
            </motion.div>
        </div>
    );
}
