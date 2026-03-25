import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { Building2, User, FileCheck, ChevronRight, ChevronLeft, Check } from 'lucide-react';

const STEPS = [
    { key: 'company', label: 'Company Details', icon: Building2 },
    { key: 'contact', label: 'Contact Details', icon: User },
    { key: 'verification', label: 'Verification', icon: FileCheck },
] as const;

export function KycFormPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(0);

    const [form, setForm] = useState({
        company_registration_number: '',
        tax_id: '',
        industry: '',
        website: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        postcode: '',
        country: '',
        contact_first_name: '',
        contact_last_name: '',
        contact_email: '',
        contact_phone: '',
        contact_job_title: '',
    });

    const { data: existingKyc } = useQuery({
        queryKey: ['my-kyc'],
        queryFn: async () => {
            const { data } = await api.get('/kyc/my');
            return data;
        },
    });

    useEffect(() => {
        if (existingKyc) {
            setForm((prev) => ({
                ...prev,
                ...Object.fromEntries(
                    Object.entries(existingKyc).filter(([_, v]) => v !== null && typeof v === 'string')
                ),
            }));
        }
    }, [existingKyc]);

    const mutation = useMutation({
        mutationFn: async () => {
            const { data } = await api.post('/kyc/submit', form);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-kyc'] });
            toast.success('KYC submitted for review');
            navigate('/business');
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to submit KYC');
        },
    });

    const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

    const kycStatus = existingKyc?.business?.kyc_status;

    return (
        <div className="max-w-3xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Business Verification (KYC)</h1>
            <p className="text-sm text-gray-500 mb-8">Complete your business verification to activate your account</p>

            {kycStatus === 'APPROVED' && (
                <div className="bs-card p-5 mb-6 border-l-4" style={{ borderLeftColor: 'var(--bs-teal)' }}>
                    <div className="flex items-center gap-2 text-green-700 font-semibold">
                        <Check className="w-5 h-5" /> Verification Approved
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Your business has been verified successfully.</p>
                </div>
            )}

            {kycStatus === 'REJECTED' && (
                <div className="bs-card p-5 mb-6 border-l-4 border-red-500">
                    <p className="text-sm font-semibold text-red-700">Verification Rejected</p>
                    {existingKyc?.admin_notes && <p className="text-sm text-gray-600 mt-1">{existingKyc.admin_notes}</p>}
                    <p className="text-sm text-gray-500 mt-1">Please update your details and resubmit.</p>
                </div>
            )}

            {kycStatus === 'INFO_REQUESTED' && (
                <div className="bs-card p-5 mb-6 border-l-4 border-amber-500">
                    <p className="text-sm font-semibold text-amber-700">Additional Information Requested</p>
                    {existingKyc?.admin_notes && <p className="text-sm text-gray-600 mt-1">{existingKyc.admin_notes}</p>}
                </div>
            )}

            {/* Stepper */}
            <div className="flex items-center gap-1 mb-8">
                {STEPS.map((s, i) => (
                    <div key={s.key} className="flex items-center gap-1">
                        <button
                            onClick={() => setStep(i)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                i === step
                                    ? 'bg-[var(--bs-teal)] text-white'
                                    : i < step
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                            }`}
                        >
                            <s.icon className="w-4 h-4" />
                            {s.label}
                        </button>
                        {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
                    </div>
                ))}
            </div>

            {/* Step 1: Company Details */}
            {step === 0 && (
                <div className="bs-card p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Registration Number</label>
                        <input className="bs-input" placeholder="e.g. 12345678" value={form.company_registration_number} onChange={(e) => update('company_registration_number', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID / VAT Number</label>
                            <input className="bs-input" placeholder="e.g. GB123456789" value={form.tax_id} onChange={(e) => update('tax_id', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                            <select className="bs-input" value={form.industry} onChange={(e) => update('industry', e.target.value)}>
                                <option value="">Select industry</option>
                                <option value="Food & Hospitality">Food & Hospitality</option>
                                <option value="Healthcare">Healthcare</option>
                                <option value="Construction">Construction</option>
                                <option value="Education">Education</option>
                                <option value="Retail">Retail</option>
                                <option value="Manufacturing">Manufacturing</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                        <input className="bs-input" placeholder="https://" value={form.website} onChange={(e) => update('website', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                        <input className="bs-input" value={form.address_line_1} onChange={(e) => update('address_line_1', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                        <input className="bs-input" value={form.address_line_2} onChange={(e) => update('address_line_2', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <input className="bs-input" value={form.city} onChange={(e) => update('city', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                            <input className="bs-input" value={form.postcode} onChange={(e) => update('postcode', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                            <input className="bs-input" value={form.country} onChange={(e) => update('country', e.target.value)} />
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Contact Details */}
            {step === 1 && (
                <div className="bs-card p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <input className="bs-input" value={form.contact_first_name} onChange={(e) => update('contact_first_name', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input className="bs-input" value={form.contact_last_name} onChange={(e) => update('contact_last_name', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                        <input className="bs-input" value={form.contact_job_title} onChange={(e) => update('contact_job_title', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                        <input type="email" className="bs-input" value={form.contact_email} onChange={(e) => update('contact_email', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                        <input type="tel" className="bs-input" value={form.contact_phone} onChange={(e) => update('contact_phone', e.target.value)} />
                    </div>
                </div>
            )}

            {/* Step 3: Verification */}
            {step === 2 && (
                <div className="bs-card p-6 space-y-5">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 mb-2">Document Upload</h3>
                        <p className="text-sm text-gray-500 mb-4">Upload supporting documents for your business verification. Accepted formats: PDF, JPG, PNG.</p>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                            <p className="text-sm text-gray-400">Document upload will be available after the storage integration (Phase 10).</p>
                            <p className="text-xs text-gray-300 mt-2">For now, submit your details and our team will contact you.</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-5">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Summary</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-gray-500">Registration #:</span> <span className="font-medium">{form.company_registration_number || '—'}</span></div>
                            <div><span className="text-gray-500">Industry:</span> <span className="font-medium">{form.industry || '—'}</span></div>
                            <div><span className="text-gray-500">City:</span> <span className="font-medium">{form.city || '—'}</span></div>
                            <div><span className="text-gray-500">Country:</span> <span className="font-medium">{form.country || '—'}</span></div>
                            <div><span className="text-gray-500">Contact:</span> <span className="font-medium">{form.contact_first_name} {form.contact_last_name}</span></div>
                            <div><span className="text-gray-500">Email:</span> <span className="font-medium">{form.contact_email || '—'}</span></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
                <button
                    onClick={() => setStep(Math.max(0, step - 1))}
                    disabled={step === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 disabled:opacity-30"
                >
                    <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                {step < STEPS.length - 1 ? (
                    <button onClick={() => setStep(step + 1)} className="btn-lime">
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending || kycStatus === 'APPROVED'}
                        className="btn-lime disabled:opacity-50"
                    >
                        {mutation.isPending ? 'Submitting...' : 'Submit for Review'}
                    </button>
                )}
            </div>
        </div>
    );
}
