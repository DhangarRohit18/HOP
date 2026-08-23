import React from 'react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-nexus-blue-60 border border-nexus-blue-20 rounded-[8px] bg-nexus-white">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[8px] border border-nexus-blue-20 bg-nexus-white">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-nexus-blue-06 text-xs font-bold text-nexus-blue uppercase tracking-wider border-b border-nexus-blue-20">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={`px-4 py-3.5 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#DDD5EA] bg-nexus-white">
          {data.map((row, rowIdx) => (
            <tr
              key={keyExtractor(row)}
              className={`${rowIdx % 2 === 1 ? 'bg-nexus-white' : 'bg-nexus-white'} hover:bg-nexus-blue-06 transition-colors`}
            >
              {columns.map((col, idx) => {
                const value =
                  typeof col.accessor === 'function'
                    ? col.accessor(row)
                    : (row[col.accessor] as React.ReactNode);
                return (
                  <td key={idx} className={`px-4 py-3.5 text-nexus-blue ${col.className || ''}`}>
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
