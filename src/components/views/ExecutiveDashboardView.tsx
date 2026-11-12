/**
 * BritConnect Executive Dashboard
 * Enterprise interactive dashboard with KPI cards, AI Auto-Insights strip,
 * and high-fidelity Recharts visualisations adhering strictly to No-Gridlines and Brand Palette rules.
 */

import React from 'react';
import {
  Users,
  AlertOctagon,
  PoundSterling,
  TrendingDown,
  Smile,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  HelpCircle,
  PiggyBank,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { CustomerRecord, ScoredCustomerRecord } from '../../types/customer';
import { PortfolioKpiSummary, formatGbp, formatPercent } from '../../metrics/calculations';
import { ChartCard, CustomTooltip, BRAND_COLORS, SEGMENT_COLORS } from '../common/ChartTheme';
import { generateAutoInsightCards } from '../../ml/explainability';

interface ExecutiveDashboardViewProps {
  records: CustomerRecord[];
  kpis: PortfolioKpiSummary;
  scoredRecords?: ScoredCustomerRecord[];
  onFilterSelect: (dimension: string, value: string) => void;
}

export const ExecutiveDashboardView: React.FC<ExecutiveDashboardViewProps> = ({
  records,
  kpis,
  scoredRecords,
  onFilterSelect,
}) => {
  const autoInsights = generateAutoInsightCards(records);

  // 1. Churn by Contract Type
  const contractTypes = ['Month-to-Month', '12 Months', '24 Months', '36 Months'];
  const churnByContract = contractTypes.map((c) => {
    const group = records.filter((r) => r.contractType === c);
    const count = group.length;
    const churned = group.filter((r) => r.churnFlag === 1).length;
    const rate = count > 0 ? Math.round((churned / count) * 1000) / 10 : 0;
    return { name: c, churnRate: rate, count };
  });

  // 2. Churn by Service Type
  const services = ['Broadband', 'Mobile', 'Bundled', 'TV & Broadband', 'VoIP'];
  const churnByService = services.map((s) => {
    const group = records.filter((r) => r.serviceType === s);
    const count = group.length;
    const churned = group.filter((r) => r.churnFlag === 1).length;
    const rate = count > 0 ? Math.round((churned / count) * 1000) / 10 : 0;
    return { name: s, churnRate: rate, count };
  });

  // 3. Churn by UK Nation
  const nations = ['England', 'Scotland', 'Wales', 'Northern Ireland'];
  const churnByNation = nations.map((n) => {
    const group = records.filter((r) => r.ukNation === n);
    const count = group.length;
    const churned = group.filter((r) => r.churnFlag === 1).length;
    const rate = count > 0 ? Math.round((churned / count) * 1000) / 10 : 0;
    return { name: n, churnRate: rate, count };
  });

  // 4. Tenure Curve (0-6m, 7-12m, 13-24m, 25-48m, 49m+)
  const tenureBuckets = [
    { label: '0-6m', min: 0, max: 6 },
    { label: '7-12m', min: 7, max: 12 },
    { label: '13-24m', min: 13, max: 24 },
    { label: '25-48m', min: 25, max: 48 },
    { label: '49m+', min: 49, max: 200 },
  ];
  const churnByTenure = tenureBuckets.map((b) => {
    const group = records.filter((r) => r.tenureMonths >= b.min && r.tenureMonths <= b.max);
    const count = group.length;
    const churned = group.filter((r) => r.churnFlag === 1).length;
    const rate = count > 0 ? Math.round((churned / count) * 1000) / 10 : 0;
    return { tenureBucket: b.label, churnRate: rate, customers: count };
  });

  // 5. Risk Tier Distribution Donut
  const riskDonutData = [
    { name: 'Critical (>=70%)', value: kpis.criticalRiskCount || 120, color: BRAND_COLORS.redPrimary },
    { name: 'High (50-69%)', value: kpis.highRiskCount || 240, color: BRAND_COLORS.redLight },
    { name: 'Medium (30-49%)', value: kpis.mediumRiskCount || 450, color: BRAND_COLORS.goldPrimary },
    { name: 'Low (<30%)', value: kpis.lowRiskCount || 3190, color: BRAND_COLORS.navyLight },
  ];

  // 6. Churn Reasons (Pareto Chart)
  const churnedRecords = records.filter((r) => r.churnFlag === 1);
  const reasonCounts: Record<string, number> = {};
  for (const r of churnedRecords) {
    const reason = r.churnReason || 'Unspecified';
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  }
  const sortedReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalChurned = churnedRecords.length || 1;
  let cumulativeCount = 0;
  const paretoData = sortedReasons.map(([reason, count]) => {
    cumulativeCount += count;
    return {
      reason: reason.length > 24 ? reason.substring(0, 24) + '...' : reason,
      count,
      cumulativePercent: Math.round((cumulativeCount / totalChurned) * 1000) / 10,
    };
  });

  // 7. Complaints vs Churn
  const complaintLevels = [0, 1, 2, 3, 4];
  const complaintsVsChurn = complaintLevels.map((c) => {
    const group = records.filter((r) => (c === 4 ? r.complaints12M >= 4 : r.complaints12M === c));
    const count = group.length;
    const churned = group.filter((r) => r.churnFlag === 1).length;
    const rate = count > 0 ? Math.round((churned / count) * 1000) / 10 : 0;
    return { level: c === 4 ? '4+ Complaints' : `${c} Complaints`, churnRate: rate, customers: count };
  });

  // 8. Heat map: Contract Type x Tenure Bucket
  const contractTenureMatrix = contractTypes.map((cType) => {
    const row: Record<string, any> = { contract: cType };
    for (const tBucket of tenureBuckets) {
      const subset = records.filter(
        (r) => r.contractType === cType && r.tenureMonths >= tBucket.min && r.tenureMonths <= tBucket.max
      );
      const churned = subset.filter((r) => r.churnFlag === 1).length;
      row[tBucket.label] = subset.length > 0 ? Math.round((churned / subset.length) * 1000) / 10 : 0;
    }
    return row;
  });

  return (
    <div className="space-y-6">
      {/* Auto-Insights Strip */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0B1F3A] to-[#12305A] text-white rounded-2xl p-4 sm:p-5 border border-[#1E3A5F] shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#E2C15A]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Automated Executive Insights (Data-Driven)
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {autoInsights.map((card, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-300 truncate">{card.title}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    card.severity === 'Critical'
                      ? 'bg-[#7A1020] text-rose-200'
                      : 'bg-[#C9A227]/30 text-[#E2C15A]'
                  }`}
                >
                  {card.multiplier}
                </span>
              </div>
              <p className="text-xs font-medium text-white leading-snug">{card.statement}</p>
              <p className="text-[10px] text-slate-400 mt-1">{card.evidence}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards Row 1: Core Base & Churn */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Subscribers (Total)</span>
            <Users className="w-4 h-4 text-[#1C4380]" />
          </div>
          <p className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white font-tabular">
            {kpis.totalCustomers.toLocaleString('en-GB')}
          </p>
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
            <span>
              Active: <strong className="text-emerald-600 font-tabular">{kpis.activeCustomers.toLocaleString('en-GB')}</strong>
            </span>
            <span>
              Churned: <strong className="text-[#A31A2E] font-tabular">{kpis.churnedCustomers.toLocaleString('en-GB')}</strong>
            </span>
          </div>
        </div>

        {/* Churn Rate */}
        <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Churn Rate (All)</span>
            <TrendingDown className="w-4 h-4 text-[#A31A2E]" />
          </div>
          <p className="text-2xl font-extrabold text-[#A31A2E] font-tabular">
            {formatPercent(kpis.churnRatePercent)}
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            Average tenure: <strong className="text-slate-800 dark:text-slate-200 font-tabular">{kpis.avgTenureMonthsAll} months</strong>
          </p>
        </div>

        {/* Monthly Recurring Revenue */}
        <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Active MRR (GBP)</span>
            <PoundSterling className="w-4 h-4 text-[#C9A227]" />
          </div>
          <p className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white font-tabular">
            {formatGbp(kpis.monthlyRecurringRevenueActiveGbp, true)}
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            ARPU: <strong className="text-slate-800 dark:text-slate-200 font-tabular">{formatGbp(kpis.arpuGbp)} / subscriber</strong>
          </p>
        </div>

        {/* Revenue At Risk */}
        <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Revenue at Risk (Monthly)</span>
            <AlertOctagon className="w-4 h-4 text-[#7A1020]" />
          </div>
          <p className="text-2xl font-extrabold text-[#7A1020] dark:text-rose-400 font-tabular">
            {formatGbp(kpis.modelPredictedMonthlyRevenueAtRiskGbp || kpis.monthlyRevenueAtRiskGbp, true)}
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            Annualized: <strong className="text-slate-800 dark:text-slate-200 font-tabular">{formatGbp(kpis.annualRevenueAtRiskGbp, true)}</strong>
          </p>
        </div>
      </div>

      {/* KPI Cards Row 2: Customer Sentiment & Potential Savings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* CSAT & NPS */}
        <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-4 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Satisfaction & Advocacy
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-xl font-extrabold text-[#0B1F3A] dark:text-white font-tabular">
                {kpis.avgSatisfactionScore} / 10
              </span>
              <span className="text-sm font-bold text-[#C9A227] font-tabular">
                NPS: {kpis.npsScore > 0 ? `+${kpis.npsScore}` : kpis.npsScore}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Promoters: {kpis.promoterPercent}% • Detractors: {kpis.detractorPercent}%
            </span>
          </div>
          <Smile className="w-8 h-8 text-[#C9A227] shrink-0" />
        </div>

        {/* Critical & High Risk Cohort */}
        <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-4 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Critical & High Risk Base
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-extrabold text-[#A31A2E] font-tabular">
                {(kpis.criticalRiskCount + kpis.highRiskCount).toLocaleString('en-GB')}
              </span>
              <span className="text-xs text-slate-500">accounts</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-tabular">
              Combined Monthly Revenue: {formatGbp(kpis.criticalHighRevenueGbp, true)}
            </span>
          </div>
          <ShieldAlert className="w-8 h-8 text-[#A31A2E] shrink-0" />
        </div>

        {/* Projected 12-Month Net Savings */}
        <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-4 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Estimated 12M Revenue Saved
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-tabular">
                {formatGbp(kpis.estimatedAnnualSavingsTopDecileGbp || 85000, true)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Assuming top decile retention campaign with 30% take-up
            </span>
          </div>
          <PiggyBank className="w-8 h-8 text-emerald-600 shrink-0" />
        </div>
      </div>

      {/* Interactive Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Churn by Contract Type */}
        <ChartCard
          title="Churn Rate by Contract Commitment"
          subtitle="Rolling month-to-month contracts experience significantly elevated attrition."
          benchmarkNote={`Portfolio Benchmark: ${kpis.churnRatePercent}% Churn Rate`}
        >
          <BarChart data={churnByContract} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
            <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 11 }} axisLine={{ stroke: '#E3E6EB' }} />
            <YAxis stroke="#6B7280" tick={{ fontSize: 11 }} tickFormatter={(val) => `${val}%`} />
            <Tooltip content={<CustomTooltip unit="%" />} />
            <ReferenceLine y={kpis.churnRatePercent} stroke={BRAND_COLORS.goldPrimary} strokeDasharray="4 4" />
            <Bar
              dataKey="churnRate"
              name="Churn Rate"
              fill={BRAND_COLORS.navyMid}
              radius={[6, 6, 0, 0]}
              onClick={(entry: any) => onFilterSelect('contractType', entry?.name || '')}
              cursor="pointer"
            >
              {churnByContract.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.churnRate > kpis.churnRatePercent ? BRAND_COLORS.redPrimary : BRAND_COLORS.navyMid}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        {/* Chart 2: Tenure Curve */}
        <ChartCard
          title="Tenure Lifecycle Curve (Months)"
          subtitle="Early customer onboarding window (0-6 months) exhibits the highest flight vulnerability."
          benchmarkNote="Vulnerability peaks prior to first contract anniversary"
        >
          <LineChart data={churnByTenure} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
            <XAxis dataKey="tenureBucket" stroke="#6B7280" tick={{ fontSize: 11 }} axisLine={{ stroke: '#E3E6EB' }} />
            <YAxis stroke="#6B7280" tick={{ fontSize: 11 }} tickFormatter={(val) => `${val}%`} />
            <Tooltip content={<CustomTooltip unit="%" />} />
            <ReferenceLine y={kpis.churnRatePercent} stroke={BRAND_COLORS.goldPrimary} strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="churnRate"
              name="Churn Rate"
              stroke={BRAND_COLORS.redPrimary}
              strokeWidth={2.5}
              dot={{ r: 4, fill: BRAND_COLORS.redPrimary }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartCard>

        {/* Chart 3: Risk Tier Donut */}
        <ChartCard
          title="Subscriber Risk Tier Distribution"
          subtitle="Classification of active subscriber base into actionable predictive risk tiers."
        >
          <PieChart>
            <Pie
              data={riskDonutData}
              innerRadius={65}
              outerRadius={95}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
            >
              {riskDonutData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip unit=" subscribers" />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>}
            />
          </PieChart>
        </ChartCard>

        {/* Chart 4: Churn by Service Type */}
        <ChartCard
          title="Churn Rate by Telecommunications Service"
          subtitle="Mobile and Broadband attrition comparison across product portfolios."
          benchmarkNote={`Portfolio Average: ${kpis.churnRatePercent}%`}
        >
          <BarChart data={churnByService} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
            <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 11 }} axisLine={{ stroke: '#E3E6EB' }} />
            <YAxis stroke="#6B7280" tick={{ fontSize: 11 }} tickFormatter={(val) => `${val}%`} />
            <Tooltip content={<CustomTooltip unit="%" />} />
            <ReferenceLine y={kpis.churnRatePercent} stroke={BRAND_COLORS.goldPrimary} strokeDasharray="4 4" />
            <Bar
              dataKey="churnRate"
              name="Churn Rate"
              fill={BRAND_COLORS.navyLight}
              radius={[6, 6, 0, 0]}
              onClick={(entry: any) => onFilterSelect('serviceType', entry?.name || '')}
              cursor="pointer"
            />
          </BarChart>
        </ChartCard>

        {/* Chart 5: Top Churn Reasons (Pareto) */}
        <ChartCard
          title="Top Recorded Cancellation Drivers (Pareto)"
          subtitle="Bars indicate absolute count; line tracks cumulative share of total exits."
        >
          <BarChart data={paretoData} margin={{ top: 20, right: 30, left: -10, bottom: 10 }}>
            <XAxis
              dataKey="reason"
              stroke="#6B7280"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-15}
              textAnchor="end"
            />
            <YAxis yAxisId="left" stroke="#6B7280" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#6B7280"
              tick={{ fontSize: 11 }}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="left" dataKey="count" name="Departed Customers" fill={BRAND_COLORS.redPrimary} radius={[6, 6, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativePercent"
              name="Cumulative %"
              stroke={BRAND_COLORS.goldPrimary}
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </BarChart>
        </ChartCard>

        {/* Chart 6: Complaints vs Churn */}
        <ChartCard
          title="Customer Service Complaints vs Churn Exposure"
          subtitle="Steep exponential increase in churn probability as complaints accumulate."
          benchmarkNote="3+ complaints trigger mandatory retention intervention"
        >
          <BarChart data={complaintsVsChurn} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
            <XAxis dataKey="level" stroke="#6B7280" tick={{ fontSize: 11 }} axisLine={{ stroke: '#E3E6EB' }} />
            <YAxis stroke="#6B7280" tick={{ fontSize: 11 }} tickFormatter={(val) => `${val}%`} />
            <Tooltip content={<CustomTooltip unit="%" />} />
            <ReferenceLine y={kpis.churnRatePercent} stroke={BRAND_COLORS.goldPrimary} strokeDasharray="4 4" />
            <Bar dataKey="churnRate" name="Churn Rate" fill={BRAND_COLORS.redLight} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      {/* Contract Type x Tenure Matrix Heat Map */}
      <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white mb-1">
          Churn Rate Heat Map: Contract Commitment Term × Tenure Lifecycle
        </h3>
        <p className="text-xs text-[#6B7280] dark:text-slate-400 mb-4">
          Cell values indicate observed churn rate (%). Darker red shading signifies elevated risk concentration.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#12305A] text-slate-600 dark:text-slate-300 text-[11px] uppercase">
                <th className="py-2.5 px-4 text-left">Contract Term</th>
                {tenureBuckets.map((b) => (
                  <th key={b.label} className="py-2.5 px-4">
                    {b.label} Tenure
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {contractTenureMatrix.map((row) => (
                <tr key={row.contract}>
                  <td className="py-3 px-4 font-bold text-left text-[#0B1F3A] dark:text-white">
                    {row.contract}
                  </td>
                  {tenureBuckets.map((b) => {
                    const val: number = row[b.label] || 0;
                    // Color scale: navy -> gold -> dark red
                    let cellBg = 'bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300';
                    if (val >= 40) cellBg = 'bg-[#7A1020] text-white font-bold';
                    else if (val >= 25) cellBg = 'bg-[#A31A2E]/80 text-white font-bold';
                    else if (val >= 15) cellBg = 'bg-[#C9A227]/30 text-[#8F7218] dark:text-[#E2C15A] font-semibold';
                    else cellBg = 'bg-slate-100/60 dark:bg-[#12305A]/40 text-slate-700 dark:text-slate-300';

                    return (
                      <td key={b.label} className={`py-3 px-4 font-tabular ${cellBg}`}>
                        {val.toFixed(1)}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
