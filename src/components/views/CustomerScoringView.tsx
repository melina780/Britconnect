/**
 * BritConnect Customer Scoring View
 * Searchable, filterable subscriber risk scoring table, confidence intervals,
 * and single-customer detail drawer with local SHAP contribution waterfall.
 */

import React, { useState } from 'react';
import { CustomerRecord, ScoredCustomerRecord, RiskTier } from '../../types/customer';
import { formatGbp, formatPercent } from '../../metrics/calculations';
import {
  Search,
  Filter,
  Download,
  Eye,
  X,
  ChevronRight,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Sparkles,
  PhoneCall,
  User,
} from 'lucide-react';

interface CustomerScoringViewProps {
  scoredRecords: ScoredCustomerRecord[];
  onOpenAiRecommendation: (customer: ScoredCustomerRecord) => void;
}

export const CustomerScoringView: React.FC<CustomerScoringViewProps> = ({
  scoredRecords,
  onOpenAiRecommendation,
}) => {
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'Active' | 'Churned'>('Active');
  const [selectedCustomer, setSelectedCustomer] = useState<ScoredCustomerRecord | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filter population
  const population = scoredRecords.filter((r) =>
    viewMode === 'Active' ? r.churnFlag === 0 : r.churnFlag === 1
  );

  const filtered = population.filter((r) => {
    const matchesSearch =
      r.customerId.toLowerCase().includes(search.toLowerCase()) ||
      r.city.toLowerCase().includes(search.toLowerCase()) ||
      r.planName.toLowerCase().includes(search.toLowerCase());
    const matchesTier = selectedTier === 'All' || r.riskTier === selectedTier;
    return matchesSearch && matchesTier;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRecords = filtered.slice((page - 1) * pageSize, page * pageSize);

  const downloadHighRiskCallList = () => {
    const highRisk = scoredRecords.filter(
      (r) => r.churnFlag === 0 && (r.riskTier === 'Critical' || r.riskTier === 'High')
    );
    const headers = [
      'Customer ID',
      'Segment',
      'Nation',
      'City',
      'Phone Plan',
      'Contract Type',
      'Monthly Charge (£)',
      'Churn Probability (%)',
      'Risk Tier',
      'Revenue At Risk (£)',
      'Reason Code',
      'Recommended Action',
    ];
    const rows = highRisk.map((r) => [
      r.customerId,
      r.customerSegment,
      r.ukNation,
      `"${r.city}"`,
      `"${r.planName}"`,
      r.contractType,
      r.monthlyChargeGbp.toFixed(2),
      (r.churnProbability * 100).toFixed(1),
      r.riskTier,
      r.predictedRevenueAtRiskGbp.toFixed(2),
      `"${r.reasonCode}"`,
      `"${r.recommendedAction}"`,
    ]);

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `BritConnect_High_Risk_Call_List_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTierBadge = (tier: RiskTier) => {
    switch (tier) {
      case 'Critical':
        return 'bg-[#7A1020] text-rose-100 border-[#A31A2E]';
      case 'High':
        return 'bg-[#A31A2E]/20 text-[#A31A2E] dark:text-rose-300 border-[#A31A2E]/40';
      case 'Medium':
        return 'bg-[#C9A227]/20 text-[#8F7218] dark:text-[#E2C15A] border-[#C9A227]/40';
      default:
        return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B1F3A] dark:text-white">
            Individual Customer Risk Scoring & Action Dispatch
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
            Real-time churn probabilities, confidence bounds, and local SHAP factor waterfalls.
          </p>
        </div>

        {/* Population Toggle & Export Call List */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-[#12305A] p-1 rounded-xl flex items-center text-xs">
            <button
              onClick={() => {
                setViewMode('Active');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                viewMode === 'Active'
                  ? 'bg-[#0B1F3A] text-white dark:bg-[#C9A227] dark:text-[#0B1F3A]'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Active Subscribers (Retention Target)
            </button>
            <button
              onClick={() => {
                setViewMode('Churned');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                viewMode === 'Churned'
                  ? 'bg-[#0B1F3A] text-white dark:bg-[#C9A227] dark:text-[#0B1F3A]'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Historical Churned Accounts
            </button>
          </div>

          <button
            onClick={downloadHighRiskCallList}
            className="px-3.5 py-2 rounded-xl bg-[#0B1F3A] dark:bg-[#12305A] hover:bg-[#12305A] text-white text-xs font-semibold flex items-center gap-2 border border-[#1C4380] transition-colors shrink-0 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#C9A227]" />
            <span className="hidden sm:inline">Export High-Risk Call List (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-4 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Customer ID, city, plan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-[#12305A] border border-[#E3E6EB] dark:border-[#1C4380] text-xs text-[#0B1F3A] dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-slate-500 font-medium">Risk Tier:</span>
          {['All', 'Critical', 'High', 'Medium', 'Low'].map((tier) => (
            <button
              key={tier}
              onClick={() => {
                setSelectedTier(tier);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                selectedTier === tier
                  ? 'bg-[#0B1F3A] text-white dark:bg-[#C9A227] dark:text-[#0B1F3A]'
                  : 'bg-slate-100 dark:bg-[#12305A] text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Scoring Table */}
      <div className="bg-white dark:bg-[#0B1F3A] rounded-xl border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] uppercase bg-slate-50 dark:bg-[#12305A] text-slate-500 dark:text-slate-300">
              <tr>
                <th className="py-3 px-4">Customer ID</th>
                <th className="py-3 px-4">Segment / Nation</th>
                <th className="py-3 px-4">Plan & Contract</th>
                <th className="py-3 px-4 font-tabular">Monthly Charge</th>
                <th className="py-3 px-4 font-tabular">Churn Risk (%)</th>
                <th className="py-3 px-4">Risk Tier</th>
                <th className="py-3 px-4 font-tabular">Monthly Exposure</th>
                <th className="py-3 px-4">Primary Reason Code</th>
                <th className="py-3 px-4 text-right">Drilldown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pageRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No customers match the active filters or search criteria.
                  </td>
                </tr>
              ) : (
                pageRecords.map((c) => (
                  <tr
                    key={c.customerId}
                    onClick={() => setSelectedCustomer(c)}
                    className="hover:bg-slate-50/70 dark:hover:bg-[#12305A]/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-bold font-mono text-[#0B1F3A] dark:text-white">
                      {c.customerId}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">{c.customerSegment}</span>
                      <span className="text-[10px] text-slate-400">{c.ukNation} ({c.city})</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-800 dark:text-slate-200 block truncate max-w-[140px]">{c.planName}</span>
                      <span className="text-[10px] text-slate-400">{c.contractType}</span>
                    </td>
                    <td className="py-3 px-4 font-tabular font-semibold">
                      {formatGbp(c.monthlyChargeGbp)}
                    </td>
                    <td className="py-3 px-4 font-tabular">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${
                              c.churnProbability >= 0.7
                                ? 'bg-[#7A1020]'
                                : c.churnProbability >= 0.5
                                ? 'bg-[#A31A2E]'
                                : c.churnProbability >= 0.3
                                ? 'bg-[#C9A227]'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.round(c.churnProbability * 100)}%` }}
                          />
                        </div>
                        <span className="font-bold">{Math.round(c.churnProbability * 100)}%</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        [{Math.round(c.confidenceLower * 100)}% - {Math.round(c.confidenceUpper * 100)}%]
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getTierBadge(c.riskTier)}`}>
                        {c.riskTier}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-tabular font-semibold text-[#7A1020] dark:text-rose-400">
                      {formatGbp(c.predictedRevenueAtRiskGbp)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {c.reasonCode}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#12305A]">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {(page - 1) * pageSize + 1} - {Math.min(filtered.length, page * pageSize)} of{' '}
            {filtered.length.toLocaleString('en-GB')} records
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 rounded bg-slate-100 dark:bg-[#12305A] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 font-tabular font-semibold text-slate-800 dark:text-slate-200">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1 rounded bg-slate-100 dark:bg-[#12305A] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Single Customer Detail Drawer Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0B1F3A] w-full max-w-xl h-full shadow-2xl border-l border-[#1E3A5F] p-6 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A227]">
                  Subscriber Risk Diagnostic
                </span>
                <h3 className="text-xl font-extrabold text-[#0B1F3A] dark:text-white mt-0.5">
                  Customer {selectedCustomer.customerId}
                </h3>
                <span className="text-xs text-slate-400">
                  {selectedCustomer.customerSegment} • {selectedCustomer.ukNation} ({selectedCustomer.city})
                </span>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Risk Probability Hero Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-[#12305A] text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-300 uppercase tracking-wider font-semibold">Predicted Churn Risk</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-[#E2C15A] font-tabular">
                    {Math.round(selectedCustomer.churnProbability * 100)}%
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getTierBadge(selectedCustomer.riskTier)}`}>
                    {selectedCustomer.riskTier} Risk
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Monthly Revenue at Risk: <strong>{formatGbp(selectedCustomer.predictedRevenueAtRiskGbp)}</strong>
                </span>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  onOpenAiRecommendation(selectedCustomer);
                  setSelectedCustomer(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#C9A227] hover:bg-[#E2C15A] text-[#0B1F3A] font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Retention Plan</span>
              </button>
            </div>

            {/* SHAP-Style Contribution Waterfall */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Local Explainability (SHAP Waterfall Drivers)
              </h4>
              <p className="text-[11px] text-slate-400">
                Top factors shifting this customer's predicted risk relative to portfolio benchmark averages:
              </p>

              <div className="space-y-2 pt-1">
                {selectedCustomer.topDrivers.map((driver, dIdx) => (
                  <div
                    key={dIdx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#12305A]/40 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          driver.impact === 'pushes_risk_up'
                            ? 'bg-rose-100 text-[#A31A2E]'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {driver.impact === 'pushes_risk_up' ? (
                          <ArrowUp className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-[#0B1F3A] dark:text-white block">{driver.label}</span>
                        <span className="text-[10px] text-slate-500">
                          Customer: <strong>{driver.actualValue}</strong> (Benchmark: {driver.portfolioAvg})
                        </span>
                      </div>
                    </div>
                    <span
                      className={`font-tabular font-bold text-xs ${
                        driver.impact === 'pushes_risk_up' ? 'text-[#A31A2E]' : 'text-emerald-600'
                      }`}
                    >
                      {driver.impact === 'pushes_risk_up' ? '+' : '-'}
                      {Math.round(driver.importance * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Best Action Card */}
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Prescribed Next-Best Action
              </span>
              <p className="text-sm font-bold text-amber-950 dark:text-amber-100">
                {selectedCustomer.recommendedAction}
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-400">
                Target Reason Code: <strong>{selectedCustomer.reasonCode}</strong>
              </p>
            </div>

            {/* Complete Record Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#12305A]/30 border">
                <span className="text-slate-400 block text-[10px]">Monthly Charge</span>
                <span className="font-bold text-slate-800 dark:text-white font-tabular">{formatGbp(selectedCustomer.monthlyChargeGbp)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#12305A]/30 border">
                <span className="text-slate-400 block text-[10px]">Relationship Tenure</span>
                <span className="font-bold text-slate-800 dark:text-white font-tabular">{selectedCustomer.tenureMonths} Months</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#12305A]/30 border">
                <span className="text-slate-400 block text-[10px]">Satisfaction Score</span>
                <span className="font-bold text-slate-800 dark:text-white font-tabular">{selectedCustomer.satisfactionScore110} / 10</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#12305A]/30 border">
                <span className="text-slate-400 block text-[10px]">Logged Complaints (12M)</span>
                <span className="font-bold text-slate-800 dark:text-white font-tabular">{selectedCustomer.complaints12M}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
