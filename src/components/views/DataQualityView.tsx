/**
 * BritConnect Data Quality Centre
 * Computes 0-100 Quality Score with 4-pillar breakdown (Completeness, Validity, Uniqueness, Consistency),
 * detailed violation inspection with concrete examples, and downloadable cleaning audit log.
 */

import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  Info,
  Layers,
  FileCheck2,
  Sparkles,
} from 'lucide-react';
import { DataQualityReport } from '../../types/customer';
import { CleaningLogEntry } from '../../utils/cleaning';

interface DataQualityViewProps {
  report: DataQualityReport;
  cleaningLogs: CleaningLogEntry[];
}

export const DataQualityView: React.FC<DataQualityViewProps> = ({ report, cleaningLogs }) => {
  const downloadCleaningLogCsv = () => {
    if (cleaningLogs.length === 0) {
      alert('No cleaning actions required for this dataset.');
      return;
    }
    const headers = ['Timestamp', 'Rule Applied', 'Field', 'Rows Affected', 'Details'];
    const rows = cleaningLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.ruleApplied}"`,
      `"${l.field}"`,
      l.rowsAffected,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BritConnect_Cleaning_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
    if (score >= 75) return 'text-[#C9A227] bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
    return 'text-[#A31A2E] bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Top Quality Score Summary Card */}
      <div className="bg-white dark:bg-[#0B1F3A] rounded-2xl p-6 sm:p-8 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          {/* Main 0-100 Circular Badge */}
          <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                strokeWidth="10"
                className="stroke-slate-100 dark:stroke-slate-800 fill-none"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                strokeWidth="10"
                strokeDasharray={264}
                strokeDashoffset={264 - (264 * report.overallScore) / 100}
                strokeLinecap="round"
                className="stroke-[#C9A227] fill-none transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-3xl font-extrabold text-[#0B1F3A] dark:text-white font-tabular block leading-none">
                {report.overallScore}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 mt-1 block">/ 100</span>
            </div>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-[#12305A] text-xs font-semibold text-[#0B1F3A] dark:text-slate-200 border border-[#E3E6EB] dark:border-[#1C4380] mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C9A227]" /> Automated Data Quality Audit
            </span>
            <h2 className="text-xl font-bold text-[#0B1F3A] dark:text-white">
              {report.overallScore >= 90
                ? 'Production-Ready Dataset Health'
                : report.overallScore >= 75
                ? 'Minor Hygiene Issues Detected'
                : 'Attention Required: Quality Violations Found'}
            </h2>
            <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-1 max-w-xl">
              Evaluated across {report.totalRows.toLocaleString('en-GB')} customer records against the 38-column UK telecom
              schema. All missing values, outliers, and inconsistencies have been logged reversibly.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={downloadCleaningLogCsv}
          className="px-4 py-2.5 rounded-xl bg-[#0B1F3A] dark:bg-[#12305A] hover:bg-[#12305A] text-white text-xs font-semibold flex items-center gap-2 border border-[#1C4380] transition-colors shrink-0 shadow-sm cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#C9A227]" />
          <span>Download Audit Log (CSV)</span>
        </button>
      </div>

      {/* 4 Pillars Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completeness */}
        <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Completeness</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold border font-tabular ${getScoreColor(report.completenessScore)}`}>
              {report.completenessScore}%
            </span>
          </div>
          <p className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white font-tabular">
            {report.cleanedSummary.missingImputed} Imputed
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Missing numerics filled via segment median; target variable was never imputed.
          </p>
        </div>

        {/* Validity */}
        <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Validity</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold border font-tabular ${getScoreColor(report.validityScore)}`}>
              {report.validityScore}%
            </span>
          </div>
          <p className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white font-tabular">
            {report.violations.length} Rules Flagged
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Checked age (16-110), satisfaction (1-10), UK nations, and non-negative charges.
          </p>
        </div>

        {/* Uniqueness */}
        <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Uniqueness</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold border font-tabular ${getScoreColor(report.uniquenessScore)}`}>
              {report.uniquenessScore}%
            </span>
          </div>
          <p className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white font-tabular">
            {report.duplicateRowsRemoved + report.duplicateIdsResolved} Deduped
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {report.duplicateRowsRemoved} exact duplicates removed; {report.duplicateIdsResolved} ID collisions resolved.
          </p>
        </div>

        {/* Consistency */}
        <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Consistency</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold border font-tabular ${getScoreColor(report.consistencyScore)}`}>
              {report.consistencyScore}%
            </span>
          </div>
          <p className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white font-tabular">
            {report.cleanedSummary.inconsistenciesResolved} Reconciled
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Reconciled Churn Flag (0/1) with recorded Churn Status and exit survey reasons.
          </p>
        </div>
      </div>

      {/* Observed NPS Scale Card */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#12305A]/40 border border-[#E3E6EB] dark:border-[#1C4380] flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-[#C9A227] shrink-0" />
          <div>
            <span className="font-bold text-[#0B1F3A] dark:text-white">Observed NPS Score Scale Range: </span>
            <span className="text-slate-600 dark:text-slate-300">
              Min {report.observedNpsRange.min} to Max {report.observedNpsRange.max} (
              {report.observedNpsRange.isTenScale
                ? 'Standard 0-10 integer advocacy scale'
                : 'Extended -100 to +100 corporate index'}
              )
            </span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded bg-[#C9A227]/20 text-[#8F7218] dark:text-[#E2C15A] font-bold text-[11px]">
          AUTO-ADAPTED
        </span>
      </div>

      {/* Detailed Validation Violations Table */}
      <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#A31A2E]" /> Detailed Rule Violations & Remediation Report
        </h3>

        {report.violations.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
            <span>Zero rule violations detected. Dataset is 100% compliant with BritConnect validation standards.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase bg-slate-50 dark:bg-[#12305A] text-slate-500 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Validation Rule</th>
                  <th className="py-2.5 px-3">Field</th>
                  <th className="py-2.5 px-3 font-tabular">Affected Rows</th>
                  <th className="py-2.5 px-3 font-tabular">% Base</th>
                  <th className="py-2.5 px-3">Concrete Examples</th>
                  <th className="py-2.5 px-3">Remediation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.violations.map((v, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-[#12305A]/40">
                    <td className="py-3 px-3 font-bold text-[#0B1F3A] dark:text-white">{v.rule}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[#1C4380] dark:text-[#E2C15A]">{v.field}</td>
                    <td className="py-3 px-3 font-tabular font-semibold text-[#A31A2E]">{v.affectedCount}</td>
                    <td className="py-3 px-3 font-tabular">{v.affectedPercent}%</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {v.examples.map((ex, exIdx) => (
                          <span
                            key={exIdx}
                            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#12305A] text-[10px] font-mono text-slate-700 dark:text-slate-300"
                          >
                            {ex}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-sm">{v.actionTaken}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cleaning Action Log Table */}
      <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white mb-3 flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-emerald-600" /> Automated Cleaning Audit Trail (Reversible)
        </h3>
        <p className="text-xs text-[#6B7280] dark:text-slate-400 mb-4">
          Every transformation is recorded with exact timestamp and affected row counts for full auditability.
        </p>

        {cleaningLogs.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            No transformations were required. Original data met all requirements.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase bg-slate-50 dark:bg-[#12305A] text-slate-500 dark:text-slate-300 sticky top-0">
                <tr>
                  <th className="py-2 px-3">Rule Applied</th>
                  <th className="py-2 px-3">Target Field</th>
                  <th className="py-2 px-3 font-tabular">Rows Transformed</th>
                  <th className="py-2 px-3">Action Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {cleaningLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-[#12305A]/40">
                    <td className="py-2.5 px-3 font-semibold text-[#0B1F3A] dark:text-white">{log.ruleApplied}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#C9A227]">{log.field}</td>
                    <td className="py-2.5 px-3 font-tabular font-bold text-slate-800 dark:text-slate-200">
                      {log.rowsAffected}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
