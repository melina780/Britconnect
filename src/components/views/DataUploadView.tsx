/**
 * BritConnect Data Ingestion & Persistence View
 * Drag & Drop, Multi-format parsing (Excel, CSV, JSON), Multi-sheet picker,
 * Append vs Replace resolution with Customer ID conflict reporting, and Version History.
 */

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  History,
  Layers,
} from 'lucide-react';
import { CustomerRecord, DatasetVersion } from '../../types/customer';
import { UploadMetadata } from '../../utils/storage';
import { parseFileToRawRows, processAndCleanRecords } from '../../utils/cleaning';
import { generateSampleDataset } from '../../utils/sampleData';

interface DataUploadViewProps {
  currentRecords: CustomerRecord[];
  metadata: UploadMetadata | null;
  versions: DatasetVersion[];
  onDatasetUpdated: (records: CustomerRecord[], meta: UploadMetadata, isAppend?: boolean) => void;
  onRestoreVersion: (versionId: string) => void;
  onClearAllData: () => void;
  onExportBackup: () => void;
}

export const DataUploadView: React.FC<DataUploadViewProps> = ({
  currentRecords,
  metadata,
  versions,
  onDatasetUpdated,
  onRestoreVersion,
  onClearAllData,
  onExportBackup,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [showAppendReplaceModal, setShowAppendReplaceModal] = useState(false);
  const [pendingParsedRecords, setPendingParsedRecords] = useState<CustomerRecord[]>([]);
  const [pendingMeta, setPendingMeta] = useState<UploadMetadata | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File, chosenSheet?: string) => {
    try {
      setIsProcessing(true);
      setProgressMsg(`Parsing ${file.name}...`);
      setPendingFile(file);

      const parsed = await parseFileToRawRows(file, chosenSheet);

      if (parsed.sheetNames && parsed.sheetNames.length > 1 && !chosenSheet) {
        setSheetNames(parsed.sheetNames);
        setSelectedSheet(parsed.detectedSheet);
        setIsProcessing(false);
        return; // Wait for sheet choice
      }

      setProgressMsg('Cleaning data, mapping headers, and validating quality rules...');
      const cleaned = processAndCleanRecords(parsed.rows);

      const active = cleaned.records.filter((r) => r.churnFlag === 0 && r.churnStatus === 'Active').length;
      const churned = cleaned.records.filter((r) => r.churnFlag === 1 || r.churnStatus === 'Churned').length;

      const meta: UploadMetadata = {
        fileName: file.name,
        uploadedAt: new Date().toLocaleString('en-GB'),
        rowCount: cleaned.records.length,
        activeCount: active,
        churnedCount: churned,
        isSampleData: false,
      };

      if (currentRecords.length > 0) {
        // Offer Append vs Replace
        setPendingParsedRecords(cleaned.records);
        setPendingMeta(meta);
        setShowAppendReplaceModal(true);
      } else {
        onDatasetUpdated(cleaned.records, meta, false);
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      alert(`Error reading file: ${err?.message || 'Unsupported or corrupted format'}`);
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  const handleSheetSelect = async (sheet: string) => {
    setSelectedSheet(sheet);
    if (pendingFile) {
      await processSelectedFile(pendingFile, sheet);
    }
  };

  const handleAppendConfirm = () => {
    if (!pendingMeta) return;

    // Merge logic: De-duplicate on Customer ID (Latest uploaded record wins)
    const existingMap = new Map<string, CustomerRecord>();
    for (const r of currentRecords) existingMap.set(r.customerId, r);

    let updatedCount = 0;
    let newCount = 0;

    for (const r of pendingParsedRecords) {
      if (existingMap.has(r.customerId)) {
        updatedCount++;
      } else {
        newCount++;
      }
      existingMap.set(r.customerId, r);
    }

    const merged = Array.from(existingMap.values());
    const active = merged.filter((r) => r.churnFlag === 0 && r.churnStatus === 'Active').length;
    const churned = merged.filter((r) => r.churnFlag === 1 || r.churnStatus === 'Churned').length;

    const mergedMeta: UploadMetadata = {
      ...pendingMeta,
      rowCount: merged.length,
      activeCount: active,
      churnedCount: churned,
    };

    onDatasetUpdated(merged, mergedMeta, true);
    setShowAppendReplaceModal(false);
  };

  const handleReplaceConfirm = () => {
    if (!pendingMeta) return;
    onDatasetUpdated(pendingParsedRecords, pendingMeta, false);
    setShowAppendReplaceModal(false);
  };

  const handleLoadSample = () => {
    setIsProcessing(true);
    setProgressMsg('Generating realistic 5,000 UK telecom customer records...');
    setTimeout(() => {
      const sample = generateSampleDataset(5000);
      const active = sample.filter((r) => r.churnFlag === 0).length;
      const churned = sample.filter((r) => r.churnFlag === 1).length;
      const meta: UploadMetadata = {
        fileName: 'BritConnect_Synthetic_5000_UK.csv',
        uploadedAt: new Date().toLocaleString('en-GB'),
        rowCount: sample.length,
        activeCount: active,
        churnedCount: churned,
        isSampleData: true,
      };
      onDatasetUpdated(sample, meta, false);
      setIsProcessing(false);
      setProgressMsg('');
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-[#0B1F3A] via-[#12305A] to-[#1C4380] text-white rounded-2xl p-6 sm:p-8 shadow-md border border-[#1E3A5F]">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C9A227]/20 text-[#E2C15A] text-xs font-semibold uppercase tracking-wider mb-3 border border-[#C9A227]/30">
            Enterprise Ingestion Pipeline
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            BritConnect AI Churn Intelligence Platform
          </h1>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            Upload your UK telecommunications subscriber dataset (.xlsx, .xls, .csv, .json, .tsv). Data is
            validated against our 38-column dictionary, cleansed of target leakage, and securely persisted in your browser
            using IndexedDB.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-[#C9A227] hover:bg-[#E2C15A] text-[#0B1F3A] font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Browse Dataset File</span>
            </button>
            <button
              onClick={handleLoadSample}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#E2C15A]" />
              <span>Load Realistic Sample (5,000 Customers)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".csv,.xlsx,.xls,.tsv,.json,.txt"
        className="hidden"
      />

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-[#C9A227] bg-[#C9A227]/5'
            : 'border-[#E3E6EB] dark:border-[#1E3A5F] bg-white dark:bg-[#0B1F3A] hover:border-[#1C4380]'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#12305A] flex items-center justify-center mx-auto mb-4 text-[#1C4380] dark:text-[#E2C15A]">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white">
          Drag & Drop your customer file here
        </h3>
        <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-1 max-w-md mx-auto">
          Supports multi-sheet Excel (.xlsx, .xls), CSV (with auto-delimiter & UTF-8 BOM detection), TSV, and JSON up
          to 200,000 rows.
        </p>

        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel (.xlsx)
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" /> CSV / TSV
          </span>
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-600" /> JSON Records
          </span>
        </div>
      </div>

      {/* Multi-sheet Selector Modal/Alert if Excel has multiple sheets */}
      {sheetNames.length > 1 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
          <h4 className="font-bold text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Multi-Sheet Excel Detected
          </h4>
          <p className="text-amber-800 dark:text-amber-300 mb-3">
            Please choose which sheet contains the 38-column customer churn records:
          </p>
          <div className="flex flex-wrap gap-2">
            {sheetNames.map((sheet) => (
              <button
                key={sheet}
                onClick={() => handleSheetSelect(sheet)}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                  selectedSheet === sheet
                    ? 'bg-[#0B1F3A] text-white'
                    : 'bg-white dark:bg-[#12305A] text-slate-800 dark:text-white border'
                }`}
              >
                {sheet}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Processing Loader */}
      {isProcessing && (
        <div className="p-6 rounded-xl bg-white dark:bg-[#0B1F3A] border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm flex items-center gap-4">
          <div className="w-8 h-8 rounded-full border-4 border-[#C9A227] border-t-transparent animate-spin shrink-0" />
          <div>
            <h4 className="font-bold text-sm text-[#0B1F3A] dark:text-white">Ingesting Data...</h4>
            <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">{progressMsg}</p>
          </div>
        </div>
      )}

      {/* Dataset Version History & Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-[#C9A227]" /> Dataset Version History (Last 5 Snapshots)
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
                Past versions saved in browser IndexedDB with one-click restore.
              </p>
            </div>
          </div>

          {versions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No previous version history recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase bg-slate-50 dark:bg-[#12305A] text-slate-500 dark:text-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Ver</th>
                    <th className="py-2.5 px-3">File / Source</th>
                    <th className="py-2.5 px-3">Uploaded At</th>
                    <th className="py-2.5 px-3 font-tabular">Rows</th>
                    <th className="py-2.5 px-3">Active / Churned</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {versions.map((ver, idx) => (
                    <tr key={ver.id} className="hover:bg-slate-50/50 dark:hover:bg-[#12305A]/40">
                      <td className="py-2.5 px-3 font-bold text-[#C9A227]">v{ver.versionNumber}</td>
                      <td className="py-2.5 px-3 font-medium text-[#0B1F3A] dark:text-white">{ver.fileName}</td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{ver.uploadedAt}</td>
                      <td className="py-2.5 px-3 font-tabular font-semibold">{ver.rowCount.toLocaleString('en-GB')}</td>
                      <td className="py-2.5 px-3 text-slate-500">
                        <span className="text-emerald-600 font-semibold">{ver.activeCount.toLocaleString('en-GB')}</span> /{' '}
                        <span className="text-[#A31A2E] font-semibold">{ver.churnedCount.toLocaleString('en-GB')}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {idx === 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                            Current Active
                          </span>
                        ) : (
                          <button
                            onClick={() => onRestoreVersion(ver.id)}
                            className="text-[#1C4380] dark:text-[#E2C15A] hover:underline font-semibold cursor-pointer"
                          >
                            Restore
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Database Persistence Actions */}
        <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white flex items-center gap-2">
              IndexedDB Management
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-1">
              Your dataset, models, and campaign records are saved locally in the browser IndexedDB.
            </p>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Storage Engine</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">IndexedDB (localforage)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Current Records</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-tabular">
                  {currentRecords.length.toLocaleString('en-GB')}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Last Synced</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {metadata?.uploadedAt || 'Not loaded'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={onExportBackup}
              className="w-full py-2.5 px-3 rounded-lg bg-slate-100 dark:bg-[#12305A] hover:bg-slate-200 text-xs font-semibold text-[#0B1F3A] dark:text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 text-[#C9A227]" />
              <span>Export All Database JSON</span>
            </button>
            <button
              onClick={() => setConfirmClearOpen(true)}
              className="w-full py-2.5 px-3 rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-xs font-semibold text-[#A31A2E] flex items-center justify-center gap-2 cursor-pointer transition-colors border border-red-200 dark:border-red-900"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Saved Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Append vs Replace Choice Dialog Modal */}
      {showAppendReplaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0B1F3A] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#1E3A5F] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white">Existing Dataset Detected</h3>
                <p className="text-xs text-slate-500">
                  You already have {currentRecords.length.toLocaleString('en-GB')} customer records loaded.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              How would you like to handle the incoming {pendingParsedRecords.length.toLocaleString('en-GB')} records from{' '}
              <strong className="text-slate-900 dark:text-white">{pendingMeta?.fileName}</strong>?
            </p>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleAppendConfirm}
                className="w-full p-3 rounded-xl border-2 border-[#1C4380] hover:bg-slate-50 dark:hover:bg-[#12305A] text-left text-xs transition-colors flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-[#1C4380] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  A
                </div>
                <div>
                  <span className="font-bold text-[#0B1F3A] dark:text-white block">
                    (a) Append & Deduplicate on Customer ID
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Merge new rows. For any duplicate Customer ID, the latest uploaded record wins.
                  </span>
                </div>
              </button>

              <button
                onClick={handleReplaceConfirm}
                className="w-full p-3 rounded-xl border-2 border-[#A31A2E] hover:bg-red-50/50 dark:hover:bg-red-950/20 text-left text-xs transition-colors flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-[#A31A2E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  B
                </div>
                <div>
                  <span className="font-bold text-[#A31A2E] block">(b) Replace Saved Dataset</span>
                  <span className="text-slate-500 text-[11px]">
                    Overwrite the saved dataset entirely with this new file. A snapshot will be saved in version history.
                  </span>
                </div>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAppendReplaceModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Clear All Data Modal */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0B1F3A] rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-red-300 dark:border-red-900 space-y-4">
            <h3 className="text-sm font-bold text-[#A31A2E] flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Clear All Saved Data?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will permanently delete all stored datasets, trained models, campaign records, and version history from
              IndexedDB. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearAllData();
                  setConfirmClearOpen(false);
                }}
                className="px-4 py-2 bg-[#A31A2E] text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
