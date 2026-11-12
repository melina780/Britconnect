/**
 * BritConnect Realistic Synthetic Data Generator
 * Generates 5,000 realistic UK telecom customer records adhering to the 38-column schema.
 * Features realistic causal relationships:
 * - High churn with month-to-month contracts, complaints, outages, competitor offers
 * - Low churn with 24M contracts, direct debit, bundled services, high satisfaction
 */

import { CustomerRecord, CustomerSegment, ServiceType, ContractType, UKNation } from '../types/customer';

// UK realistic distribution
const UK_NATIONS: UKNation[] = ['England', 'Scotland', 'Wales', 'Northern Ireland'];
const NATION_WEIGHTS = [0.84, 0.08, 0.05, 0.03];

const CITIES_BY_NATION: Record<UKNation, string[]> = {
  England: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol', 'Newcastle', 'Sheffield', 'Liverpool', 'Nottingham', 'Southampton'],
  Scotland: ['Glasgow', 'Edinburgh', 'Aberdeen', 'Dundee', 'Inverness'],
  Wales: ['Cardiff', 'Swansea', 'Newport', 'Wrexham'],
  'Northern Ireland': ['Belfast', 'Derry', 'Lisburn', 'Newry'],
};

const CHANNELS = ['Direct Web', 'Price Comparison Website', 'Retail Store', 'Telesales', 'Referral'];
const CONSUMER_PLANS: { name: string; service: ServiceType; charge: number; allowance: number }[] = [
  { name: 'Essential Fibre 50', service: 'Broadband', charge: 28.0, allowance: 100 },
  { name: 'Superfast Fibre 150', service: 'Broadband', charge: 36.0, allowance: 300 },
  { name: 'Ultrafast Pro 500', service: 'Broadband', charge: 48.0, allowance: 1000 },
  { name: 'Gigabit Full Fibre', service: 'Broadband', charge: 62.0, allowance: 2000 },
  { name: 'Smart Mobile 20GB', service: 'Mobile', charge: 18.0, allowance: 20 },
  { name: 'Unlimited 5G Mobile', service: 'Mobile', charge: 32.0, allowance: 1000 },
  { name: 'Home Trio (TV, Fibre & SIM)', service: 'Bundled', charge: 74.0, allowance: 500 },
  { name: 'Stream TV & Fibre 150', service: 'TV & Broadband', charge: 54.0, allowance: 350 },
];

const BIZ_PLANS: { name: string; service: ServiceType; charge: number; allowance: number }[] = [
  { name: 'Business Broadband Connect', service: 'Broadband', charge: 45.0, allowance: 500 },
  { name: 'Business Gigabit Leased Line', service: 'Broadband', charge: 120.0, allowance: 5000 },
  { name: 'Cloud Voice & SIP Trunking', service: 'VoIP', charge: 65.0, allowance: 200 },
  { name: 'Enterprise Bundle & 5G Backup', service: 'Bundled', charge: 165.0, allowance: 2000 },
];

const CHURN_REASONS = [
  'Competitor offered cheaper tariff',
  'Frequent network outages / poor speed',
  'Unresolved customer service complaint',
  'Price increase at end of contract',
  'Relocated outside coverage area',
  'Switched to alt-net full fibre provider',
  'Billing dispute and overage charges',
];

function pseudoRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateSampleDataset(count: number = 5000, seed: number = 42): CustomerRecord[] {
  const rand = pseudoRandom(seed);
  const records: CustomerRecord[] = [];

  const nowYear = 2024;
  const nowMonth = 10;

  for (let i = 1; i <= count; i++) {
    const custId = `BC-${String(i).padStart(6, '0')}`;
    const isBusiness = rand() < 0.22;
    const segment: CustomerSegment = isBusiness ? 'Small Business' : 'Consumer';

    // Demographics
    const age = isBusiness ? Math.floor(rand() * 40) + 25 : Math.floor(rand() * 65) + 18;
    let ageBand = '18-24';
    if (age >= 65) ageBand = '65+';
    else if (age >= 50) ageBand = '50-64';
    else if (age >= 35) ageBand = '35-49';
    else if (age >= 25) ageBand = '25-34';

    const gender = rand() < 0.49 ? 'Female' : rand() < 0.97 ? 'Male' : 'Non-binary/Other';

    // UK Nation
    const nationRoll = rand();
    let nation: UKNation = 'England';
    let cumulative = 0;
    for (let n = 0; n < UK_NATIONS.length; n++) {
      cumulative += NATION_WEIGHTS[n];
      if (nationRoll <= cumulative) {
        nation = UK_NATIONS[n];
        break;
      }
    }
    const cities = CITIES_BY_NATION[nation];
    const city = cities[Math.floor(rand() * cities.length)];
    const channel = CHANNELS[Math.floor(rand() * CHANNELS.length)];

    // Plan & Service
    const planPool = isBusiness ? BIZ_PLANS : CONSUMER_PLANS;
    const planChoice = planPool[Math.floor(rand() * planPool.length)];
    const serviceType = planChoice.service;
    const planName = planChoice.name;

    // Contract
    const contractRoll = rand();
    let contractType: ContractType = '24 Months';
    let contractMonths = 24;
    if (contractRoll < 0.25) {
      contractType = 'Month-to-Month';
      contractMonths = 1;
    } else if (contractRoll < 0.45) {
      contractType = '12 Months';
      contractMonths = 12;
    } else if (contractRoll < 0.90) {
      contractType = '24 Months';
      contractMonths = 24;
    } else {
      contractType = '36 Months';
      contractMonths = 36;
    }

    const autoRenew: 'Yes' | 'No' = rand() < 0.65 ? 'Yes' : 'No';

    // Tenure and Dates
    const tenureMonths = Math.max(1, Math.floor(rand() * 60) + (contractType === 'Month-to-Month' ? 2 : 6));
    const joinYear = Math.max(2019, nowYear - Math.floor(tenureMonths / 12));
    const joinMonth = Math.max(1, ((nowMonth - (tenureMonths % 12) + 12) % 12) || 12);
    const joinDay = Math.floor(rand() * 27) + 1;
    const joinDate = `${joinYear}-${String(joinMonth).padStart(2, '0')}-${String(joinDay).padStart(2, '0')}`;

    const contractStartDate = joinDate;
    let contractEndDate: string | null = null;
    if (contractType !== 'Month-to-Month') {
      const endYear = joinYear + Math.floor(contractMonths / 12);
      const endMonth = joinMonth;
      contractEndDate = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(joinDay).padStart(2, '0')}`;
    }

    // Charges & Usage
    const baseMonthlyCharge = planChoice.charge + (rand() * 10 - 5);
    const monthlyChargeGbp = Math.round(baseMonthlyCharge * 100) / 100;
    const dataAllowanceGb = planChoice.allowance;
    const usageRatio = 0.4 + rand() * 0.8; // 40% - 120%
    const averageMonthlyUsageGb = Math.round(dataAllowanceGb * usageRatio * 10) / 10;
    const overageChargesGbp = averageMonthlyUsageGb > dataAllowanceGb ? Math.round((averageMonthlyUsageGb - dataAllowanceGb) * 1.5 * 100) / 100 : 0;
    const discountPercent = rand() < 0.35 ? Math.floor(rand() * 25) + 5 : 0;

    const directDebit: 'Yes' | 'No' = rand() < 0.78 ? 'Yes' : 'No';
    const paymentMethod = directDebit === 'Yes' ? 'Direct Debit' : rand() < 0.6 ? 'Credit Card' : 'Manual Bank Transfer';

    // Payment stress
    const latePayments12M = rand() < 0.18 ? Math.floor(rand() * 4) + 1 : 0;
    const failedPayments12M = latePayments12M > 0 && rand() < 0.35 ? Math.floor(rand() * 2) + 1 : 0;

    // Support & Service Experience
    const supportTickets12M = Math.floor(rand() * 5);
    const complaints12M = rand() < 0.22 ? Math.floor(rand() * 4) + 1 : 0;
    const averageResolutionHours = Math.round((1.5 + rand() * 18 + complaints12M * 6) * 10) / 10;
    const networkOutages12M = rand() < 0.28 ? Math.floor(rand() * 5) + 1 : 0;

    // Satisfaction & NPS
    let baseCsat = 8;
    if (complaints12M > 1) baseCsat -= 3;
    if (networkOutages12M > 2) baseCsat -= 2;
    if (overageChargesGbp > 10) baseCsat -= 1;
    if (failedPayments12M > 0) baseCsat -= 1;
    const satisfactionScore110 = Math.max(1, Math.min(10, Math.round(baseCsat + (rand() * 3 - 1.5))));

    // NPS closely correlates with satisfaction (0-10 scale)
    const npsScore = Math.max(0, Math.min(10, satisfactionScore110 + (rand() < 0.2 ? (rand() > 0.5 ? 1 : -1) : 0)));
    const competitorOfferReceived: 'Yes' | 'No' = (rand() < 0.32 || (satisfactionScore110 <= 5 && rand() < 0.65)) ? 'Yes' : 'No';

    // Causal Churn Probability formula for synthetic ground truth
    let churnRiskScore = 0.08; // baseline UK telecom churn ~8-12%
    if (contractType === 'Month-to-Month') churnRiskScore += 0.28;
    if (contractType === '12 Months') churnRiskScore += 0.06;
    if (autoRenew === 'No') churnRiskScore += 0.12;
    if (complaints12M >= 2) churnRiskScore += 0.32;
    else if (complaints12M === 1) churnRiskScore += 0.14;
    if (networkOutages12M >= 3) churnRiskScore += 0.22;
    if (satisfactionScore110 <= 4) churnRiskScore += 0.35;
    else if (satisfactionScore110 <= 6) churnRiskScore += 0.12;
    if (competitorOfferReceived === 'Yes') churnRiskScore += 0.24;
    if (overageChargesGbp > 15) churnRiskScore += 0.15;
    if (failedPayments12M > 0) churnRiskScore += 0.18;
    if (directDebit === 'No') churnRiskScore += 0.08;
    if (tenureMonths <= 6) churnRiskScore += 0.10;
    if (tenureMonths > 36) churnRiskScore -= 0.08;

    churnRiskScore = Math.max(0.02, Math.min(0.96, churnRiskScore));

    const isChurned = rand() < churnRiskScore;
    const churnStatus: 'Active' | 'Churned' = isChurned ? 'Churned' : 'Active';
    const churnFlag = isChurned ? 1 : 0;

    let churnDate: string | null = null;
    let churnReason: string | null = null;
    if (isChurned) {
      const churnMonth = Math.max(1, Math.min(12, Math.floor(rand() * 10) + 1));
      const churnDay = Math.floor(rand() * 27) + 1;
      churnDate = `2024-${String(churnMonth).padStart(2, '0')}-${String(churnDay).padStart(2, '0')}`;

      if (complaints12M >= 2) {
        churnReason = 'Unresolved customer service complaint';
      } else if (networkOutages12M >= 2) {
        churnReason = 'Frequent network outages / poor speed';
      } else if (competitorOfferReceived === 'Yes') {
        churnReason = 'Competitor offered cheaper tariff';
      } else if (overageChargesGbp > 10) {
        churnReason = 'Billing dispute and overage charges';
      } else {
        churnReason = CHURN_REASONS[Math.floor(rand() * CHURN_REASONS.length)];
      }
    }

    const lifetimeRevenueGbp = Math.round(monthlyChargeGbp * tenureMonths * (1 - discountPercent / 100) * 100) / 100;
    // Monthly revenue at risk: populated for active customers with elevated risk, 0 for churned
    const monthlyRevenueAtRiskGbp = isChurned ? 0 : Math.round(monthlyChargeGbp * (churnRiskScore > 0.4 ? 1 : 0) * 100) / 100;

    records.push({
      customerId: custId,
      customerSegment: segment,
      age,
      ageBand,
      gender,
      ukNation: nation,
      city,
      acquisitionChannel: channel,
      joinDate,
      tenureMonths,
      serviceType,
      planName,
      contractType,
      contractStartDate,
      contractEndDate,
      autoRenew,
      monthlyChargeGbp,
      averageMonthlyUsageGb,
      dataAllowanceGb,
      overageChargesGbp,
      discountPercent,
      paymentMethod,
      directDebit,
      latePayments12M,
      failedPayments12M,
      supportTickets12M,
      complaints12M,
      averageResolutionHours,
      networkOutages12M,
      satisfactionScore110,
      npsScore,
      competitorOfferReceived,
      churnStatus,
      churnDate,
      churnReason,
      lifetimeRevenueGbp,
      monthlyRevenueAtRiskGbp,
      churnFlag,
    });
  }

  return records;
}
