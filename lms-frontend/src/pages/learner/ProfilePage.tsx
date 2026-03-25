import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { User as UserIcon, Lock, Mail, Phone } from 'lucide-react';

export function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPw, setChangingPw] = useState(false);

    useEffect(() => {
        if (user) {
            setFirstName(user.first_name || '');
            setLastName(user.last_name || '');
            setPhone(user.phone || '');
        }
    }, [user]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.patch('/users/profile', { first_name: firstName, last_name: lastName, phone });
            await refreshUser();
            toast.success('Profile updated');
        } catch {
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }
        setChangingPw(true);
        try {
            await api.post('/users/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
            });
            toast.success('Password changed');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to change password');
        } finally {
            setChangingPw(false);
        }
    };

    return (
        <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">My Profile</h1>
            <p className="text-sm text-gray-500 mb-8">Manage your account settings and change your password</p>

            {/* Profile Form */}
            <form onSubmit={handleProfileSubmit} className="bs-card p-6 mb-6">
                <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
                    <UserIcon className="w-5 h-5" style={{ color: 'var(--bs-teal)' }} />
                    Personal Information
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
                            <Mail className="w-4 h-4" />
                            {user?.email}
                            {user?.email_verified && (
                                <span className="ml-auto text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Verified</span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[var(--bs-teal)]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[var(--bs-teal)]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+44 7123 456789"
                                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[var(--bs-teal)]"
                            />
                        </div>
                    </div>
                </div>

                <button type="submit" disabled={saving} className="btn-lime mt-6 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </form>

            {/* Password Form */}
            <form onSubmit={handlePasswordSubmit} className="bs-card p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
                    <Lock className="w-5 h-5" style={{ color: 'var(--bs-teal)' }} />
                    Change Password
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[var(--bs-teal)]"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[var(--bs-teal)]"
                            minLength={8}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[var(--bs-teal)]"
                            minLength={8}
                            required
                        />
                    </div>
                </div>

                <button type="submit" disabled={changingPw} className="btn-lime mt-6 disabled:opacity-50">
                    {changingPw ? 'Changing...' : 'Change Password'}
                </button>
            </form>
        </div>
    );
}
