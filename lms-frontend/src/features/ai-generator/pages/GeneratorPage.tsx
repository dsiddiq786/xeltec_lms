import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Sparkles, BookOpen, Clock, Target, Layers, List } from 'lucide-react';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const CATEGORIES = [
    'Health & Safety', 'Food Hygiene', 'Fire Safety', 'First Aid',
    'Safeguarding', 'HACCP', 'Mental Health', 'Education',
    'Business Essentials', 'Customer Service', 'Compliance', 'Other',
];

export function GeneratorPage() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        course_title: '',
        description: '',
        category: '',
        course_level: 'Beginner',
        regulatory_context: '',
        target_audience: '',
        learning_objectives: '',
        target_course_duration_minutes: 30,
        target_slide_duration_sec: 120,
        words_per_minute: 150,
        levels_count: 1,
        modules_per_level: 4,
        slides_per_module: 5,
        pass_percentage: 85,
        include_standard_intro_slides: true,
        generate_audio: false,
        generate_images: false,
    });

    const [useModuleNames, setUseModuleNames] = useState(false);
    const [moduleNamesText, setModuleNamesText] = useState('');

    const totalSlides = form.levels_count * form.modules_per_level * form.slides_per_module;
    const estimatedDuration = Math.round(totalSlides * form.target_slide_duration_sec / 60);

    const createJob = useMutation({
        mutationFn: async () => {
            const moduleNames = useModuleNames
                ? moduleNamesText.split('\n').map(s => s.trim()).filter(Boolean)
                : undefined;

            const { data } = await api.post('course-generator/jobs', {
                ...form,
                total_slides: totalSlides,
                module_names: moduleNames,
            });
            return data;
        },
        onSuccess: () => {
            toast.success('Course generation started!');
            navigate('/admin/ai-generator');
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail?.message || err?.response?.data?.message || 'Failed to start generation');
        },
    });

    const update = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <button onClick={() => navigate('/admin/ai-generator')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Jobs
            </button>

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Create AI Course</h1>
                <p className="text-sm text-gray-500 mt-1">Configure the course parameters and let AI generate the content.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Course Identity */}
                    <div className="bs-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="w-4 h-4" style={{ color: 'var(--bs-teal)' }} />
                            <h2 className="text-sm font-semibold text-gray-900">Course Identity</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Course Title *</label>
                                <input className="bs-input" value={form.course_title} onChange={(e) => update('course_title', e.target.value)} placeholder="e.g. Level 1 Food Hygiene and Safety" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                                <textarea className="bs-input !h-20 resize-none" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Brief description of the course content and goals..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Category *</label>
                                    <select className="bs-input" value={form.category} onChange={(e) => update('category', e.target.value)}>
                                        <option value="">Select category</option>
                                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Level</label>
                                    <select className="bs-input" value={form.course_level} onChange={(e) => update('course_level', e.target.value)}>
                                        {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Target Audience</label>
                                <input className="bs-input" value={form.target_audience} onChange={(e) => update('target_audience', e.target.value)} placeholder="e.g. Food service workers, new employees" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Learning Objectives</label>
                                <textarea className="bs-input !h-20 resize-none" value={form.learning_objectives} onChange={(e) => update('learning_objectives', e.target.value)} placeholder="List the key learning outcomes (one per line)..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Regulatory Context</label>
                                <input className="bs-input" value={form.regulatory_context} onChange={(e) => update('regulatory_context', e.target.value)} placeholder="e.g. GDPR, HIPAA, UK Food Safety Act" />
                            </div>
                        </div>
                    </div>

                    {/* Structure */}
                    <div className="bs-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Layers className="w-4 h-4" style={{ color: 'var(--bs-teal)' }} />
                            <h2 className="text-sm font-semibold text-gray-900">Course Structure</h2>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Levels</label>
                                <input type="number" className="bs-input" min={1} max={10} value={form.levels_count} onChange={(e) => update('levels_count', Number(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Modules / Level</label>
                                <input type="number" className="bs-input" min={1} max={10} value={form.modules_per_level} onChange={(e) => update('modules_per_level', Number(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Slides / Module</label>
                                <input type="number" className="bs-input" min={1} max={20} value={form.slides_per_module} onChange={(e) => update('slides_per_module', Number(e.target.value))} />
                            </div>
                        </div>
                    </div>

                    {/* Module Names (Optional) */}
                    <div className="bs-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <List className="w-4 h-4" style={{ color: 'var(--bs-teal)' }} />
                            <h2 className="text-sm font-semibold text-gray-900">Module Names</h2>
                            <span className="text-xs text-gray-400">(Optional)</span>
                        </div>
                        <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer mb-3">
                            <input
                                type="checkbox"
                                checked={useModuleNames}
                                onChange={(e) => setUseModuleNames(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <div>
                                <span className="text-sm font-medium text-gray-900">Specify custom module names</span>
                                <p className="text-xs text-gray-500">Define specific module titles instead of letting AI generate them</p>
                            </div>
                        </label>
                        <AnimatePresence>
                            {useModuleNames && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <p className="text-xs text-gray-500 mb-2">Enter one module name per line. The AI will use these as the module titles.</p>
                                    <textarea
                                        className="bs-input !h-32 resize-none font-mono text-sm"
                                        value={moduleNamesText}
                                        onChange={(e) => setModuleNamesText(e.target.value)}
                                        placeholder={`Introduction to ${form.course_title || 'the Topic'}\nCore Concepts\nAdvanced Techniques\nPractical Application`}
                                    />
                                    {moduleNamesText.trim() && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            {moduleNamesText.split('\n').filter(s => s.trim()).length} module(s) defined
                                        </p>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Duration & Assessment */}
                    <div className="bs-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="w-4 h-4" style={{ color: 'var(--bs-teal)' }} />
                            <h2 className="text-sm font-semibold text-gray-900">Duration & Assessment</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Target Duration (min)</label>
                                <input type="number" className="bs-input" min={5} max={480} value={form.target_course_duration_minutes} onChange={(e) => update('target_course_duration_minutes', Number(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Slide Duration (sec)</label>
                                <input type="number" className="bs-input" min={30} max={600} value={form.target_slide_duration_sec} onChange={(e) => update('target_slide_duration_sec', Number(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Pass Percentage</label>
                                <input type="number" className="bs-input" min={50} max={100} value={form.pass_percentage} onChange={(e) => update('pass_percentage', Number(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Words Per Minute</label>
                                <input type="number" className="bs-input" min={100} max={200} value={form.words_per_minute} onChange={(e) => update('words_per_minute', Number(e.target.value))} />
                            </div>
                        </div>
                    </div>

                    {/* AI Features */}
                    <div className="bs-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="w-4 h-4" style={{ color: 'var(--bs-teal)' }} />
                            <h2 className="text-sm font-semibold text-gray-900">AI Features</h2>
                        </div>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                                <input type="checkbox" checked={form.include_standard_intro_slides} onChange={(e) => update('include_standard_intro_slides', e.target.checked)} className="rounded border-gray-300" />
                                <div>
                                    <span className="text-sm font-medium text-gray-900">Include intro slides</span>
                                    <p className="text-xs text-gray-500">Adds welcome, objectives, and overview slides</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                                <input type="checkbox" checked={form.generate_audio} onChange={(e) => update('generate_audio', e.target.checked)} className="rounded border-gray-300" />
                                <div>
                                    <span className="text-sm font-medium text-gray-900">Generate voiceover audio</span>
                                    <p className="text-xs text-gray-500">Uses AI TTS to create narration for each slide</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                                <input type="checkbox" checked={form.generate_images} onChange={(e) => update('generate_images', e.target.checked)} className="rounded border-gray-300" />
                                <div>
                                    <span className="text-sm font-medium text-gray-900">Generate slide images</span>
                                    <p className="text-xs text-gray-500">Uses AI to generate illustrations for key slides</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Sidebar summary */}
                <div>
                    <div className="bs-card p-6 sticky top-6">
                        <h2 className="text-sm font-semibold text-gray-900 mb-4">Generation Summary</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Total Slides</span><span className="font-semibold">{totalSlides}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Estimated Duration</span><span className="font-semibold">{estimatedDuration} min</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Structure</span><span className="font-semibold">{form.levels_count}L / {form.modules_per_level}M / {form.slides_per_module}S</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Pass Score</span><span className="font-semibold">{form.pass_percentage}%</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Audio</span><span className="font-semibold">{form.generate_audio ? 'Yes' : 'No'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Images</span><span className="font-semibold">{form.generate_images ? 'Yes' : 'No'}</span></div>
                            {useModuleNames && moduleNamesText.trim() && (
                                <div className="flex justify-between"><span className="text-gray-500">Custom Modules</span><span className="font-semibold">{moduleNamesText.split('\n').filter(s => s.trim()).length}</span></div>
                            )}
                        </div>

                        {form.course_title && (
                            <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(0,77,64,0.04)' }}>
                                <p className="text-xs text-gray-500 mb-1">Course Title</p>
                                <p className="text-sm font-medium text-gray-900">{form.course_title}</p>
                            </div>
                        )}

                        <hr className="my-5" />

                        <button
                            onClick={() => createJob.mutate()}
                            disabled={!form.course_title || !form.category || createJob.isPending}
                            className="btn-lime w-full justify-center disabled:opacity-50"
                        >
                            {createJob.isPending ? 'Starting...' : (
                                <><Sparkles className="w-4 h-4" /> Generate Course</>
                            )}
                        </button>

                        <p className="text-xs text-gray-400 text-center mt-3">
                            Generation may take several minutes depending on course size
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
