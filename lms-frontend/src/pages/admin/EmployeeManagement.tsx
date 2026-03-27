import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type Column, type FilterOption } from '../../components/shared/DataTable';
import api from '../../lib/api';
import { Users, Building2 } from 'lucide-react';

const filters: FilterOption[] = [
    {
        key: 'status',
        label: 'Status',
        options: [
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INVITED', label: 'Invited' },
            { value: 'DEACTIVATED', label: 'Deactivated' },
        ],
    },
];

export function EmployeeManagement() {
    const { data: businesses, isLoading } = useQuery<any[]>({
        queryKey: ['admin-businesses'],
        queryFn: async () => {
            const { data } = await api.get('/businesses?limit=100');
            return Array.isArray(data) ? data : data?.data ?? [];
        },
    });

    const allEmployees = (businesses || []).flatMap((biz: any) =>
        (biz.employees || []).map((emp: any) => ({
            ...emp,
            business_name: biz.name,
            business_id: biz.id,
        })),
    );

    const columns: Column<any>[] = useMemo(
        () => [
            {
                key: 'user.email',
                label: 'Employee',
                sortable: true,
                render: (emp) => (
                    <div className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: 'var(--bs-gray-100)', color: 'var(--bs-gray-600)' }}
                        >
                            {emp.user?.first_name?.[0] ||
                                emp.user?.email?.[0]?.toUpperCase() ||
                                '?'}
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-900">
                                {emp.user?.first_name
                                    ? `${emp.user.first_name} ${emp.user.last_name ?? ''}`.trim()
                                    : '—'}
                            </div>
                            <div className="text-xs text-gray-400">{emp.user?.email}</div>
                        </div>
                    </div>
                ),
            },
            {
                key: 'business_name',
                label: 'Business',
                sortable: true,
                render: (emp) => (
                    <span className="text-sm text-gray-600">{emp.business_name}</span>
                ),
            },
            {
                key: 'status',
                label: 'Status',
                sortable: true,
                render: (emp) => (
                    <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            emp.status === 'ACTIVE'
                                ? 'bg-green-50 text-green-700'
                                : emp.status === 'INVITED'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-gray-100 text-gray-500'
                        }`}
                    >
                        {emp.status}
                    </span>
                ),
            },
            {
                key: 'created_at',
                label: 'Joined',
                sortable: true,
                getValue: (emp) => new Date(emp.created_at).getTime(),
                render: (emp) => (
                    <span className="text-sm text-gray-500">
                        {new Date(emp.created_at).toLocaleDateString()}
                    </span>
                ),
            },
        ],
        [],
    );

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
                <p className="text-sm text-gray-500 mt-1">All employees across businesses</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                    {
                        label: 'Total Employees',
                        value: allEmployees.length,
                        icon: Users,
                        color: '#035A51',
                    },
                    {
                        label: 'Active',
                        value: allEmployees.filter((e) => e.status === 'ACTIVE').length,
                        icon: Users,
                        color: '#1565c0',
                    },
                    {
                        label: 'Invited',
                        value: allEmployees.filter((e) => e.status === 'INVITED').length,
                        icon: Users,
                        color: '#e65100',
                    },
                    {
                        label: 'Businesses',
                        value: businesses?.length || 0,
                        icon: Building2,
                        color: '#6a1b9a',
                    },
                ].map((stat) => (
                    <div key={stat.label} className="bs-card p-4 flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ background: `${stat.color}15` }}
                        >
                            <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                        </div>
                        <div>
                            <div className="text-[11px] text-gray-500">{stat.label}</div>
                            <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            <DataTable
                data={allEmployees}
                columns={columns}
                isLoading={isLoading}
                searchKeys={['user.email', 'user.first_name', 'business_name']}
                searchPlaceholder="Search employees..."
                filters={filters}
                pageSize={10}
                emptyMessage="No employees found."
            />
        </div>
    );
}
