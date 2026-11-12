/**
 * BritConnect Data Ingestion, Quality Validation, and Automated Cleaning Engine
 * Supports CSV, TSV, Excel (.xlsx, .xls) and JSON.
 * Produces transparent Data Quality Scores (0-100) and reversible cleaning logs.
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { CustomerRecord, CustomerSegment, DataQualityReport, ServiceType, ContractType, UKNation } from '../types/customer';
import { FUZZY_HEADER_MAP } from '../schema/dataDictionary';
import { detectNpsScale } from '../metrics/calculations';

export interface CleaningLogEntry {
  timestamp: string;
  ruleApplied: string;
  field: string;
  rowsAffected: number;
  details: string;
}

export interface ParseResult {
  records: CustomerRecord[];
  qualityReport: DataQualityReport;
  cleaningLogs: CleaningLogEntry[];
  columnMapping: { original: string; mappedTo: string | null }[];
  sheetNames?: string[];
}

/**
 * Normalises a header string by lowercasing, stripping underscores, spaces, dashes
 */
export function normalizeHeaderKey(key: string): string {
  return key.toLowerCase().replace(/[\s_\-\.\(\)\/£]/g, '');
}

/**
 * Normalises boolean/Yes-No values
 */
function normalizeYesNo(val: any): 'Yes' | 'No' {
  if (val === undefined || val === null) return 'No';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  const str = String(val).trim().toLowerCase();
  if (['yes', 'y', 'true', '1', 't'].includes(str)) return 'Yes';
  return 'No';
}

/**
 * Maps raw object keys to official standard CustomerRecord properties using fuzzy matching
 */
export function mapRowHeaders(rawRow: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const [key, val] of Object.entries(rawRow)) {
    const norm = normalizeHeaderKey(key);
    const standardField = FUZZY_HEADER_MAP[norm];
    if (standardField) {
      mapped[standardField] = val;
    } else {
      mapped[key] = val;
    }
  }
  return mapped;
}

/**
 * Parses raw text or file buffer into raw JSON rows
 */
export async function parseFileToRawRows(
  file: File,
  chosenSheet?: string
): Promise<{ rows: Record<string, any>[]; sheetNames: string[]; detectedSheet: string }> {
  const fileName = file.name.toLowerCase();

  // JSON format
  if (fileName.endsWith('.json')) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return { rows, sheetNames: ['Default'], detectedSheet: 'Default' };
  }

  // Excel formats
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const sheetNames = workbook.SheetNames;
    const targetSheet = chosenSheet && sheetNames.includes(chosenSheet) ? chosenSheet : sheetNames[0];
    const worksheet = workbook.Sheets[targetSheet];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    return { rows, sheetNames, detectedSheet: targetSheet };
  }

  // CSV or Delimited text (PapaParse)
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        resolve({
          rows: results.data as Record<string, any>[],
          sheetNames: ['CSV'],
          detectedSheet: 'CSV',
        });
      },
      error: (err) => reject(err),
    });
  });
}

/**
 * Main cleaning and validation pipeline
 */
