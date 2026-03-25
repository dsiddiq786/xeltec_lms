import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export function CheckoutSuccessPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bs-off-white)' }}>
            <div className="bs-card p-10 max-w-md text-center">
                <div
                    className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
                    style={{ background: 'rgba(76,175,80,0.1)' }}
                >
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                    Payment Successful!
                </h1>
                <p className="text-sm text-gray-500 mb-6">
                    Thank you for your purchase. You are now enrolled in the course and can start learning immediately.
                </p>
                <div className="flex flex-col gap-3">
                    <Link to="/dashboard" className="btn-lime justify-center">Go to My Learning</Link>
                    <Link to="/courses" className="btn-outline justify-center">Browse More Courses</Link>
                </div>
            </div>
        </div>
    );
}
