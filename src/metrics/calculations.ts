/**
 * BritConnect Metrics Engine
 * Single Source of Truth for all Business KPI Definitions
 * Strictly handles divide-by-zero, empty populations, and explicit population labelling.
 */

import { CustomerRecord, ScoredCustomerRecord } from '../types/customer';

export interface PortfolioKpiSummary {
  // Population counts
  totalCustomers: number;
  activeCustomers: number;
  churnedCustomers: number;

  // Rate & Tenure
  churnRatePercent: number; // Churned / Total (All)
  activeRatePercent: number; // Active / Total (All)
  avgTenureMonthsAll: number; // All
  avgTenureMonthsActive: number; // Active only
  avgTenureMonthsChurned: number; // Churned only

  // Financials
  monthlyRecurringRevenueActiveGbp: number; // Active only
  monthlyRevenueAtRiskGbp: number; // Sum for Active customers (recorded)
  modelPredictedMonthlyRevenueAtRiskGbp: number; // Sum(probability * monthlyCharge) for Active
  annualRevenueAtRiskGbp: number; // monthlyRevenueAtRiskGbp * 12
  arpuGbp: number; // MRR / Active customers
  arpuAllGbp: number; // Total charges / All customers
  lifetimeRevenueTotalGbp: number;

  // Experience & Quality
  avgSatisfactionScore: number; // 1-10
  npsScore: number; // % Promoters - % Detractors
  promoterPercent: number;
  passivePercent: number;
  detractorPercent: number;
  npsScaleType: '0-10' | '-100-to-100' | '1-10';

  // Operational friction
  totalComplaints12M: number;
  avgComplaintsPerCustomer: number;
  avgResolutionHours: number;
  avgOutages12M: number;

  // Risk Tiers (for scored active customers)
  criticalRiskCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  criticalHighRevenueGbp: number; // Monthly revenue of Critical + High risk customers
  estimatedAnnualSavingsTopDecileGbp: number; // Estimated savings from cost matrix
}

/**
 * Detects whether NPS in data is 0-10 scale or -100 to 100 scale.
 */
export function detectNpsScale(records: { npsScore: number }[]): {
  min: number;
  max: number;
  isTenScale: boolean;
  scaleType: '0-10' | '-100-to-100' | '1-10';
} {
  if (!records || records.length === 0) {
    return { min: 0, max: 10, isTenScale: true, scaleType: '0-10' };
  }
  let min = Infinity;
  let max = -Infinity;
  for (const r of records) {
    if (typeof r.npsScore === 'number' && !isNaN(r.npsScore)) {
      if (r.npsScore < min) min = r.npsScore;
      if (r.npsScore > max) max = r.npsScore;
    }
  }
  if (min === Infinity) return { min: 0, max: 10, isTenScale: true, scaleType: '0-10' };

  if (min < 0 || max > 10) {
    return { min, max, isTenScale: false, scaleType: '-100-to-100' };
  }
  return { min, max, isTenScale: true, scaleType: min >= 1 ? '1-10' : '0-10' };
}

/**
 * Computes Net Promoter Score from records based on scale
 */
export function computeNps(records: { npsScore: number }[]): {
  nps: number;
  promoterPercent: number;
  passivePercent: number;
  detractorPercent: number;
  scaleType: '0-10' | '-100-to-100' | '1-10';
} {
  if (!records || records.length === 0) {
    return { nps: 0, promoterPercent: 0, passivePercent: 0, detractorPercent: 0, scaleType: '0-10' };
  }

  const { isTenScale, scaleType } = detectNpsScale(records);
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  let validCount = 0;

  for (const r of records) {
    const val = r.npsScore;
    if (typeof val !== 'number' || isNaN(val)) continue;
    validCount++;

    if (isTenScale) {
      // 0-10 scale: 9-10 Promoter, 7-8 Passive, 0-6 Detractor
      if (val >= 9) promoters++;
      else if (val >= 7) passives++;
      else detractors++;
    } else {
      // -100 to 100 scale: > 30 Promoter, -10 to 30 Passive, < -10 Detractor
      if (val >= 30) promoters++;
      else if (val >= -10) passives++;
      else detractors++;
    }
  }

  if (validCount === 0) {
    return { nps: 0, promoterPercent: 0, passivePercent: 0, detractorPercent: 0, scaleType };
  }

  const promoterPercent = (promoters / validCount) * 100;
  const passivePercent = (passives / validCount) * 100;
  const detractorPercent = (detractors / validCount) * 100;
  const nps = Math.round((promoterPercent - detractorPercent) * 10) / 10;

  return {
    nps,
    promoterPercent: Math.round(promoterPercent * 10) / 10,
    passivePercent: Math.round(passivePercent * 10) / 10,
    detractorPercent: Math.round(detractorPercent * 10) / 10,
    scaleType,
  };
}

