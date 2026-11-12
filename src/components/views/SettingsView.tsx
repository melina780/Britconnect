/**
 * BritConnect Settings, Schema Dictionary & Automated Self-Check Suite
 * Live 38-column schema status mapper, Leakage Guard configuration,
 * fairness demographic toggles, and 32-test in-browser unit test execution runner.
 */

import React, { useState } from 'react';
import { DATA_DICTIONARY, LEAKAGE_RULES } from '../../schema/dataDictionary';
import { ModelSettings } from '../../types/customer';
import { runBritConnectUnitTests, TestResult } from '../../metrics/unitTests';
import {
  Settings,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  BookOpen,
  Scale,
  DollarSign,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface SettingsViewProps {
  settings: ModelSettings;
  onUpdateSettings: (newSettings: Partial<ModelSettings>) => void;
  columnMapping?: { original: string; mappedTo: string | null }[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  columnMapping = [],
}) => {
  const [activeTab, setActiveTab] = useState<'dictionary' | 'model_settings' | 'self_check'>('dictionary');
  const [testResults, setTestResults] = useState<TestResult[]>(() => runBritConnectUnitTests());
  const [isRunningTests, setIsRunningTests] = useState(false);

  const handleRunTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const outcome = runBritConnectUnitTests();
      setTestResults(outcome);
      setIsRunningTests(false);
    }, 250);
  };

  const passedCount = testResults.filter((t) => t.passed).length;
  const failedCount = testResults.length - passedCount;

  // Build live mapping status map
  const mappedStandardFields = new Set(columnMapping.map((c) => c.mappedTo).filter(Boolean));

  return (
    <div className="space-y-6">
      {/* View Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="text-xl font-bold text-[#0B1F3A] dark:text-white">
            System Settings, Schema Governance & Automated Verification
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
            Official 38-column data dictionary, target leakage toggles, and live unit test validation suite.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#12305A] p-1 rounded-xl text-xs">
          <button
            onClick={() => setActiveTab('dictionary')}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
              activeTab === 'dictionary'
                ? 'bg-[#0B1F3A] text-white dark:bg-[#C9A227] dark:text-[#0B1F3A]'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Data Dictionary (38)
          </button>
          <button
            onClick={() => setActiveTab('model_settings')}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
              activeTab === 'model_settings'
                ? 'bg-[#0B1F3A] text-white dark:bg-[#C9A227] dark:text-[#0B1F3A]'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Leakage & Model Settings
          </button>
          <button
            onClick={() => setActiveTab('self_check')}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
              activeTab === 'self_check'
                ? 'bg-[#0B1F3A] text-white dark:bg-[#C9A227] dark:text-[#0B1F3A]'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Self-Check Unit Tests ({passedCount}/{testResults.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Official Data Dictionary & Live Mapping */}
      {activeTab === 'dictionary' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#C9A227]" /> Authoritative BritConnect Data Dictionary (38 Columns)
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
                  Official source of truth schema. Live status indicates whether each column was mapped from the uploaded file.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase bg-slate-50 dark:bg-[#12305A] text-slate-500 dark:text-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">No.</th>
                    <th className="py-2.5 px-3">Column Name</th>
                    <th className="py-2.5 px-3">Data Type</th>
                    <th className="py-2.5 px-3">Description & Allowed Values</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Model Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {DATA_DICTIONARY.map((col) => {
                    const isMapped = mappedStandardFields.size === 0 || mappedStandardFields.has(col.name);
                    return (
                      <tr key={col.num} className="hover:bg-slate-50/50 dark:hover:bg-[#12305A]/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-400">{col.num}</td>
                        <td className="py-2.5 px-3 font-bold text-[#0B1F3A] dark:text-white">{col.name}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#1C4380] dark:text-[#E2C15A]">
                          {col.type}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-sm">
                          {col.description}
                          {col.allowedValues && (
                            <span className="block text-[10px] text-slate-400 mt-0.5 font-mono">
                              Allowed: {col.allowedValues.join(', ')}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isMapped
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {isMapped ? 'Active' : 'Unmapped'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {col.isTarget ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-red-100 text-[#7A1020] font-extrabold uppercase">
                              Target Variable (y)
                            </span>
                          ) : col.isLeakage ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-semibold">
                              Excluded (Leakage Guard)
                            </span>
                          ) : col.name === 'Lifetime Revenue GBP' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold">
                              Optional (Default OFF)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-semibold">
                              Predictive Feature (X)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Leakage Guard & Model Configuration */}
      {activeTab === 'model_settings' && (
        <div className="space-y-6">
          {/* Leakage Guard Panel */}
          <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-5 h-5 text-[#A31A2E]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white">
                Leakage Guard Architecture
              </h3>
            </div>
            <p className="text-xs text-[#6B7280] dark:text-slate-400 mb-4 max-w-2xl leading-relaxed">
              Target leakage occurs when post-churn outcomes or duration proxies are fed into model training, producing
              trivially perfect but commercially useless 100% AUC. The fields below are rigorously quarantined.
            </p>

            <div className="space-y-2.5">
              {LEAKAGE_RULES.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#12305A]/40 border border-slate-200 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-[#0B1F3A] dark:text-white block">{rule.field}</span>
                    <span className="text-[11px] text-slate-500">{rule.reason}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-[#7A1020] dark:bg-rose-950/40 dark:text-rose-300 shrink-0 self-start sm:self-center">
                    {rule.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Model Settings & Fairness Toggles */}
          <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#C9A227]" /> Feature Inclusions & Algorithmic Fairness Toggles
            </h3>

            <div className="space-y-4 text-xs">
              {/* Lifetime Revenue Toggle */}
              <div className="flex items-start justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#12305A]/40 border">
                <div className="max-w-xl">
                  <span className="font-bold text-[#0B1F3A] dark:text-white block">
                    Include Lifetime Revenue GBP in Model Inputs
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    <strong>Default: OFF.</strong> Lifetime revenue strongly correlates with relationship duration, which can
                    artificially leak survival duration. Toggle ON only for post-hoc customer value modeling.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.includeLifetimeRevenue}
                  onChange={(e) => onUpdateSettings({ includeLifetimeRevenue: e.target.checked })}
                  className="w-5 h-5 rounded text-[#0B1F3A] focus:ring-[#C9A227] cursor-pointer mt-1"
                />
              </div>

              {/* Gender Demographic Toggle */}
              <div className="flex items-start justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#12305A]/40 border">
                <div className="max-w-xl">
                  <span className="font-bold text-[#0B1F3A] dark:text-white block">
                    Include Gender in Predictive Features
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    <strong>Default: OFF.</strong> Excluded to prevent algorithmic gender disparity and adhere strictly to the
                    UK Equality Act 2010.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.includeDemographicsGender}
                  onChange={(e) => onUpdateSettings({ includeDemographicsGender: e.target.checked })}
                  className="w-5 h-5 rounded text-[#0B1F3A] focus:ring-[#C9A227] cursor-pointer mt-1"
                />
              </div>

              {/* Age Demographic Toggle */}
              <div className="flex items-start justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#12305A]/40 border">
                <div className="max-w-xl">
                  <span className="font-bold text-[#0B1F3A] dark:text-white block">
                    Include Exact Age in Predictive Features
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    <strong>Default: OFF.</strong> Excluded to prevent ageist underwriting bias under UK regulatory standards.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.includeDemographicsAge}
                  onChange={(e) => onUpdateSettings({ includeDemographicsAge: e.target.checked })}
                  className="w-5 h-5 rounded text-[#0B1F3A] focus:ring-[#C9A227] cursor-pointer mt-1"
                />
              </div>
            </div>

            {/* Threshold Tiers */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Predictive Risk Tier Cutoffs
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1">Critical Risk Threshold (&ge;)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={settings.riskThresholdCritical}
                    onChange={(e) => onUpdateSettings({ riskThresholdCritical: parseFloat(e.target.value) || 0.7 })}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-[#12305A] border text-xs font-tabular"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">High Risk Threshold (&ge;)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={settings.riskThresholdHigh}
                    onChange={(e) => onUpdateSettings({ riskThresholdHigh: parseFloat(e.target.value) || 0.5 })}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-[#12305A] border text-xs font-tabular"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Medium Risk Threshold (&ge;)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={settings.riskThresholdMedium}
                    onChange={(e) => onUpdateSettings({ riskThresholdMedium: parseFloat(e.target.value) || 0.3 })}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-[#12305A] border text-xs font-tabular"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Self-Check Unit Test Suite (32 Tests) */}
      {activeTab === 'self_check' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white">
                  Automated Calculation & Integrity Test Suite
                </h3>
              </div>
              <p className="text-xs text-[#6B7280] dark:text-slate-400">
                Runs 32 executable unit tests verifying calculation fidelity, zero-division guards, data cleaning rules,
                and leakage protection.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right text-xs">
                <span className="font-bold text-emerald-600 block">{passedCount} Passed</span>
                {failedCount > 0 && <span className="font-bold text-[#A31A2E] block">{failedCount} Failed</span>}
              </div>
              <button
                onClick={handleRunTests}
                disabled={isRunningTests}
                className="px-4 py-2 rounded-xl bg-[#0B1F3A] dark:bg-[#12305A] hover:bg-[#12305A] text-white text-xs font-bold border border-[#1C4380] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 text-[#C9A227] fill-[#C9A227]" />
                <span>{isRunningTests ? 'Running...' : 'Re-Run All 32 Tests'}</span>
              </button>
            </div>
          </div>

          {/* Test Results Table */}
          <div className="bg-white dark:bg-[#0B1F3A] rounded-xl border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase bg-slate-50 dark:bg-[#12305A] text-slate-500 dark:text-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Test ID</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Test Case</th>
                    <th className="py-2.5 px-3">Expected Outcome</th>
                    <th className="py-2.5 px-3">Actual Result</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {testResults.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-[#12305A]/40">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{t.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">{t.category}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-[#0B1F3A] dark:text-white block">{t.name}</span>
                        <span className="text-[10px] text-slate-400">{t.description}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{t.expected}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-800 dark:text-slate-200">{t.actual}</td>
                      <td className="py-2.5 px-3 text-right">
                        {t.passed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                            <CheckCircle2 className="w-3 h-3" /> PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 font-bold">
                            <XCircle className="w-3 h-3" /> FAIL
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
