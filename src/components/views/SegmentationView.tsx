/**
 * BritConnect Customer Segmentation View
 * 3x3 Value × Risk Matrix, Unsupervised K-Means Behavioral Clustering,
 * Radar profiling, 2D PCA Dimensionality Projection, and One-Click Campaign Generation.
 */

import React, { useState } from 'react';
import { CustomerRecord, ScoredCustomerRecord } from '../../types/customer';
import { performKMeansClustering, ClusterProfile, PcaPoint } from '../../utils/kmeans';
import { formatGbp, formatPercent } from '../../metrics/calculations';
import { ChartCard, CustomTooltip, BRAND_COLORS, SEGMENT_COLORS } from '../common/ChartTheme';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Cell,
  Legend,
} from 'recharts';
import { Users, Grid, Send, Sparkles, Layers, Sliders } from 'lucide-react';

interface SegmentationViewProps {
  records: CustomerRecord[];
  scoredRecords?: ScoredCustomerRecord[];
  onCreateCampaignFromSegment: (segmentName: string, count: number) => void;
}

export const SegmentationView: React.FC<SegmentationViewProps> = ({
  records,
  scoredRecords,
  onCreateCampaignFromSegment,
}) => {
  const [selectedK, setSelectedK] = useState<number>(4);
  const [activeClusterId, setActiveClusterId] = useState<number>(0);

  // Run in-browser K-means clustering
  const { clusters, pcaPoints, elbowData } = performKMeansClustering(records, scoredRecords, selectedK);
  const activeCluster = clusters.find((c) => c.id === activeClusterId) || clusters[0];

  // 3x3 Value x Risk Matrix Computation
  // Value: High (Charge >= £60), Medium (£40-60), Low (<£40)
  // Risk: High (prob >= 0.5 or churned), Medium (prob 0.3-0.5), Low (<0.3)
  const computeCell = (valTier: 'High' | 'Medium' | 'Low', riskTier: 'High' | 'Medium' | 'Low') => {
    let count = 0;
    let revSum = 0;

    for (const r of records) {
      const charge = r.monthlyChargeGbp || 0;
      let v: 'High' | 'Medium' | 'Low' = 'Low';
      if (charge >= 60) v = 'High';
      else if (charge >= 40) v = 'Medium';

      let rk: 'High' | 'Medium' | 'Low' = 'Low';
      if (r.churnFlag === 1) rk = 'High';
      else if (r.satisfactionScore110 <= 4 || r.complaints12M >= 2) rk = 'High';
      else if (r.contractType === 'Month-to-Month') rk = 'Medium';

      if (v === valTier && rk === riskTier) {
        count++;
        revSum += charge;
      }
    }
    return { count, revSum };
  };

  const matrixData = [
    {
      valueLabel: 'High Value (£60+)',
      cells: [
        { risk: 'High Risk', ...computeCell('High', 'High'), color: 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300' },
        { risk: 'Medium Risk', ...computeCell('High', 'Medium'), color: 'bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-300' },
        { risk: 'Low Risk', ...computeCell('High', 'Low'), color: 'bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300' },
      ],
    },
    {
      valueLabel: 'Medium Value (£40-60)',
      cells: [
        { risk: 'High Risk', ...computeCell('Medium', 'High'), color: 'bg-red-500/15 border-red-400 text-red-700 dark:text-red-300' },
        { risk: 'Medium Risk', ...computeCell('Medium', 'Medium'), color: 'bg-amber-500/15 border-amber-400 text-amber-800 dark:text-amber-300' },
        { risk: 'Low Risk', ...computeCell('Medium', 'Low'), color: 'bg-emerald-500/10 border-emerald-400 text-emerald-800 dark:text-emerald-300' },
      ],
    },
    {
      valueLabel: 'Low Value (<£40)',
      cells: [
        { risk: 'High Risk', ...computeCell('Low', 'High'), color: 'bg-red-500/10 border-red-300 text-red-600 dark:text-red-400' },
        { risk: 'Medium Risk', ...computeCell('Low', 'Medium'), color: 'bg-amber-500/10 border-amber-300 text-amber-700 dark:text-amber-400' },
        { risk: 'Low Risk', ...computeCell('Low', 'Low'), color: 'bg-slate-100 dark:bg-slate-800/40 border-slate-300 text-slate-700 dark:text-slate-300' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B1F3A] dark:text-white">
            Customer Segmentation & Behavioral Clustering
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
            Rule-based 3×3 Value-at-Risk prioritization matrix and unsupervised K-Means behavioral clustering.
          </p>
        </div>

        {/* K Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-[#0B1F3A] p-2 rounded-xl border border-[#E3E6EB] dark:border-[#1E3A5F] text-xs">
          <Sliders className="w-3.5 h-3.5 text-[#C9A227]" />
          <span className="text-slate-500 font-medium">Clusters (k):</span>
          {[3, 4, 5, 6].map((k) => (
            <button
              key={k}
              onClick={() => setSelectedK(k)}
              className={`w-7 h-7 rounded-lg font-bold transition-colors cursor-pointer ${
                selectedK === k
                  ? 'bg-[#0B1F3A] text-white dark:bg-[#C9A227] dark:text-[#0B1F3A]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Section 1: 3x3 Value x Risk Matrix */}
      <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white mb-1 flex items-center gap-2">
          <Grid className="w-4 h-4 text-[#C9A227]" /> 3×3 Strategic Priority Grid: Customer Value vs Churn Risk
        </h3>
        <p className="text-xs text-[#6B7280] dark:text-slate-400 mb-4">
          Direct retention budget allocation towards High Value × High Risk accounts (top left quadrant).
        </p>

        <div className="grid grid-cols-3 gap-3">
          {matrixData.map((row) =>
            row.cells.map((cell, idx) => (
              <div
                key={`${row.valueLabel}-${idx}`}
                className={`p-4 rounded-xl border ${cell.color} transition-all hover:scale-[1.01]`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                  <span>{row.valueLabel}</span>
                  <span className="uppercase tracking-wider">{cell.risk}</span>
                </div>
                <p className="text-xl font-extrabold font-tabular mt-2">
                  {cell.count.toLocaleString('en-GB')} accounts
                </p>
                <div className="flex items-center justify-between mt-2 text-xs font-semibold">
                  <span>Monthly Revenue:</span>
                  <span className="font-tabular">{formatGbp(cell.revSum, true)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Section 2: Behavioral Clusters Tabs & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Clusters List */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-[#C9A227]" /> K-Means Behavioral Segments
          </h3>

          {clusters.map((cl) => {
            const isSelected = cl.id === activeClusterId;
            return (
              <div
                key={cl.id}
                onClick={() => setActiveClusterId(cl.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#12305A] text-white border-[#C9A227] shadow-md'
                    : 'bg-white dark:bg-[#0B1F3A] text-slate-800 dark:text-slate-200 border-[#E3E6EB] dark:border-[#1E3A5F] hover:border-[#1C4380]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-bold text-xs">{cl.name}</h4>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-[#C9A227] text-[#0B1F3A]' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {cl.sharePercent}% of base
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs my-2 font-tabular">
                  <span>{cl.size.toLocaleString('en-GB')} subscribers</span>
                  <span className="font-bold text-[#E2C15A]">{formatGbp(cl.totalMonthlyRevenueGbp, true)} MRR</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Churn Rate: {cl.churnRatePercent}%</span>
                  <span>Risk MRR: {formatGbp(cl.monthlyRevenueAtRiskGbp, true)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center & Right: Selected Cluster Radar & Diagnostic Details */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0B1F3A] rounded-xl p-6 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A227]">
                  Segment Profile #{activeCluster?.id + 1}
                </span>
                <h3 className="text-lg font-bold text-[#0B1F3A] dark:text-white mt-0.5">
                  {activeCluster?.name}
                </h3>
              </div>

              {/* One-Click Retention Campaign */}
              <button
                onClick={() => onCreateCampaignFromSegment(activeCluster.name, activeCluster.size)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0B1F3A] to-[#1C4380] hover:opacity-95 text-white text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>Create Retention Campaign</span>
              </button>
            </div>

            {/* Dominant Traits Chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {activeCluster?.dominantTraits.map((trait, tIdx) => (
                <span
                  key={tIdx}
                  className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#12305A] text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700"
                >
                  ✓ {trait}
                </span>
              ))}
            </div>

            {/* Radar Chart */}
            <div className="h-64 w-full">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" width={400} height={250} data={activeCluster?.radarData}>
                <PolarGrid stroke="#E3E6EB" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#6B7280', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#E3E6EB" tick={{ fontSize: 9 }} />
                <Radar
                  name="Segment Score"
                  dataKey="value"
                  stroke={BRAND_COLORS.goldPrimary}
                  fill={BRAND_COLORS.goldPrimary}
                  fillOpacity={0.4}
                />
                <Radar
                  name="Portfolio Benchmark"
                  dataKey="benchmark"
                  stroke={BRAND_COLORS.navyLight}
                  fill={BRAND_COLORS.navyLight}
                  fillOpacity={0.15}
                />
                <Legend
                  verticalAlign="bottom"
                  height={24}
                  formatter={(val) => <span className="text-xs text-slate-600 dark:text-slate-300">{val}</span>}
                />
              </RadarChart>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Primary Churn Drivers: {activeCluster?.topDrivers.join(', ')}</span>
            <span className="font-semibold text-[#0B1F3A] dark:text-white">
              Revenue at Risk: {formatGbp(activeCluster?.monthlyRevenueAtRiskGbp, true)}
            </span>
          </div>
        </div>
      </div>

      {/* Section 3: 2D PCA Dimensionality Projection Scatter */}
      <ChartCard
        title="2-D Dimensionality Projection (Principal Component Analysis)"
        subtitle="Unsupervised 2D projection mapping customer behavioral distribution. Point size scales with churn probability."
      >
        <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: -10 }}>
          <XAxis
            type="number"
            dataKey="x"
            name="PC1: Bandwidth & Spend"
            stroke="#6B7280"
            tick={{ fontSize: 11 }}
            axisLine={{ stroke: '#E3E6EB' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="PC2: Service Friction & Outages"
            stroke="#6B7280"
            tick={{ fontSize: 11 }}
            axisLine={{ stroke: '#E3E6EB' }}
          />
          <ZAxis type="number" dataKey="churnProbability" range={[30, 200]} />
          <Tooltip content={<CustomTooltip />} />
          <Scatter name="Customers" data={pcaPoints} fill={BRAND_COLORS.navyMid}>
            {pcaPoints.map((entry, index) => {
              const color =
                entry.riskTier === 'Critical'
                  ? BRAND_COLORS.redPrimary
                  : entry.riskTier === 'High'
                  ? BRAND_COLORS.redLight
                  : entry.riskTier === 'Medium'
                  ? BRAND_COLORS.goldPrimary
                  : BRAND_COLORS.navyLight;
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Scatter>
        </ScatterChart>
      </ChartCard>
    </div>
  );
};
