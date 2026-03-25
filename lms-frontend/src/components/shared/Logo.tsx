import { Link } from 'react-router-dom';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg';
    linkTo?: string;
    className?: string;
    variant?: 'dark' | 'light';
}

export function Logo({ size = 'md', linkTo = '/', className = '', variant = 'dark' }: LogoProps) {
    const sizes = {
        sm: { icon: 28, text: 15, svg: 16 },
        md: { icon: 36, text: 18, svg: 20 },
        lg: { icon: 44, text: 22, svg: 24 },
    };

    const s = sizes[size];
    const textColor = variant === 'light' ? '#ffffff' : '#1a1f25';

    const content = (
        <span className={`inline-flex items-center gap-2.5 ${className}`}>
            <span
                style={{
                    width: s.icon,
                    height: s.icon,
                    borderRadius: s.icon * 0.22,
                    background: '#0a2e24',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <svg width={s.svg} height={s.svg} viewBox="0 0 24 24" fill="none">
                    <path d="M6 3L6 21L12 17L12 11L18 7L12 11L12 3L6 3Z" fill="#CBFF2A" />
                    <path d="M12 11L12 17L18 13L18 7L12 11Z" fill="#CBFF2A" opacity="0.7" />
                </svg>
            </span>
            <span style={{ fontSize: s.text, fontWeight: 700, color: textColor, letterSpacing: '-0.02em' }}>
                brick<span style={{ fontWeight: 800 }}>Skill</span>
            </span>
        </span>
    );

    if (linkTo) {
        return (
            <Link to={linkTo} className="no-underline hover:opacity-90 transition-opacity">
                {content}
            </Link>
        );
    }

    return content;
}
