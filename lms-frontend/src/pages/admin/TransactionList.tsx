import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../lib/api';


export function TransactionList() {
    const { data: transactions, isLoading } = useQuery<any[]>({
        queryKey: ['admin-transactions'],
        queryFn: async () => {
            const { data } = await api.get('/payments/transactions?limit=100');
            return Array.isArray(data) ? data : data?.data ?? [];
        },
    });

    const statusBadge = (status: string) => {
        switch (status) {
            case 'SUCCESS': return 'badge-success';
            case 'FAILED': return 'badge-danger';
            default: return 'badge-warning';
        }
    };

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
                <p className="text-sm text-gray-500 mt-1">Payment history</p>
            </div>

            <div className="bs-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr style={{ background: 'var(--bs-gray-50)' }}>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">User</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Amount</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading
                            ? Array.from({ length: 4 }).map((_, i) => (
                                <tr key={i} style={{ borderTop: '1px solid var(--bs-gray-100)' }}>
                                    <td className="px-5 py-4"><div className="w-40 h-5 bg-gray-100 rounded animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-16 h-5 bg-gray-100 rounded animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-20 h-5 bg-gray-100 rounded-full animate-pulse" /></td>
                                    <td className="px-5 py-4"><div className="w-24 h-5 bg-gray-100 rounded animate-pulse" /></td>
                                </tr>
                            ))
                            : transactions?.map((tx: any, index: number) => (
                                <motion.tr
                                    key={tx.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="hover:bg-gray-50/50 transition-colors"
                                    style={{ borderTop: '1px solid var(--bs-gray-100)' }}
                                >
                                    <td className="px-5 py-4 text-sm text-gray-900">{tx.user?.email || '—'}</td>
                                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">${(tx.amount / 100).toFixed(2)}</td>
                                    <td className="px-5 py-4"><span className={statusBadge(tx.status)}>{tx.status}</span></td>
                                    <td className="px-5 py-4 text-sm text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</td>
                                </motion.tr>
                            ))}
                    </tbody>
                </table>

                {!isLoading && transactions?.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-gray-500">No transactions found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
