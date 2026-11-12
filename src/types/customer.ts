/**
 * BritConnect AI Customer Churn Intelligence Platform
 * Core Data Models and Domain Types
 */

export type CustomerSegment = 'Consumer' | 'Small Business';
export type UKNation = 'England' | 'Scotland' | 'Wales' | 'Northern Ireland';
export type ChurnStatus = 'Active' | 'Churned';
export type ServiceType = 'Broadband' | 'Mobile' | 'Bundled' | 'TV & Broadband' | 'VoIP';
export type ContractType = 'Month-to-Month' | '12 Months' | '24 Months' | '36 Months';
export type RiskTier = 'Critical' | 'High' | 'Medium' | 'Low';

export interface RawCustomerRecord {
  [key: string]: any;
}

export interface CustomerRecord {
  // 1-8: Demographics & Acquisition
  customerId: string;
  customerSegment: CustomerSegment;
  age: number;
  ageBand: string;
  gender: string;
  ukNation: UKNation;
  city: string;
  acquisitionChannel: string;

  // 9-16: Tenure & Contract
  joinDate: string; // ISO format YYYY-MM-DD
  tenureMonths: number;
  serviceType: ServiceType;
  planName: string;
  contractType: ContractType;
  contractStartDate: string;
  contractEndDate: string | null;
  autoRenew: 'Yes' | 'No';

  // 17-23: Billing & Usage
  monthlyChargeGbp: number;
  averageMonthlyUsageGb: number;
  dataAllowanceGb: number;
  overageChargesGbp: number;
  discountPercent: number;
  paymentMethod: string;
  directDebit: 'Yes' | 'No';

  // 24-32: Service & Experience
  latePayments12M: number;
  failedPayments12M: number;
  supportTickets12M: number;
  complaints12M: number;
  averageResolutionHours: number;
  networkOutages12M: number;
  satisfactionScore110: number; // 1-10
  npsScore: number; // raw advocacy score recorded
  competitorOfferReceived: 'Yes' | 'No';

  // 33-38: Outcomes & Financials
  churnStatus: ChurnStatus;
  churnDate: string | null;
  churnReason: string | null;
  lifetimeRevenueGbp: number;
  monthlyRevenueAtRiskGbp: number;
  churnFlag: number; // 1 = Churned, 0 = Active

  // Cleaned / Imputation flags
  _wasImputed?: Record<string, boolean>;
  _validationErrors?: string[];
}

export interface EngineeredFeatures {
  utilisationRatio: number;
  isOverAllowance: number;
  overageShare: number;
  effectiveMonthlyPrice: number;
  isDiscountDependent: number;
  pricePerGb: number;
  tenureBucket: '0-6m' | '7-12m' | '13-24m' | '25-48m' | '49m+';
  isNewCustomer: number;
  monthsToContractEnd: number;
  isOutOfContract: number;
  isContractEndingSoon: number;
  autoRenewAndContractInteraction: number;
  paymentRiskScore: number;
  isDirectDebit: number;
  serviceFrictionIndex: number;
  complaintsPerTicketRatio: number;
  satisfactionBand: 'Low (1-4)' | 'Medium (5-7)' | 'High (8-10)';
  npsCategory: 'Detractor' | 'Passive' | 'Promoter';
  competitorPressure: number;
  customerValueTier: 'Tier 1 (High)' | 'Tier 2 (Mid-High)' | 'Tier 3 (Mid-Low)' | 'Tier 4 (Low)';
  [key: string]: any;
}

export interface ScoredCustomerRecord extends CustomerRecord {
  features: EngineeredFeatures;
  churnProbability: number; // 0 to 1
  riskTier: RiskTier;
  predictedRevenueAtRiskGbp: number;
  expectedLoss12mGbp: number;
  confidenceLower: number;
  confidenceUpper: number;
  topDrivers: {
    feature: string;
    label: string;
    importance: number;
    impact: 'pushes_risk_up' | 'pushes_risk_down';
    actualValue: string | number;
    portfolioAvg: string | number;
  }[];
  reasonCode: string;
  recommendedAction: string;
  clusterId?: number;
}

export interface ColumnDefinition {
  num: number;
  name: string;
  type: 'Text' | 'Whole Number' | 'Decimal Number' | 'Date';
  description: string;
  required: boolean;
  allowedValues?: string[];
  isTarget?: boolean;
  isLeakage?: boolean;
  leakageReason?: string;
}

