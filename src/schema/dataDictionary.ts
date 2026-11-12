/**
 * BritConnect Official Data Dictionary (38 Columns)
 * Contains metadata, field types, constraints, fuzzy column aliases, and leakage rules.
 */

import { ColumnDefinition } from '../types/customer';

export const DATA_DICTIONARY: ColumnDefinition[] = [
  {
    num: 1,
    name: 'Customer ID',
    type: 'Text',
    description: 'Unique identifier assigned to each customer.',
    required: true,
    isLeakage: true,
    leakageReason: 'Identifier field (arbitrary unique key; non-predictive identity)',
  },
  {
    num: 2,
    name: 'Customer Segment',
    type: 'Text',
    description: 'Customer classification (Consumer or Small Business).',
    required: true,
    allowedValues: ['Consumer', 'Small Business'],
  },
  {
    num: 3,
    name: 'Age',
    type: 'Whole Number',
    description: 'Customer age in years (16 - 110). Protected demographic attribute.',
    required: true,
  },
  {
    num: 4,
    name: 'Age Band',
    type: 'Text',
    description: 'Age grouping used for demographic analysis (e.g. 18-24, 25-34, 35-49, 50-64, 65+).',
    required: true,
  },
  {
    num: 5,
    name: 'Gender',
    type: 'Text',
    description: 'Recorded customer gender. Protected demographic attribute.',
    required: false,
  },
  {
    num: 6,
    name: 'UK Nation',
    type: 'Text',
    description: 'UK constituent nation (England, Scotland, Wales, Northern Ireland).',
    required: true,
    allowedValues: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  },
  {
    num: 7,
    name: 'City',
    type: 'Text',
    description: 'Customer city in the United Kingdom.',
    required: true,
  },
  {
    num: 8,
    name: 'Acquisition Channel',
    type: 'Text',
    description: 'Channel through which the customer was acquired (e.g., Direct, Price Comparison Website, Retail Store, Telesales).',
    required: true,
  },
  {
    num: 9,
    name: 'Join Date',
    type: 'Date',
    description: 'Date the customer first joined BritConnect (DD/MM/YYYY or ISO).',
    required: true,
  },
  {
    num: 10,
    name: 'Tenure Months',
    type: 'Whole Number',
    description: 'Length of customer relationship in months (must be >= 0).',
    required: true,
  },
  {
    num: 11,
    name: 'Service Type',
    type: 'Text',
    description: 'Telecommunications service subscribed to (Broadband, Mobile, Bundled, etc.).',
    required: true,
  },
  {
    num: 12,
    name: 'Plan Name',
    type: 'Text',
    description: 'Name of the subscription package.',
    required: true,
  },
  {
    num: 13,
    name: 'Contract Type',
    type: 'Text',
    description: 'Contract arrangement (Month-to-Month, 12 Months, 24 Months, 36 Months).',
    required: true,
    allowedValues: ['Month-to-Month', '12 Months', '24 Months', '36 Months'],
  },
  {
    num: 14,
    name: 'Contract Start Date',
    type: 'Date',
    description: 'Date the current contract began.',
    required: true,
  },
  {
    num: 15,
    name: 'Contract End Date',
    type: 'Date',
    description: 'Scheduled contract expiry date, where applicable (blank for month-to-month).',
    required: false,
  },
  {
    num: 16,
    name: 'Auto Renew',
    type: 'Text',
    description: 'Whether the contract renews automatically (Yes/No).',
    required: true,
    allowedValues: ['Yes', 'No'],
  },
  {
    num: 17,
    name: 'Monthly Charge GBP',
    type: 'Decimal Number',
    description: 'Monthly subscription charge in GBP (£).',
    required: true,
  },
  {
    num: 18,
    name: 'Average Monthly Usage GB',
    type: 'Decimal Number',
    description: 'Average monthly data usage in gigabytes.',
    required: true,
  },
  {
    num: 19,
    name: 'Data Allowance GB',
    type: 'Whole Number',
    description: 'Included monthly data allowance in gigabytes.',
    required: true,
  },
  {
    num: 20,
    name: 'Overage Charges GBP',
    type: 'Decimal Number',
    description: 'Additional usage charges in GBP (£).',
    required: true,
  },
  {
    num: 21,
    name: 'Discount Percent',
    type: 'Decimal Number',
    description: 'Discount percentage applied to the subscription (0 - 100%).',
    required: true,
  },
  {
    num: 22,
    name: 'Payment Method',
    type: 'Text',
    description: 'Customer payment method (e.g. Direct Debit, Credit Card, Bank Transfer).',
    required: true,
  },
  {
    num: 23,
    name: 'Direct Debit',
    type: 'Text',
    description: 'Whether the customer pays by direct debit (Yes/No).',
    required: true,
    allowedValues: ['Yes', 'No'],
  },
  {
    num: 24,
    name: 'Late Payments 12M',
    type: 'Whole Number',
    description: 'Number of late payments in the preceding 12 months.',
    required: true,
  },
  {
    num: 25,
    name: 'Failed Payments 12M',
    type: 'Whole Number',
    description: 'Number of failed payments in the preceding 12 months.',
    required: true,
  },
  {
    num: 26,
    name: 'Support Tickets 12M',
    type: 'Whole Number',
    description: 'Number of support tickets in the preceding 12 months.',
    required: true,
  },
  {
    num: 27,
    name: 'Complaints 12M',
    type: 'Whole Number',
    description: 'Number of formal complaints logged in the preceding 12 months.',
    required: true,
  },
  {
    num: 28,
    name: 'Average Resolution Hours',
    type: 'Decimal Number',
    description: 'Average support issue resolution time in hours.',
    required: true,
  },
  {
    num: 29,
    name: 'Network Outages 12M',
    type: 'Whole Number',
    description: 'Number of network outages experienced in the preceding 12 months.',
    required: true,
  },
  {
    num: 30,
    name: 'Satisfaction Score 1 10',
    type: 'Whole Number',
    description: 'Customer satisfaction score on an integer scale from 1 to 10.',
    required: true,
  },
  {
    num: 31,
    name: 'NPS Score',
    type: 'Whole Number',
    description: 'Customer advocacy score recorded; higher values indicate stronger advocacy.',
    required: true,
  },
  {
    num: 32,
    name: 'Competitor Offer Received',
    type: 'Text',
    description: 'Whether the customer received a competitor offer (Yes/No).',
    required: true,
    allowedValues: ['Yes', 'No'],
  },
  {
    num: 33,
    name: 'Churn Status',
    type: 'Text',
    description: 'Recorded customer state: Active or Churned.',
    required: true,
    allowedValues: ['Active', 'Churned'],
    isLeakage: true,
    leakageReason: 'Direct outcome label (target equivalent; leaking this gives trivial 100% AUC)',
  },
  {
    num: 34,
    name: 'Churn Date',
    type: 'Date',
    description: 'Cancellation/churn date; blank for active customers.',
    required: false,
    isLeakage: true,
    leakageReason: 'Post-event timestamp (only present after churn has occurred)',
  },
  {
    num: 35,
    name: 'Churn Reason',
    type: 'Text',
    description: 'Recorded cancellation reason; blank for active customers.',
    required: false,
    isLeakage: true,
    leakageReason: 'Post-event feedback recorded during cancellation exit survey',
  },
  {
    num: 36,
    name: 'Lifetime Revenue GBP',
    type: 'Decimal Number',
    description: 'Cumulative recorded revenue from the customer in GBP (£). Optional model feature (default OFF) due to duration leakage.',
    required: true,
    isLeakage: false, // Optional toggle in model settings
    leakageReason: 'May subtly proxy tenure or churn timing. Toggleable in Model Settings (default OFF).',
  },
  {
    num: 37,
    name: 'Monthly Revenue At Risk GBP',
    type: 'Decimal Number',
    description: 'Estimated monthly revenue exposed to churn in GBP (£). Use strictly for reporting.',
    required: true,
    isLeakage: true,
    leakageReason: 'Derived business reporting field that encodes pre-assumed churn exposure',
  },
  {
    num: 38,
    name: 'Churn Flag',
    type: 'Whole Number',
    description: 'Binary churn outcome: 1 = Churned, 0 = Active. Primary target variable.',
    required: true,
    allowedValues: ['0', '1'],
    isTarget: true,
    isLeakage: true,
    leakageReason: 'Ground-truth supervision target variable (y)',
  },
];

