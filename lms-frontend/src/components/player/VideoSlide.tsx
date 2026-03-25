import { useState, useRef } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';

interface VideoSlideProps {
    videoUrl?: string;
    title?: string;
    posterUrl?: string;
}

export function VideoSlide({
    videoUrl,
    title = 'Level 2 Food Hygiene and Safety for Catering',
    posterUrl,
}: VideoSlideProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(15);
    const [isMuted, setIsMuted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handlePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <div style={{ position: 'relative', background: '#1a3a2a', borderRadius: 16, overflow: 'hidden' }}>
            {/* Video Area */}
            <div
                onClick={handlePlayPause}
                style={{
                    position: 'relative', width: '100%', height: 420,
                    background: 'linear-gradient(135deg, rgba(0,77,64,0.85), rgba(26,58,42,0.9))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                }}
            >
                {videoUrl ? (
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        poster={posterUrl}
                        muted={isMuted}
                        onTimeUpdate={(e) => {
                            const v = e.currentTarget;
                            setProgress((v.currentTime / (v.duration || 1)) * 100);
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                    />
                ) : (
                    <div style={{
                        width: '100%', height: '100%',
                        background: 'linear-gradient(135deg, rgba(0,77,64,0.85), rgba(26,58,42,0.95))',
                    }} />
                )}

                {/* Play button overlay */}
                {!isPlaying && (
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                    }}>
                        <Play style={{ width: 32, height: 32, color: '#fff', fill: '#fff', marginLeft: 4 }} />
                    </div>
                )}

                {/* Progress bar */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: 4, background: 'rgba(255,255,255,0.2)',
                }}>
                    <div style={{
                        height: '100%', width: `${progress}%`,
                        background: '#00897b',
                        transition: 'width 0.1s',
                    }} />
                </div>
            </div>

            {/* Bottom Bar */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px', background: '#fff',
            }}>
                <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#212121' }}>{title}</div>
                    <div style={{ fontSize: 12, color: '#9e9e9e' }}>Slide 1: {title}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#424242' }}
                    >
                        {isMuted ? <VolumeX style={{ width: 20, height: 20 }} /> : <Volume2 style={{ width: 20, height: 20 }} />}
                    </button>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#424242' }}>1x</span>
                </div>
            </div>
        </div>
    );
}