export interface DataQualityReport {
  overallScore: number; // 0-100
  completenessScore: number;
  validityScore: number;
  uniquenessScore: number;
  consistencyScore: number;
  totalRows: number;
  duplicateRowsRemoved: number;
  duplicateIdsResolved: number;
  violations: {
    rule: string;
    field: string;
    affectedCount: number;
    affectedPercent: number;
    examples: string[];
    actionTaken: string;
  }[];
  cleanedSummary: {
    missingImputed: number;
    outliersWinsorised: number;
    nearDuplicatesMerged: number;
    inconsistenciesResolved: number;
  };
  observedNpsRange: { min: number; max: number; isTenScale: boolean };
}

export interface ModelMetrics {
  rocAuc: number;
  prAuc: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  specificity: number;
  brierScore: number;
  logLoss: number;
  confusionMatrix: {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
  };
  rocCurve: { fpr: number; tpr: number; threshold: number }[];
  prCurve: { recall: number; precision: number; threshold: number }[];
  calibrationCurve: { meanPredicted: number; observedFrequency: number; count: number }[];
  liftGainCurve: { decile: number; cumulativePercentChurners: number; lift: number }[];
  optimalThreshold: number;
  optimalThresholdCost: number;
  crossValRocAucMean: number;
  crossValRocAucStd: number;
  suspiciousLeakageWarning: boolean;
}

export interface ModelSettings {
  includeLifetimeRevenue: boolean;
  includeDemographicsGender: boolean;
  includeDemographicsAge: boolean;
  retentionOfferCost: number; // default £25
  retentionSuccessRate: number; // default 0.30
  retentionHorizonMonths: number; // default 12
  riskThresholdCritical: number; // default 0.70
  riskThresholdHigh: number; // default 0.50
  riskThresholdMedium: number; // default 0.30
}

export interface CampaignRecord {
  id: string;
  name: string;
  objective: string;
  targetSegment: string;
  channel: 'Direct Phone Call' | 'SMS' | 'Personalised Email' | 'MyAccount App' | 'Field Retention Team';
  offer: string;
  startDate: string;
  endDate: string;
  costPerContactGbp: number;
  budgetGbp: number;
  controlGroupPercent: number;
  createdAt: string;

  // Outcome Tracking
  targetedCount: number;
  contactedCount: number;
  respondedCount: number;
  offerAcceptedCount: number;
  retainedTreatmentCount: number;
  churnedTreatmentCount: number;
  controlTotalCount: number;
  retainedControlCount: number;
  churnedControlCount: number;

  // Calculated Metrics
  reachPercent: number;
  responseRatePercent: number;
  offerTakeUpPercent: number;
  treatmentRetentionRatePercent: number;
  controlRetentionRatePercent: number;
  upliftPercent: number;
  isSignificant: boolean;
  confidenceInterval: [number, number];
  grossRevenueSavedGbp: number;
  totalCampaignCostGbp: number;
  netBenefitGbp: number;
  roiPercent: number;
  costPerSavedCustomerGbp: number;
}

export interface AIRecommendation {
  headline: string;
  riskSummary: {
    probabilityPercent: number;
    tier: RiskTier;
    monthlyRevenueAtRiskGbp: number;
    annualExposureGbp: number;
  };
  evidence: {
    metric: string;
    customerValue: string | number;
    portfolioAvg: string | number;
    significance: string;
  }[];
  rootCause: string;
  primaryDriverCategory: string;
  recommendedActions: {
    priority: 'P1 Immediate (Within 7 Days)' | 'P2 Short-term (Within 30 Days)' | 'P3 Medium-term (Within 90 Days)';
    actionTitle: string;
    channel: string;
    owner: string;
    offerDetails: string;
    costEstimateGbp: number;
    implementationSteps: string[];
  }[];
  expectedImpact: {
    probabilityReductionPercent: number;
    expectedRevenueRetained12mGbp: number;
    netBenefitGbp: number;
    paybackMonths: number;
    roiPercent: number;
    assumptionsNote: string;
  };
  kpis: {
    name: string;
    baseline: string;
    target: string;
    window: string;
    dataSource: string;
  }[];
  complianceNotes: {
    gdpr: string;
    pecr: string;
    ofcomRules: string;
  };
  personalisedScript: string;
}

export interface DatasetVersion {
  id: string;
  versionNumber: number;
  uploadedAt: string;
  fileName: string;
  rowCount: number;
  activeCount: number;
  churnedCount: number;
  dataQualityScore: number;
  notes: string;
}

export interface GlobalFilterState {
  customerSegment: string;
  ukNation: string;
  serviceType: string;
  contractType: string;
  joinDateStart: string;
  joinDateEnd: string;
  searchQuery: string;
}
