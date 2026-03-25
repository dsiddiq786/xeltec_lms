import { Star, ArrowRight } from 'lucide-react';

interface CourseCardProps {
    title: string;
    description?: string;
    price: number;
    rating: number;
    reviewCount: number;
    level?: string;
    certifications?: string[];
    imageUrl?: string | null;
    variant?: 'vertical' | 'horizontal';
    onViewCourse?: () => void;
}

export function CourseCard({
    title,
    description,
    price,
    rating,
    reviewCount,
    level: _level,
    certifications = ['EHO', 'CPD', 'IoH', 'RoSPA', 'City & Guilds'],
    imageUrl,
    variant = 'vertical',
    onViewCourse,
}: CourseCardProps) {
    if (variant === 'horizontal') {
        return (
            <div className="bs-card overflow-hidden flex group cursor-pointer" onClick={onViewCourse}>
                <div
                    className="w-[280px] flex-shrink-0 relative overflow-hidden"
                    style={{ background: imageUrl ? undefined : 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' }}
                >
                    {imageUrl ? (
                        <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                            <span className="text-5xl opacity-20">📚</span>
                        </div>
                    )}
                </div>
                <div className="flex-1 p-5 flex flex-col">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {certifications.map((cert) => (
                            <span key={cert} className="px-2.5 py-1 text-[11px] font-semibold rounded-full" style={{ background: 'rgba(203,255,42,0.15)', color: '#035A51' }}>
                                {cert}
                            </span>
                        ))}
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-[#035A51] transition-colors">{title}</h3>
                    {description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{description}</p>}
                    <div className="flex items-center gap-1 mt-auto mb-3">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-semibold text-gray-900">{rating}</span>
                        <span className="text-sm text-gray-400">({reviewCount} Reviews)</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-lg font-bold" style={{ color: '#035A51' }}>${price}</span>
                        <button onClick={(e) => { e.stopPropagation(); onViewCourse?.(); }} className="btn-lime !py-2 !px-5 !text-sm">
                            View Course <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bs-card overflow-hidden group cursor-pointer" onClick={onViewCourse}>
            <div
                className="h-44 relative overflow-hidden"
                style={{ background: imageUrl ? undefined : 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)' }}
            >
                {imageUrl ? (
                    <img src={imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-5xl opacity-15">📚</span>
                    </div>
                )}
            </div>
            <div className="p-5">
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {certifications.map((cert) => (
                        <span key={cert} className="px-2.5 py-1 text-[11px] font-semibold rounded-full" style={{ background: 'rgba(203,255,42,0.15)', color: '#035A51' }}>
                            {cert}
                        </span>
                    ))}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-base group-hover:text-[#035A51] transition-colors">
                    {title}
                </h3>
                <div className="flex items-center gap-1 mb-3">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-semibold text-gray-900">{rating}</span>
                    <span className="text-xs text-gray-400">({reviewCount} Reviews)</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-lg font-bold" style={{ color: '#035A51' }}>${price}</span>
                    <button onClick={(e) => { e.stopPropagation(); onViewCourse?.(); }} className="btn-lime !py-2 !px-4 !text-xs">
                        View Course <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}