/**
 * Calculates complete executive KPIs with guardrails for small samples and divide-by-zero
 */
export function calculatePortfolioKPIs(
  records: CustomerRecord[],
  scoredRecords?: ScoredCustomerRecord[],
  retentionOfferCost: number = 25,
  retentionSuccessRate: number = 0.30
): PortfolioKpiSummary {
  const total = records.length;
  if (total === 0) {
    return {
      totalCustomers: 0,
      activeCustomers: 0,
      churnedCustomers: 0,
      churnRatePercent: 0,
      activeRatePercent: 0,
      avgTenureMonthsAll: 0,
      avgTenureMonthsActive: 0,
      avgTenureMonthsChurned: 0,
      monthlyRecurringRevenueActiveGbp: 0,
      monthlyRevenueAtRiskGbp: 0,
      modelPredictedMonthlyRevenueAtRiskGbp: 0,
      annualRevenueAtRiskGbp: 0,
      arpuGbp: 0,
      arpuAllGbp: 0,
      lifetimeRevenueTotalGbp: 0,
      avgSatisfactionScore: 0,
      npsScore: 0,
      promoterPercent: 0,
      passivePercent: 0,
      detractorPercent: 0,
      npsScaleType: '0-10',
      totalComplaints12M: 0,
      avgComplaintsPerCustomer: 0,
      avgResolutionHours: 0,
      avgOutages12M: 0,
      criticalRiskCount: 0,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
      criticalHighRevenueGbp: 0,
      estimatedAnnualSavingsTopDecileGbp: 0,
    };
  }

  let activeCount = 0;
  let churnedCount = 0;
  let activeTenureSum = 0;
  let churnedTenureSum = 0;
  let allTenureSum = 0;

  let activeMrr = 0;
  let allRevenueSum = 0;
  let recordedRevAtRisk = 0;
  let lifetimeRevSum = 0;

  let satisfactionSum = 0;
  let complaintsSum = 0;
  let resolutionSum = 0;
  let outagesSum = 0;

  for (const r of records) {
    const isChurned = r.churnFlag === 1 || r.churnStatus === 'Churned';
    const tenure = r.tenureMonths || 0;
    const charge = r.monthlyChargeGbp || 0;

    allTenureSum += tenure;
    allRevenueSum += charge;
    lifetimeRevSum += r.lifetimeRevenueGbp || 0;
    satisfactionSum += r.satisfactionScore110 || 0;
    complaintsSum += r.complaints12M || 0;
    resolutionSum += r.averageResolutionHours || 0;
    outagesSum += r.networkOutages12M || 0;

    if (isChurned) {
      churnedCount++;
      churnedTenureSum += tenure;
    } else {
      activeCount++;
      activeTenureSum += tenure;
      activeMrr += charge;
      recordedRevAtRisk += r.monthlyRevenueAtRiskGbp || 0;
    }
  }

  const churnRatePercent = Math.round((churnedCount / total) * 1000) / 10;
  const activeRatePercent = Math.round((activeCount / total) * 1000) / 10;
  const avgTenureMonthsAll = Math.round((allTenureSum / total) * 10) / 10;
  const avgTenureMonthsActive = activeCount > 0 ? Math.round((activeTenureSum / activeCount) * 10) / 10 : 0;
  const avgTenureMonthsChurned = churnedCount > 0 ? Math.round((churnedTenureSum / churnedCount) * 10) / 10 : 0;

  const arpuGbp = activeCount > 0 ? Math.round((activeMrr / activeCount) * 100) / 100 : 0;
  const arpuAllGbp = Math.round((allRevenueSum / total) * 100) / 100;
  const avgSatisfactionScore = Math.round((satisfactionSum / total) * 10) / 10;
  const avgComplaintsPerCustomer = Math.round((complaintsSum / total) * 100) / 100;
  const avgResolutionHours = Math.round((resolutionSum / total) * 10) / 10;
  const avgOutages12M = Math.round((outagesSum / total) * 10) / 10;

  const npsData = computeNps(records);

  // Scored data metrics
  let predictedRevAtRisk = 0;
  let critCount = 0;
  let hiCount = 0;
  let medCount = 0;
  let loCount = 0;
  let critHiRev = 0;
  let estSavingsTopDecile = 0;

  if (scoredRecords && scoredRecords.length > 0) {
    const activeScored = scoredRecords.filter((s) => s.churnFlag === 0 && s.churnStatus === 'Active');
    for (const s of activeScored) {
      const p = s.churnProbability || 0;
      const charge = s.monthlyChargeGbp || 0;
      predictedRevAtRisk += p * charge;

      if (s.riskTier === 'Critical') {
        critCount++;
        critHiRev += charge;
      } else if (s.riskTier === 'High') {
        hiCount++;
        critHiRev += charge;
      } else if (s.riskTier === 'Medium') {
        medCount++;
      } else {
        loCount++;
      }
    }

    // Sort active customers by probability descending to find top decile (top 10%)
    const sorted = [...activeScored].sort((a, b) => b.churnProbability - a.churnProbability);
    const topDecileCount = Math.max(1, Math.floor(sorted.length * 0.10));
    const topDecile = sorted.slice(0, topDecileCount);

    let grossSaved = 0;
    let campaignCost = 0;
    for (const cust of topDecile) {
      const annualExposure = cust.monthlyChargeGbp * 12;
      // Retained value = exposure * probability * success rate
      grossSaved += annualExposure * cust.churnProbability * retentionSuccessRate;
      campaignCost += retentionOfferCost;
    }
    estSavingsTopDecile = Math.max(0, Math.round(grossSaved - campaignCost));
  } else {
    // If not scored yet, estimate from recorded risk
    predictedRevAtRisk = recordedRevAtRisk;
  }

  return {
    totalCustomers: total,
    activeCustomers: activeCount,
    churnedCustomers: churnedCount,
    churnRatePercent,
    activeRatePercent,
    avgTenureMonthsAll,
    avgTenureMonthsActive,
    avgTenureMonthsChurned,
    monthlyRecurringRevenueActiveGbp: Math.round(activeMrr * 100) / 100,
    monthlyRevenueAtRiskGbp: Math.round(recordedRevAtRisk * 100) / 100,
    modelPredictedMonthlyRevenueAtRiskGbp: Math.round(predictedRevAtRisk * 100) / 100,
    annualRevenueAtRiskGbp: Math.round(recordedRevAtRisk * 12 * 100) / 100,
    arpuGbp,
    arpuAllGbp,
    lifetimeRevenueTotalGbp: Math.round(lifetimeRevSum * 100) / 100,
    avgSatisfactionScore,
    npsScore: npsData.nps,
    promoterPercent: npsData.promoterPercent,
    passivePercent: npsData.passivePercent,
    detractorPercent: npsData.detractorPercent,
    npsScaleType: npsData.scaleType,
    totalComplaints12M: complaintsSum,
    avgComplaintsPerCustomer,
    avgResolutionHours,
    avgOutages12M,
    criticalRiskCount: critCount,
    highRiskCount: hiCount,
    mediumRiskCount: medCount,
    lowRiskCount: loCount,
    criticalHighRevenueGbp: Math.round(critHiRev * 100) / 100,
    estimatedAnnualSavingsTopDecileGbp: estSavingsTopDecile,
  };
}

/**
 * Currency formatter for GBP (£) in en-GB locale
 */
export function formatGbp(amount: number, compact: boolean = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '£0.00';
  if (compact) {
    if (Math.abs(amount) >= 1_000_000) {
      return `£${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `£${(amount / 1_000).toFixed(1)}k`;
    }
    return `£${amount.toFixed(0)}`;
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Percent formatter
 */
export function formatPercent(value: number, decimals: number = 1): string {
  if (isNaN(value) || value === null || value === undefined) return '0.0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Date formatter DD/MM/YYYY
 */
export function formatDateGb(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}
