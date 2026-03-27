import { useState, useMemo, type ReactNode } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';

export interface Column<T = any> {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (row: T, index: number) => ReactNode;
    className?: string;
    headerClassName?: string;
    getValue?: (row: T) => string | number;
}

export interface FilterOption {
    key: string;
    label: string;
    options: { value: string; label: string }[];
}

interface DataTableProps<T = any> {
    data: T[];
    columns: Column<T>[];
    isLoading?: boolean;
    searchKeys?: string[];
    searchPlaceholder?: string;
    filters?: FilterOption[];
    pageSize?: number;
    emptyMessage?: string;
    emptyAction?: ReactNode;
    rowKey?: (row: T) => string;
    onRowClick?: (row: T) => void;
    rowClassName?: string;
}

type SortDir = 'asc' | 'desc' | null;

function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function DataTable<T extends Record<string, any>>({
    data,
    columns,
    isLoading = false,
    searchKeys = [],
    searchPlaceholder = 'Search...',
    filters = [],
    pageSize = 10,
    emptyMessage = 'No data found',
    emptyAction,
    rowKey,
    onRowClick,
    rowClassName,
}: DataTableProps<T>) {
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>(null);
    const [page, setPage] = useState(1);
    const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
    const [showFilters, setShowFilters] = useState(false);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            if (sortDir === 'asc') setSortDir('desc');
            else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
            else setSortDir('asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
        setPage(1);
    };

    const filtered = useMemo(() => {
        let result = [...data];

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter((row) =>
                searchKeys.some((key) => {
                    const val = getNestedValue(row, key);
                    return val != null && String(val).toLowerCase().includes(q);
                })
            );
        }

        for (const [key, value] of Object.entries(activeFilters)) {
            if (value) {
                result = result.filter((row) => String(getNestedValue(row, key)) === value);
            }
        }

        if (sortKey && sortDir) {
            const col = columns.find((c) => c.key === sortKey);
            result.sort((a, b) => {
                const aVal = col?.getValue ? col.getValue(a) : getNestedValue(a, sortKey);
                const bVal = col?.getValue ? col.getValue(b) : getNestedValue(b, sortKey);
                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return 1;
                if (bVal == null) return -1;
                const cmp = typeof aVal === 'number' && typeof bVal === 'number'
                    ? aVal - bVal
                    : String(aVal).localeCompare(String(bVal));
                return sortDir === 'asc' ? cmp : -cmp;
            });
        }

        return result;
    }, [data, search, searchKeys, activeFilters, sortKey, sortDir, columns]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    const hasActiveFilters = Object.values(activeFilters).some(Boolean);

    return (
        <div className="bs-card overflow-hidden">
            {/* Toolbar */}
            <div className="px-5 py-3 flex items-center gap-3 border-b border-gray-100 flex-wrap" style={{ background: 'var(--bs-gray-50)' }}>
                {searchKeys.length > 0 && (
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder={searchPlaceholder}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[var(--bs-teal)] bg-white"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}

                {filters.length > 0 && (
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg transition-colors ${
                            hasActiveFilters
                                ? 'border-[var(--bs-teal)] text-[var(--bs-teal)] bg-[var(--bs-teal)]/5'
                                : 'border-gray-200 text-gray-500 hover:bg-white'
                        }`}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        Filters{hasActiveFilters && ` (${Object.values(activeFilters).filter(Boolean).length})`}
                    </button>
                )}

                <div className="ml-auto text-xs text-gray-400">
                    {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Active filters */}
            {showFilters && filters.length > 0 && (
                <div className="px-5 py-3 flex items-center gap-3 border-b border-gray-100 flex-wrap bg-white">
                    {filters.map((f) => (
                        <select
                            key={f.key}
                            value={activeFilters[f.key] || ''}
                            onChange={(e) => {
                                setActiveFilters((prev) => ({ ...prev, [f.key]: e.target.value }));
                                setPage(1);
                            }}
                            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-[var(--bs-teal)] bg-white"
                        >
                            <option value="">{f.label}: All</option>
                            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    ))}
                    {hasActiveFilters && (
                        <button
                            onClick={() => { setActiveFilters({}); setPage(1); }}
                            className="text-xs text-red-500 hover:text-red-700"
                        >
                            Clear all
                        </button>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-100" style={{ background: 'var(--bs-gray-50)' }}>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 ${col.headerClassName || ''} ${col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''}`}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        {col.label}
                                        {col.sortable && (
                                            sortKey === col.key
                                                ? sortDir === 'asc'
                                                    ? <ChevronUp className="w-3.5 h-3.5 text-[var(--bs-teal)]" />
                                                    : <ChevronDown className="w-3.5 h-3.5 text-[var(--bs-teal)]" />
                                                : <ChevronsUpDown className="w-3 h-3 text-gray-300" />
                                        )}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading
                            ? Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
                                <tr key={i} className="border-b border-gray-50">
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-5 py-4">
                                            <div className="h-5 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                            : paginated.map((row, index) => {
                                const key = rowKey ? rowKey(row) : (row.id || index);
                                return (
                                    <tr
                                        key={key}
                                        onClick={() => onRowClick?.(row)}
                                        className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName || ''}`}
                                    >
                                        {columns.map((col) => (
                                            <td key={col.key} className={`px-5 py-4 ${col.className || ''}`}>
                                                {col.render
                                                    ? col.render(row, (safePage - 1) * pageSize + index)
                                                    : <span className="text-sm text-gray-700">{getNestedValue(row, col.key) ?? '—'}</span>
                                                }
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>

            {/* Empty state */}
            {!isLoading && filtered.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-sm text-gray-400 mb-4">{emptyMessage}</p>
                    {emptyAction}
                </div>
            )}

            {/* Pagination */}
            {!isLoading && filtered.length > pageSize && (
                <div className="px-5 py-3 flex items-center justify-between border-t border-gray-100" style={{ background: 'var(--bs-gray-50)' }}>
                    <span className="text-xs text-gray-400">
                        Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={safePage <= 1}
                            onClick={() => setPage(safePage - 1)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                            .reduce<(number | 'dots')[]>((acc, p, i, arr) => {
                                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('dots');
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((item, i) =>
                                item === 'dots' ? (
                                    <span key={`dots-${i}`} className="px-1 text-xs text-gray-300">...</span>
                                ) : (
                                    <button
                                        key={item}
                                        onClick={() => setPage(item as number)}
                                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                                            safePage === item
                                                ? 'text-white'
                                                : 'text-gray-500 hover:bg-gray-100'
                                        }`}
                                        style={safePage === item ? { background: 'var(--bs-teal)' } : {}}
                                    >
                                        {item}
                                    </button>
                                )
                            )}
                        <button
                            disabled={safePage >= totalPages}
                            onClick={() => setPage(safePage + 1)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
