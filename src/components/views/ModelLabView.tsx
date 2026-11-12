/**
 * BritConnect Model Lab
 * Pure-TypeScript Machine Learning Studio:
 * 4 Algorithms (Logistic Regression, Decision Tree, Random Forest, Gradient Boosting),
 * ROC-AUC, PR-AUC, Calibration, Lift/Gain, Cost-Matrix Threshold Optimization, and Leakage Guard.
 */

import React, { useState } from 'react';
import { CustomerRecord, ModelMetrics, ModelSettings } from '../../types/customer';
import {
  trainAndCompareAllModels,
  ModelComparisonResult,
  TrainingProgress,
} from '../../ml/engine';
import { formatGbp, formatPercent } from '../../metrics/calculations';
import { ChartCard, CustomTooltip, BRAND_COLORS } from '../common/ChartTheme';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import {
  Cpu,
  Play,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sliders,
  DollarSign,
  Info,
  ShieldCheck,
  Activity,
} from 'lucide-react';

interface ModelLabViewProps {
  records: CustomerRecord[];
  settings: ModelSettings;
  onUpdateSettings: (newSettings: Partial<ModelSettings>) => void;
  championMetrics: ModelMetrics | null;
  onModelTrained: (result: {
    champion: ModelComparisonResult;
    allModels: ModelComparisonResult[];
    datasetDate: Date;
    featureNames: string[];
  }) => void;
}

