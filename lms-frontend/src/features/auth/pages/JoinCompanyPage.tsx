import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo } from '../../../components/shared/Logo';
import { ArrowRight, Building2, Eye, EyeOff } from 'lucide-react';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

export function JoinCompanyPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState<'code' | 'form'>('code');
    const [companyCode, setCompanyCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [companyInfo, setCompanyInfo] = useState<{ id: string; name: string } | null>(null);
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const update = (field: string, value: string) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyCode.trim()) {
            toast.error('Please enter a company code');
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.post('/businesses/verify-code', { code: companyCode.trim() });
            setCompanyInfo(data);
            setStep('form');
            toast.success(`Found: ${data.name}`);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Invalid company code');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (form.password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }
        setLoading(true);
        try {
            await api.post('/businesses/join', {
                company_code: companyCode.trim(),
                email: form.email,
                password: form.password,
                first_name: form.firstName,
                last_name: form.lastName,
            });
            navigate(`/check-email?email=${encodeURIComponent(form.email)}&type=join`);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-sm">
                <Logo size="md" linkTo="/" />
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 hidden sm:inline">Already have an account?</span>
                    <Link to="/login" className="px-5 py-2 rounded-full text-sm font-semibold text-white" style={{ background: '#035A51' }}>Login</Link>
                </div>
            </div>

            {/* Left illustration */}
            <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:flex w-[42%] items-center justify-center relative overflow-hidden"
                style={{ background: 'linear-gradient(180deg, #edf7e1 0%, #dff0cc 40%, #d1e8b8 100%)' }}
            >
                <div className="absolute top-[5%] left-[5%] w-72 h-72 rounded-full opacity-40" style={{ background: 'radial-gradient(circle, rgba(203,255,42,0.3) 0%, transparent 70%)' }} />
                <div className="relative z-10">
                    <motion.img
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.5, type: 'spring' }}
                        src="/assets/images/building-3d.png"
                        alt="Join team"
                        className="w-[340px] h-auto drop-shadow-2xl"
                    />
                </div>
            </motion.div>

            {/* Right panel */}
            <div className="flex-1 flex items-center justify-center px-8 pt-20 pb-8 bg-white">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="w-full max-w-md"
                >
                    {step === 'code' ? (
                        <>
                            <h1 className="text-[28px] font-bold text-gray-900 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                                Join a Company
                            </h1>
                            <p className="text-sm text-gray-500 mb-8">
                                Enter the signup code provided by your employer to request access to their training platform.
                            </p>

                            <form onSubmit={handleVerifyCode} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Company Signup Code</label>
                                    <input
                                        type="text"
                                        className="bs-input text-center text-lg tracking-[0.2em] font-mono"
                                        placeholder="XXXX-XXXX"
                                        value={companyCode}
                                        onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <button type="submit" className="btn-lime w-full justify-center !py-3" disabled={loading}>
                                    {loading ? 'Verifying...' : (
                                        <span className="inline-flex items-center gap-2">Verify Code <ArrowRight className="w-4 h-4" /></span>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 mb-6 p-3 rounded-xl" style={{ background: 'rgba(0,77,64,0.05)' }}>
                                <Building2 className="w-5 h-5" style={{ color: '#035A51' }} />
                                <div>
                                    <p className="text-xs text-gray-500">Joining</p>
                                    <p className="text-sm font-semibold text-gray-900">{companyInfo?.name}</p>
                                </div>
                            </div>

                            <h1 className="text-[28px] font-bold text-gray-900 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                                Create Your Account
                            </h1>
                            <p className="text-sm text-gray-500 mb-6">
                                Your request will be sent to the company admin for approval. You'll receive an email once approved.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">First Name</label>
                                        <input type="text" className="bs-input" placeholder="John" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Last Name</label>
                                        <input type="text" className="bs-input" placeholder="Doe" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} required />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
                                    <input type="email" className="bs-input" placeholder="your@email.com" value={form.email} onChange={(e) => update('email', e.target.value)} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className="bs-input !pr-11"
                                            placeholder="Min 8 characters"
                                            value={form.password}
                                            onChange={(e) => update('password', e.target.value)}
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
                                    <input type="password" className="bs-input" placeholder="Re-enter password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} required minLength={8} />
                                </div>
                                <button type="submit" className="btn-lime w-full justify-center !py-3 !mt-6" disabled={loading}>
                                    {loading ? 'Submitting...' : 'Submit Request →'}
                                </button>
                            </form>
                        </>
                    )}

                    <p className="mt-6 text-center text-sm text-gray-500">
                        Want to register individually?{' '}
                        <Link to="/register" className="font-semibold hover:underline" style={{ color: '#035A51' }}>Click here</Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
