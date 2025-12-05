import apiClient from './client';

export interface SuperAdminStats {
    total_companies: number;
    total_users: number;
    total_documents: number;
    total_questions: number;
    recent_activity: {
        type: string;
        content: string;
        created_at: string;
    }[];
}

export interface CompanyAdminStats {
    total_documents: number;
    total_faqs: number;
    total_questions: number;
    avg_questions_per_session: number;
    recent_activity?: {
        type: string;
        content: string;
        created_at: string;
    }[];
    top_products?: {
        product_name: string;
        product_id: string;
        count: number;
    }[];
    daily_queries?: {
        date: string;
        count: number;
    }[];
}

export const getSuperAdminStats = async (): Promise<SuperAdminStats> => {
    const response = await apiClient.get('/api/dashboard/super-admin/stats');
    return response.data;
};

export const getCompanyAdminStats = async (days: number = 7): Promise<CompanyAdminStats> => {
    const response = await apiClient.get('/api/dashboard/company-admin/stats', {params: {days}});
    return response.data;
};
