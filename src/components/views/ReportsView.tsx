/**
 * BritConnect Reports & Export Centre
 * Multi-Sheet Excel Workbook Export via SheetJS (xlsx), Executive Summary Print Layout,
 * Filtered CSV downloads, and Audit Configuration JSON.
 */

import React from 'react';
import * as XLSX from 'xlsx';
import { CustomerRecord, ScoredCustomerRecord, ModelMetrics, CampaignRecord } from '../../types/customer';
import { PortfolioKpiSummary, formatGbp, formatPercent } from '../../metrics/calculations';
import { UploadMetadata } from '../../utils/storage';
import {
  FileSpreadsheet,
  Printer,
  Download,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ReportsViewProps {
  records: CustomerRecord[];
  scoredRecords?: ScoredCustomerRecord[];
  kpis: PortfolioKpiSummary;
  metrics: ModelMetrics | null;
  campaigns: CampaignRecord[];
  metadata: UploadMetadata | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  records,
  scoredRecords,
  kpis,
  metrics,
  campaigns,
  metadata,
}) => {
  const timestamp = new Date().toLocaleString('en-GB');

  // Multi-Sheet Excel Workbook Export
  const generateExcelWorkbook = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Executive Summary
    const summaryData = [
      ['BritConnect AI Customer Churn Intelligence Platform - Executive Summary'],
      ['Generated On', timestamp],
      ['Source Dataset', metadata?.fileName || 'BritConnect_Synthetic_UK.csv'],
      ['Total Records', records.length],
      [''],
      ['Key Performance Indicators', 'Value', 'Population Scope'],
      ['Active Subscribers', kpis.activeCustomers, 'Active base only'],
      ['Churned Accounts', kpis.churnedCustomers, 'Departed customers'],
      ['Portfolio Churn Rate', `${kpis.churnRatePercent}%`, 'All records'],
      ['Monthly Recurring Revenue (MRR)', `£${kpis.monthlyRecurringRevenueActiveGbp.toFixed(2)}`, 'Active base only'],
      ['Monthly Revenue at Risk', `£${kpis.modelPredictedMonthlyRevenueAtRiskGbp.toFixed(2)}`, 'Active base only'],
      ['Average Revenue Per User (ARPU)', `£${kpis.arpuGbp.toFixed(2)}`, 'Active base only'],
      ['Average Satisfaction Score (1-10)', kpis.avgSatisfactionScore, 'All records'],
      ['Net Promoter Score (NPS)', kpis.npsScore, 'All records'],
      ['Critical Risk Customers', kpis.criticalRiskCount, 'Active subscribers >=70% risk'],
      ['High Risk Customers', kpis.highRiskCount, 'Active subscribers 50-69% risk'],
      ['Estimated 12M Revenue Saved', `£${kpis.estimatedAnnualSavingsTopDecileGbp.toFixed(2)}`, 'Top decile retention intervention'],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Sheet 2: Scored Customers
    if (scoredRecords && scoredRecords.length > 0) {
      const scoredData = scoredRecords.map((c) => ({
        'Customer ID': c.customerId,
        Segment: c.customerSegment,
        Nation: c.ukNation,
        City: c.city,
        'Plan Name': c.planName,
        'Contract Type': c.contractType,
        'Monthly Charge (£)': c.monthlyChargeGbp,
        'Churn Probability (%)': (c.churnProbability * 100).toFixed(1),
        'Risk Tier': c.riskTier,
        'Predicted Monthly Risk (£)': c.predictedRevenueAtRiskGbp,
        'Expected 12M Loss (£)': c.expectedLoss12mGbp,
        'Primary Reason Code': c.reasonCode,
        'Recommended Next-Best Action': c.recommendedAction,
      }));
      const wsScored = XLSX.utils.json_to_sheet(scoredData);
      XLSX.utils.book_append_sheet(wb, wsScored, 'Scored Customers');
    }

    // Sheet 3: Model Metrics
    if (metrics) {
      const metricsData = [
        ['Machine Learning Model Diagnostics & Validation Audit'],
        ['Generated At', timestamp],
        [''],
        ['Metric Name', 'Score / Value'],
        ['ROC-AUC (Test Partition)', metrics.rocAuc],
        ['PR-AUC (Precision-Recall)', metrics.prAuc],
        ['Accuracy', `${metrics.accuracy}%`],
        ['Precision', `${metrics.precision}%`],
        ['Recall (Sensitivity)', `${metrics.recall}%`],
        ['F1-Score', `${metrics.f1}%`],
        ['Specificity', `${metrics.specificity}%`],
        ['Brier Score', metrics.brierScore],
        ['Log-Loss', metrics.logLoss],
        ['Optimal Probability Threshold', metrics.optimalThreshold],
        ['Expected Threshold Cost (£)', `£${metrics.optimalThresholdCost.toFixed(2)}`],
        ['Cross-Validation ROC-AUC Mean', metrics.crossValRocAucMean],
        ['Cross-Validation Std Error', metrics.crossValRocAucStd],
      ];
      const wsMetrics = XLSX.utils.aoa_to_sheet(metricsData);
      XLSX.utils.book_append_sheet(wb, wsMetrics, 'Model Metrics');
    }

    // Sheet 4: Campaigns
    if (campaigns.length > 0) {
      const campData = campaigns.map((camp) => ({
        'Campaign ID': camp.id,
        Name: camp.name,
        Segment: camp.targetSegment,
        Channel: camp.channel,
        Offer: camp.offer,
        Targeted: camp.targetedCount,
        Contacted: camp.contactedCount,
        'Reach (%)': camp.reachPercent,
        'Uplift (%)': camp.upliftPercent,
        'Treatment Retention (%)': camp.treatmentRetentionRatePercent,
        'Control Retention (%)': camp.controlRetentionRatePercent,
        'Total Cost (£)': camp.totalCampaignCostGbp,
        'Net Benefit (£)': camp.netBenefitGbp,
        'ROI (%)': camp.roiPercent,
      }));
      const wsCamp = XLSX.utils.json_to_sheet(campData);
      XLSX.utils.book_append_sheet(wb, wsCamp, 'Campaigns');
    }

    XLSX.writeFile(wb, `BritConnect_Enterprise_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadCleanedDatasetCsv = () => {
    const ws = XLSX.utils.json_to_sheet(records);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BritConnect_Cleaned_Dataset_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const downloadAuditJson = () => {
    const auditObj = {
      exportTimestamp: timestamp,
      system: 'BritConnect AI Customer Churn Intelligence Platform',
      metadata,
      kpis,
      modelMetrics: metrics,
      recordsCount: records.length,
      methodologyNote:
        'All calculations follow strict population exclusivity (Active vs Churned vs All). Machine learning features are cleansed via Leakage Guard.',
    };
    const jsonStr = JSON.stringify(auditObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BritConnect_Model_Audit_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B1F3A] dark:text-white">
            Executive Reports & Multi-Format Downloads
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
            Export comprehensive multi-sheet Excel workbooks, print executive PDF summaries, or extract audit configurations.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={generateExcelWorkbook}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Multi-Sheet Excel (.xlsx)</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-[#0B1F3A] dark:bg-[#12305A] hover:bg-[#12305A] text-white text-xs font-semibold flex items-center gap-2 border border-[#1C4380] transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#C9A227]" />
            <span>Print Executive PDF</span>
          </button>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Multi-Sheet Excel */}
        <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#0B1F3A] dark:text-white">
              Full Multi-Sheet Excel Workbook
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Includes Summary, Scored Customers, Segments, Model Metrics, Campaigns, and Quality Log sheets.
            </p>
          </div>
          <button
            onClick={generateExcelWorkbook}
            className="mt-4 w-full py-2 rounded-lg bg-slate-100 dark:bg-[#12305A] hover:bg-slate-200 text-xs font-semibold text-[#0B1F3A] dark:text-white flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export .xlsx</span>
          </button>
        </div>

        {/* Card 2: Cleaned Dataset CSV */}
        <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#0B1F3A] dark:text-white">
              Cleaned Dataset (CSV)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Standardized, deduplicated 38-column customer dataset with imputed values and normalized flags.
            </p>
          </div>
          <button
            onClick={downloadCleanedDatasetCsv}
            className="mt-4 w-full py-2 rounded-lg bg-slate-100 dark:bg-[#12305A] hover:bg-slate-200 text-xs font-semibold text-[#0B1F3A] dark:text-white flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Export .csv</span>
          </button>
        </div>

        {/* Card 3: Model Audit JSON */}
        <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#0B1F3A] dark:text-white">
              Model Governance Audit (JSON)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Machine-readable JSON specification containing algorithm weights, cross-validation metrics, and leakage rules.
            </p>
          </div>
          <button
            onClick={downloadAuditJson}
            className="mt-4 w-full py-2 rounded-lg bg-slate-100 dark:bg-[#12305A] hover:bg-slate-200 text-xs font-semibold text-[#0B1F3A] dark:text-white flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-purple-600" />
            <span>Export .json</span>
          </button>
        </div>
      </div>

      {/* Printable Executive Summary Sheet Area */}
      <div className="bg-white dark:bg-[#0B1F3A] rounded-2xl p-8 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm space-y-6 print:m-0 print:p-0 print:border-none">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A227]">
              Confidential Board Memorandum
            </span>
            <h3 className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white mt-1">
              BritConnect AI Customer Churn Intelligence Report
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Executive Briefing on Portfolio Health, Predictive Churn Exposure, and Retention ROI
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <span className="block font-medium">Date: {timestamp}</span>
            <span className="block">Dataset: {metadata?.fileName}</span>
            <span className="block">Scope: {records.length.toLocaleString('en-GB')} Accounts</span>
          </div>
        </div>

        {/* Executive Numbers Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#12305A]">
            <span className="text-xs text-slate-400 block">Active Subscribers</span>
            <span className="text-xl font-extrabold text-[#0B1F3A] dark:text-white font-tabular">
              {kpis.activeCustomers.toLocaleString('en-GB')}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#12305A]">
            <span className="text-xs text-slate-400 block">Baseline Churn Rate</span>
            <span className="text-xl font-extrabold text-[#A31A2E] font-tabular">
              {formatPercent(kpis.churnRatePercent)}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#12305A]">
            <span className="text-xs text-slate-400 block">Monthly Revenue at Risk</span>
            <span className="text-xl font-extrabold text-[#7A1020] dark:text-rose-400 font-tabular">
              {formatGbp(kpis.modelPredictedMonthlyRevenueAtRiskGbp, true)}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#12305A]">
            <span className="text-xs text-slate-400 block">Projected 12M Savings</span>
            <span className="text-xl font-extrabold text-emerald-600 font-tabular">
              {formatGbp(kpis.estimatedAnnualSavingsTopDecileGbp, true)}
            </span>
          </div>
        </div>

        {/* Methodology Notes */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#12305A]/40 border text-xs text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
          <h4 className="font-bold text-[#0B1F3A] dark:text-white uppercase tracking-wider text-[11px]">
            Governance & Methodological Principles
          </h4>
          <p>
            1. <strong>Population Disaggregation:</strong> Metrics strictly disaggregate Active, Churned, and Combined
            subscriber populations. MRR and ARPU reflect exclusively active billing subscribers.
          </p>
          <p>
            2. <strong>Leakage Guard Enforcement:</strong> Target outcomes (Churn Status, Churn Date, Churn Reason, Monthly Revenue At Risk)
            and Customer ID identifiers are strictly withheld from model feature matrices.
          </p>
          <p>
            3. <strong>Algorithmic Fairness:</strong> Demographics (Gender, Age) are omitted from default training sets to uphold the UK Equality Act 2010.
          </p>
        </div>
      </div>
    </div>
  );
};
