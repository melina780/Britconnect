/**
 * BritConnect AI Customer Churn Intelligence Platform
 * Master Application Orchestrator & State Container
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CustomerRecord,
  ScoredCustomerRecord,
  GlobalFilterState,
  DatasetVersion,
  ModelSettings,
  ModelMetrics,
  AIRecommendation,
  CampaignRecord,
} from './types/customer';
import { NavSection, Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import {
  loadDataset,
  saveDataset,
  loadScoredDataset,
  saveScoredDataset,
  loadModelSettings,
  saveModelSettings,
  loadModelMetrics,
  saveModelMetrics,
  loadCampaigns,
  saveCampaigns,
  restoreDatasetVersion,
  clearAllSavedData,
  exportAllDataAsJson,
  UploadMetadata,
  DEFAULT_MODEL_SETTINGS,
} from './utils/storage';
import { generateSampleDataset } from './utils/sampleData';
import { processAndCleanRecords } from './utils/cleaning';
import { calculatePortfolioKPIs } from './metrics/calculations';
import { scoreCustomers, trainAndCompareAllModels } from './ml/engine';

// Views
import { DataUploadView } from './components/views/DataUploadView';
import { DataQualityView } from './components/views/DataQualityView';
import { ExecutiveDashboardView } from './components/views/ExecutiveDashboardView';
import { ChurnAnalysisView } from './components/views/ChurnAnalysisView';
import { SegmentationView } from './components/views/SegmentationView';
import { ModelLabView } from './components/views/ModelLabView';
import { CustomerScoringView } from './components/views/CustomerScoringView';
import { ExplainabilityView } from './components/views/ExplainabilityView';
import { RetentionRecommendationsView } from './components/views/RetentionRecommendationsView';
import { CampaignTrackerView } from './components/views/CampaignTrackerView';
import { AiAnalystView } from './components/views/AiAnalystView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';

export default function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('britconnect_theme') === 'dark';
  });

  // Core Data States
  const [records, setRecords] = useState<CustomerRecord[]>([]);
  const [scoredRecords, setScoredRecords] = useState<ScoredCustomerRecord[]>([]);
  const [metadata, setMetadata] = useState<UploadMetadata | null>(null);
  const [versions, setVersions] = useState<DatasetVersion[]>([]);
  const [modelSettings, setModelSettings] = useState<ModelSettings>(DEFAULT_MODEL_SETTINGS);
  const [championMetrics, setChampionMetrics] = useState<ModelMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [cleaningLogs, setCleaningLogs] = useState<any[]>([]);
  const [activeRecommendation, setActiveRecommendation] = useState<AIRecommendation | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  // Global Filter State
  const [filters, setFilters] = useState<GlobalFilterState>({
    customerSegment: 'All',
    ukNation: 'All',
    serviceType: 'All',
    contractType: 'All',
    joinDateStart: '',
    joinDateEnd: '',
    searchQuery: '',
  });

  // Dark Mode Class synchronization
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('britconnect_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('britconnect_theme', 'light');
    }
  }, [isDarkMode]);

  // Initial Load from IndexedDB
  useEffect(() => {
    async function init() {
      try {
        const [savedData, savedSettings, savedMetrics, savedCamps] = await Promise.all([
          loadDataset(),
          loadModelSettings(),
          loadModelMetrics(),
          loadCampaigns(),
        ]);

        if (savedSettings) setModelSettings(savedSettings);
        if (savedMetrics) setChampionMetrics(savedMetrics);
        if (savedCamps) setCampaigns(savedCamps);

        if (savedData.records && savedData.records.length > 0) {
          setRecords(savedData.records);
          setMetadata(savedData.meta);
          setVersions(savedData.versions);

          // Restore scored dataset or score on the fly
          const savedScored = await loadScoredDataset();
          if (savedScored && savedScored.length > 0) {
            setScoredRecords(savedScored);
          }
        } else {
          // Guided Onboarding: Auto-load realistic sample dataset
          handleLoadSampleData();
        }
      } catch (err) {
        console.error('Failed to initialise BritConnect storage:', err);
      }
    }
    init();
  }, []);

  const handleLoadSampleData = () => {
    const sample = generateSampleDataset(5000);
    const cleaned = processAndCleanRecords(sample);
    const active = cleaned.records.filter((r) => r.churnFlag === 0).length;
    const churned = cleaned.records.filter((r) => r.churnFlag === 1).length;

    const meta: UploadMetadata = {
      fileName: 'BritConnect_Synthetic_5000_UK.csv',
      uploadedAt: new Date().toLocaleString('en-GB'),
      rowCount: cleaned.records.length,
      activeCount: active,
      churnedCount: churned,
      isSampleData: true,
    };

    handleDatasetUpdated(cleaned.records, meta, false);
    setCleaningLogs(cleaned.logs);
  };

  const handleDatasetUpdated = async (
    newRecords: CustomerRecord[],
    meta: UploadMetadata,
    isAppend: boolean = false
  ) => {
    setRecords(newRecords);
    setMetadata(meta);

    const updatedVersions = await saveDataset(newRecords, meta, isAppend);
    setVersions(updatedVersions);

    // Train baseline champion model & score records
    try {
      const outcome = await trainAndCompareAllModels(newRecords, modelSettings);
      setChampionMetrics(outcome.bestModel.metrics);
      await saveModelMetrics(outcome.bestModel.metrics);

      const scored = scoreCustomers(newRecords, outcome.bestModel.modelInstance, outcome.datasetDate, modelSettings);
      setScoredRecords(scored);
      await saveScoredDataset(scored);
    } catch (err) {
      console.warn('Initial model scoring background warning:', err);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    const version = await restoreDatasetVersion(versionId);
    if (version) {
      alert(`Restoring version v${version.versionNumber} (${version.fileName})...`);
    }
  };

  const handleClearAllData = async () => {
    await clearAllSavedData();
    setRecords([]);
    setScoredRecords([]);
    setMetadata(null);
    setVersions([]);
    setChampionMetrics(null);
    setCampaigns([]);
    setCurrentSection('upload');
  };

  const handleExportBackup = async () => {
    const json = await exportAllDataAsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BritConnect_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  const handleUpdateSettings = async (newSettings: Partial<ModelSettings>) => {
    const merged = { ...modelSettings, ...newSettings };
    setModelSettings(merged);
    await saveModelSettings(merged);
  };

  const handleAddCampaign = async (newCamp: CampaignRecord) => {
    const updated = [newCamp, ...campaigns];
    setCampaigns(updated);
    await saveCampaigns(updated);
  };

  const handleFilterChange = (newFilters: Partial<GlobalFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      customerSegment: 'All',
      ukNation: 'All',
      serviceType: 'All',
      contractType: 'All',
      joinDateStart: '',
      joinDateEnd: '',
      searchQuery: '',
    });
  };

  // Filtered dataset across all global filter dimensions
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filters.customerSegment !== 'All' && r.customerSegment !== filters.customerSegment) return false;
      if (filters.ukNation !== 'All' && r.ukNation !== filters.ukNation) return false;
      if (filters.serviceType !== 'All' && r.serviceType !== filters.serviceType) return false;
      if (filters.contractType !== 'All' && r.contractType !== filters.contractType) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        if (
          !r.customerId.toLowerCase().includes(q) &&
          !r.city.toLowerCase().includes(q) &&
          !r.planName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [records, filters]);

  const filteredScoredRecords = useMemo(() => {
    return scoredRecords.filter((r) => {
      if (filters.customerSegment !== 'All' && r.customerSegment !== filters.customerSegment) return false;
      if (filters.ukNation !== 'All' && r.ukNation !== filters.ukNation) return false;
      if (filters.serviceType !== 'All' && r.serviceType !== filters.serviceType) return false;
      if (filters.contractType !== 'All' && r.contractType !== filters.contractType) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        if (
          !r.customerId.toLowerCase().includes(q) &&
          !r.city.toLowerCase().includes(q) &&
          !r.planName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [scoredRecords, filters]);

  // Global KPIs computed from filtered population
  const globalKPIs = useMemo(() => {
    return calculatePortfolioKPIs(
      filteredRecords,
      filteredScoredRecords,
      modelSettings.retentionOfferCost,
      modelSettings.retentionSuccessRate
    );
  }, [filteredRecords, filteredScoredRecords, modelSettings]);

  // Quality Report from current dataset
  const qualityReport = useMemo(() => {
    return processAndCleanRecords(records).report;
  }, [records]);

  // AI Recommendation Trigger
  const handleGenerateAiRecommendation = async (customer: ScoredCustomerRecord) => {
    setIsGeneratingAi(true);
    try {
      const response = await fetch('/api/gemini/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetName: `Customer ${customer.customerId}`,
          targetType: 'Individual Subscriber',
          profile: customer,
          topDrivers: customer.topDrivers,
          benchmarks: {
            avgComplaints: globalKPIs.avgComplaintsPerCustomer,
            avgSatisfaction: globalKPIs.avgSatisfactionScore,
            baseChurnRate: globalKPIs.churnRatePercent,
          },
          costMatrix: modelSettings,
        }),
      });

      if (response.ok) {
        const resJson = await response.json();
        if (resJson.success && resJson.recommendation) {
          setActiveRecommendation(resJson.recommendation);
          setCurrentSection('recommendations');
        }
      }
    } catch (err) {
      console.error('Failed to generate AI recommendation:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F6F8] dark:bg-[#071324] text-[#1F2937] dark:text-[#F1F5F9]">
      {/* 1. Left Navigation Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        datasetLoaded={records.length > 0}
        activeCount={globalKPIs.activeCustomers}
        churnRate={globalKPIs.churnRatePercent}
      />

      {/* 2. Main Content Layout */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Sticky Top Bar */}
        <TopBar
          metadata={metadata}
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onExportClick={() => setCurrentSection('reports')}
          onOpenAiDrawer={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
          onLoadSampleData={handleLoadSampleData}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {currentSection === 'upload' && (
            <DataUploadView
              currentRecords={records}
              metadata={metadata}
              versions={versions}
              onDatasetUpdated={handleDatasetUpdated}
              onRestoreVersion={handleRestoreVersion}
              onClearAllData={handleClearAllData}
              onExportBackup={handleExportBackup}
            />
          )}

          {currentSection === 'quality' && (
            <DataQualityView report={qualityReport} cleaningLogs={cleaningLogs} />
          )}

          {currentSection === 'dashboard' && (
            <ExecutiveDashboardView
              records={filteredRecords}
              kpis={globalKPIs}
              scoredRecords={filteredScoredRecords}
              onFilterSelect={(dim, val) => handleFilterChange({ [dim]: val } as any)}
            />
          )}

          {currentSection === 'churn_analysis' && (
            <ChurnAnalysisView records={filteredRecords} />
          )}

          {currentSection === 'segmentation' && (
            <SegmentationView
              records={filteredRecords}
              scoredRecords={filteredScoredRecords}
              onCreateCampaignFromSegment={(segName, count) => {
                setCurrentSection('campaigns');
              }}
            />
          )}

          {currentSection === 'model_lab' && (
            <ModelLabView
              records={records}
              settings={modelSettings}
              onUpdateSettings={handleUpdateSettings}
              championMetrics={championMetrics}
              onModelTrained={async ({ champion, allModels, datasetDate }) => {
                setChampionMetrics(champion.metrics);
                await saveModelMetrics(champion.metrics);
                const scored = scoreCustomers(records, champion.modelInstance, datasetDate, modelSettings);
                setScoredRecords(scored);
                await saveScoredDataset(scored);
              }}
            />
          )}

          {currentSection === 'scoring' && (
            <CustomerScoringView
              scoredRecords={filteredScoredRecords}
              onOpenAiRecommendation={(cust) => {
                handleGenerateAiRecommendation(cust);
              }}
            />
          )}

          {currentSection === 'explainability' && (
            <ExplainabilityView
              records={filteredRecords}
              scoredRecords={filteredScoredRecords}
              featureImportances={championMetrics ? championMetrics.confusionMatrix as any : {}}
            />
          )}

          {currentSection === 'recommendations' && (
            <RetentionRecommendationsView
              scoredRecords={filteredScoredRecords}
              activeRecommendation={activeRecommendation}
              onGenerateAiRecommendation={handleGenerateAiRecommendation}
              isGeneratingAi={isGeneratingAi}
            />
          )}

          {currentSection === 'campaigns' && (
            <CampaignTrackerView campaigns={campaigns} onAddCampaign={handleAddCampaign} />
          )}

          {currentSection === 'analyst' && (
            <AiAnalystView records={records} scoredRecords={scoredRecords} />
          )}

          {currentSection === 'reports' && (
            <ReportsView
              records={filteredRecords}
              scoredRecords={filteredScoredRecords}
              kpis={globalKPIs}
              metrics={championMetrics}
              campaigns={campaigns}
              metadata={metadata}
            />
          )}

          {currentSection === 'settings' && (
            <SettingsView
              settings={modelSettings}
              onUpdateSettings={handleUpdateSettings}
            />
          )}
        </main>
      </div>

      {/* Floating AI Analyst Side Panel Drawer */}
      {isAiDrawerOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-[#0B1F3A] shadow-2xl border-l border-[#1E3A5F] flex flex-col p-4 animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-[#0B1F3A] dark:text-white flex items-center gap-2">
              BritConnect AI Analyst Drawer
            </h3>
            <button
              onClick={() => setIsAiDrawerOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
            >
              ✕ Close
            </button>
          </div>
          <div className="flex-1 overflow-hidden pt-3">
            <AiAnalystView records={records} scoredRecords={scoredRecords} />
          </div>
        </div>
      )}
    </div>
  );
}
