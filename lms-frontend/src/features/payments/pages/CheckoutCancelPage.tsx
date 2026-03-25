import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export function CheckoutCancelPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bs-off-white)' }}>
            <div className="bs-card p-10 max-w-md text-center">
                <div
                    className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
                    style={{ background: 'rgba(244,67,54,0.1)' }}
                >
                    <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                    Payment Cancelled
                </h1>
                <p className="text-sm text-gray-500 mb-6">
                    Your payment was not completed. No charges were made. You can try again anytime.
                </p>
                <div className="flex flex-col gap-3">
                    <Link to="/courses" className="btn-lime justify-center">Browse Courses</Link>
                    <Link to="/dashboard" className="btn-outline justify-center">Go to Dashboard</Link>
                </div>
            </div>
        </div>
    );
}
