// ============================================================================
// BusinessHub Enterprise - Pagination Component
// Clean, accessible pagination controls with page indicators
// ============================================================================

import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
  onPageChange: (newPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalRecords,
  limit,
  onPageChange,
}) => {
  const startRecord = totalRecords === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, totalRecords);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        fontSize: '0.875rem',
        color: '#64748b',
      }}
    >
      <div>
        Showing <span style={{ fontWeight: 600, color: '#1e293b' }}>{startRecord}</span> to{' '}
        <span style={{ fontWeight: 600, color: '#1e293b' }}>{endRecord}</span> of{' '}
        <span style={{ fontWeight: 600, color: '#1e293b' }}>{totalRecords}</span> records
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            backgroundColor: page <= 1 ? '#f8fafc' : '#ffffff',
            color: page <= 1 ? '#94a3b8' : '#334155',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            fontSize: '0.8125rem',
          }}
        >
          Previous
        </button>

        <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontWeight: 600, color: '#0f172a' }}>
          {page} / {totalPages}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            backgroundColor: page >= totalPages ? '#f8fafc' : '#ffffff',
            color: page >= totalPages ? '#94a3b8' : '#334155',
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            fontSize: '0.8125rem',
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};