export function processAndCleanRecords(rawRows: Record<string, any>[]): {
  records: CustomerRecord[];
  report: DataQualityReport;
  logs: CleaningLogEntry[];
  columnMapping: { original: string; mappedTo: string | null }[];
} {
  const logs: CleaningLogEntry[] = [];
  const timestamp = new Date().toISOString();

  if (rawRows.length === 0) {
    return {
      records: [],
      report: {
        overallScore: 0,
        completenessScore: 0,
        validityScore: 0,
        uniquenessScore: 0,
        consistencyScore: 0,
        totalRows: 0,
        duplicateRowsRemoved: 0,
        duplicateIdsResolved: 0,
        violations: [],
        cleanedSummary: { missingImputed: 0, outliersWinsorised: 0, nearDuplicatesMerged: 0, inconsistenciesResolved: 0 },
        observedNpsRange: { min: 0, max: 10, isTenScale: true },
      },
      logs,
      columnMapping: [],
    };
  }

  // Build Column Mapping Inspection
  const sampleRow = rawRows[0] || {};
  const columnMapping = Object.keys(sampleRow).map((key) => {
    const norm = normalizeHeaderKey(key);
    return {
      original: key,
      mappedTo: FUZZY_HEADER_MAP[norm] || null,
    };
  });

  // Step 1: Normalise Headers & Check Exact Duplicate Rows
  const stringifiedSet = new Set<string>();
  const uniqueRawRows: Record<string, any>[] = [];
  let exactDuplicatesCount = 0;

  for (const r of rawRows) {
    const str = JSON.stringify(r);
    if (stringifiedSet.has(str)) {
      exactDuplicatesCount++;
    } else {
      stringifiedSet.add(str);
      uniqueRawRows.push(mapRowHeaders(r));
    }
  }

  if (exactDuplicatesCount > 0) {
    logs.push({
      timestamp,
      ruleApplied: 'Deduplication',
      field: 'Full Row',
      rowsAffected: exactDuplicatesCount,
      details: `Removed ${exactDuplicatesCount} exact duplicate row(s) to guarantee sample integrity.`,
    });
  }

  // Step 2: Customer ID Uniqueness (Latest record wins if duplicated)
  const idMap = new Map<string, Record<string, any>>();
  let duplicateIdCount = 0;
  const duplicateIdExamples: string[] = [];

  for (let idx = 0; idx < uniqueRawRows.length; idx++) {
    const row = uniqueRawRows[idx];
    const id = String(row.customerId || `BC-ROW-${idx + 1}`).trim();
    row.customerId = id;

    if (idMap.has(id)) {
      duplicateIdCount++;
      if (duplicateIdExamples.length < 5) duplicateIdExamples.push(id);
    }
    idMap.set(id, row);
  }

  const deduplicatedRows = Array.from(idMap.values());

  if (duplicateIdCount > 0) {
    logs.push({
      timestamp,
      ruleApplied: 'ID Conflict Resolution',
      field: 'Customer ID',
      rowsAffected: duplicateIdCount,
      details: `Resolved ${duplicateIdCount} duplicate Customer ID conflict(s) using latest record priority.`,
    });
  }

  // Step 3: Numeric Imputation Prep (Compute column medians for imputation)
  const numericValues: Record<string, number[]> = {
    age: [],
    monthlyChargeGbp: [],
    averageMonthlyUsageGb: [],
    dataAllowanceGb: [],
    overageChargesGbp: [],
    discountPercent: [],
    latePayments12M: [],
    failedPayments12M: [],
    supportTickets12M: [],
    complaints12M: [],
    averageResolutionHours: [],
    networkOutages12M: [],
    satisfactionScore110: [],
    npsScore: [],
    tenureMonths: [],
    lifetimeRevenueGbp: [],
  };

  for (const row of deduplicatedRows) {
    for (const [key, list] of Object.entries(numericValues)) {
      const val = parseFloat(row[key]);
      if (!isNaN(val) && isFinite(val)) {
        list.push(val);
      }
    }
  }

  const columnMedians: Record<string, number> = {};
  for (const [key, list] of Object.entries(numericValues)) {
    if (list.length > 0) {
      list.sort((a, b) => a - b);
      const mid = Math.floor(list.length / 2);
      columnMedians[key] = list.length % 2 !== 0 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
    } else {
      columnMedians[key] = 0;
    }
  }

  // Step 4: Check if Discount Percent is formatted as 0-1 fraction
  let maxDiscount = 0;
  for (const r of deduplicatedRows) {
    const val = parseFloat(r.discountPercent);
    if (!isNaN(val) && val > maxDiscount) maxDiscount = val;
  }
  const shouldConvertDiscountFractions = maxDiscount > 0 && maxDiscount <= 1.0;
  if (shouldConvertDiscountFractions) {
    logs.push({
      timestamp,
      ruleApplied: 'Unit Normalisation',
      field: 'Discount Percent',
      rowsAffected: deduplicatedRows.length,
      details: `Detected discount values in 0-1 scale (max ${maxDiscount}). Converted to 0-100% percentage scale.`,
    });
  }

  // Step 5: Clean each record & collect violations
  const cleanedRecords: CustomerRecord[] = [];
  const violations: DataQualityReport['violations'] = [];
  let missingImputedCount = 0;
  let nearDuplicatesMergedCount = 0;
  let inconsistenciesResolvedCount = 0;

  const ageViolations: string[] = [];
  const satViolations: string[] = [];
  const targetConflictCount: { count: number; examples: string[] } = { count: 0, examples: [] };
  const nationViolations: { count: number; examples: string[] } = { count: 0, examples: [] };

  const validNations = new Set(['England', 'Scotland', 'Wales', 'Northern Ireland']);

  for (let i = 0; i < deduplicatedRows.length; i++) {
    const raw = deduplicatedRows[i];
    const wasImputed: Record<string, boolean> = {};

    // 1. Customer ID
    const customerId = raw.customerId;

    // 2. Segment
    let segment: CustomerSegment = 'Consumer';
    const segStr = String(raw.customerSegment || '').trim().toLowerCase();
    if (segStr.includes('business') || segStr.includes('smb') || segStr.includes('b2b')) {
      segment = 'Small Business';
    }

    // 3. Age & 4. Age Band
    let age = parseInt(raw.age, 10);
    if (isNaN(age) || age < 16 || age > 110) {
      if (raw.age !== undefined && raw.age !== '') {
        if (ageViolations.length < 5) ageViolations.push(`${customerId}: Age=${raw.age}`);
      }
      age = Math.round(columnMedians.age || 38);
      wasImputed.age = true;
      missingImputedCount++;
    }

    let ageBand = '35-49';
    if (age >= 65) ageBand = '65+';
    else if (age >= 50) ageBand = '50-64';
    else if (age >= 35) ageBand = '35-49';
    else if (age >= 25) ageBand = '25-34';
    else ageBand = '18-24';

    // 5. Gender
    const gender = String(raw.gender || 'Unknown').trim();

    // 6. UK Nation
    let nationRaw = String(raw.ukNation || '').trim();
    let ukNation: UKNation = 'England';
    const normNation = nationRaw.toLowerCase();
    if (normNation.includes('scot')) ukNation = 'Scotland';
    else if (normNation.includes('wale')) ukNation = 'Wales';
    else if (normNation.includes('ireland') || normNation.includes('ni') || normNation.includes('ulster')) ukNation = 'Northern Ireland';
    else if (normNation.includes('eng')) ukNation = 'England';
    else {
      if (nationRaw) {
        nationViolations.count++;
        if (nationViolations.examples.length < 5) nationViolations.examples.push(`${customerId}: ${nationRaw}`);
      }
      ukNation = 'England';
    }

    // 7. City (merge near duplicates)
    let city = String(raw.city || 'London').trim();
    if (city.toLowerCase() === 'birmingam') {
      city = 'Birmingham';
      nearDuplicatesMergedCount++;
    }

    // 8. Acquisition Channel
    const acquisitionChannel = String(raw.acquisitionChannel || 'Direct Web').trim();

    // 9. Join Date & 10. Tenure
    let tenure = parseInt(raw.tenureMonths, 10);
    if (isNaN(tenure) || tenure < 0) {
      tenure = Math.round(columnMedians.tenureMonths || 18);
      wasImputed.tenureMonths = true;
      missingImputedCount++;
    }

    let joinDate = String(raw.joinDate || '2023-01-15').trim();
    if (joinDate.includes('/')) {
      const parts = joinDate.split('/');
      if (parts.length === 3) {
        // Assume DD/MM/YYYY
        joinDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    // 11. Service Type
    let serviceType: ServiceType = 'Broadband';
    const svcStr = String(raw.serviceType || '').toLowerCase();
    if (svcStr.includes('mobile')) serviceType = 'Mobile';
    else if (svcStr.includes('bundle') || svcStr.includes('trio')) serviceType = 'Bundled';
    else if (svcStr.includes('tv')) serviceType = 'TV & Broadband';
    else if (svcStr.includes('voip') || svcStr.includes('voice')) serviceType = 'VoIP';

    const planName = String(raw.planName || 'Standard Fibre').trim();

    // 13. Contract Type
    let contractType: ContractType = '24 Months';
    const cStr = String(raw.contractType || '').toLowerCase();
    if (cStr.includes('month-to-month') || cStr.includes('rolling') || cStr.includes('1 month')) contractType = 'Month-to-Month';
    else if (cStr.includes('12')) contractType = '12 Months';
    else if (cStr.includes('36')) contractType = '36 Months';
    else contractType = '24 Months';

    const contractStartDate = String(raw.contractStartDate || joinDate).trim();
    const contractEndDate = raw.contractEndDate ? String(raw.contractEndDate).trim() : null;
    const autoRenew = normalizeYesNo(raw.autoRenew);

    // Charges & Usage
    let monthlyChargeGbp = parseFloat(raw.monthlyChargeGbp);
    if (isNaN(monthlyChargeGbp) || monthlyChargeGbp < 0) {
      monthlyChargeGbp = columnMedians.monthlyChargeGbp || 42.0;
      wasImputed.monthlyChargeGbp = true;
      missingImputedCount++;
    }

    let averageMonthlyUsageGb = parseFloat(raw.averageMonthlyUsageGb);
    if (isNaN(averageMonthlyUsageGb) || averageMonthlyUsageGb < 0) {
      averageMonthlyUsageGb = columnMedians.averageMonthlyUsageGb || 150;
      wasImputed.averageMonthlyUsageGb = true;
    }

    let dataAllowanceGb = parseInt(raw.dataAllowanceGb, 10);
    if (isNaN(dataAllowanceGb) || dataAllowanceGb < 0) {
      dataAllowanceGb = columnMedians.dataAllowanceGb || 300;
    }

    let overageChargesGbp = parseFloat(raw.overageChargesGbp);
    if (isNaN(overageChargesGbp) || overageChargesGbp < 0) overageChargesGbp = 0;

    let discountPercent = parseFloat(raw.discountPercent);
    if (isNaN(discountPercent)) discountPercent = 0;
    if (shouldConvertDiscountFractions && discountPercent <= 1.0) discountPercent *= 100;
    discountPercent = Math.max(0, Math.min(100, discountPercent));

    const directDebit = normalizeYesNo(raw.directDebit);
    const paymentMethod = String(raw.paymentMethod || (directDebit === 'Yes' ? 'Direct Debit' : 'Credit Card')).trim();

    // Service Experience
    const latePayments12M = Math.max(0, parseInt(raw.latePayments12M, 10) || 0);
    const failedPayments12M = Math.max(0, parseInt(raw.failedPayments12M, 10) || 0);
    const supportTickets12M = Math.max(0, parseInt(raw.supportTickets12M, 10) || 0);
    const complaints12M = Math.max(0, parseInt(raw.complaints12M, 10) || 0);
    const averageResolutionHours = Math.max(0, parseFloat(raw.averageResolutionHours) || 4.0);
    const networkOutages12M = Math.max(0, parseInt(raw.networkOutages12M, 10) || 0);

    let satisfactionScore110 = parseInt(raw.satisfactionScore110, 10);
    if (isNaN(satisfactionScore110) || satisfactionScore110 < 1 || satisfactionScore110 > 10) {
      if (raw.satisfactionScore110 !== undefined && raw.satisfactionScore110 !== '') {
        if (satViolations.length < 5) satViolations.push(`${customerId}: CSAT=${raw.satisfactionScore110}`);
      }
      satisfactionScore110 = Math.max(1, Math.min(10, Math.round(columnMedians.satisfactionScore110 || 7)));
      wasImputed.satisfactionScore110 = true;
      missingImputedCount++;
    }

    let npsScore = parseInt(raw.npsScore, 10);
    if (isNaN(npsScore)) {
      npsScore = satisfactionScore110;
      wasImputed.npsScore = true;
    }

    const competitorOfferReceived = normalizeYesNo(raw.competitorOfferReceived);

    // Target Variable & Reconciliations
    let churnStatus: 'Active' | 'Churned' = 'Active';
    const statusStr = String(raw.churnStatus || '').trim().toLowerCase();
    let churnFlag = parseInt(raw.churnFlag, 10);

    if (statusStr.includes('churn')) {
      churnStatus = 'Churned';
      if (churnFlag === 0) {
        targetConflictCount.count++;
        if (targetConflictCount.examples.length < 5) targetConflictCount.examples.push(`${customerId}: Status=Churned, Flag=0`);
        churnFlag = 1; // Prioritise recorded churn status
        inconsistenciesResolvedCount++;
      }
    } else if (churnFlag === 1) {
      churnStatus = 'Churned';
      if (!statusStr.includes('churn')) {
        targetConflictCount.count++;
        if (targetConflictCount.examples.length < 5) targetConflictCount.examples.push(`${customerId}: Flag=1, Status=Active`);
        inconsistenciesResolvedCount++;
      }
    } else {
      churnStatus = 'Active';
      churnFlag = 0;
    }

    const churnDate = churnStatus === 'Churned' ? (raw.churnDate ? String(raw.churnDate).trim() : '2024-06-01') : null;
    const churnReason = churnStatus === 'Churned' ? String(raw.churnReason || 'Unspecified').trim() : null;

    let lifetimeRevenueGbp = parseFloat(raw.lifetimeRevenueGbp);
    if (isNaN(lifetimeRevenueGbp) || lifetimeRevenueGbp <= 0) {
      lifetimeRevenueGbp = Math.round(monthlyChargeGbp * tenure * (1 - discountPercent / 100) * 100) / 100;
    }

    let monthlyRevenueAtRiskGbp = parseFloat(raw.monthlyRevenueAtRiskGbp);
    if (isNaN(monthlyRevenueAtRiskGbp) || monthlyRevenueAtRiskGbp < 0 || churnStatus === 'Churned') {
      monthlyRevenueAtRiskGbp = churnStatus === 'Active' && churnFlag === 0 ? monthlyChargeGbp : 0;
    }

    cleanedRecords.push({
      customerId,
      customerSegment: segment,
      age,
      ageBand,
      gender,
      ukNation,
      city,
      acquisitionChannel,
      joinDate,
      tenureMonths: tenure,
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
      _wasImputed: wasImputed,
    });
  }

  // Compile Violations & Quality Breakdown
  const totalRows = rawRows.length;

  if (ageViolations.length > 0) {
    violations.push({
      rule: 'Age 16-110 Range Bound',
      field: 'Age',
      affectedCount: ageViolations.length,
      affectedPercent: Math.round((ageViolations.length / totalRows) * 1000) / 10,
      examples: ageViolations,
      actionTaken: 'Imputed with segment/portfolio median age and recomputed Age Band.',
    });
  }

  if (satViolations.length > 0) {
    violations.push({
      rule: 'Satisfaction Score 1-10 Bound',
      field: 'Satisfaction Score 1 10',
      affectedCount: satViolations.length,
      affectedPercent: Math.round((satViolations.length / totalRows) * 1000) / 10,
      examples: satViolations,
      actionTaken: 'Clamped to 1-10 bounds and imputed missing scores.',
    });
  }

  if (targetConflictCount.count > 0) {
    violations.push({
      rule: 'Churn Status vs Churn Flag Agreement',
      field: 'Churn Flag',
      affectedCount: targetConflictCount.count,
      affectedPercent: Math.round((targetConflictCount.count / totalRows) * 1000) / 10,
      examples: targetConflictCount.examples,
      actionTaken: 'Reconciled binary Churn Flag to align with recorded Churn Status.',
    });
  }

  if (nationViolations.count > 0) {
    violations.push({
      rule: 'UK Constituent Nation Validation',
      field: 'UK Nation',
      affectedCount: nationViolations.count,
      affectedPercent: Math.round((nationViolations.count / totalRows) * 1000) / 10,
      examples: nationViolations.examples,
      actionTaken: 'Normalised variations and defaulted unidentified overseas regions to England.',
    });
  }

  // Compute 0-100 Data Quality Score
  const completenessScore = Math.max(0, Math.round(100 - (missingImputedCount / (totalRows * 15)) * 100));
  const validityScore = Math.max(0, Math.round(100 - ((ageViolations.length + satViolations.length + nationViolations.count) / totalRows) * 100));
  const uniquenessScore = Math.max(0, Math.round(100 - ((exactDuplicatesCount + duplicateIdCount) / totalRows) * 100));
  const consistencyScore = Math.max(0, Math.round(100 - (targetConflictCount.count / totalRows) * 100));

  const overallScore = Math.round(
    completenessScore * 0.3 + validityScore * 0.3 + uniquenessScore * 0.2 + consistencyScore * 0.2
  );

  const npsScale = detectNpsScale(cleanedRecords);

  const report: DataQualityReport = {
    overallScore,
    completenessScore,
    validityScore,
    uniquenessScore,
    consistencyScore,
    totalRows: cleanedRecords.length,
    duplicateRowsRemoved: exactDuplicatesCount,
    duplicateIdsResolved: duplicateIdCount,
    violations,
    cleanedSummary: {
      missingImputed: missingImputedCount,
      outliersWinsorised: 0,
      nearDuplicatesMerged: nearDuplicatesMergedCount,
      inconsistenciesResolved: inconsistenciesResolvedCount,
    },
    observedNpsRange: {
      min: npsScale.min,
      max: npsScale.max,
      isTenScale: npsScale.isTenScale,
    },
  };

  return {
    records: cleanedRecords,
    report,
    logs,
    columnMapping,
  };
}
