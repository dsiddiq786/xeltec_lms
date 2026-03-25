import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export function CheckoutPage() {
    const navigate = useNavigate();

    useEffect(() => {
        navigate('/courses', { replace: true });
    }, [navigate]);

    return null;
}