/**
 * Fuzzy aliases mapping various header variations to standardized camelCase fields
 */
export const FUZZY_HEADER_MAP: Record<string, string> = {
  // 1
  'customerid': 'customerId',
  'customer_id': 'customerId',
  'cust_id': 'customerId',
  'id': 'customerId',

  // 2
  'customersegment': 'customerSegment',
  'customer_segment': 'customerSegment',
  'segment': 'customerSegment',

  // 3
  'age': 'age',

  // 4
  'ageband': 'ageBand',
  'age_band': 'ageBand',
  'agegroup': 'ageBand',
  'age_group': 'ageBand',

  // 5
  'gender': 'gender',
  'sex': 'gender',

  // 6
  'uknation': 'ukNation',
  'uk_nation': 'ukNation',
  'nation': 'ukNation',
  'country': 'ukNation',

  // 7
  'city': 'city',
  'town': 'city',

  // 8
  'acquisitionchannel': 'acquisitionChannel',
  'acquisition_channel': 'acquisitionChannel',
  'channel': 'acquisitionChannel',

  // 9
  'joindate': 'joinDate',
  'join_date': 'joinDate',
  'startdate': 'joinDate',
  'signup_date': 'joinDate',

  // 10
  'tenuremonths': 'tenureMonths',
  'tenure_months': 'tenureMonths',
  'tenure': 'tenureMonths',

  // 11
  'servicetype': 'serviceType',
  'service_type': 'serviceType',
  'service': 'serviceType',

  // 12
  'planname': 'planName',
  'plan_name': 'planName',
  'plan': 'planName',
  'package': 'planName',

  // 13
  'contracttype': 'contractType',
  'contract_type': 'contractType',
  'contract': 'contractType',

  // 14
  'contractstartdate': 'contractStartDate',
  'contract_start_date': 'contractStartDate',

  // 15
  'contractenddate': 'contractEndDate',
  'contract_end_date': 'contractEndDate',

  // 16
  'autorenew': 'autoRenew',
  'auto_renew': 'autoRenew',
  'autorenewal': 'autoRenew',

  // 17
  'monthlychargegbp': 'monthlyChargeGbp',
  'monthly_charge_gbp': 'monthlyChargeGbp',
  'monthlycharge': 'monthlyChargeGbp',
  'monthly_charge': 'monthlyChargeGbp',
  'charge': 'monthlyChargeGbp',
  'mrr': 'monthlyChargeGbp',

  // 18
  'averagemonthlyusagegb': 'averageMonthlyUsageGb',
  'average_monthly_usage_gb': 'averageMonthlyUsageGb',
  'monthly_usage': 'averageMonthlyUsageGb',
  'usage_gb': 'averageMonthlyUsageGb',

  // 19
  'dataallowancegb': 'dataAllowanceGb',
  'data_allowance_gb': 'dataAllowanceGb',
  'allowance_gb': 'dataAllowanceGb',
  'data_allowance': 'dataAllowanceGb',

  // 20
  'overagechargesgbp': 'overageChargesGbp',
  'overage_charges_gbp': 'overageChargesGbp',
  'overage_charges': 'overageChargesGbp',
  'overage': 'overageChargesGbp',

  // 21
  'discountpercent': 'discountPercent',
  'discount_percent': 'discountPercent',
  'discount_pct': 'discountPercent',
  'discount': 'discountPercent',

  // 22
  'paymentmethod': 'paymentMethod',
  'payment_method': 'paymentMethod',
  'payment_type': 'paymentMethod',

  // 23
  'directdebit': 'directDebit',
  'direct_debit': 'directDebit',
  'dd': 'directDebit',

  // 24
  'latepayments12m': 'latePayments12M',
  'late_payments_12m': 'latePayments12M',
  'latepayments': 'latePayments12M',

  // 25
  'failedpayments12m': 'failedPayments12M',
  'failed_payments_12m': 'failedPayments12M',
  'failedpayments': 'failedPayments12M',

  // 26
  'supporttickets12m': 'supportTickets12M',
  'support_tickets_12m': 'supportTickets12M',
  'tickets_12m': 'supportTickets12M',
  'tickets': 'supportTickets12M',

  // 27
  'complaints12m': 'complaints12M',
  'complaints_12m': 'complaints12M',
  'complaints': 'complaints12M',

  // 28
  'averageresolutionhours': 'averageResolutionHours',
  'average_resolution_hours': 'averageResolutionHours',
  'resolution_hours': 'averageResolutionHours',

  // 29
  'networkoutages12m': 'networkOutages12M',
  'network_outages_12m': 'networkOutages12M',
  'outages_12m': 'networkOutages12M',
  'outages': 'networkOutages12M',

  // 30
  'satisfactionscore110': 'satisfactionScore110',
  'satisfaction_score_1_10': 'satisfactionScore110',
  'satisfaction_score': 'satisfactionScore110',
  'satisfaction': 'satisfactionScore110',
  'csat': 'satisfactionScore110',

  // 31
  'npsscore': 'npsScore',
  'nps_score': 'npsScore',
  'nps': 'npsScore',

  // 32
  'competitorofferreceived': 'competitorOfferReceived',
  'competitor_offer_received': 'competitorOfferReceived',
  'competitor_offer': 'competitorOfferReceived',

  // 33
  'churnstatus': 'churnStatus',
  'churn_status': 'churnStatus',
  'status': 'churnStatus',

  // 34
  'churndate': 'churnDate',
  'churn_date': 'churnDate',

  // 35
  'churnreason': 'churnReason',
  'churn_reason': 'churnReason',
  'reason': 'churnReason',

  // 36
  'lifetimerevenuegbp': 'lifetimeRevenueGbp',
  'lifetime_revenue_gbp': 'lifetimeRevenueGbp',
  'lifetime_revenue': 'lifetimeRevenueGbp',
  'clv': 'lifetimeRevenueGbp',

  // 37
  'monthlyrevenueatriskgbp': 'monthlyRevenueAtRiskGbp',
  'monthly_revenue_at_risk_gbp': 'monthlyRevenueAtRiskGbp',
  'revenue_at_risk': 'monthlyRevenueAtRiskGbp',

  // 38
  'churnflag': 'churnFlag',
  'churn_flag': 'churnFlag',
  'churn': 'churnFlag',
  'target': 'churnFlag',
};

