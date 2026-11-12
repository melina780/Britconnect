/**
 * BritConnect Feature Engineering Engine
 * Derives rich predictive signals, interaction terms, ratios, and encodings
 * Includes correlation matrix and collinearity filtering (|r| > 0.95).
 */

import { CustomerRecord, EngineeredFeatures } from '../types/customer';

export interface FeatureCatalogueItem {
  name: string;
  category: 'Billing & Usage' | 'Contract & Lifecycle' | 'Service Friction' | 'Satisfaction & NPS' | 'Composite';
  plainEnglishDefinition: string;
  formula: string;
  businessRationale: string;
  type: 'Numeric' | 'Binary' | 'Categorical';
}

export const FEATURE_CATALOGUE: FeatureCatalogueItem[] = [
  {
    name: 'utilisationRatio',
    category: 'Billing & Usage',
    plainEnglishDefinition: 'Ratio of monthly data consumed to monthly data allowance',
    formula: 'averageMonthlyUsageGb / dataAllowanceGb',
    businessRationale: 'Customers under-utilising feel they overpay; customers over-utilising incur bill shock',
    type: 'Numeric',
  },
  {
    name: 'isOverAllowance',
    category: 'Billing & Usage',
    plainEnglishDefinition: 'Flag indicating whether the customer breached their monthly data cap',
    formula: '1 if averageMonthlyUsageGb > dataAllowanceGb else 0',
    businessRationale: 'Strong predictor of churn driven by unexpected bill surcharges',
    type: 'Binary',
  },
  {
    name: 'overageShare',
    category: 'Billing & Usage',
    plainEnglishDefinition: 'Proportion of total monthly bill represented by penalty overage charges',
    formula: 'overageChargesGbp / monthlyChargeGbp',
    businessRationale: 'High overage share directly causes pricing grievance and contract cancellation',
    type: 'Numeric',
  },
  {
    name: 'effectiveMonthlyPrice',
    category: 'Billing & Usage',
    plainEnglishDefinition: 'Net monthly price paid after deducting promotional discounts',
    formula: 'monthlyChargeGbp * (1 - discountPercent / 100)',
    businessRationale: 'Reflects real out-of-pocket customer cost before future promo expiration',
    type: 'Numeric',
  },
  {
    name: 'isDiscountDependent',
    category: 'Billing & Usage',
    plainEnglishDefinition: 'Flag identifying customers on steep introductory promotional discounts (>20%)',
    formula: '1 if discountPercent >= 20 else 0',
    businessRationale: 'Discount shoppers exhibit extreme price sensitivity and churn upon renewal',
    type: 'Binary',
  },
  {
    name: 'pricePerGb',
    category: 'Billing & Usage',
    plainEnglishDefinition: 'Effective unit cost of data (£ per gigabyte)',
    formula: 'effectiveMonthlyPrice / max(1, dataAllowanceGb)',
    businessRationale: 'Normalises value perception across disparate broadband speed and data tiers',
    type: 'Numeric',
  },
  {
    name: 'tenureBucket',
    category: 'Contract & Lifecycle',
    plainEnglishDefinition: 'Customer lifecycle phase bucketed into discrete maturity cohorts',
    formula: '0-6m, 7-12m, 13-24m, 25-48m, 49m+',
    businessRationale: 'First 6 months represent highest vulnerability; >48m indicates entrenched brand loyalty',
    type: 'Categorical',
  },
  {
    name: 'isNewCustomer',
    category: 'Contract & Lifecycle',
    plainEnglishDefinition: 'Flag for early-stage customer relationships (tenure 6 months or fewer)',
    formula: '1 if tenureMonths <= 6 else 0',
    businessRationale: 'Onboarding drop-off is critical for telecommunications retention interventions',
    type: 'Binary',
  },
  {
    name: 'monthsToContractEnd',
    category: 'Contract & Lifecycle',
    plainEnglishDefinition: 'Months remaining until current fixed commitment terminates',
    formula: 'Computed relative to portfolio dataset reference date',
    businessRationale: 'Churn risk peaks in the 90 days preceding contract expiration (Ofcom notification window)',
    type: 'Numeric',
  },
  {
    name: 'isOutOfContract',
    category: 'Contract & Lifecycle',
    plainEnglishDefinition: 'Flag indicating customer is operating on expired, out-of-contract terms',
    formula: '1 if contractEndDate <= datasetDate or contractType == Month-to-Month else 0',
    businessRationale: 'Out-of-contract customers are immediately vulnerable to competitor poaching',
    type: 'Binary',
  },
  {
    name: 'isContractEndingSoon',
    category: 'Contract & Lifecycle',
    plainEnglishDefinition: 'Flag indicating commitment ends within 3 months',
    formula: '1 if monthsToContractEnd <= 3 and monthsToContractEnd > 0 else 0',
    businessRationale: 'Target window for proactive UK Ofcom end-of-contract renewal notifications',
    type: 'Binary',
  },
  {
    name: 'autoRenewAndContractInteraction',
    category: 'Contract & Lifecycle',
    plainEnglishDefinition: 'Interaction term between auto-renewal commitment and rolling contract',
    formula: '1 if autoRenew == No and isOutOfContract == 1 else 0',
    businessRationale: 'Identifies immediate flight risks with zero contractual lock-in',
    type: 'Binary',
  },
  {
    name: 'paymentRiskScore',
    category: 'Billing & Usage',
    plainEnglishDefinition: 'Composite financial stress index weighting late and bounced direct debits',
    formula: 'latePayments12M + 2 * failedPayments12M',
    businessRationale: 'Payment failure is frequently an early warning indicator of involuntary or distressed churn',
    type: 'Numeric',
  },
  {
    name: 'serviceFrictionIndex',
    category: 'Service Friction',
    plainEnglishDefinition: 'Holistic operational friction score capturing outages, tickets, and formal complaints',
    formula: 'supportTickets12M + 2 * complaints12M + networkOutages12M + (avgResolutionHours > 24 ? 2 : 0)',
    businessRationale: 'Customer frustration compounds exponentially with repeated unresolved incidents',
    type: 'Numeric',
  },
  {
    name: 'complaintsPerTicketRatio',
    category: 'Service Friction',
    plainEnglishDefinition: 'Ratio of escalated complaints to total support interactions',
    formula: 'complaints12M / max(1, supportTickets12M)',
    businessRationale: 'Measures severity of technical dissatisfaction rather than simple contact volume',
    type: 'Numeric',
  },
  {
    name: 'satisfactionBand',
    category: 'Satisfaction & NPS',
    plainEnglishDefinition: 'Segmented customer sentiment grouping',
    formula: 'Low (1-4), Medium (5-7), High (8-10)',
    businessRationale: 'Direct indicator of emotional loyalty and customer retention likelihood',
    type: 'Categorical',
  },
  {
    name: 'npsCategory',
    category: 'Satisfaction & NPS',
    plainEnglishDefinition: 'Net Promoter category based on advocacy rating',
    formula: 'Detractor, Passive, Promoter',
    businessRationale: 'Industry-standard metric correlating strongly with word-of-mouth and competitor susceptibility',
    type: 'Categorical',
  },
  {
    name: 'competitorPressure',
    category: 'Composite',
    plainEnglishDefinition: 'Compounded risk when customer received competitor solicitation while dissatisfied',
    formula: '1 if competitorOfferReceived == Yes and satisfactionScore110 <= 6 else 0',
    businessRationale: 'Extremely high conversion risk for competing UK alt-net providers',
    type: 'Binary',
  },
  {
    name: 'customerValueTier',
    category: 'Composite',
    plainEnglishDefinition: 'Revenue quartile tier based on monthly spend',
    formula: 'Tier 1 (>£65), Tier 2 (£45-65), Tier 3 (£30-45), Tier 4 (<£30)',
    businessRationale: 'Enables prioritisation of high-MRR customers in retention budget allocation',
    type: 'Categorical',
  },
];

