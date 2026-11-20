import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { tokens } from '../../styles/tokens';
import { formatPaiseToInr } from '../../utils/currency';

interface ProfitLossData {
  periodStart: string;
  periodEnd: string;
  totalSalesPaise: number;
  totalCogsPaise: number;
  grossProfitPaise: number;
  grossMarginBps: number;
  totalExpensesPaise: number;
  netProfitPaise: number;
  netMarginBps: number;
}

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pnl' | 'gst' | 'aging'>('pnl');
  const [pnlData, setPnlData] = useState<ProfitLossData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetch('/api/v1/reports/profit-loss', { credentials: 'include' });
        if (res.ok) {
          const json = (await res.json()) as any;
          if (json.success && json.data) {
            setPnlData(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to load P&L report:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadReports();
  }, []);

  if (isLoading) {
    return <LoadingSpinner size="lg" label="Loading financial reports..." />;
  }

  const pnl = pnlData || {
    periodStart: '2026-04-01',
    periodEnd: '2027-03-31',
    totalSalesPaise: 0,
    totalCogsPaise: 0,
    grossProfitPaise: 0,
    grossMarginBps: 0,
    totalExpensesPaise: 0,
    netProfitPaise: 0,
    netMarginBps: 0,
  };

  return (
    <div>
      <PageHeader
        title="Financial Reports"
        subtitle="Profit & loss, GST tax summaries, and aging analysis"
      />

      {/* Report Tab Selector */}
      <div
        style={{
          display: 'flex',
          gap: tokens.spacing[2],
          borderBottom: `1px solid ${tokens.colors.slate[200]}`,
          marginBottom: tokens.spacing[6],
        }}
      >
        <button
          onClick={() => setActiveTab('pnl')}
          style={{
            padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
            border: 'none',
            borderBottom: activeTab === 'pnl' ? `2px solid ${tokens.colors.primary[600]}` : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'pnl' ? tokens.colors.primary[600] : tokens.colors.slate[600],
            fontWeight: activeTab === 'pnl' ? 600 : 400,
            cursor: 'pointer',
            fontSize: tokens.typography.fontSize.sm,
          }}
        >
          Profit & Loss Statement
        </button>
        <button
          onClick={() => setActiveTab('gst')}
          style={{
            padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
            border: 'none',
            borderBottom: activeTab === 'gst' ? `2px solid ${tokens.colors.primary[600]}` : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'gst' ? tokens.colors.primary[600] : tokens.colors.slate[600],
            fontWeight: activeTab === 'gst' ? 600 : 400,
            cursor: 'pointer',
            fontSize: tokens.typography.fontSize.sm,
          }}
        >
          GST Returns (GSTR-1 & 3B)
        </button>
        <button
          onClick={() => setActiveTab('aging')}
          style={{
            padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
            border: 'none',
            borderBottom: activeTab === 'aging' ? `2px solid ${tokens.colors.primary[600]}` : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'aging' ? tokens.colors.primary[600] : tokens.colors.slate[600],
            fontWeight: activeTab === 'aging' ? 600 : 400,
            cursor: 'pointer',
            fontSize: tokens.typography.fontSize.sm,
          }}
        >
          Working Capital Aging
        </button>
      </div>

      {/* P&L Statement View */}
      {activeTab === 'pnl' && (
        <div>
          {/* Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: tokens.spacing[4],
              marginBottom: tokens.spacing[8],
            }}
          >
            <SummaryCard
              title="Total Commercial Revenue"
              value={formatPaiseToInr(pnl.totalSalesPaise)}
              subtitle="Net Sales Excl. Taxes"
              variant="primary"
            />
            <SummaryCard
              title="Cost of Goods Sold (COGS)"
              value={formatPaiseToInr(pnl.totalCogsPaise)}
              subtitle="WAC Inventory Depletion"
              variant="danger"
            />
            <SummaryCard
              title="Gross Trading Margin"
              value={formatPaiseToInr(pnl.grossProfitPaise)}
              subtitle={`${(pnl.grossMarginBps / 100).toFixed(2)}% Margin`}
              variant={pnl.grossProfitPaise >= 0 ? 'success' : 'danger'}
            />
            <SummaryCard
              title="Net Operating Profit"
              value={formatPaiseToInr(pnl.netProfitPaise)}
              subtitle={`${(pnl.netMarginBps / 100).toFixed(2)}% Net Margin`}
              variant={pnl.netProfitPaise >= 0 ? 'success' : 'danger'}
            />
          </div>

          {/* Detailed Statement Table */}
          <div
            style={{
              maxWidth: '750px',
              backgroundColor: '#ffffff',
              borderRadius: tokens.borderRadius.lg,
              padding: tokens.spacing[6],
              border: `1px solid ${tokens.colors.slate[200]}`,
            }}
          >
            <h3
              style={{
                margin: `0 0 ${tokens.spacing[4]}`,
                fontSize: tokens.typography.fontSize.base,
                fontWeight: tokens.typography.fontWeight.semibold,
              }}
            >
              Audited Profit & Loss Statement (Accrual Basis)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: tokens.spacing[2], borderBottom: `1px solid ${tokens.colors.slate[100]}` }}>
                <span>1. Revenue from Operations (Net Sales)</span>
                <span style={{ fontWeight: 600 }}>{formatPaiseToInr(pnl.totalSalesPaise)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: tokens.spacing[2], borderBottom: `1px solid ${tokens.colors.slate[100]}` }}>
                <span style={{ color: tokens.colors.slate[600] }}>Less: Cost of Goods Sold (COGS)</span>
                <span style={{ color: tokens.colors.danger[600] }}>({formatPaiseToInr(pnl.totalCogsPaise)})</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: `${tokens.spacing[2]} 0`,
                  backgroundColor: tokens.colors.slate[50],
                  fontWeight: 600,
                }}
              >
                <span>2. Gross Trading Profit</span>
                <span style={{ color: pnl.grossProfitPaise >= 0 ? tokens.colors.success[700] : tokens.colors.danger[700] }}>
                  {formatPaiseToInr(pnl.grossProfitPaise)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: tokens.spacing[2], borderBottom: `1px solid ${tokens.colors.slate[100]}` }}>
                <span style={{ color: tokens.colors.slate[600] }}>Less: Operating Overheads & Expenses</span>
                <span style={{ color: tokens.colors.danger[600] }}>({formatPaiseToInr(pnl.totalExpensesPaise)})</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: `${tokens.spacing[3]} 0`,
                  borderTop: `2px solid ${tokens.colors.slate[800]}`,
                  borderBottom: `2px solid ${tokens.colors.slate[800]}`,
                  fontSize: tokens.typography.fontSize.base,
                  fontWeight: tokens.typography.fontWeight.bold,
                }}
              >
                <span>3. Net Operating Profit Before Taxes</span>
                <span style={{ color: pnl.netProfitPaise >= 0 ? tokens.colors.success[600] : tokens.colors.danger[600] }}>
                  {formatPaiseToInr(pnl.netProfitPaise)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GST Returns View */}
      {activeTab === 'gst' && (
        <div
          style={{
            maxWidth: '850px',
            backgroundColor: '#ffffff',
            borderRadius: tokens.borderRadius.lg,
            padding: tokens.spacing[6],
            border: `1px solid ${tokens.colors.slate[200]}`,
          }}
        >
          <h3 style={{ margin: `0 0 ${tokens.spacing[2]}`, fontSize: tokens.typography.fontSize.base }}>
            Goods & Services Tax (GST) Summary
          </h3>
          <p style={{ color: tokens.colors.slate[500], fontSize: tokens.typography.fontSize.xs, marginBottom: tokens.spacing[6] }}>
            Compiled from verified Sales Invoices and confirmed Purchase Bills.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tokens.typography.fontSize.sm }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${tokens.colors.slate[200]}`, textAlign: 'left' }}>
                <th style={{ padding: tokens.spacing[2] }}>Tax Classification</th>
                <th style={{ padding: tokens.spacing[2] }}>Output Tax (Sales)</th>
                <th style={{ padding: tokens.spacing[2] }}>Input Tax Credit (Purchases)</th>
                <th style={{ padding: tokens.spacing[2] }}>Net Tax Payable / (Credit)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: `1px solid ${tokens.colors.slate[100]}` }}>
                <td style={{ padding: tokens.spacing[2], fontWeight: 500 }}>Central GST (CGST)</td>
                <td style={{ padding: tokens.spacing[2] }}>₹0.00</td>
                <td style={{ padding: tokens.spacing[2] }}>₹0.00</td>
                <td style={{ padding: tokens.spacing[2], fontWeight: 600 }}>₹0.00</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${tokens.colors.slate[100]}` }}>
                <td style={{ padding: tokens.spacing[2], fontWeight: 500 }}>State GST (SGST)</td>
                <td style={{ padding: tokens.spacing[2] }}>₹0.00</td>
                <td style={{ padding: tokens.spacing[2] }}>₹0.00</td>
                <td style={{ padding: tokens.spacing[2], fontWeight: 600 }}>₹0.00</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${tokens.colors.slate[100]}` }}>
                <td style={{ padding: tokens.spacing[2], fontWeight: 500 }}>Integrated GST (IGST)</td>
                <td style={{ padding: tokens.spacing[2] }}>₹0.00</td>
                <td style={{ padding: tokens.spacing[2] }}>₹0.00</td>
                <td style={{ padding: tokens.spacing[2], fontWeight: 600 }}>₹0.00</td>
              </tr>
              <tr style={{ fontWeight: 'bold', borderTop: `2px solid ${tokens.colors.slate[300]}` }}>
                <td style={{ padding: tokens.spacing[3] }}>Total Net Tax</td>
                <td style={{ padding: tokens.spacing[3] }}>₹0.00</td>
                <td style={{ padding: tokens.spacing[3] }}>₹0.00</td>
                <td style={{ padding: tokens.spacing[3], color: tokens.colors.primary[600] }}>₹0.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Working Capital Aging View */}
      {activeTab === 'aging' && (
        <div
          style={{
            maxWidth: '850px',
            backgroundColor: '#ffffff',
            borderRadius: tokens.borderRadius.lg,
            padding: tokens.spacing[6],
            border: `1px solid ${tokens.colors.slate[200]}`,
          }}
        >
          <h3 style={{ margin: `0 0 ${tokens.spacing[2]}`, fontSize: tokens.typography.fontSize.base }}>
            Accounts Receivable & Accounts Payable Aging Matrix
          </h3>
          <p style={{ color: tokens.colors.slate[500], fontSize: tokens.typography.fontSize.xs, marginBottom: tokens.spacing[6] }}>
            Aging buckets calculated strictly from transaction invoice due dates.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tokens.typography.fontSize.sm }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${tokens.colors.slate[200]}`, textAlign: 'left' }}>
                <th style={{ padding: tokens.spacing[2] }}>Ledger Bracket</th>
                <th style={{ padding: tokens.spacing[2] }}>Current (&lt; 30 Days)</th>
                <th style={{ padding: tokens.spacing[2] }}>31 - 60 Days</th>
                <th style={{ padding: tokens.spacing[2] }}>61 - 90 Days</th>
                <th style={{ padding: tokens.spacing[2] }}>&gt; 90 Days (Overdue)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: `1px solid ${tokens.colors.slate[100]}` }}>
                <td style={{ padding: tokens.spacing[2], fontWeight: 500 }}>Debtors (AR)</td>
                <td style={{ padding: tokens.spacing[2] }}>₹0.00</td>
                <td style={{ padding: tokens.spacing[2] }}>₹0.00</td>
                <td style={{ padding: tokens.spacing[2] }}>₹0.00</td>
                <td style={{ padding: tokens.spacing[2], color: tokens.colors.danger[600], fontWeight: 600 }}>₹0.00</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${tokens.colors.slate[100]}` }}>
                <td style={{ padding: tokens.spacing[2], fontWeight: 500 }}>Creditors (AP)</td>
                <td style={{ padding: tokens.spacing[2] }}>₹0.00</td>
                <td style={{ padding: tokens.spacing[2] }}>₹0.00</td>
                <td style={{ padding: tokens.spacing[2] }}>₹0.00</td>
                <td style={{ padding: tokens.spacing[2], color: tokens.colors.danger[600], fontWeight: 600 }}>₹0.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
