import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Save, Upload, Plus, Trash2, Image, BookOpen } from 'lucide-react';
import type { Course, PaginatedResponse } from '../../types';

const SECTION_KEYS = [
    { key: 'hero', label: 'Hero Section' },
    { key: 'stats', label: 'Stats Bar' },
    { key: 'categories', label: 'Categories' },
    { key: 'featured_courses', label: 'Featured Courses' },
    { key: 'testimonials', label: 'Testimonials' },
    { key: 'articles', label: 'Articles & News' },
    { key: 'trusted_by', label: 'Trusted By' },
    { key: 'community', label: 'Community Section' },
    { key: 'faq', label: 'FAQ Section' },
    { key: 'cta_banner', label: 'CTA Banner' },
    { key: 'footer', label: 'Footer' },
];

function ImageUploadField({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (file: File) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await api.post('/site-settings/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onChange(data.url);
            toast.success('Image uploaded');
        } catch {
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
            <div className="flex gap-3 items-start">
                <input
                    className="bs-input flex-1"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Image URL or upload"
                />
                <label className="btn-outline !py-2.5 !px-3 cursor-pointer inline-flex items-center gap-1.5 flex-shrink-0">
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Uploading...' : 'Upload'}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(f);
                    }} />
                </label>
            </div>
            {value && (
                <img src={value} alt="Preview" className="mt-2 h-20 rounded-lg object-cover border border-gray-100" />
            )}
        </div>
    );
}