/**
 * Extracts and engineers all features for a single customer record
 */
export function engineerCustomerFeatures(record: CustomerRecord, maxDatasetDate: Date): EngineeredFeatures {
  const usage = record.averageMonthlyUsageGb || 0;
  const allowance = Math.max(1, record.dataAllowanceGb || 1);
  const monthlyCharge = Math.max(0.1, record.monthlyChargeGbp || 1);
  const discount = record.discountPercent || 0;
  const overage = record.overageChargesGbp || 0;

  // 1. Ratios
  const utilisationRatio = Math.round((usage / allowance) * 100) / 100;
  const isOverAllowance = usage > allowance ? 1 : 0;
  const overageShare = Math.round((overage / monthlyCharge) * 100) / 100;

  const effectiveMonthlyPrice = Math.round(monthlyCharge * (1 - discount / 100) * 100) / 100;
  const isDiscountDependent = discount >= 20 ? 1 : 0;
  const pricePerGb = Math.round((effectiveMonthlyPrice / allowance) * 100) / 100;

  // 2. Lifecycle & Tenure Buckets
  const tenure = record.tenureMonths || 0;
  let tenureBucket: EngineeredFeatures['tenureBucket'] = '25-48m';
  if (tenure <= 6) tenureBucket = '0-6m';
  else if (tenure <= 12) tenureBucket = '7-12m';
  else if (tenure <= 24) tenureBucket = '13-24m';
  else if (tenure <= 48) tenureBucket = '25-48m';
  else tenureBucket = '49m+';

  const isNewCustomer = tenure <= 6 ? 1 : 0;

  // Contract timing relative to max date
  let monthsToContractEnd = 0;
  let isOutOfContract = 0;
  let isContractEndingSoon = 0;

  if (record.contractType === 'Month-to-Month') {
    monthsToContractEnd = 0;
    isOutOfContract = 1;
  } else if (record.contractEndDate) {
    const endDate = new Date(record.contractEndDate);
    if (!isNaN(endDate.getTime())) {
      const diffMs = endDate.getTime() - maxDatasetDate.getTime();
      const diffMonths = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4375));
      monthsToContractEnd = Math.max(0, diffMonths);
      isOutOfContract = diffMonths <= 0 ? 1 : 0;
      isContractEndingSoon = diffMonths > 0 && diffMonths <= 3 ? 1 : 0;
    }
  }

  const autoRenewAndContractInteraction = record.autoRenew === 'No' && isOutOfContract === 1 ? 1 : 0;

  // 3. Payment & Friction
  const paymentRiskScore = (record.latePayments12M || 0) + 2 * (record.failedPayments12M || 0);
  const isDirectDebit = record.directDebit === 'Yes' ? 1 : 0;

  const tickets = record.supportTickets12M || 0;
  const complaints = record.complaints12M || 0;
  const outages = record.networkOutages12M || 0;
  const resHours = record.averageResolutionHours || 0;

  const serviceFrictionIndex = tickets + 2 * complaints + outages + (resHours > 24 ? 2 : 0);
  const complaintsPerTicketRatio = Math.round((complaints / Math.max(1, tickets)) * 100) / 100;

  // 4. Sentiment & NPS
  const sat = record.satisfactionScore110 || 7;
  let satisfactionBand: EngineeredFeatures['satisfactionBand'] = 'Medium (5-7)';
  if (sat <= 4) satisfactionBand = 'Low (1-4)';
  else if (sat >= 8) satisfactionBand = 'High (8-10)';

  const nps = record.npsScore;
  let npsCategory: EngineeredFeatures['npsCategory'] = 'Passive';
  if (nps >= 9 || nps >= 30) npsCategory = 'Promoter';
  else if (nps <= 6 || nps < -10) npsCategory = 'Detractor';

  const competitorPressure = record.competitorOfferReceived === 'Yes' && sat <= 6 ? 1 : 0;

  // 5. Value Tier
  let customerValueTier: EngineeredFeatures['customerValueTier'] = 'Tier 3 (Mid-Low)';
  if (monthlyCharge >= 65) customerValueTier = 'Tier 1 (High)';
  else if (monthlyCharge >= 45) customerValueTier = 'Tier 2 (Mid-High)';
  else if (monthlyCharge >= 30) customerValueTier = 'Tier 3 (Mid-Low)';
  else customerValueTier = 'Tier 4 (Low)';

  return {
    utilisationRatio,
    isOverAllowance,
    overageShare,
    effectiveMonthlyPrice,
    isDiscountDependent,
    pricePerGb,
    tenureBucket,
    isNewCustomer,
    monthsToContractEnd,
    isOutOfContract,
    isContractEndingSoon,
    autoRenewAndContractInteraction,
    paymentRiskScore,
    isDirectDebit,
    serviceFrictionIndex,
    complaintsPerTicketRatio,
    satisfactionBand,
    npsCategory,
    competitorPressure,
    customerValueTier,
  };
}