export const LEAKAGE_RULES = [
  {
    field: 'Churn Status',
    status: 'EXCLUDED',
    reason: 'Contains the actual post-event outcome (Active vs Churned). Directly leaks the target.',
  },
  {
    field: 'Churn Date',
    status: 'EXCLUDED',
    reason: 'Contains date of departure, which only exists for already-churned accounts.',
  },
  {
    field: 'Churn Reason',
    status: 'EXCLUDED',
    reason: 'Exit interview diagnostic recorded only after customer requested cancellation.',
  },
  {
    field: 'Monthly Revenue At Risk GBP',
    status: 'EXCLUDED',
    reason: 'Derived financial KPI encoding risk; reserved exclusively for executive reporting.',
  },
  {
    field: 'Customer ID',
    status: 'EXCLUDED',
    reason: 'Non-predictive unique identifier; causes memorisation rather than generalisation.',
  },
  {
    field: 'Lifetime Revenue GBP',
    status: 'OPTIONAL (DEFAULT OFF)',
    reason: 'High correlation with customer tenure; can leak survival duration. Available as toggle in Model Settings.',
  },
  {
    field: 'Gender & Age (Demographics)',
    status: 'EXCLUDED BY DEFAULT (FAIRNESS)',
    reason: 'Excluded by default to adhere to UK Equality Act 2010 and prevent discriminatory algorithmic bias.',
  },
];
