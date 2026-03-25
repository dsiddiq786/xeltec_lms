import { Construction } from 'lucide-react';

interface PagePlaceholderProps {
    title: string;
    description?: string;
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
            <div className="bs-card p-12 max-w-md text-center">
                <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                    style={{ background: 'var(--bs-lime-muted)' }}
                >
                    <Construction className="w-8 h-8" style={{ color: 'var(--bs-teal)' }} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
                <p className="text-sm text-gray-500">
                    {description || 'This page is under construction and will be available soon.'}
                </p>
            </div>
        </div>
    );
}
