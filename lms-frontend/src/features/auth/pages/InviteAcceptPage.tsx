import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo } from '../../../components/shared/Logo';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';

export function InviteAcceptPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (!token) {
            toast.error('Invalid invite link');
            return;
        }
        setLoading(true);
        try {
            await api.post('/auth/accept-invite', {
                token,
                password,
                first_name: firstName,
                last_name: lastName,
            });
            toast.success('Account activated!');
            navigate('/login');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to accept invite');
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
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Invite Link</h2>
                        <p className="text-sm text-gray-500 mb-6">This invitation link is invalid or has expired.</p>
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
                    <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>Accept Invitation</h1>
                    <p className="text-sm text-gray-500 mb-6">Set up your account to start training.</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1.5">First Name</label>
                                <input type="text" className="bs-input" placeholder="Jane" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1.5">Last Name</label>
                                <input type="text" className="bs-input" placeholder="Smith" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                            </div>
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
                        <button type="submit" className="btn-lime w-full justify-center !py-3" disabled={loading}>
                            {loading ? 'Activating...' : 'Activate Account →'}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
