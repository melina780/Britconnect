/**
 * BritConnect Chart Theme & Recharts Standards Module
 * Enforces:
 * - NO gridlines, no chart borders
 * - Strict palette: Navy Blue (#0B1F3A), Gold (#C9A227), Dark Red (#7A1020)
 * - Clear title, one-line subtitle, benchmark dashed lines, rich tooltips
 */

import React from 'react';
import { ResponsiveContainer, Tooltip } from 'recharts';

export const BRAND_COLORS = {
  navyDeep: '#0B1F3A',
  navyMid: '#12305A',
  navyLight: '#1C4380',
  navySoft: '#2D5B9E',
  goldPrimary: '#C9A227',
  goldLight: '#E2C15A',
  goldDark: '#8F7218',
  redPrimary: '#7A1020',
  redLight: '#A31A2E',
  redDeep: '#4D0A14',
  neutralBorder: '#E3E6EB',
  neutralMuted: '#6B7280',
  neutralDark: '#1F2937',
  neutralLight: '#F5F6F8',
  white: '#FFFFFF',
};

// Segment consistent color mapping
export const SEGMENT_COLORS: Record<string, string> = {
  Consumer: '#12305A', // Navy mid
  'Small Business': '#C9A227', // Gold primary
  Broadband: '#1C4380', // Navy light
  Mobile: '#2D5B9E', // Navy soft
  Bundled: '#C9A227', // Gold
  'TV & Broadband': '#E2C15A', // Gold light
  VoIP: '#8F7218', // Gold dark
  Active: '#12305A', // Navy
  Churned: '#7A1020', // Dark red
  Critical: '#7A1020', // Dark red primary
  High: '#A31A2E', // Dark red light
  Medium: '#C9A227', // Gold
  Low: '#1C4380', // Navy
};

export interface ChartContainerProps {
  title: string;
  subtitle: string;
  benchmarkNote?: string;
  height?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  benchmarkNote,
  height = 300,
  action,
  children,
}) => {
  return (
    <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white flex items-center gap-2">
            {title}
          </h3>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        {action && <div>{action}</div>}
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </div>

      {benchmarkNote && (
        <div className="mt-2 pt-2 border-t border-[#F5F6F8] dark:border-[#1E3A5F] flex items-center justify-between text-[11px] text-[#6B7280] dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[#C9A227] inline-block border-b border-dashed border-[#C9A227]"></span>
            {benchmarkNote}
          </span>
          <span className="text-[10px] text-slate-400">BritConnect ML Engine</span>
        </div>
      )}
    </div>
  );
};

export const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
  label?: string;
  unit?: string;
  formatter?: (val: any) => string;
}> = ({ active, payload, label, unit = '', formatter }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0B1F3A] text-white p-3 rounded-lg shadow-xl text-xs border border-[#1E3A5F] min-w-[140px] z-50">
        <p className="font-semibold text-slate-200 mb-1.5 border-b border-slate-700 pb-1">{label}</p>
        {payload.map((entry, idx) => (
          <div key={`item-${idx}`} className="flex items-center justify-between gap-3 my-0.5">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || BRAND_COLORS.goldPrimary }} />
              {entry.name || 'Value'}:
            </span>
            <span className="font-bold text-[#E2C15A] font-tabular">
              {formatter ? formatter(entry.value) : `${entry.value}${unit}`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};