/**
 * Finds the latest date in the dataset to anchor contract calculations
 */
export function findMaxDatasetDate(records: CustomerRecord[]): Date {
  let maxTime = new Date('2024-01-01').getTime();
  for (const r of records) {
    if (r.contractStartDate) {
      const t = new Date(r.contractStartDate).getTime();
      if (!isNaN(t) && t > maxTime) maxTime = t;
    }
    if (r.joinDate) {
      const t = new Date(r.joinDate).getTime();
      if (!isNaN(t) && t > maxTime) maxTime = t;
    }
  }
  return new Date(maxTime);
}

/**
 * Encodes engineered and raw feature set into a numerical vector suitable for ML
 * Strictly adheres to Leakage Guard:
 * - Excludes Churn Status, Churn Date, Churn Reason, Monthly Revenue at Risk, Customer ID, Churn Flag
 * - Optional Lifetime Revenue (default off)
 * - Optional Demographics (Gender, Age) (default off for fairness)
 */
export function buildFeatureVector(
  record: CustomerRecord,
  engineered: EngineeredFeatures,
  options: {
    includeLifetimeRevenue?: boolean;
    includeGender?: boolean;
    includeAge?: boolean;
  } = {}
): { names: string[]; vector: number[] } {
  const names: string[] = [];
  const vector: number[] = [];

  const add = (name: string, val: number) => {
    names.push(name);
    vector.push(isNaN(val) || !isFinite(val) ? 0 : val);
  };

  // 1. Contract & Plan Encodings
  add('contract_month_to_month', record.contractType === 'Month-to-Month' ? 1 : 0);
  add('contract_12m', record.contractType === '12 Months' ? 1 : 0);
  add('contract_24m', record.contractType === '24 Months' ? 1 : 0);
  add('contract_36m', record.contractType === '36 Months' ? 1 : 0);
  add('auto_renew', record.autoRenew === 'Yes' ? 1 : 0);
  add('is_out_of_contract', engineered.isOutOfContract);
  add('is_contract_ending_soon', engineered.isContractEndingSoon);
  add('auto_renew_out_of_contract_interaction', engineered.autoRenewAndContractInteraction);

  // 2. Segment & Service Encodings
  add('segment_small_business', record.customerSegment === 'Small Business' ? 1 : 0);
  add('service_broadband', record.serviceType === 'Broadband' ? 1 : 0);
  add('service_mobile', record.serviceType === 'Mobile' ? 1 : 0);
  add('service_bundled', record.serviceType === 'Bundled' ? 1 : 0);
  add('service_tv', record.serviceType === 'TV & Broadband' ? 1 : 0);

  // 3. Billing & Financial Features
  add('monthly_charge', record.monthlyChargeGbp);
  add('effective_monthly_price', engineered.effectiveMonthlyPrice);
  add('discount_percent', record.discountPercent);
  add('is_discount_dependent', engineered.isDiscountDependent);
  add('overage_charges', record.overageChargesGbp);
  add('overage_share', engineered.overageShare);
  add('price_per_gb', engineered.pricePerGb);
  add('direct_debit', engineered.isDirectDebit);
  add('payment_risk_score', engineered.paymentRiskScore);

  // 4. Usage & Utilisation
  add('avg_monthly_usage_gb', record.averageMonthlyUsageGb);
  add('data_allowance_gb', record.dataAllowanceGb);
  add('utilisation_ratio', engineered.utilisationRatio);
  add('is_over_allowance', engineered.isOverAllowance);

  // 5. Service Quality & Operational Friction
  add('tenure_months', record.tenureMonths);
  add('is_new_customer', engineered.isNewCustomer);
  add('support_tickets_12m', record.supportTickets12M);
  add('complaints_12m', record.complaints12M);
  add('average_resolution_hours', record.averageResolutionHours);
  add('network_outages_12m', record.networkOutages12M);
  add('service_friction_index', engineered.serviceFrictionIndex);
  add('complaints_per_ticket_ratio', engineered.complaintsPerTicketRatio);

  // 6. Sentiment & Competitor Action
  add('satisfaction_score_1_10', record.satisfactionScore110);
  add('nps_score', record.npsScore);
  add('competitor_offer_received', record.competitorOfferReceived === 'Yes' ? 1 : 0);
  add('competitor_pressure', engineered.competitorPressure);

  // 7. Optional Features (Configurable by user in Model Settings)
  if (options.includeLifetimeRevenue) {
    add('lifetime_revenue_gbp', record.lifetimeRevenueGbp);
  }
  if (options.includeAge) {
    add('customer_age', record.age);
  }
  if (options.includeGender) {
    add('gender_female', record.gender.toLowerCase() === 'female' ? 1 : 0);
  }

  return { names, vector };
}

