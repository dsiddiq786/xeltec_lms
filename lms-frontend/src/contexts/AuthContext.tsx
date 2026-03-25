import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import api from '../lib/api';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    initialCheckDone: boolean;
    login: (email: string, password: string) => Promise<User>;
    adminLogin: (email: string, password: string) => Promise<User>;
    register: (data: RegisterData) => Promise<{ user: User; requiresVerification: boolean }>;
    registerBusiness: (data: BusinessRegisterData) => Promise<{ user: User; requiresVerification: boolean }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
}

interface RegisterData {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
}

interface BusinessRegisterData {
    email: string;
    password: string;
    phone?: string;
    company_name: string;
    number_of_employees?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [initialCheckDone, setInitialCheckDone] = useState(false);

    const fetchMe = useCallback(async () => {
        try {
            const { data } = await api.get('/auth/me');
            setUser(data);
            return data;
        } catch {
            setUser(null);
            return null;
        }
    }, []);

    useEffect(() => {
        fetchMe().finally(() => {
            setIsLoading(false);
            setInitialCheckDone(true);
        });
    }, [fetchMe]);

    const login = async (email: string, password: string): Promise<User> => {
        const { data } = await api.post('/auth/login', { email, password });
        setUser(data.user);
        return data.user;
    };

    const adminLogin = async (email: string, password: string): Promise<User> => {
        const { data } = await api.post('/auth/admin/login', { email, password });
        setUser(data.user);
        return data.user;
    };

    const register = async (registerData: RegisterData) => {
        const { data } = await api.post('/auth/register', registerData);
        return { user: data.user, requiresVerification: true };
    };

    const registerBusiness = async (registerData: BusinessRegisterData) => {
        const { data } = await api.post('/auth/register-business', registerData);
        return { user: data.user, requiresVerification: true };
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch { /* ignore */ }
        setUser(null);
    };

    const refreshUser = async () => {
        await fetchMe();
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                initialCheckDone,
                login,
                adminLogin,
                register,
                registerBusiness,
                logout,
                refreshUser,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
