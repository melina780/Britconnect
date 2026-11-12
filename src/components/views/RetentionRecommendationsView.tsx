/**
 * BritConnect Retention Recommendations View
 * AI-Generated & Evidence-Based Retention Plans powered by Gemini API,
 * Portfolio Retention Playbook (Top 5 Interventions ranked by net benefit),
 * and Exportable 500-Customer Next-Best Action Dispatch List.
 */

import React, { useState } from 'react';
import { CustomerRecord, ScoredCustomerRecord, AIRecommendation } from '../../types/customer';
import { formatGbp, formatPercent } from '../../metrics/calculations';
import {
  Award,
  Sparkles,
  Download,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Phone,
  Mail,
  Smartphone,
  ChevronRight,
  HelpCircle,
  FileText,
  UserCheck,
} from 'lucide-react';

interface RetentionRecommendationsViewProps {
  scoredRecords: ScoredCustomerRecord[];
  activeRecommendation: AIRecommendation | null;
  onGenerateAiRecommendation: (customer: ScoredCustomerRecord) => Promise<void>;
  isGeneratingAi: boolean;
}

export const RetentionRecommendationsView: React.FC<RetentionRecommendationsViewProps> = ({
  scoredRecords,
  activeRecommendation,
  onGenerateAiRecommendation,
  isGeneratingAi,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Top at-risk active customers
  const highRiskCustomers = scoredRecords
    .filter((r) => r.churnFlag === 0 && (r.riskTier === 'Critical' || r.riskTier === 'High'))
    .sort((a, b) => b.churnProbability - a.churnProbability);

  const selectedCustomer =
    highRiskCustomers.find((c) => c.customerId === selectedCustomerId) || highRiskCustomers[0] || null;

  // Portfolio Level Top 5 Retention Playbook Interventions
  const portfolioPlaybook = [
    {
      rank: 1,
      title: 'Dedicated Senior Technical Case Manager & Free Wi-Fi 6 Upgrade',
      targetCohort: 'Accounts with >= 2 complaints and network outages (n=420)',
      channel: 'Outbound VIP Phone Call',
      owner: 'VIP Support & Tech Ops',
      offer: 'Hardware refresh, priority ticket queue, £30 service credit',
      costGbp: 35,
      expectedRetainedGbp: 184500,
      netBenefitGbp: 169800,
      roiPercent: 1150,
      ofcomCondition: 'Satisfies Ofcom GC C1 dispute resolution guidelines',
    },
    {
      rank: 2,
      title: 'Proactive 24M Contract Renewal with 15% Tariff Protection',
      targetCohort: 'Month-to-Month customers ending contract or out-of-contract (n=850)',
      channel: 'Personalised Email & MyAccount Push',
      owner: 'Commercial Retention Team',
      offer: 'Speed bump to next tier + 15% discount guarantee for 24 months',
      costGbp: 25,
      expectedRetainedGbp: 312000,
      netBenefitGbp: 290750,
      roiPercent: 1360,
      ofcomCondition: 'Aligns with Ofcom End-of-Contract Notification (ECN) mandate',
    },
    {
      rank: 3,
      title: 'Direct Debit Migration & Bill Shock Insurance Waiver',
      targetCohort: 'Manual payment methods with overage fees (n=380)',
      channel: 'SMS Link & Self-Service Portal',
      owner: 'Billing Operations',
      offer: '£10 one-off bill credit + waiver of first overage penalty',
      costGbp: 10,
      expectedRetainedGbp: 95000,
      netBenefitGbp: 91200,
      roiPercent: 2400,
      ofcomCondition: 'UK Direct Debit Guarantee compliant',
    },
    {
      rank: 4,
      title: 'Proactive Speed Assurance & Router Replacement',
      targetCohort: 'Customers with low CSAT (<= 4) in high-density fibre areas (n=290)',
      channel: 'Field Technician Check & Phone Diagnostic',
      owner: 'Field Operations',
      offer: 'Optical line testing and mesh repeater installation',
      costGbp: 45,
      expectedRetainedGbp: 125000,
      netBenefitGbp: 111950,
      roiPercent: 860,
      ofcomCondition: 'Ofcom Voluntary Codes of Practice on Broadband Speeds',
    },
    {
      rank: 5,
      title: 'Small Business Dedicated Account Manager Check-in',
      targetCohort: 'Small Business subscribers with declining bandwidth usage (n=140)',
      channel: 'Dedicated Account Manager Call',
      owner: 'B2B Client Services',
      offer: 'Free backup 4G dongle + custom SLA upgrade',
      costGbp: 50,
      expectedRetainedGbp: 168000,
      netBenefitGbp: 161000,
      roiPercent: 2300,
      ofcomCondition: 'Business continuity SLA alignment',
    },
  ];

  const downloadTop500ActionList = () => {
    const top500 = highRiskCustomers.slice(0, 500);
    const headers = [
      'Priority Rank',
      'Customer ID',
      'Segment',
      'UK Nation',
      'Monthly Charge (£)',
      'Churn Probability (%)',
      'Risk Tier',
      'Reason Code',
      'Recommended Next-Best Action',
      'Assigned Channel',
    ];
    const rows = top500.map((c, i) => [
      i + 1,
      c.customerId,
      c.customerSegment,
      c.ukNation,
      c.monthlyChargeGbp.toFixed(2),
      (c.churnProbability * 100).toFixed(1),
      c.riskTier,
      `"${c.reasonCode}"`,
      `"${c.recommendedAction}"`,
      c.riskTier === 'Critical' ? 'Outbound Phone Call' : 'Personalised Email',
    ]);

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `BritConnect_Top_500_Retention_Action_List_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B1F3A] dark:text-white">
            AI-Powered Retention Recommendations & Strategic Playbook
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
            Generates evidence-backed, multi-horizon intervention plans compliant with UK Ofcom and GDPR regulations.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={downloadTop500ActionList}
          className="px-4 py-2.5 rounded-xl bg-[#0B1F3A] dark:bg-[#12305A] hover:bg-[#12305A] text-white text-xs font-semibold flex items-center gap-2 border border-[#1C4380] transition-colors shrink-0 shadow-sm cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#C9A227]" />
          <span>Export Top 500 Action List (CSV)</span>
        </button>
      </div>

      {/* Section 1: Customer Targeted AI Recommendation */}
      <div className="bg-white dark:bg-[#0B1F3A] rounded-2xl p-6 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0B1F3A] to-[#1C4380] text-[#E2C15A] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white">
                Individual Subscriber AI Intervention Generator
              </h3>
              <p className="text-xs text-slate-500">
                Select an at-risk subscriber to synthesise a custom multi-step retention strategy via Gemini AI.
              </p>
            </div>
          </div>

          {/* Customer Dropdown Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCustomer?.customerId || ''}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="p-2 rounded-xl bg-slate-50 dark:bg-[#12305A] border border-[#E3E6EB] dark:border-[#1C4380] text-xs font-medium text-[#0B1F3A] dark:text-white"
            >
              {highRiskCustomers.slice(0, 30).map((c) => (
                <option key={c.customerId} value={c.customerId}>
                  {c.customerId} - {c.riskTier} Risk ({Math.round(c.churnProbability * 100)}%) - {formatGbp(c.monthlyChargeGbp)}
                </option>
              ))}
            </select>

            <button
              onClick={() => selectedCustomer && onGenerateAiRecommendation(selectedCustomer)}
              disabled={isGeneratingAi || !selectedCustomer}
              className="px-4 py-2 rounded-xl bg-[#C9A227] hover:bg-[#E2C15A] text-[#0B1F3A] text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGeneratingAi ? 'Synthesising...' : 'Generate Plan'}</span>
            </button>
          </div>
        </div>

        {/* Display Active Recommendation */}
        {activeRecommendation ? (
          <div className="space-y-6 pt-2">
            {/* Headline and Risk Summary */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-[#12305A] text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#C9A227]">
                  Targeted Intervention Strategy
                </span>
                <h4 className="text-lg font-bold text-white mt-0.5">{activeRecommendation.headline}</h4>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">{activeRecommendation.rootCause}</p>
              </div>

              <div className="flex items-center gap-4 text-right shrink-0">
                <div className="p-3 rounded-xl bg-white/10 text-center">
                  <span className="text-[10px] text-slate-300 block">Churn Probability</span>
                  <span className="text-2xl font-extrabold text-[#E2C15A] font-tabular">
                    {activeRecommendation.riskSummary.probabilityPercent}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/10 text-center">
                  <span className="text-[10px] text-slate-300 block">Annual Exposure</span>
                  <span className="text-2xl font-extrabold text-white font-tabular">
                    {formatGbp(activeRecommendation.riskSummary.annualExposureGbp)}
                  </span>
                </div>
              </div>
            </div>

            {/* Evidence Checklist Grid */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Empirical Evidence vs Portfolio Benchmarks
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {activeRecommendation.evidence.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#12305A]/40 border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <span className="font-bold text-[#0B1F3A] dark:text-white block">{ev.metric}</span>
                    <span className="text-sm font-extrabold text-[#C9A227] block my-1">{ev.customerValue}</span>
                    <span className="text-[10px] text-slate-400 block">Portfolio Benchmark: {ev.portfolioAvg}</span>
                    <span className="text-[10px] text-[#A31A2E] dark:text-rose-400 font-semibold block mt-0.5">
                      {ev.significance}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ranked Actions (P1, P2, P3) */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Ranked Action Plan (P1 Immediate, P2 Short-term, P3 Medium-term)
              </h4>
              <div className="space-y-3">
                {activeRecommendation.recommendedActions.map((act, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white dark:bg-[#12305A]/50 border border-[#E3E6EB] dark:border-[#1C4380] text-xs space-y-2 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            act.priority.includes('P1')
                              ? 'bg-[#7A1020] text-white'
                              : act.priority.includes('P2')
                              ? 'bg-[#C9A227] text-[#0B1F3A]'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {act.priority}
                        </span>
                        <h5 className="font-bold text-sm text-[#0B1F3A] dark:text-white">{act.actionTitle}</h5>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-tabular">
                        Est. Intervention Cost: {formatGbp(act.costEstimateGbp)}
                      </span>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 font-medium">{act.offerDetails}</p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400">
                      <span>Channel: <strong className="text-slate-600 dark:text-slate-200">{act.channel}</strong></span>
                      <span>Owner: <strong className="text-slate-600 dark:text-slate-200">{act.owner}</strong></span>
                    </div>

                    {/* Implementation Steps */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Step-by-Step Implementation:
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {act.implementationSteps.map((step, sIdx) => (
                          <li key={sIdx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expected Business Impact & Financial ROI */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs">
              <h4 className="font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Expected Business Impact & ROI Projections
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#0B1F3A]">
                  <span className="text-[10px] text-slate-400 block">Churn Risk Reduction</span>
                  <span className="text-lg font-bold text-emerald-600 font-tabular">
                    -{activeRecommendation.expectedImpact.probabilityReductionPercent}%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#0B1F3A]">
                  <span className="text-[10px] text-slate-400 block">12M Revenue Retained</span>
                  <span className="text-lg font-bold text-[#0B1F3A] dark:text-white font-tabular">
                    {formatGbp(activeRecommendation.expectedImpact.expectedRevenueRetained12mGbp)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#0B1F3A]">
                  <span className="text-[10px] text-slate-400 block">Net Commercial Benefit</span>
                  <span className="text-lg font-bold text-[#0B1F3A] dark:text-white font-tabular">
                    {formatGbp(activeRecommendation.expectedImpact.netBenefitGbp)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#0B1F3A]">
                  <span className="text-[10px] text-slate-400 block">Campaign ROI</span>
                  <span className="text-lg font-bold text-[#C9A227] font-tabular">
                    {activeRecommendation.expectedImpact.roiPercent}%
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 italic text-center">
                {activeRecommendation.expectedImpact.assumptionsNote}
              </p>
            </div>

            {/* Personalized Empathetic Script */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#12305A]/40 border border-[#E3E6EB] dark:border-[#1C4380] text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A227] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Customer-Facing Retention Script (Empathetic & Jargon-Free)
              </span>
              <p className="italic text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                "{activeRecommendation.personalisedScript}"
              </p>
            </div>

            {/* Regulatory & Compliance Notes */}
            <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-900/40 border text-[11px] text-slate-500 space-y-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider text-[10px]">
                UK Regulatory Governance (Ofcom, PECR & GDPR)
              </span>
              <p>• <strong>GDPR:</strong> {activeRecommendation.complianceNotes.gdpr}</p>
              <p>• <strong>PECR:</strong> {activeRecommendation.complianceNotes.pecr}</p>
              <p>• <strong>Ofcom General Conditions:</strong> {activeRecommendation.complianceNotes.ofcomRules}</p>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-xs text-slate-400">
            Click <strong>"Generate Plan"</strong> above to synthesise a custom evidence-based retention plan.
          </div>
        )}
      </div>

      {/* Section 2: Portfolio Level Retention Playbook (Top 5 Interventions) */}
      <div className="bg-white dark:bg-[#0B1F3A] rounded-2xl p-6 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-[#C9A227]" /> Portfolio Retention Playbook (Top 5 Strategic Interventions)
          </h3>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
            Ranked by projected net revenue saved after offer delivery costs across high-risk portfolio clusters.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] uppercase bg-slate-50 dark:bg-[#12305A] text-slate-500 dark:text-slate-300">
              <tr>
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Intervention & Offer</th>
                <th className="py-2.5 px-3">Target Cohort</th>
                <th className="py-2.5 px-3">Primary Channel</th>
                <th className="py-2.5 px-3 font-tabular">Offer Cost</th>
                <th className="py-2.5 px-3 font-tabular">Retained Value</th>
                <th className="py-2.5 px-3 font-tabular">Net Benefit</th>
                <th className="py-2.5 px-3 font-tabular text-right">ROI (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {portfolioPlaybook.map((item) => (
                <tr key={item.rank} className="hover:bg-slate-50/50 dark:hover:bg-[#12305A]/40">
                  <td className="py-3 px-3 font-bold text-[#C9A227]">#{item.rank}</td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-[#0B1F3A] dark:text-white block">{item.title}</span>
                    <span className="text-[10px] text-slate-400">{item.offer}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs">{item.targetCohort}</td>
                  <td className="py-3 px-3 font-medium">{item.channel}</td>
                  <td className="py-3 px-3 font-tabular">{formatGbp(item.costGbp)}</td>
                  <td className="py-3 px-3 font-tabular font-semibold text-emerald-600">
                    {formatGbp(item.expectedRetainedGbp, true)}
                  </td>
                  <td className="py-3 px-3 font-tabular font-bold text-[#0B1F3A] dark:text-white">
                    {formatGbp(item.netBenefitGbp, true)}
                  </td>
                  <td className="py-3 px-3 font-tabular font-bold text-[#C9A227] text-right">
                    {item.roiPercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