/**
 * Checks for high multicollinearity (|r| > 0.95) among numerical features and logs drops
 */
export function detectMulticollinearity(
  matrix: number[][],
  featureNames: string[]
): { droppedFeatures: string[]; collinearPairs: { f1: string; f2: string; corr: number }[] } {
  const n = matrix.length;
  if (n < 2) return { droppedFeatures: [], collinearPairs: [] };
  const p = featureNames.length;

  // Means & Stds
  const means: number[] = new Array(p).fill(0);
  const stds: number[] = new Array(p).fill(0);

  for (let j = 0; j < p; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += matrix[i][j];
    means[j] = sum / n;

    let varSum = 0;
    for (let i = 0; i < n; i++) varSum += Math.pow(matrix[i][j] - means[j], 2);
    stds[j] = Math.sqrt(varSum / (n - 1)) || 1e-6;
  }

  const dropped = new Set<string>();
  const collinearPairs: { f1: string; f2: string; corr: number }[] = [];

  for (let j1 = 0; j1 < p; j1++) {
    for (let j2 = j1 + 1; j2 < p; j2++) {
      let cov = 0;
      for (let i = 0; i < n; i++) {
        cov += (matrix[i][j1] - means[j1]) * (matrix[i][j2] - means[j2]);
      }
      const r = cov / ((n - 1) * stds[j1] * stds[j2]);
      if (Math.abs(r) > 0.95) {
        collinearPairs.push({
          f1: featureNames[j1],
          f2: featureNames[j2],
          corr: Math.round(r * 1000) / 1000,
        });
        // Drop the second feature to avoid singularity
        dropped.add(featureNames[j2]);
      }
    }
  }

  return { droppedFeatures: Array.from(dropped), collinearPairs };
}
