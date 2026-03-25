import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Flag, Trash2, Plus, ToggleLeft, ToggleRight, BookOpen, Mail, FileText, ChevronDown, ChevronRight, Send } from 'lucide-react';
import { useState, useEffect } from 'react';

const TEMPLATE_KEYS = [
    { key: 'email_verification', label: 'Email Verification', description: 'Sent when a new user registers to verify their email', variables: '{{link}}, {{app_name}}' },
    { key: 'password_reset', label: 'Password Reset', description: 'Sent when a user requests a password reset', variables: '{{link}}, {{app_name}}' },
    { key: 'employee_invite', label: 'Employee Invite', description: 'Sent when a business invites an employee', variables: '{{link}}, {{business_name}}, {{app_name}}' },
    { key: 'purchase_approved', label: 'Purchase Approved', description: 'Sent when admin approves a purchase request', variables: '{{course_title}}, {{dashboard_link}}, {{app_name}}' },
    { key: 'purchase_rejected', label: 'Purchase Rejected', description: 'Sent when admin rejects a purchase request', variables: '{{course_title}}, {{admin_notes}}, {{app_name}}' },
    { key: 'certificate_earned', label: 'Certificate Earned', description: 'Sent when a learner earns a certificate', variables: '{{course_title}}, {{cert_number}}, {{verify_link}}, {{app_name}}' },
    { key: 'welcome', label: 'Welcome Email', description: 'Sent after email verification is complete', variables: '{{first_name}}, {{dashboard_link}}, {{app_name}}' },
];

const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
    email_verification: {
        subject: 'Verify your email - {{app_name}}',
        body: '<h2>Welcome to {{app_name}}!</h2>\n<p>Please verify your email address by clicking the link below:</p>\n<a href="{{link}}" style="{{btn_style}}">Verify Email</a>\n<p style="color:#999;font-size:12px;margin-top:24px">If you didn\'t create an account, you can safely ignore this email.</p>',
    },
    password_reset: {
        subject: 'Reset your password - {{app_name}}',
        body: '<h2>Password Reset</h2>\n<p>Click the link below to reset your password. This link expires in 1 hour.</p>\n<a href="{{link}}" style="{{btn_style}}">Reset Password</a>\n<p style="color:#999;font-size:12px;margin-top:24px">If you didn\'t request this, you can safely ignore this email.</p>',
    },
    employee_invite: {
        subject: "You've been invited to {{business_name}} - {{app_name}}",
        body: '<h2>You\'ve been invited!</h2>\n<p><strong>{{business_name}}</strong> has invited you to join their learning platform on {{app_name}}.</p>\n<a href="{{link}}" style="{{btn_style}}">Accept Invite</a>\n<p style="color:#999;font-size:12px;margin-top:24px">This invite expires in 7 days.</p>',
    },
    purchase_approved: {
        subject: 'Purchase confirmed: {{course_title}} - {{app_name}}',
        body: '<h2>Purchase Confirmed</h2>\n<p>Your purchase request for <strong>{{course_title}}</strong> has been approved.</p>\n<p>You can start learning right away from your dashboard.</p>\n<a href="{{dashboard_link}}" style="{{btn_style}}">Go to Dashboard</a>',
    },
    purchase_rejected: {
        subject: 'Purchase request update - {{app_name}}',
        body: '<h2>Purchase Request Update</h2>\n<p>Your purchase request for <strong>{{course_title}}</strong> was not approved.</p>\n{{#admin_notes}}<p><strong>Note:</strong> {{admin_notes}}</p>{{/admin_notes}}\n<p>Please contact support if you have any questions.</p>',
    },
    certificate_earned: {
        subject: 'Certificate earned: {{course_title}} - {{app_name}}',
        body: '<h2>Congratulations! 🎉</h2>\n<p>You\'ve earned a certificate for completing <strong>{{course_title}}</strong>.</p>\n<p>Certificate #: <strong>{{cert_number}}</strong></p>\n<a href="{{verify_link}}" style="{{btn_style}}">View Certificate</a>',
    },
    welcome: {
        subject: 'Welcome to {{app_name}}!',
        body: '<h2>Welcome aboard! 🚀</h2>\n<p>Thank you for joining {{app_name}}. Your account has been created successfully.</p>\n<p>Start exploring our courses and begin your learning journey today.</p>\n<a href="{{dashboard_link}}" style="{{btn_style}}">Explore Courses</a>',
    },
};

