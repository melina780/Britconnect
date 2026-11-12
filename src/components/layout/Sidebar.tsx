/**
 * BritConnect Navigation Sidebar
 * 13 Collapsible Sections, Mobile Hamburger, Brand Header with Gold Signal-Wave Glyph
 */

import React from 'react';
import {
  UploadCloud,
  ShieldCheck,
  LayoutDashboard,
  LineChart,
  Users,
  Cpu,
  UserCheck,
  HelpCircle,
  Award,
  Send,
  Bot,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Radio,
} from 'lucide-react';

export type NavSection =
  | 'upload'
  | 'quality'
  | 'dashboard'
  | 'churn_analysis'
  | 'segmentation'
  | 'model_lab'
  | 'scoring'
  | 'explainability'
  | 'recommendations'
  | 'campaigns'
  | 'analyst'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  datasetLoaded: boolean;
  activeCount: number;
  churnRate: number;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'upload', label: '1. Data Ingestion', icon: UploadCloud },
  { id: 'quality', label: '2. Data Quality', icon: ShieldCheck },
  { id: 'dashboard', label: '3. Executive Dashboard', icon: LayoutDashboard },
  { id: 'churn_analysis', label: '4. Churn Analysis', icon: LineChart },
  { id: 'segmentation', label: '5. Segmentation', icon: Users },
  { id: 'model_lab', label: '6. Model Lab (ML)', icon: Cpu },
  { id: 'scoring', label: '7. Customer Scoring', icon: UserCheck },
  { id: 'explainability', label: '8. Explainability (XAI)', icon: HelpCircle },
  { id: 'recommendations', label: '9. AI Recommendations', icon: Award },
  { id: 'campaigns', label: '10. Campaign Tracker', icon: Send },
  { id: 'analyst', label: '11. AI Analyst Chatbot', icon: Bot },
  { id: 'reports', label: '12. Reports & Export', icon: FileSpreadsheet },
  { id: 'settings', label: '13. Settings & Schema', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  datasetLoaded,
  activeCount,
  churnRate,
}) => {
  return (
    <aside
      className={`fixed lg:static top-0 left-0 z-40 h-full bg-[#0B1F3A] text-white transition-all duration-300 flex flex-col justify-between border-r border-[#12305A] ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Top Brand Header */}
      <div>
        <div className="h-18 flex items-center justify-between px-5 border-b border-[#12305A]">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Gold Signal-Wave Glyph */}
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#C9A227] to-[#8F7218] flex items-center justify-center shrink-0 shadow-md">
              <Radio className="w-5 h-5 text-[#0B1F3A]" />
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1">
                  Brit<span className="text-[#C9A227]">Connect</span>
                </span>
                <span className="text-[10px] tracking-wider uppercase text-slate-400 block font-medium">
                  AI Churn Intelligence
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            aria-label="Toggle navigation sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#12305A] transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Live Mini Portfolio Status Banner */}
        {!collapsed && datasetLoaded && (
          <div className="mx-4 my-3 p-3 rounded-lg bg-[#12305A]/60 border border-[#1C4380] text-xs">
            <div className="flex items-center justify-between text-slate-300 mb-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Active Subscribers</span>
              <span className="font-bold text-white font-tabular">{activeCount.toLocaleString('en-GB')}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Baseline Churn</span>
              <span className="font-bold text-[#E2C15A] font-tabular">{churnRate.toFixed(1)}%</span>
            </div>
          </div>
        )}

        {/* Navigation List */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#1C4380] to-[#12305A] text-white border-l-4 border-[#C9A227] shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-[#12305A]/70'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C9A227]' : 'text-slate-400'}`} />
                {!collapsed && <span className="truncate text-left">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-[#12305A] text-[11px] text-slate-400 flex items-center justify-between">
          <span>UK Telecom Edition v2.4</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="In-Browser Engine Active" />
        </div>
      )}
    </aside>
  );
};