export const ModelLabView: React.FC<ModelLabViewProps> = ({
  records,
  settings,
  onUpdateSettings,
  championMetrics,
  onModelTrained,
}) => {
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [comparisonResults, setComparisonResults] = useState<ModelComparisonResult[]>([]);
  const [selectedAlgo, setSelectedAlgo] = useState<string>('Gradient Boosting');

  const handleStartTraining = async () => {
    if (records.length === 0) {
      alert('Please load or upload a customer dataset before training ML models.');
      return;
    }
    try {
      setIsTraining(true);
      const outcome = await trainAndCompareAllModels(records, settings, (p) => {
        setProgress(p);
      });
      setComparisonResults(outcome.allModels);
      setSelectedAlgo(outcome.bestModel.algorithm);
      onModelTrained({
        champion: outcome.bestModel,
        allModels: outcome.allModels,
        datasetDate: outcome.datasetDate,
        featureNames: outcome.featureNames,
      });
    } catch (err: any) {
      console.error('Training failed:', err);
      alert(`ML Training Error: ${err?.message || String(err)}`);
    } finally {
      setIsTraining(false);
      setProgress(null);
    }
  };

  const activeModelResult =
    comparisonResults.find((m) => m.algorithm === selectedAlgo) ||
    comparisonResults[0] ||
    null;

  const currentMetrics = activeModelResult ? activeModelResult.metrics : championMetrics;

  return (
    <div className="space-y-6">
      {/* View Header & Train Action */}
      <div className="bg-white dark:bg-[#0B1F3A] rounded-2xl p-6 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-[#12305A] text-xs font-semibold text-[#0B1F3A] dark:text-slate-200 border border-[#E3E6EB] dark:border-[#1C4380] mb-2">
            <Cpu className="w-3.5 h-3.5 text-[#C9A227]" /> 100% In-Browser TypeScript Machine Learning
          </span>
          <h2 className="text-xl font-bold text-[#0B1F3A] dark:text-white">
            Predictive Model Lab & Hyperparameter Engine
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-1 max-w-xl">
            Trains and benchmarks 4 algorithms on stratified 70/30 partitions with 5-fold cross-validation.
            Optimises business classification threshold via customizable retention cost matrices.
          </p>
        </div>

        <button
          onClick={handleStartTraining}
          disabled={isTraining}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#0B1F3A] to-[#1C4380] hover:opacity-95 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {isTraining ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Training in Web Worker ({progress?.progressPercent}%)</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-[#C9A227] fill-[#C9A227]" />
              <span>Train & Compare All 4 Models</span>
            </>
          )}
        </button>
      </div>

      {/* Training Progress Bar */}
      {isTraining && progress && (
        <div className="p-4 rounded-xl bg-white dark:bg-[#0B1F3A] border border-[#1E3A5F] shadow-sm space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-[#0B1F3A] dark:text-white">{progress.message}</span>
            <span className="text-[#C9A227] font-tabular">{progress.progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#C9A227] to-[#E2C15A] transition-all duration-300"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Suspicious Leakage Alert if AUC > 0.98 */}
      {currentMetrics?.suspiciousLeakageWarning && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-900 dark:text-amber-200">
              Suspiciously High Metric Warning (AUC &gt; 0.98)
            </h4>
            <p className="text-amber-800 dark:text-amber-300 mt-0.5">
              An AUC above 0.98 usually indicates target leakage from post-churn or duration proxies. Please check the
              Leakage Guard in Settings and confirm Lifetime Revenue is switched OFF.
            </p>
          </div>
        </div>
      )}

      {/* Model Benchmark Comparison Table */}
      {comparisonResults.length > 0 && (
        <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white mb-1 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#C9A227]" /> Model Tournament Leaderboard (Test Set Evaluation)
          </h3>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 mb-4">
            Evaluated on the untouched 30% stratified test partition. Select a model to inspect diagnostic curves.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase bg-slate-50 dark:bg-[#12305A] text-slate-500 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Algorithm</th>
                  <th className="py-2.5 px-3 font-tabular">ROC-AUC</th>
                  <th className="py-2.5 px-3 font-tabular">PR-AUC</th>
                  <th className="py-2.5 px-3 font-tabular">F1-Score</th>
                  <th className="py-2.5 px-3 font-tabular">Accuracy</th>
                  <th className="py-2.5 px-3 font-tabular">Recall</th>
                  <th className="py-2.5 px-3 font-tabular">Precision</th>
                  <th className="py-2.5 px-3 font-tabular">Brier Score</th>
                  <th className="py-2.5 px-3 text-right">Train Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {comparisonResults.map((m) => {
                  const isSelected = selectedAlgo === m.algorithm;
                  return (
                    <tr
                      key={m.algorithm}
                      onClick={() => setSelectedAlgo(m.algorithm)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#12305A]/40 border-l-4 border-[#C9A227]'
                          : 'hover:bg-slate-50/50 dark:hover:bg-[#12305A]/20'
                      }`}
                    >
                      <td className="py-3 px-3 font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                        {m.algorithm}
                        {m.isBest && (
                          <span className="px-2 py-0.5 rounded-full bg-[#C9A227] text-[#0B1F3A] text-[10px] font-extrabold uppercase">
                            Champion
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-tabular font-bold text-[#C9A227]">{m.rocAuc}</td>
                      <td className="py-3 px-3 font-tabular">{m.prAuc}</td>
                      <td className="py-3 px-3 font-tabular font-semibold">{m.f1}%</td>
                      <td className="py-3 px-3 font-tabular">{m.accuracy}%</td>
                      <td className="py-3 px-3 font-tabular">{m.recall}%</td>
                      <td className="py-3 px-3 font-tabular">{m.precision}%</td>
                      <td className="py-3 px-3 font-tabular text-slate-400">{m.brierScore}</td>
                      <td className="py-3 px-3 text-right font-tabular text-slate-500">{m.trainingTimeMs}ms</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Model Diagnostics Grid: Confusion Matrix, ROC, Calibration */}
      {currentMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Confusion Matrix */}
          <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white mb-1">
                Confusion Matrix
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-slate-400 mb-4">
                At profit-optimal threshold ({currentMetrics.optimalThreshold}).
              </p>

              <div className="grid grid-cols-2 gap-3 text-center text-xs">
                {/* True Negatives */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1C4380]">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">True Negative (TN)</span>
                  <span className="text-lg font-bold font-tabular text-emerald-600 block mt-1">
                    {currentMetrics.confusionMatrix.tn}
                  </span>
                  <span className="text-[10px] text-slate-500">Correctly identified active</span>
                </div>

                {/* False Positives */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1C4380]">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">False Positive (FP)</span>
                  <span className="text-lg font-bold font-tabular text-amber-600 block mt-1">
                    {currentMetrics.confusionMatrix.fp}
                  </span>
                  <span className="text-[10px] text-slate-500">Unnecessary retention offer</span>
                </div>

                {/* False Negatives */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1C4380]">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">False Negative (FN)</span>
                  <span className="text-lg font-bold font-tabular text-[#A31A2E] block mt-1">
                    {currentMetrics.confusionMatrix.fn}
                  </span>
                  <span className="text-[10px] text-slate-500">Missed churner (£ loss)</span>
                </div>

                {/* True Positives */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12305A] border border-slate-200 dark:border-[#1C4380]">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">True Positive (TP)</span>
                  <span className="text-lg font-bold font-tabular text-emerald-600 block mt-1">
                    {currentMetrics.confusionMatrix.tp}
                  </span>
                  <span className="text-[10px] text-slate-500">Intercepted churner</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500">
              <span>Specificity: {currentMetrics.specificity}%</span>
              <span>Log-Loss: {currentMetrics.logLoss}</span>
            </div>
          </div>

          {/* ROC Curve */}
          <ChartCard
            title="ROC Curve (Receiver Operating Characteristic)"
            subtitle={`AUC: ${currentMetrics.rocAuc} • 5-Fold Cross-Val: ${currentMetrics.crossValRocAucMean} ± ${currentMetrics.crossValRocAucStd}`}
            benchmarkNote="Dashed gold represents random guess baseline (AUC 0.50)"
          >
            <LineChart data={currentMetrics.rocCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="fpr" stroke="#6B7280" tick={{ fontSize: 10 }} domain={[0, 1]} />
              <YAxis dataKey="tpr" stroke="#6B7280" tick={{ fontSize: 10 }} domain={[0, 1]} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke={BRAND_COLORS.goldPrimary} strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="tpr"
                stroke={BRAND_COLORS.navyMid}
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ChartCard>

          {/* Calibration / Reliability Diagram */}
          <ChartCard
            title="Calibration Curve (Reliability Diagram)"
            subtitle="Observed churn frequency across predicted probability deciles (Brier Score: ${currentMetrics.brierScore})."
            benchmarkNote="Diagonal indicates perfect probabilistic calibration"
          >
            <LineChart data={currentMetrics.calibrationCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="meanPredicted" stroke="#6B7280" tick={{ fontSize: 10 }} domain={[0, 1]} />
              <YAxis dataKey="observedFrequency" stroke="#6B7280" tick={{ fontSize: 10 }} domain={[0, 1]} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke={BRAND_COLORS.goldPrimary} strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="observedFrequency"
                stroke={BRAND_COLORS.redPrimary}
                strokeWidth={2.5}
                dot={{ r: 4, fill: BRAND_COLORS.redPrimary }}
              />
            </LineChart>
          </ChartCard>
        </div>
      )}

      {/* Editable Cost Matrix & Profit-Optimal Threshold Setting */}
      <div className="bg-white dark:bg-[#0B1F3A] rounded-xl p-5 border border-[#E3E6EB] dark:border-[#1E3A5F] shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-white mb-1 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#C9A227]" /> Commercial Cost Matrix & Profit-Optimal Threshold
        </h3>
        <p className="text-xs text-[#6B7280] dark:text-slate-400 mb-4">
          Adjust retention offer economics to compute the mathematically profit-maximising probability threshold.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-slate-500 mb-1">Retention Offer Cost (£)</label>
            <input
              type="number"
              value={settings.retentionOfferCost}
              onChange={(e) => onUpdateSettings({ retentionOfferCost: parseFloat(e.target.value) || 25 })}
              className="w-full p-2 rounded-lg bg-slate-50 dark:bg-[#12305A] border border-[#E3E6EB] dark:border-[#1C4380] text-xs font-tabular text-[#0B1F3A] dark:text-white"
            />
          </div>
          <div>
            <label className="block text-slate-500 mb-1">Offer Success Rate (0-1.0)</label>
            <input
              type="number"
              step="0.05"
              value={settings.retentionSuccessRate}
              onChange={(e) => onUpdateSettings({ retentionSuccessRate: parseFloat(e.target.value) || 0.3 })}
              className="w-full p-2 rounded-lg bg-slate-50 dark:bg-[#12305A] border border-[#E3E6EB] dark:border-[#1C4380] text-xs font-tabular text-[#0B1F3A] dark:text-white"
            />
          </div>
          <div>
            <label className="block text-slate-500 mb-1">Retention Horizon (Months)</label>
            <input
              type="number"
              value={settings.retentionHorizonMonths}
              onChange={(e) => onUpdateSettings({ retentionHorizonMonths: parseInt(e.target.value, 10) || 12 })}
              className="w-full p-2 rounded-lg bg-slate-50 dark:bg-[#12305A] border border-[#E3E6EB] dark:border-[#1C4380] text-xs font-tabular text-[#0B1F3A] dark:text-white"
            />
          </div>
          <div className="p-3 rounded-lg bg-[#C9A227]/15 border border-[#C9A227]/40 flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-[#8F7218] dark:text-[#E2C15A]">
              Profit-Optimal Threshold
            </span>
            <span className="text-xl font-extrabold text-[#0B1F3A] dark:text-white font-tabular">
              {currentMetrics?.optimalThreshold || 0.45}
            </span>
            <span className="text-[10px] text-slate-500">Minimises expected net portfolio loss</span>
          </div>
        </div>
      </div>
    </div>
  );
};
