import { useState } from 'react';
import { Check, X, Info } from 'lucide-react';

interface ExerciseOption {
    id: string;
    text: string;
    isCorrect?: boolean;
}

interface ExerciseSlideProps {
    type: 'exercise' | 'assessment';
    question: string;
    instruction?: string;
    options: ExerciseOption[];
    maxSelections?: number;
    onAnswer?: (selectedIds: string[], allCorrect: boolean) => void;
}

export function ExerciseSlide({
    type = 'exercise',
    question = 'Which of the following falls within the role of an EHO?',
    instruction = 'Click to select an answer and click again to deselect it. Select the 3 answers you think are right and then use the \'Check Answer\' button to see if you are correct.',
    options = [
        { id: '1', text: 'Hold disciplinary meetings with staff', isCorrect: true },
        { id: '2', text: 'Enter food premises to carry out food safety inspections', isCorrect: true },
        { id: '3', text: 'Provide guidance and advice', isCorrect: true },
        { id: '4', text: 'Leave negative google reviews about the business and its staff', isCorrect: false },
        { id: '5', text: 'Investigate food poisoning outbreaks', isCorrect: false },
    ],
    maxSelections = 3,
    onAnswer,
}: ExerciseSlideProps) {
    const [selected, setSelected] = useState<string[]>([]);
    const [submitted, setSubmitted] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState('');

    const toggleOption = (id: string) => {
        if (submitted) return;
        setSelected((prev) => {
            if (prev.includes(id)) return prev.filter((s) => s !== id);
            if (prev.length >= maxSelections) return prev;
            return [...prev, id];
        });
    };

    const handleCheckAnswer = () => {
        setSubmitted(true);
        const allCorrect = selected.every((id) => options.find((o) => o.id === id)?.isCorrect) &&
            selected.length === options.filter((o) => o.isCorrect).length;

        if (!allCorrect) {
            setFeedbackMessage(
                'Employees have a responsibility to follow any safety measures in place but it is not their responsibility to implement a HACCP system. This is the duty of the employer.'
            );
        }

        onAnswer?.(selected, allCorrect);
    };

    return (
        <div style={{ padding: 32, background: '#fff', minHeight: 420 }}>
            {/* Feedback banner */}
            {submitted && feedbackMessage && (
                <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '14px 20px', marginBottom: 20,
                    background: '#fff8e1', borderRadius: 10, border: '1px solid #ffecb3',
                }}>
                    <Info style={{ width: 20, height: 20, color: '#f9a825', flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: 13, color: '#616161', lineHeight: 1.6 }}>{feedbackMessage}</p>
                    <button
                        onClick={() => setFeedbackMessage('')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9e9e9e', marginLeft: 'auto', flexShrink: 0, padding: 4 }}
                    >
                        <X style={{ width: 16, height: 16 }} />
                    </button>
                </div>
            )}

            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#212121', marginBottom: 8 }}>
                {type === 'exercise' ? 'Exercise' : 'Assessment'}
            </h2>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#035A51', marginBottom: 6 }}>{question}</p>
            <p style={{ fontSize: 13, color: '#757575', marginBottom: 24, lineHeight: 1.5 }}>{instruction}</p>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {options.map((option) => {
                    const isSelected = selected.includes(option.id);
                    const showCorrect = submitted && isSelected && option.isCorrect;
                    const showWrong = submitted && isSelected && !option.isCorrect;

                    return (
                        <button
                            key={option.id}
                            onClick={() => toggleOption(option.id)}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 20px', borderRadius: 10,
                                border: `1.5px solid ${showCorrect ? '#4caf50' : showWrong ? '#f44336' : isSelected ? '#035A51' : '#e0e0e0'}`,
                                background: showCorrect ? 'rgba(76,175,80,0.04)' : showWrong ? 'rgba(244,67,54,0.04)' : '#fff',
                                cursor: submitted ? 'default' : 'pointer',
                                textAlign: 'left' as const,
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <span style={{ fontSize: 14, fontWeight: 500, color: '#212121' }}>{option.text}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                {showCorrect && (
                                    <div style={{
                                        width: 24, height: 24, borderRadius: '50%',
                                        background: '#4caf50', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Check style={{ width: 14, height: 14, color: '#fff' }} />
                                    </div>
                                )}
                                {showWrong && (
                                    <div style={{
                                        width: 24, height: 24, borderRadius: '50%',
                                        background: '#f44336', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <X style={{ width: 14, height: 14, color: '#fff' }} />
                                    </div>
                                )}
                                <div style={{
                                    width: 22, height: 22, borderRadius: '50%',
                                    border: `2px solid ${isSelected ? '#035A51' : '#bdbdbd'}`,
                                    background: isSelected ? '#035A51' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.15s ease',
                                }}>
                                    {isSelected && (
                                        <div style={{
                                            width: 8, height: 8, borderRadius: '50%', background: '#fff',
                                        }} />
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {!submitted && (
                <button
                    onClick={handleCheckAnswer}
                    disabled={selected.length === 0}
                    className="btn-lime"
                    style={{ opacity: selected.length === 0 ? 0.5 : 1 }}
                >
                    Check Answer
                </button>
            )}
        </div>
    );
}
