import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { Logo } from '../../../components/shared/Logo';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export function BusinessRegistrationPage() {
    const navigate = useNavigate();
    const { registerBusiness } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({
        companyName: '',
        businessEmail: '',
        phone: '',
        numberOfEmployees: '',
        password: '',
        confirmPassword: '',
    });

    const update = (field: string, value: string) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
        if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
        setLoading(true);
        try {
            await registerBusiness({
                email: form.businessEmail,
                password: form.password,
                phone: form.phone,
                company_name: form.companyName,
                number_of_employees: form.numberOfEmployees,
            });
            navigate(`/check-email?email=${encodeURIComponent(form.businessEmail)}&type=business`);
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
                <div className="absolute top-[5%] right-[5%] w-72 h-72 rounded-full opacity-40" style={{ background: 'radial-gradient(circle, rgba(203,255,42,0.3) 0%, transparent 70%)' }} />
                <div className="absolute bottom-[10%] left-[0%] w-96 h-96 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(3,90,81,0.15) 0%, transparent 70%)' }} />
                <div className="relative z-10">
                    <motion.img
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.5, type: 'spring' }}
                        src="/assets/images/building-3d.png"
                        alt="Business growth"
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
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Company Name</label>
                            <input type="text" className="bs-input" placeholder="Enter" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Business Email</label>
                            <input type="email" className="bs-input" placeholder="Enter" value={form.businessEmail} onChange={(e) => update('businessEmail', e.target.value)} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1.5">Phone Number</label>
                                <input type="tel" className="bs-input" placeholder="Enter" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1.5">Number of employees</label>
                                <select className="bs-input" value={form.numberOfEmployees} onChange={(e) => update('numberOfEmployees', e.target.value)}>
                                    <option value="">Select</option>
                                    <option value="1-10">1-10</option>
                                    <option value="11-50">11-50</option>
                                    <option value="51-200">51-200</option>
                                    <option value="201-500">201-500</option>
                                    <option value="500+">500+</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="bs-input !pr-11"
                                    placeholder="Password"
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
                            <input type="password" className="bs-input" placeholder="Password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} required minLength={8} />
                        </div>
                        <button type="submit" className="btn-lime w-full justify-center !py-3 !mt-6" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Account →'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-500">
                        Want to register as an individual?{' '}
                        <Link to="/register" className="font-semibold hover:underline" style={{ color: '#035A51' }}>Click here</Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