export function HomepageEditor() {
    const queryClient = useQueryClient();
    const [activeSection, setActiveSection] = useState('hero');
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [dirty, setDirty] = useState(false);

    const { data: settings, isLoading } = useQuery({
        queryKey: ['site-settings'],
        queryFn: async () => {
            const { data } = await api.get('/site-settings');
            return data as Record<string, any>;
        },
    });

    const { data: allCourses } = useQuery<PaginatedResponse<Course>>({
        queryKey: ['all-published-courses'],
        queryFn: async () => {
            const { data } = await api.get('/courses/catalog?limit=100');
            return data;
        },
    });

    useEffect(() => {
        if (settings) setFormData(settings);
    }, [settings]);

    const saveMutation = useMutation({
        mutationFn: async (data: Record<string, any>) => {
            await api.put('/site-settings', data);
        },
        onSuccess: () => {
            toast.success('Homepage content saved!');
            setDirty(false);
            queryClient.invalidateQueries({ queryKey: ['site-settings'] });
        },
        onError: () => toast.error('Failed to save'),
    });

    const updateField = useCallback((sectionKey: string, field: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [sectionKey]: { ...(prev[sectionKey] || {}), [field]: value },
        }));
        setDirty(true);
    }, []);

    const sectionData = formData[activeSection] || {};

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Homepage Content</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage the content displayed on the public homepage</p>
                </div>
                <button
                    onClick={() => saveMutation.mutate(formData)}
                    disabled={!dirty || saveMutation.isPending}
                    className="btn-lime disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {saveMutation.isPending ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>

            <div className="flex gap-6">
                <div className="w-56 flex-shrink-0">
                    <div className="bs-card p-2 space-y-1 sticky top-4">
                        {SECTION_KEYS.map((section) => (
                            <button
                                key={section.key}
                                onClick={() => setActiveSection(section.key)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    activeSection === section.key
                                        ? 'bg-[var(--bs-lime-muted)] text-[var(--bs-teal)]'
                                        : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {section.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1">
                    {isLoading ? (
                        <div className="bs-card p-8 text-center text-gray-400">Loading settings...</div>
                    ) : (
                        <div className="bs-card p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-1">
                                {SECTION_KEYS.find((s) => s.key === activeSection)?.label}
                            </h2>
                            <p className="text-xs text-gray-500 mb-6">Edit the content for this section.</p>

                            {activeSection === 'hero' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Hero Title</label>
                                        <input className="bs-input" value={sectionData.title || ''} onChange={(e) => updateField('hero', 'title', e.target.value)} placeholder="Online training and compliance made easy" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Subtitle / Trust Badges</label>
                                        <input className="bs-input" value={sectionData.subtitle || ''} onChange={(e) => updateField('hero', 'subtitle', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Description</label>
                                        <textarea className="bs-input !min-h-[80px]" value={sectionData.description || ''} onChange={(e) => updateField('hero', 'description', e.target.value)} />
                                    </div>
                                    <ImageUploadField label="Hero Image" value={sectionData.image_url || ''} onChange={(url) => updateField('hero', 'image_url', url)} />
                                </div>
                            )}

                            {activeSection === 'stats' && (
                                <div className="space-y-4">
                                    {(sectionData.items || [{ value: '4.9', label: '/ 200 Reviews' }, { value: '10K+', label: 'Online Courses' }, { value: '6K+', label: 'Certified Courses' }, { value: '2K+', label: 'Experienced Tutors' }]).map((item: any, i: number) => (
                                        <div key={i} className="flex gap-3 items-center p-3 rounded-lg bg-gray-50">
                                            <input className="bs-input !w-24" value={item.value || ''} onChange={(e) => {
                                                const items = [...(sectionData.items || [])];
                                                items[i] = { ...items[i], value: e.target.value };
                                                updateField('stats', 'items', items);
                                            }} placeholder="4.9" />
                                            <input className="bs-input flex-1" value={item.label || item.sublabel || ''} onChange={(e) => {
                                                const items = [...(sectionData.items || [])];
                                                items[i] = { ...items[i], label: e.target.value, sublabel: e.target.value };
                                                updateField('stats', 'items', items);
                                            }} placeholder="/ 200 Reviews" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeSection === 'categories' && (
                                <div className="space-y-3">
                                    {(sectionData.items || []).map((item: any, i: number) => (
                                        <div key={i} className="flex gap-3 items-center p-3 rounded-lg bg-gray-50">
                                            <input className="bs-input flex-1" value={item.name || ''} onChange={(e) => {
                                                const items = [...(sectionData.items || [])];
                                                items[i] = { ...items[i], name: e.target.value };
                                                updateField('categories', 'items', items);
                                            }} placeholder="Category name" />
                                            <input className="bs-input !w-32" value={item.icon || ''} onChange={(e) => {
                                                const items = [...(sectionData.items || [])];
                                                items[i] = { ...items[i], icon: e.target.value };
                                                updateField('categories', 'items', items);
                                            }} placeholder="Icon name" />
                                            <button onClick={() => {
                                                const items = (sectionData.items || []).filter((_: any, j: number) => j !== i);
                                                updateField('categories', 'items', items);
                                            }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => {
                                        const items = [...(sectionData.items || []), { name: '', icon: 'ShieldCheck' }];
                                        updateField('categories', 'items', items);
                                    }} className="text-sm text-[var(--bs-teal)] font-medium inline-flex items-center gap-1">
                                        <Plus className="w-4 h-4" /> Add Category
                                    </button>
                                </div>
                            )}

                            {activeSection === 'featured_courses' && (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-500">Select courses to feature on the homepage. The "Best Sellers" section shows all published courses.</p>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {(allCourses?.data || []).map((course: any) => {
                                            const ids: string[] = sectionData.course_ids || [];
                                            const isSelected = ids.includes(course.id);
                                            return (
                                                <label key={course.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-[var(--bs-lime-muted)]' : 'bg-gray-50 hover:bg-gray-100'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {
                                                            const newIds = isSelected ? ids.filter((id) => id !== course.id) : [...ids, course.id];
                                                            updateField('featured_courses', 'course_ids', newIds);
                                                        }}
                                                        className="w-4 h-4 rounded"
                                                    />
                                                    <div className="flex items-center gap-2 flex-1">
                                                        {course.thumbnail_url ? (
                                                            <img src={course.thumbnail_url} className="w-10 h-10 rounded object-cover" alt="" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center"><BookOpen className="w-4 h-4 text-gray-400" /></div>
                                                        )}
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">{course.title}</div>
                                                            <div className="text-xs text-gray-400">${Number(course.base_price).toFixed(2)}</div>
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {activeSection === 'testimonials' && (
                                <div className="space-y-4">
                                    {(sectionData.items || []).map((item: any, i: number) => (
                                        <div key={i} className="p-4 rounded-lg bg-gray-50 space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-xs font-medium text-gray-500">Testimonial {i + 1}</span>
                                                <button onClick={() => {
                                                    const items = (sectionData.items || []).filter((_: any, j: number) => j !== i);
                                                    updateField('testimonials', 'items', items);
                                                }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                            <textarea className="bs-input !min-h-[60px]" value={item.text || ''} onChange={(e) => {
                                                const items = [...(sectionData.items || [])];
                                                items[i] = { ...items[i], text: e.target.value };
                                                updateField('testimonials', 'items', items);
                                            }} placeholder="Testimonial text" />
                                            <div className="flex gap-3">
                                                <input className="bs-input flex-1" value={item.name || ''} onChange={(e) => {
                                                    const items = [...(sectionData.items || [])];
                                                    items[i] = { ...items[i], name: e.target.value };
                                                    updateField('testimonials', 'items', items);
                                                }} placeholder="Name" />
                                                <input className="bs-input flex-1" value={item.role || ''} onChange={(e) => {
                                                    const items = [...(sectionData.items || [])];
                                                    items[i] = { ...items[i], role: e.target.value };
                                                    updateField('testimonials', 'items', items);
                                                }} placeholder="Role" />
                                                <input className="bs-input !w-20" type="number" step="0.5" min="0" max="5" value={item.rating || 5} onChange={(e) => {
                                                    const items = [...(sectionData.items || [])];
                                                    items[i] = { ...items[i], rating: Number(e.target.value) };
                                                    updateField('testimonials', 'items', items);
                                                }} placeholder="5" />
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => {
                                        const items = [...(sectionData.items || []), { text: '', name: '', role: '', rating: 5 }];
                                        updateField('testimonials', 'items', items);
                                    }} className="text-sm text-[var(--bs-teal)] font-medium inline-flex items-center gap-1">
                                        <Plus className="w-4 h-4" /> Add Testimonial
                                    </button>
                                </div>
                            )}

                            {activeSection === 'articles' && (
                                <div className="space-y-4">
                                    {(sectionData.items || []).map((item: any, i: number) => (
                                        <div key={i} className="p-4 rounded-lg bg-gray-50 space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-xs font-medium text-gray-500">Article {i + 1}</span>
                                                <button onClick={() => {
                                                    const items = (sectionData.items || []).filter((_: any, j: number) => j !== i);
                                                    updateField('articles', 'items', items);
                                                }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                            <input className="bs-input" value={item.title || ''} onChange={(e) => {
                                                const items = [...(sectionData.items || [])];
                                                items[i] = { ...items[i], title: e.target.value };
                                                updateField('articles', 'items', items);
                                            }} placeholder="Article title" />
                                            <textarea className="bs-input !min-h-[50px]" value={item.excerpt || ''} onChange={(e) => {
                                                const items = [...(sectionData.items || [])];
                                                items[i] = { ...items[i], excerpt: e.target.value };
                                                updateField('articles', 'items', items);
                                            }} placeholder="Excerpt" />
                                            <div className="flex gap-3">
                                                <input className="bs-input flex-1" value={item.author || ''} onChange={(e) => {
                                                    const items = [...(sectionData.items || [])];
                                                    items[i] = { ...items[i], author: e.target.value };
                                                    updateField('articles', 'items', items);
                                                }} placeholder="Author" />
                                                <input className="bs-input !w-36" value={item.date || ''} onChange={(e) => {
                                                    const items = [...(sectionData.items || [])];
                                                    items[i] = { ...items[i], date: e.target.value };
                                                    updateField('articles', 'items', items);
                                                }} placeholder="Date" />
                                            </div>
                                            <ImageUploadField label="Article Image" value={item.image || ''} onChange={(url) => {
                                                const items = [...(sectionData.items || [])];
                                                items[i] = { ...items[i], image: url };
                                                updateField('articles', 'items', items);
                                            }} />
                                        </div>
                                    ))}
                                    <button onClick={() => {
                                        const items = [...(sectionData.items || []), { title: '', excerpt: '', author: '', date: '', image: '' }];
                                        updateField('articles', 'items', items);
                                    }} className="text-sm text-[var(--bs-teal)] font-medium inline-flex items-center gap-1">
                                        <Plus className="w-4 h-4" /> Add Article
                                    </button>
                                </div>
                            )}

                            {activeSection === 'trusted_by' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Section Title</label>
                                        <input className="bs-input" value={sectionData.title || ''} onChange={(e) => updateField('trusted_by', 'title', e.target.value)} placeholder="Trusted by 50,000+ Organisations" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Description</label>
                                        <textarea className="bs-input !min-h-[60px]" value={sectionData.description || ''} onChange={(e) => updateField('trusted_by', 'description', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Organization Logos (one per line)</label>
                                        <textarea
                                            className="bs-input !min-h-[100px] font-mono text-xs"
                                            value={Array.isArray(sectionData.logos) ? sectionData.logos.join('\n') : (sectionData.logos || '')}
                                            onChange={(e) => updateField('trusted_by', 'logos', e.target.value.split('\n').filter(Boolean))}
                                            placeholder="Waterstones&#10;Centara&#10;Deliveroo"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeSection === 'community' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Section Title</label>
                                        <input className="bs-input" value={sectionData.title || ''} onChange={(e) => updateField('community', 'title', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Description</label>
                                        <textarea className="bs-input !min-h-[80px]" value={sectionData.description || ''} onChange={(e) => updateField('community', 'description', e.target.value)} />
                                    </div>
                                    <ImageUploadField label="Community Image" value={sectionData.image_url || ''} onChange={(url) => updateField('community', 'image_url', url)} />
                                </div>
                            )}

                            {activeSection === 'faq' && (
                                <div className="space-y-4">
                                    {(sectionData.items || []).map((item: any, i: number) => (
                                        <div key={i} className="p-4 rounded-lg bg-gray-50 space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-xs font-medium text-gray-500">FAQ {i + 1}</span>
                                                <button onClick={() => {
                                                    const items = (sectionData.items || []).filter((_: any, j: number) => j !== i);
                                                    updateField('faq', 'items', items);
                                                }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                            <input className="bs-input" value={item.question || ''} onChange={(e) => {
                                                const items = [...(sectionData.items || [])];
                                                items[i] = { ...items[i], question: e.target.value };
                                                updateField('faq', 'items', items);
                                            }} placeholder="Question" />
                                            <textarea className="bs-input !min-h-[60px]" value={item.answer || ''} onChange={(e) => {
                                                const items = [...(sectionData.items || [])];
                                                items[i] = { ...items[i], answer: e.target.value };
                                                updateField('faq', 'items', items);
                                            }} placeholder="Answer" />
                                        </div>
                                    ))}
                                    <button onClick={() => {
                                        const items = [...(sectionData.items || []), { question: '', answer: '' }];
                                        updateField('faq', 'items', items);
                                    }} className="text-sm text-[var(--bs-teal)] font-medium inline-flex items-center gap-1">
                                        <Plus className="w-4 h-4" /> Add FAQ
                                    </button>
                                </div>
                            )}

                            {activeSection === 'cta_banner' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Title</label>
                                        <input className="bs-input" value={sectionData.title || ''} onChange={(e) => updateField('cta_banner', 'title', e.target.value)} placeholder="Sign up as a Company" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Description</label>
                                        <textarea className="bs-input !min-h-[60px]" value={sectionData.description || ''} onChange={(e) => updateField('cta_banner', 'description', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Button Text</label>
                                        <input className="bs-input" value={sectionData.button_text || ''} onChange={(e) => updateField('cta_banner', 'button_text', e.target.value)} placeholder="Get Started" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Button Link</label>
                                        <input className="bs-input" value={sectionData.button_link || ''} onChange={(e) => updateField('cta_banner', 'button_link', e.target.value)} placeholder="/register/business" />
                                    </div>
                                </div>
                            )}

                            {activeSection === 'footer' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Footer Description</label>
                                        <textarea className="bs-input !min-h-[60px]" value={sectionData.description || ''} onChange={(e) => updateField('footer', 'description', e.target.value)} placeholder="Platform designed to help..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
                                        <input className="bs-input" value={sectionData.email || ''} onChange={(e) => updateField('footer', 'email', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Phone</label>
                                        <input className="bs-input" value={sectionData.phone || ''} onChange={(e) => updateField('footer', 'phone', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Address</label>
                                        <input className="bs-input" value={sectionData.address || ''} onChange={(e) => updateField('footer', 'address', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Social Links (JSON)</label>
                                        <textarea
                                            className="bs-input !min-h-[80px] font-mono text-xs"
                                            value={typeof sectionData.social_links === 'string' ? sectionData.social_links : JSON.stringify(sectionData.social_links || {}, null, 2)}
                                            onChange={(e) => {
                                                try { updateField('footer', 'social_links', JSON.parse(e.target.value)); }
                                                catch { updateField('footer', 'social_links', e.target.value); }
                                            }}
                                            placeholder='{"facebook": "...", "twitter": "..."}'
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
