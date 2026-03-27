export interface User {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    role: 'INDIVIDUAL' | 'BUSINESS_ADMIN' | 'EMPLOYEE' | 'ADMIN';
    is_active: boolean;
    email_verified?: boolean;
    created_at: string;
}

export interface AuthResponse {
    user: User;
    expires_in: number;
}

export interface Course {
    id: string;
    title: string;
    description?: string;
    base_price: string;
    seat_price?: string;
    is_published: boolean;
    published_at?: string;
    created_at: string;
    thumbnail_url?: string;
    category?: string;
    difficulty_level?: string;
    source_type?: string;
    source_draft_id?: string;
    versions?: CourseVersion[];
}

export interface CourseVersion {
    id: string;
    course_id: string;
    version_number: number;
    content_snapshot: any;
    created_at: string;
    course?: { title: string; id: string };
}

export interface Enrollment {
    id: string;
    user_id: string;
    course_version_id: string;
    status: 'IN_PROGRESS' | 'COMPLETED';
    strict_mode: boolean;
    created_at: string;
    course_version?: CourseVersion;
    progress?: Progress;
    certificate?: Certificate;
}

export interface Progress {
    id: string;
    enrollment_id: string;
    level_index: number;
    module_index: number;
    slide_index: number;
    progress_percentage: number;
    last_accessed_at: string;
}

export interface AssessmentAttempt {
    id: string;
    enrollment_id: string;
    score: number;
    passed: boolean;
    attempt_number: number;
    created_at: string;
}

export interface Certificate {
    id: string;
    enrollment_id: string;
    certificate_number: string;
    issued_at: string;
}

export interface Business {
    id: string;
    name: string;
    subscription_status: string;
    billing_cycle: 'MONTHLY' | 'YEARLY';
    seats_total: number;
    seats_used: number;
    is_active: boolean;
    created_at: string;
    employees?: Employee[];
}

export interface Employee {
    id: string;
    business_id: string;
    user_id: string;
    status: 'INVITED' | 'ACTIVE' | 'DEACTIVATED';
    user?: { id: string; email: string; is_active: boolean };
}

export interface Transaction {
    id: string;
    user_id?: string;
    business_id?: string;
    stripe_session_id?: string;
    stripe_event_id: string;
    amount: string;
    status: string;
    created_at: string;
    user?: { id: string; email: string };
    business?: { id: string; name: string };
}

export interface FeatureFlag {
    key: string;
    enabled: boolean;
}

export interface DashboardStats {
    total_users: number;
    total_businesses: number;
    active_enrollments: number;
    completed_courses: number;
    total_revenue: number;
    active_subscriptions: number;
    total_courses: number;
    published_courses: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}
