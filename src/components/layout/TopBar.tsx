/**
 * BritConnect Sticky Global Top Bar
 * Hosts Dataset status chip, interactive filters (Segment, Nation, Service, Contract),
 * Customer ID search, Export action, Dark Mode toggle, and Sample Data banner.
 */

import React, { useState } from 'react';
import {
  Search,
  Filter,
  X,
  Download,
  Moon,
  Sun,
  FileCheck,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { GlobalFilterState } from '../../types/customer';
import { UploadMetadata } from '../../utils/storage';

interface TopBarProps {
  metadata: UploadMetadata | null;
  filters: GlobalFilterState;
  onFilterChange: (filters: Partial<GlobalFilterState>) => void;
  onResetFilters: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onExportClick: () => void;
  onOpenAiDrawer: () => void;
  onLoadSampleData: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  metadata,
  filters,
  onFilterChange,
  onResetFilters,
  isDarkMode,
  onToggleDarkMode,
  onExportClick,
  onOpenAiDrawer,
  onLoadSampleData,
}) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Check if any filters are active
  const hasActiveFilters =
    filters.customerSegment !== 'All' ||
    filters.ukNation !== 'All' ||
    filters.serviceType !== 'All' ||
    filters.contractType !== 'All' ||
    Boolean(filters.searchQuery);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0B1F3A]/95 backdrop-blur-md border-b border-[#E3E6EB] dark:border-[#1E3A5F] px-6 py-3 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Dataset Status Chip & Sample Data Alert */}
        <div className="flex items-center flex-wrap gap-2.5">
          {metadata ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-[#12305A] text-xs text-[#0B1F3A] dark:text-slate-200 border border-[#E3E6EB] dark:border-[#1C4380]">
              <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium truncate max-w-[200px]" title={metadata.fileName}>
                {metadata.fileName}
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-tabular font-semibold">{metadata.rowCount.toLocaleString('en-GB')} rows</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>No dataset active</span>
              <button
                onClick={onLoadSampleData}
                className="underline hover:text-amber-900 font-semibold cursor-pointer ml-1"
              >
                Load Sample (5,000)
              </button>
            </div>
          )}

          {metadata?.isSampleData && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#C9A227]/20 text-[#8F7218] dark:text-[#E2C15A] text-[11px] font-bold tracking-wider uppercase border border-[#C9A227]/40">
              SAMPLE DATA (5,000 UK Customers)
            </span>
          )}
        </div>

        {/* Right: Search, Filter Triggers, AI Launcher, Export & Theme */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Global Search for Customer ID */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Customer ID (e.g. BC-0001)..."
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#12305A] border border-[#E3E6EB] dark:border-[#1C4380] text-xs text-[#1F2937] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C9A227] w-52"
            />
            {filters.searchQuery && (
              <button
                onClick={() => onFilterChange({ searchQuery: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Segment Filter Pill */}
          <select
            value={filters.customerSegment}
            onChange={(e) => onFilterChange({ customerSegment: e.target.value })}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#12305A] border border-[#E3E6EB] dark:border-[#1C4380] text-xs text-[#0B1F3A] dark:text-white cursor-pointer"
          >
            <option value="All">All Segments</option>
            <option value="Consumer">Consumer</option>
            <option value="Small Business">Small Business</option>
          </select>

          {/* More Filters Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                hasActiveFilters
                  ? 'bg-[#12305A] text-white border-[#1C4380]'
                  : 'bg-slate-50 dark:bg-[#12305A] text-slate-700 dark:text-slate-200 border-[#E3E6EB] dark:border-[#1C4380] hover:bg-slate-100'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9A227]" />
              )}
            </button>

            {/* Filter Dropdown Popover */}
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#0B1F3A] rounded-xl shadow-2xl border border-[#E3E6EB] dark:border-[#1E3A5F] p-4 z-50 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="font-bold text-[#0B1F3A] dark:text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#C9A227]" /> Global Filters
                  </span>
                  {hasActiveFilters && (
                    <button
                      onClick={onResetFilters}
                      className="text-[11px] text-[#A31A2E] hover:underline font-semibold"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* UK Nation */}
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">UK Nation</label>
                  <select
                    value={filters.ukNation}
                    onChange={(e) => onFilterChange({ ukNation: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-[#12305A] border border-[#E3E6EB] dark:border-[#1C4380] text-xs text-[#0B1F3A] dark:text-white"
                  >
                    <option value="All">All UK Nations</option>
                    <option value="England">England</option>
                    <option value="Scotland">Scotland</option>
                    <option value="Wales">Wales</option>
                    <option value="Northern Ireland">Northern Ireland</option>
                  </select>
                </div>

                {/* Service Type */}
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Service Type</label>
                  <select
                    value={filters.serviceType}
                    onChange={(e) => onFilterChange({ serviceType: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-[#12305A] border border-[#E3E6EB] dark:border-[#1C4380] text-xs text-[#0B1F3A] dark:text-white"
                  >
                    <option value="All">All Services</option>
                    <option value="Broadband">Broadband</option>
                    <option value="Mobile">Mobile</option>
                    <option value="Bundled">Bundled</option>
                    <option value="TV & Broadband">TV & Broadband</option>
                    <option value="VoIP">VoIP</option>
                  </select>
                </div>

                {/* Contract Type */}
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Contract Term</label>
                  <select
                    value={filters.contractType}
                    onChange={(e) => onFilterChange({ contractType: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-[#12305A] border border-[#E3E6EB] dark:border-[#1C4380] text-xs text-[#0B1F3A] dark:text-white"
                  >
                    <option value="All">All Contract Types</option>
                    <option value="Month-to-Month">Month-to-Month</option>
                    <option value="12 Months">12 Months</option>
                    <option value="24 Months">24 Months</option>
                    <option value="36 Months">36 Months</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowFilterDropdown(false)}
                  className="w-full py-1.5 rounded-lg bg-[#0B1F3A] dark:bg-[#1C4380] text-white text-xs font-semibold hover:opacity-90"
                >
                  Apply Filters
                </button>
              </div>
            )}
          </div>

          {/* AI Analyst Quick Launcher */}
          <button
            onClick={onOpenAiDrawer}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#0B1F3A] to-[#1C4380] text-white text-xs font-semibold shadow-sm hover:opacity-95 transition-opacity"
            title="Open BritConnect AI Analyst"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E2C15A]" />
            <span>AI Analyst</span>
          </button>

          {/* Export Report Trigger */}
          <button
            onClick={onExportClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#12305A] hover:bg-slate-200 text-[#0B1F3A] dark:text-slate-200 text-xs font-medium border border-[#E3E6EB] dark:border-[#1C4380] transition-colors"
            title="Download Excel Workbook or Executive PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Dark Navy / Light Theme Toggle */}
          <button
            onClick={onToggleDarkMode}
            aria-label="Toggle visual theme"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#12305A] transition-colors"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-[#E2C15A]" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Filter Active Chips Bar */}
      {hasActiveFilters && (
        <div className="flex items-center flex-wrap gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-[#12305A] text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Filters:</span>

          {filters.customerSegment !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#12305A] text-[#0B1F3A] dark:text-slate-200 border border-[#E3E6EB] dark:border-[#1C4380]">
              Segment: {filters.customerSegment}
              <button onClick={() => onFilterChange({ customerSegment: 'All' })}>
                <X className="w-3 h-3 hover:text-red-500" />
              </button>
            </span>
          )}

          {filters.ukNation !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#12305A] text-[#0B1F3A] dark:text-slate-200 border border-[#E3E6EB] dark:border-[#1C4380]">
              Nation: {filters.ukNation}
              <button onClick={() => onFilterChange({ ukNation: 'All' })}>
                <X className="w-3 h-3 hover:text-red-500" />
              </button>
            </span>
          )}

          {filters.serviceType !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#12305A] text-[#0B1F3A] dark:text-slate-200 border border-[#E3E6EB] dark:border-[#1C4380]">
              Service: {filters.serviceType}
              <button onClick={() => onFilterChange({ serviceType: 'All' })}>
                <X className="w-3 h-3 hover:text-red-500" />
              </button>
            </span>
          )}

          {filters.contractType !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#12305A] text-[#0B1F3A] dark:text-slate-200 border border-[#E3E6EB] dark:border-[#1C4380]">
              Contract: {filters.contractType}
              <button onClick={() => onFilterChange({ contractType: 'All' })}>
                <X className="w-3 h-3 hover:text-red-500" />
              </button>
            </span>
          )}

          {filters.searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#12305A] text-[#0B1F3A] dark:text-slate-200 border border-[#E3E6EB] dark:border-[#1C4380]">
              ID: {filters.searchQuery}
              <button onClick={() => onFilterChange({ searchQuery: '' })}>
                <X className="w-3 h-3 hover:text-red-500" />
              </button>
            </span>
          )}

          <button
            onClick={onResetFilters}
            className="text-[11px] font-bold text-[#A31A2E] hover:underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </header>
  );
};
