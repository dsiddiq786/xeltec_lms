/*
 * FAQSection — Accordion FAQ matching PDF design.
 * Used on: Homepage, Catalog page, Course Detail page.
 * PDF reference: Pages 1-3 show identical FAQ section.
 */

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const DEFAULT_FAQS = [
    {
        question: 'How do I enroll in a course?',
        answer: 'Simply browse our course catalog, select the course you want, and click "Add to Cart" or "Enroll Now". Complete the checkout process and you\'ll have instant access to your course.',
    },
    {
        question: 'How long do I have access to a course?',
        answer: 'Once enrolled, you have lifetime access to the course materials. You can revisit and review the content as many times as you need.',
    },
    {
        question: 'What payment methods are accepted?',
        answer: 'We accept all major credit and debit cards including Visa, Mastercard, and American Express. We also support PayPal for your convenience.',
    },
    {
        question: 'Will I receive a certificate after completing a course?',
        answer: 'Many websites offer a Certificate of Completion for paid courses. Free courses may or may not include a certificate, depending on the platform\'s policies.',
    },
    {
        question: 'What is the purpose of this DreamLMS?',
        answer: 'Our platform is designed to help organizations, educators, and learners manage, deliver, and track learning and training activities effectively.',
    },
    {
        question: 'What can I do with my certificate?',
        answer: 'Your certificate can be shared on LinkedIn, added to your resume, or presented to employers as proof of your skills and knowledge.',
    },
];

interface FAQSectionProps {
    faqs?: { question: string; answer: string }[];
}

export function FAQSection({ faqs = DEFAULT_FAQS }: FAQSectionProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(3); // PDF shows 4th one open

    return (
        <section className="py-16">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                    Frequently <span style={{ color: 'var(--bs-teal)' }}>Asked</span> Questions
                </h2>
                <p className="text-sm text-gray-500 text-center mb-10">
                    Explore detailed answers to the most common questions about our platform
                </p>

                <div className="space-y-3">
                    {faqs.map((faq, index) => {
                        const isOpen = openIndex === index;
                        return (
                            <div
                                key={index}
                                className="border border-gray-200 rounded-xl overflow-hidden transition-all"
                                style={isOpen ? { borderColor: 'var(--bs-teal)', background: '#fafffe' } : {}}
                            >
                                <button
                                    onClick={() => setOpenIndex(isOpen ? null : index)}
                                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                                >
                                    <span className={`text-sm font-medium ${isOpen ? 'text-[var(--bs-teal)]' : 'text-gray-900'}`}>
                                        {faq.question}
                                    </span>
                                    <ChevronDown
                                        className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[var(--bs-teal)]' : 'text-gray-400'}`}
                                    />
                                </button>
                                {isOpen && (
                                    <div className="px-5 pb-4">
                                        <p className="text-sm text-gray-500 leading-relaxed">{faq.answer}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
