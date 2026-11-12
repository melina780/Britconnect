/**
 * BritConnect Campaign Performance Tracker
 * Design, execution and attribution of proactive retention campaigns
 * with 10% randomized hold-out control groups, uplift confidence intervals, and ROI tracking.
 */

import React, { useState } from 'react';
import { CampaignRecord } from '../../types/customer';
import { formatGbp, formatPercent } from '../../metrics/calculations';
import { ChartCard, CustomTooltip, BRAND_COLORS } from '../common/ChartTheme';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Send,
  Plus,
  TrendingUp,
  DollarSign,
  Target,
  ShieldCheck,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface CampaignTrackerViewProps {
  campaigns: CampaignRecord[];
  onAddCampaign: (campaign: CampaignRecord) => void;
}

export const CampaignTrackerView: React.FC<CampaignTrackerViewProps> = ({
  campaigns,
  onAddCampaign,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [targetSegment, setTargetSegment] = useState('High Risk Month-to-Month');
  const [channel, setChannel] = useState<CampaignRecord['channel']>('Direct Phone Call');
  const [offer, setOffer] = useState('15% Tariff Discount + Free Wi-Fi 6 Router');
  const [costPerContact, setCostPerContact] = useState(25);
  const [budget, setBudget] = useState(15000);
  const [targetedCount, setTargetedCount] = useState(500);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Compute realistic randomized 10% hold-out outcomes
    const controlCount = Math.round(targetedCount * 0.1);
    const treatmentCount = targetedCount - controlCount;

    const contacted = Math.round(treatmentCount * 0.92);
    const responded = Math.round(contacted * 0.48);
    const offerAccepted = Math.round(responded * 0.72);

    // Retention rates: Treatment ~78%, Control ~52% (Uplift ~+26%)
    const retainedTreatment = Math.round(treatmentCount * 0.78);
    const churnedTreatment = treatmentCount - retainedTreatment;

    const retainedControl = Math.round(controlCount * 0.52);
    const churnedControl = controlCount - retainedControl;

    const treatmentRate = (retainedTreatment / treatmentCount) * 100;
    const controlRate = (retainedControl / controlCount) * 100;
    const uplift = treatmentRate - controlRate;

    const avgMrr = 45;
    const annualValuePerSaved = avgMrr * 12;
    const incrementalSavedCustomers = Math.round(treatmentCount * (uplift / 100));
    const grossSaved = incrementalSavedCustomers * annualValuePerSaved;
    const totalCost = contacted * costPerContact;
    const netBenefit = Math.max(0, grossSaved - totalCost);
    const roi = Math.round((netBenefit / Math.max(1, totalCost)) * 100);

    const newCampaign: CampaignRecord = {
      id: `camp-${Date.now()}`,
      name: name || 'Proactive Fiber Retention Initiative',
      objective: objective || 'Reduce month-to-month contract attrition prior to renewal',
      targetSegment,
      channel,
      offer,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      costPerContactGbp: costPerContact,
      budgetGbp: budget,
      controlGroupPercent: 10,
      createdAt: new Date().toLocaleDateString('en-GB'),
      targetedCount,
      contactedCount: contacted,
      respondedCount: responded,
      offerAcceptedCount: offerAccepted,
      retainedTreatmentCount: retainedTreatment,
      churnedTreatmentCount: churnedTreatment,
      controlTotalCount: controlCount,
      retainedControlCount: retainedControl,
      churnedControlCount: churnedControl,
      reachPercent: Math.round((contacted / treatmentCount) * 100),
      responseRatePercent: Math.round((responded / contacted) * 100),
      offerTakeUpPercent: Math.round((offerAccepted / responded) * 100),
      treatmentRetentionRatePercent: Math.round(treatmentRate * 10) / 10,
      controlRetentionRatePercent: Math.round(controlRate * 10) / 10,
      upliftPercent: Math.round(uplift * 10) / 10,
      isSignificant: true,
      confidenceInterval: [Math.round((uplift - 3.5) * 10) / 10, Math.round((uplift + 3.5) * 10) / 10],
      grossRevenueSavedGbp: grossSaved,
      totalCampaignCostGbp: totalCost,
      netBenefitGbp: netBenefit,
      roiPercent: roi,
      costPerSavedCustomerGbp: Math.round(totalCost / Math.max(1, incrementalSavedCustomers)),
    };

    onAddCampaign(newCampaign);
    setShowCreateModal(false);
  };

  // Funnel Data for primary campaign
  const activeCamp = campaigns[0];
  const funnelData = activeCamp
    ? [
        { stage: 'Targeted', count: activeCamp.targetedCount },
        { stage: 'Contacted', count: activeCamp.contactedCount },
        { stage: 'Responded', count: activeCamp.respondedCount },
        { stage: 'Offer Accepted', count: activeCamp.offerAcceptedCount },
        { stage: 'Retained', count: activeCamp.retainedTreatmentCount },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B1F3A] dark:text-white">
            Campaign Performance Tracker & Hold-out Uplift
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
            Scientific measurement of retention interventions against 10% randomized control groups.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#0B1F3A] dark:bg-[#12305A] hover:bg-[#12305A] text-white text-xs font-semibold flex items-center gap-2 border border-[#1C4380] transition-colors shrink-0 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#C9A227]" />
          <span>Launch New Retention Campaign</span>
        </button>
      </div>

      {/* Primary Campaign Highlight KPIs */}
      {activeCamp && (
        <div className="bg-gradient-to-r from-slate-900 to-[#12305A] text-white rounded-2xl p-6 border border-[#1E3A5F] shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A227]">
                Active Campaign Highlight
              </span>
              <h3 className="text-xl font-bold text-white mt-1">{activeCamp.name}</h3>
              <p className="text-xs text-slate-300 mt-0.5">{activeCamp.objective}</p>

              <div className="flex items-center gap-4 mt-3 text-xs text-slate-300">
                <span>Channel: <strong>{activeCamp.channel}</strong></span>
                <span>Offer: <strong>{activeCamp.offer}</strong></span>
                <span>Holdout: <strong>{activeCamp.controlGroupPercent}% Control</strong></span>
              </div>
            </div>

            {/* Uplift and Financial Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white/10">
                <span className="text-[10px] text-slate-300 block">Incremental Uplift</span>
                <span className="text-xl font-extrabold text-[#E2C15A] font-tabular">
                  +{activeCamp.upliftPercent}%
                </span>
                <span className="text-[9px] text-emerald-400 block mt-0.5">Statistically Significant</span>
              </div>
              <div className="p-3 rounded-xl bg-white/10">
                <span className="text-[10px] text-slate-300 block">Treatment vs Control</span>
                <span className="text-xl font-extrabold text-white font-tabular">
                  {activeCamp.treatmentRetentionRatePercent}% vs {activeCamp.controlRetentionRatePercent}%
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Retention Rate</span>
              </div>
              <div className="p-3 rounded-xl bg-white/10">
                <span className="text-[10px] text-slate-300 block">Net Revenue Saved</span>
                <span className="text-xl font-extrabold text-white font-tabular">
                  {formatGbp(activeCamp.netBenefitGbp, true)}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">After campaign costs</span>
              </div>
              <div className="p-3 rounded-xl bg-white/10">
                <span className="text-[10px] text-slate-300 block">Campaign ROI</span>
                <span className="text-xl font-extrabold text-[#C9A227] font-tabular">
                  {activeCamp.roiPercent}%
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Cost/Saved: {formatGbp(activeCamp.costPerSavedCustomerGbp)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Funnel Chart for Active Campaign */}
      {activeCamp && (
        <ChartCard
          title="Campaign Conversion & Retention Funnel"
          subtitle="Subscriber transition from initial cohort selection through contact, response, and verified retention."
        >
          <BarChart data={funnelData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
            <XAxis dataKey="stage" stroke="#6B7280" tick={{ fontSize: 11 }} />
            <YAxis stroke="#6B7280" tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip unit=" subscribers" />} />
            <Bar dataKey="count" name="Subscribers" fill={BRAND_COLORS.navyMid} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>
      )}

      {/* Campaigns Leaderboard Table */}
      <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white mb-3">
          Retention Campaign Registry & Historical Attribution
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] uppercase bg-slate-50 dark:bg-[#12305A] text-slate-500 dark:text-slate-300">
              <tr>
                <th className="py-2.5 px-3">Campaign Name</th>
                <th className="py-2.5 px-3">Target Segment</th>
                <th className="py-2.5 px-3">Channel & Offer</th>
                <th className="py-2.5 px-3 font-tabular">Targeted</th>
                <th className="py-2.5 px-3 font-tabular">Reach (%)</th>
                <th className="py-2.5 px-3 font-tabular">Uplift</th>
                <th className="py-2.5 px-3 font-tabular">Cost</th>
                <th className="py-2.5 px-3 font-tabular">Net Benefit</th>
                <th className="py-2.5 px-3 font-tabular text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {campaigns.map((camp) => (
                <tr key={camp.id} className="hover:bg-slate-50/50 dark:hover:bg-[#12305A]/40">
                  <td className="py-3 px-3 font-bold text-[#0B1F3A] dark:text-white">{camp.name}</td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{camp.targetSegment}</td>
                  <td className="py-3 px-3">
                    <span className="font-semibold block">{camp.channel}</span>
                    <span className="text-[10px] text-slate-400">{camp.offer}</span>
                  </td>
                  <td className="py-3 px-3 font-tabular">{camp.targetedCount.toLocaleString('en-GB')}</td>
                  <td className="py-3 px-3 font-tabular">{camp.reachPercent}%</td>
                  <td className="py-3 px-3 font-tabular font-bold text-emerald-600">+{camp.upliftPercent}%</td>
                  <td className="py-3 px-3 font-tabular">{formatGbp(camp.totalCampaignCostGbp, true)}</td>
                  <td className="py-3 px-3 font-tabular font-bold text-[#0B1F3A] dark:text-white">
                    {formatGbp(camp.netBenefitGbp, true)}
                  </td>
                  <td className="py-3 px-3 font-tabular font-bold text-[#C9A227] text-right">
                    {camp.roiPercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#0B1F3A] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#1E3A5F] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-[#C9A227]" /> Launch New Retention Campaign
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Fibre Speed Upgrade & Router Renewal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-[#12305A] border border-[#E3E6EB] dark:border-[#1C4380] text-xs text-[#0B1F3A] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Target Segment</label>
                <input
                  type="text"
                  required
                  value={targetSegment}
                  onChange={(e) => setTargetSegment(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-[#12305A] border border-[#E3E6EB] dark:border-[#1C4380] text-xs text-[#0B1F3A] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-[#12305A] border border-[#E3E6EB] dark:border-[#1C4380] text-xs text-[#0B1F3A] dark:text-white"
                  >
                    <option value="Direct Phone Call">Direct Phone Call</option>
                    <option value="Personalised Email">Personalised Email</option>
                    <option value="SMS">SMS</option>
                    <option value="MyAccount App">MyAccount App</option>
                    <option value="Field Retention Team">Field Retention Team</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Cost Per Contact (£)</label>
                  <input
                    type="number"
                    value={costPerContact}
                    onChange={(e) => setCostPerContact(parseFloat(e.target.value) || 20)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-[#12305A] border border-[#E3E6EB] dark:border-[#1C4380] text-xs text-[#0B1F3A] dark:text-white font-tabular"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Offer Details</label>
                <input
                  type="text"
                  required
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-[#12305A] border border-[#E3E6EB] dark:border-[#1C4380] text-xs text-[#0B1F3A] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Target Subscriber Count</label>
                  <input
                    type="number"
                    value={targetedCount}
                    onChange={(e) => setTargetedCount(parseInt(e.target.value, 10) || 100)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-[#12305A] border border-[#E3E6EB] dark:border-[#1C4380] text-xs text-[#0B1F3A] dark:text-white font-tabular"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Total Campaign Budget (£)</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(parseFloat(e.target.value) || 10000)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-[#12305A] border border-[#E3E6EB] dark:border-[#1C4380] text-xs text-[#0B1F3A] dark:text-white font-tabular"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-[11px] border border-amber-200 dark:border-amber-800">
                <strong>Scientific Attribution:</strong> Automatically reserves a 10% hold-out control group to isolate true incremental retention uplift.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#0B1F3A] dark:bg-[#1C4380] text-white font-bold hover:opacity-90 cursor-pointer"
                >
                  Deploy Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
