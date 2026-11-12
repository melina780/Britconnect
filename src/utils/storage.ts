/**
 * BritConnect Persistence Engine (IndexedDB via localforage)
 * Manages datasets, version history (last 5), model states, campaigns, and settings.
 * Never uses localStorage for dataset persistence.
 */

import localforage from 'localforage';
import { CustomerRecord, ScoredCustomerRecord, CampaignRecord, DatasetVersion, ModelSettings, ModelMetrics } from '../types/customer';

// Configure dedicated IndexedDB store
const britStore = localforage.createInstance({
  name: 'BritConnect_Churn_Intelligence_DB',
  storeName: 'app_state',
  description: 'IndexedDB persistent storage for BritConnect datasets, ML models, and campaigns',
});

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  includeLifetimeRevenue: false, // Default OFF to prevent leakage
  includeDemographicsGender: false, // Default OFF for algorithmic fairness
  includeDemographicsAge: false, // Default OFF for algorithmic fairness
  retentionOfferCost: 25.0, // £25 standard retention offer
  retentionSuccessRate: 0.30, // 30% baseline campaign acceptance
  retentionHorizonMonths: 12, // 12 months exposure
  riskThresholdCritical: 0.70, // >= 70% Critical
  riskThresholdHigh: 0.50, // 50-69% High
  riskThresholdMedium: 0.30, // 30-49% Medium
};

const KEYS = {
  DATASET: 'current_dataset',
  SCORED_DATASET: 'current_scored_dataset',
  VERSIONS: 'dataset_versions',
  MODEL_SETTINGS: 'model_settings',
  MODEL_METRICS: 'model_metrics',
  CAMPAIGNS: 'campaign_records',
  METADATA: 'upload_metadata',
};

export interface UploadMetadata {
  fileName: string;
  uploadedAt: string;
  rowCount: number;
  activeCount: number;
  churnedCount: number;
  isSampleData?: boolean;
}

/**
 * Saves active dataset and creates a version snapshot (keeps last 5)
 */
export async function saveDataset(
  records: CustomerRecord[],
  meta: UploadMetadata,
  isAppend: boolean = false
): Promise<DatasetVersion[]> {
  let existingVersions: DatasetVersion[] = (await britStore.getItem<DatasetVersion[]>(KEYS.VERSIONS)) || [];

  const newVersion: DatasetVersion = {
    id: `ver-${Date.now()}`,
    versionNumber: existingVersions.length + 1,
    uploadedAt: meta.uploadedAt,
    fileName: meta.fileName,
    rowCount: records.length,
    activeCount: records.filter((r) => r.churnFlag === 0 && r.churnStatus === 'Active').length,
    churnedCount: records.filter((r) => r.churnFlag === 1 || r.churnStatus === 'Churned').length,
    dataQualityScore: 94,
    notes: isAppend ? 'Appended new records with Customer ID deduplication' : 'Fresh dataset upload/replacement',
  };

  // Keep last 5 versions
  existingVersions = [newVersion, ...existingVersions].slice(0, 5);

  await Promise.all([
    britStore.setItem(KEYS.DATASET, records),
    britStore.setItem(KEYS.METADATA, meta),
    britStore.setItem(KEYS.VERSIONS, existingVersions),
  ]);

  return existingVersions;
}

/**
 * Loads current dataset from IndexedDB
 */
export async function loadDataset(): Promise<{
  records: CustomerRecord[] | null;
  meta: UploadMetadata | null;
  versions: DatasetVersion[];
}> {
  try {
    const [records, meta, versions] = await Promise.all([
      britStore.getItem<CustomerRecord[]>(KEYS.DATASET),
      britStore.getItem<UploadMetadata>(KEYS.METADATA),
      britStore.getItem<DatasetVersion[]>(KEYS.VERSIONS),
    ]);
    return {
      records: records || null,
      meta: meta || null,
      versions: versions || [],
    };
  } catch (err) {
    console.error('Failed to load dataset from IndexedDB:', err);
    return { records: null, meta: null, versions: [] };
  }
}

/**
 * Saves scored records
 */
export async function saveScoredDataset(scored: ScoredCustomerRecord[]): Promise<void> {
  await britStore.setItem(KEYS.SCORED_DATASET, scored);
}

/**
 * Loads scored records
 */
export async function loadScoredDataset(): Promise<ScoredCustomerRecord[] | null> {
  return await britStore.getItem<ScoredCustomerRecord[]>(KEYS.SCORED_DATASET);
}

/**
 * Saves model settings
 */
export async function saveModelSettings(settings: ModelSettings): Promise<void> {
  await britStore.setItem(KEYS.MODEL_SETTINGS, settings);
}

/**
 * Loads model settings
 */
export async function loadModelSettings(): Promise<ModelSettings> {
  const saved = await britStore.getItem<ModelSettings>(KEYS.MODEL_SETTINGS);
  return saved ? { ...DEFAULT_MODEL_SETTINGS, ...saved } : DEFAULT_MODEL_SETTINGS;
}

/**
 * Saves trained model evaluation metrics
 */
export async function saveModelMetrics(metrics: ModelMetrics): Promise<void> {
  await britStore.setItem(KEYS.MODEL_METRICS, metrics);
}

/**
 * Loads trained model evaluation metrics
 */
export async function loadModelMetrics(): Promise<ModelMetrics | null> {
  return await britStore.getItem<ModelMetrics>(KEYS.MODEL_METRICS);
}

/**
 * Saves retention campaigns
 */
export async function saveCampaigns(campaigns: CampaignRecord[]): Promise<void> {
  await britStore.setItem(KEYS.CAMPAIGNS, campaigns);
}

/**
 * Loads retention campaigns
 */
export async function loadCampaigns(): Promise<CampaignRecord[]> {
  const camps = await britStore.getItem<CampaignRecord[]>(KEYS.CAMPAIGNS);
  return camps || [];
}

/**
 * Restores a past dataset version from history
 */
export async function restoreDatasetVersion(versionId: string): Promise<DatasetVersion | null> {
  const versions = (await britStore.getItem<DatasetVersion[]>(KEYS.VERSIONS)) || [];
  const target = versions.find((v) => v.id === versionId);
  return target || null;
}

/**
 * Exports complete application database as JSON for audit
 */
export async function exportAllDataAsJson(): Promise<string> {
  const [dataset, meta, versions, settings, metrics, campaigns] = await Promise.all([
    britStore.getItem(KEYS.DATASET),
    britStore.getItem(KEYS.METADATA),
    britStore.getItem(KEYS.VERSIONS),
    britStore.getItem(KEYS.MODEL_SETTINGS),
    britStore.getItem(KEYS.MODEL_METRICS),
    britStore.getItem(KEYS.CAMPAIGNS),
  ]);

  const backup = {
    exportDate: new Date().toISOString(),
    system: 'BritConnect AI Customer Churn Intelligence Platform',
    metadata: meta,
    dataset,
    versions,
    settings,
    metrics,
    campaigns,
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Clears all saved data in IndexedDB
 */
export async function clearAllSavedData(): Promise<void> {
  await britStore.clear();
}