export function SettingsPage() {
    const queryClient = useQueryClient();
    const [newKey, setNewKey] = useState('');
    const [strictModeDefault, setStrictModeDefault] = useState(true);
    const [requireAllModules, setRequireAllModules] = useState(true);
    const [passingScore, setPassingScore] = useState(70);
    const [emailProvider, setEmailProvider] = useState('console');
    const [emailFrom, setEmailFrom] = useState('');
    const [emailFromName, setEmailFromName] = useState('');
    const [emailTemplates, setEmailTemplates] = useState<Record<string, { subject: string; body: string }>>({});
    const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
    const [testEmail, setTestEmail] = useState('');

    const { data: siteSettings } = useQuery({
        queryKey: ['site-settings'],
        queryFn: async () => {
            const { data } = await api.get('/site-settings');
            return data as Record<string, any>;
        },
    });

    useEffect(() => {
        if (siteSettings?.course_player_settings) {
            const s = siteSettings.course_player_settings;
            setStrictModeDefault(s.strict_mode_default ?? true);
            setRequireAllModules(s.require_all_modules ?? true);
            setPassingScore(s.passing_score ?? 70);
        }
        if (siteSettings?.email_settings) {
            const es = siteSettings.email_settings;
            setEmailProvider(es.provider || 'console');
            setEmailFrom(es.from_address || '');
            setEmailFromName(es.from_name || '');
            if (es.templates) {
                setEmailTemplates(es.templates);
            }
        }
    }, [siteSettings]);

    const saveCourseSettings = useMutation({
        mutationFn: async () => {
            await api.put('/site-settings/course_player_settings', {
                value: {
                    strict_mode_default: strictModeDefault,
                    require_all_modules: requireAllModules,
                    passing_score: passingScore,
                },
            });
        },
        onSuccess: () => {
            toast.success('Course settings saved');
            queryClient.invalidateQueries({ queryKey: ['site-settings'] });
        },
        onError: () => toast.error('Failed to save settings'),
    });

    const saveEmailSettings = useMutation({
        mutationFn: async () => {
            await api.put('/site-settings/email_settings', {
                value: {
                    provider: emailProvider,
                    from_address: emailFrom || undefined,
                    from_name: emailFromName || undefined,
                    templates: Object.keys(emailTemplates).length > 0 ? emailTemplates : undefined,
                },
            });
        },
        onSuccess: () => {
            toast.success('Email settings saved');
            queryClient.invalidateQueries({ queryKey: ['site-settings'] });
        },
        onError: () => toast.error('Failed to save email settings'),
    });

    const sendTestMut = useMutation({
        mutationFn: async (email: string) => {
            await api.post('/site-settings/test-email', { to: email });
        },
        onSuccess: () => toast.success('Test email sent! Check inbox.'),
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to send test email'),
    });

    const getTemplateValue = (key: string, field: 'subject' | 'body'): string => {
        return emailTemplates[key]?.[field] ?? DEFAULT_TEMPLATES[key]?.[field] ?? '';
    };

    const setTemplateField = (key: string, field: 'subject' | 'body', value: string) => {
        setEmailTemplates((prev) => ({
            ...prev,
            [key]: {
                subject: prev[key]?.subject ?? DEFAULT_TEMPLATES[key]?.subject ?? '',
                body: prev[key]?.body ?? DEFAULT_TEMPLATES[key]?.body ?? '',
                [field]: value,
            },
        }));
    };

    const { data: flags, isLoading } = useQuery<any[]>({
        queryKey: ['feature-flags'],
        queryFn: async () => {
            const { data } = await api.get('/feature-flags');
            return Array.isArray(data) ? data : data?.data ?? [];
        },
    });

    const upsertMut = useMutation({
        mutationFn: async ({ key, is_enabled }: { key: string; is_enabled: boolean }) =>
            api.post('/feature-flags', { key, is_enabled }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
            toast.success('Flag updated');
        },
    });

    const deleteMut = useMutation({
        mutationFn: async (key: string) => api.delete(`/feature-flags/${key}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
            toast.success('Flag deleted');
        },
    });

    const handleAdd = () => {
        if (!newKey.trim()) return;
        upsertMut.mutate({ key: newKey.trim(), is_enabled: false });
        setNewKey('');
    };

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Feature flags and system configuration</p>
            </div>

            {/* Email Configuration */}
            <div className="bs-card p-6 mb-6">
                <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-[var(--bs-teal)]" />
                    Email Configuration
                </h2>
                <p className="text-xs text-gray-500 mb-5">Configure email delivery, sender info, and templates for all transactional emails.</p>

                {/* Provider */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 mb-4">
                    <div>
                        <div className="text-sm font-medium text-gray-900">Email Provider</div>
                        <div className="text-xs text-gray-500 mt-0.5">Choose how transactional emails are sent</div>
                    </div>
                    <select
                        value={emailProvider}
                        onChange={(e) => setEmailProvider(e.target.value)}
                        className="bs-input !w-44 !py-2 !text-sm"
                    >
                        <option value="console">Console (dev only)</option>
                        <option value="resend">Resend</option>
                        <option value="sendgrid">SendGrid</option>
                    </select>
                </div>

                {/* From Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-gray-50">
                        <label className="block text-sm font-medium text-gray-900 mb-1">From Name</label>
                        <input
                            className="bs-input !py-2 !text-sm"
                            value={emailFromName}
                            onChange={(e) => setEmailFromName(e.target.value)}
                            placeholder="brickSkill"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Display name in recipient's inbox</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50">
                        <label className="block text-sm font-medium text-gray-900 mb-1">From Email Address</label>
                        <input
                            className="bs-input !py-2 !text-sm"
                            value={emailFrom}
                            onChange={(e) => setEmailFrom(e.target.value)}
                            placeholder="onboarding@resend.dev"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Must be verified with your email provider. Resend free tier: use onboarding@resend.dev</p>
                    </div>
                </div>

                {/* Send Test Email */}
                <div className="p-4 rounded-xl bg-gray-50 mb-4">
                    <div className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1.5">
                        <Send className="w-4 h-4 text-[var(--bs-teal)]" />
                        Send Test Email
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="email"
                            className="bs-input !py-2 !text-sm flex-1"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="your-email@example.com"
                        />
                        <button
                            onClick={() => testEmail && sendTestMut.mutate(testEmail)}
                            disabled={!testEmail || sendTestMut.isPending}
                            className="btn-lime !py-2 !px-4 disabled:opacity-50"
                        >
                            {sendTestMut.isPending ? 'Sending...' : 'Send Test'}
                        </button>
                    </div>
                </div>

                {/* Email Templates */}
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[var(--bs-teal)]" />
                        Email Templates
                    </h3>
                    <p className="text-[11px] text-gray-400 mb-3">
                        Customize the subject and body for each email type. Use {'{{variable}}'} placeholders.
                    </p>

                    <div className="space-y-2">
                        {TEMPLATE_KEYS.map((tmpl) => {
                            const isExpanded = expandedTemplate === tmpl.key;
                            return (
                                <div key={tmpl.key} className="border border-gray-100 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => setExpandedTemplate(isExpanded ? null : tmpl.key)}
                                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                                    >
                                        <div>
                                            <span className="text-sm font-medium text-gray-900">{tmpl.label}</span>
                                            <span className="text-xs text-gray-400 ml-2">{tmpl.description}</span>
                                        </div>
                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                    </button>
                                    {isExpanded && (
                                        <div className="px-4 pb-4 space-y-3 border-t border-gray-50">
                                            <div className="pt-3">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Subject Line</label>
                                                <input
                                                    className="bs-input !py-2 !text-sm"
                                                    value={getTemplateValue(tmpl.key, 'subject')}
                                                    onChange={(e) => setTemplateField(tmpl.key, 'subject', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Email Body (HTML)</label>
                                                <textarea
                                                    className="bs-input !py-2 !text-sm font-mono !min-h-[140px]"
                                                    value={getTemplateValue(tmpl.key, 'body')}
                                                    onChange={(e) => setTemplateField(tmpl.key, 'body', e.target.value)}
                                                />
                                            </div>
                                            <div className="text-[11px] text-gray-400 bg-gray-50 rounded-lg p-2.5">
                                                <strong>Available variables:</strong> {tmpl.variables}, {'{{btn_style}}'} (button CSS)
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const defaults = DEFAULT_TEMPLATES[tmpl.key];
                                                    if (defaults && window.confirm('Reset to default template?')) {
                                                        setTemplateField(tmpl.key, 'subject', defaults.subject);
                                                        setTemplateField(tmpl.key, 'body', defaults.body);
                                                    }
                                                }}
                                                className="text-xs text-gray-400 hover:text-red-500"
                                            >
                                                Reset to Default
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={() => saveEmailSettings.mutate()}
                        disabled={saveEmailSettings.isPending}
                        className="btn-lime !py-2.5"
                    >
                        {saveEmailSettings.isPending ? 'Saving...' : 'Save Email Settings'}
                    </button>
                </div>
            </div>

            {/* Feature Flags */}
            <div className="bs-card p-6 mb-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Feature Flags</h2>

                <div className="flex items-center gap-2 mb-5">
                    <input
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        placeholder="new_feature_key"
                        className="bs-input !py-2 !text-sm flex-1"
                    />
                    <button onClick={handleAdd} className="btn-lime !py-2.5">
                        <Plus className="w-4 h-4" />
                        Add
                    </button>
                </div>

                <div className="space-y-2">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50">
                                <div className="w-40 h-5 bg-gray-200 rounded animate-pulse" />
                                <div className="w-12 h-6 bg-gray-200 rounded-full animate-pulse" />
                            </div>
                        ))
                    ) : (
                        flags?.map((flag: any) => (
                            <motion.div
                                key={flag.key}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Flag className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-900">{flag.key}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => upsertMut.mutate({ key: flag.key, is_enabled: !flag.is_enabled })}
                                        className="transition-colors"
                                        style={{ color: flag.is_enabled ? 'var(--bs-teal)' : 'var(--bs-gray-300)' }}
                                    >
                                        {flag.is_enabled
                                            ? <ToggleRight className="w-7 h-7" />
                                            : <ToggleLeft className="w-7 h-7" />
                                        }
                                    </button>
                                    <button
                                        onClick={() => deleteMut.mutate(flag.key)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Course Player Settings */}
            <div className="bs-card p-6 mb-6">
                <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[var(--bs-teal)]" />
                    Course Player Settings
                </h2>
                <p className="text-xs text-gray-500 mb-5">Configure default behavior for course players and assessments</p>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                        <div>
                            <div className="text-sm font-medium text-gray-900">Strict Mode (Default)</div>
                            <div className="text-xs text-gray-500 mt-0.5">When enabled, new enrollments require sequential module completion</div>
                        </div>
                        <button
                            onClick={() => setStrictModeDefault(!strictModeDefault)}
                            style={{ color: strictModeDefault ? 'var(--bs-teal)' : 'var(--bs-gray-300)' }}
                        >
                            {strictModeDefault ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                        <div>
                            <div className="text-sm font-medium text-gray-900">Require All Modules</div>
                            <div className="text-xs text-gray-500 mt-0.5">Require completion of all modules before assessment</div>
                        </div>
                        <button
                            onClick={() => setRequireAllModules(!requireAllModules)}
                            style={{ color: requireAllModules ? 'var(--bs-teal)' : 'var(--bs-gray-300)' }}
                        >
                            {requireAllModules ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                        <div>
                            <div className="text-sm font-medium text-gray-900">Passing Score (%)</div>
                            <div className="text-xs text-gray-500 mt-0.5">Minimum score required to pass the assessment</div>
                        </div>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            value={passingScore}
                            onChange={(e) => setPassingScore(Number(e.target.value))}
                            className="w-20 bs-input !py-2 !text-center"
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={() => saveCourseSettings.mutate()}
                            disabled={saveCourseSettings.isPending}
                            className="btn-lime !py-2.5"
                        >
                            {saveCourseSettings.isPending ? 'Saving...' : 'Save Course Settings'}
                        </button>
                    </div>
                </div>
            </div>

            {/* System Info */}
            <div className="bs-card p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">System Information</h2>
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Version', value: '1.0.0' },
                        { label: 'Backend', value: 'NestJS' },
                        { label: 'Database', value: 'PostgreSQL' },
                        { label: 'Cache', value: 'Redis' },
                    ].map(({ label, value }) => (
                        <div key={label} className="p-4 rounded-xl" style={{ background: 'var(--bs-gray-50)' }}>
                            <p className="text-xs text-gray-500 mb-1">{label}</p>
                            <p className="text-sm font-semibold text-gray-900">{value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
