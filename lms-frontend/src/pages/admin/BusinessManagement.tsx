import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Building2 } from 'lucide-react';

export function BusinessManagement() {
    const queryClient = useQueryClient();

    const { data: businesses, isLoading } = useQuery<any[]>({
        queryKey: ['admin-businesses'],
        queryFn: async () => {
            const { data } = await api.get('/businesses?limit=100');
            return Array.isArray(data) ? data : data?.data ?? [];
        },
    });

    const seatMut = useMutation({
        mutationFn: async ({ id, seats }: { id: string; seats: number }) =>
            api.patch(`/businesses/${id}/seats`, { new_seat_count: seats }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
            toast.success('Seats updated');
        },
    });

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Business Management</h1>
                <p className="text-sm text-gray-500 mt-1">Manage business accounts and seats</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bs-card p-5">
                            <div className="w-32 h-6 bg-gray-100 rounded animate-pulse mb-3" />
                            <div className="w-full h-4 bg-gray-100 rounded-full animate-pulse" />
                        </div>
                    ))
                    : businesses?.map((biz: any, index: number) => {
                        const usedSeats = biz._count?.employees ?? biz.employees?.length ?? 0;
                        const totalSeats = biz.seat_count ?? 0;
                        const pct = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;

                        return (
                            <motion.div
                                key={biz.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bs-card p-5"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,77,64,0.1)' }}>
                                            <Building2 className="w-5 h-5" style={{ color: 'var(--bs-teal)' }} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{biz.name}</h3>
                                            <span className={biz.subscription_status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}>
                                                {biz.subscription_status || 'ACTIVE'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Seat usage */}
                                <div className="mb-3">
                                    <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-gray-500">Seats</span>
                                        <span className="font-medium text-gray-900">{usedSeats} / {totalSeats}</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${pct}%`,
                                                background: pct > 85 ? 'var(--bs-danger)' : 'var(--bs-teal)',
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Override seats */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={usedSeats}
                                        defaultValue={totalSeats}
                                        className="bs-input !py-2 !text-sm w-24"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                seatMut.mutate({ id: biz.id, seats: Number((e.target as HTMLInputElement).value) });
                                            }
                                        }}
                                    />
                                    <span className="text-xs text-gray-400">Press Enter to update</span>
                                </div>
                            </motion.div>
                        );
                    })}
            </div>

            {!isLoading && businesses?.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-gray-500">No businesses found</p>
                </div>
            )}
        </div>
    );
}
