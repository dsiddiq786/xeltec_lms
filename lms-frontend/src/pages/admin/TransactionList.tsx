import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type Column, type FilterOption } from '../../components/shared/DataTable';
import api from '../../lib/api';

const filters: FilterOption[] = [
    {
        key: 'status',
        label: 'Status',
        options: [
            { value: 'SUCCESS', label: 'Success' },
            { value: 'FAILED', label: 'Failed' },
            { value: 'PENDING', label: 'Pending' },
        ],
    },
];

function statusBadgeClass(status: string) {
    switch (status) {
        case 'SUCCESS':
            return 'badge-success';
        case 'FAILED':
            return 'badge-danger';
        default:
            return 'badge-warning';
    }
}

export function TransactionList() {
    const { data: transactions, isLoading } = useQuery<any[]>({
        queryKey: ['admin-transactions'],
        queryFn: async () => {
            const { data } = await api.get('/payments/transactions?limit=100');
            return Array.isArray(data) ? data : data?.data ?? [];
        },
    });

    const columns: Column<any>[] = useMemo(
        () => [
            {
                key: 'user.email',
                label: 'User',
                sortable: true,
                render: (tx) => (
                    <span className="text-sm text-gray-900">{tx.user?.email || '—'}</span>
                ),
            },
            {
                key: 'amount',
                label: 'Amount',
                sortable: true,
                getValue: (tx) => tx.amount ?? 0,
                render: (tx) => (
                    <span className="text-sm font-semibold text-gray-900">
                        ${((tx.amount ?? 0) / 100).toFixed(2)}
                    </span>
                ),
            },
            {
                key: 'status',
                label: 'Status',
                sortable: true,
                render: (tx) => (
                    <span className={statusBadgeClass(tx.status)}>{tx.status}</span>
                ),
            },
            {
                key: 'created_at',
                label: 'Date',
                sortable: true,
                getValue: (tx) => new Date(tx.created_at).getTime(),
                render: (tx) => (
                    <span className="text-sm text-gray-500">
                        {new Date(tx.created_at).toLocaleDateString()}
                    </span>
                ),
            },
        ],
        [],
    );

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
                <p className="text-sm text-gray-500 mt-1">Payment history</p>
            </div>

            <DataTable
                data={transactions || []}
                columns={columns}
                isLoading={isLoading}
                searchKeys={['user.email']}
                searchPlaceholder="Search by user email..."
                filters={filters}
                pageSize={10}
                emptyMessage="No transactions found"
            />
        </div>
    );
}
