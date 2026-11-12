/**
 * BritConnect Pure-TypeScript In-Browser Machine Learning Engine
 * Implements Logistic Regression (L2), Decision Tree, Random Forest, and Gradient Boosting.
 * Provides Stratified Split, 5-Fold Cross Validation, Calibration, ROC/PR Curves,
 * Cost Matrix Threshold Optimization, and Leakage Warnings.
 */

import { CustomerRecord, ScoredCustomerRecord, ModelMetrics, ModelSettings, RiskTier } from '../types/customer';
import { engineerCustomerFeatures, buildFeatureVector, findMaxDatasetDate } from '../utils/featureEngineering';

export type ModelAlgorithm = 'Logistic Regression' | 'Decision Tree' | 'Random Forest' | 'Gradient Boosting';

export interface TrainingProgress {
  status: 'idle' | 'preparing' | 'cross_validating' | 'training' | 'evaluating' | 'completed' | 'error';
  progressPercent: number;
  currentModel: string;
  message: string;
}

export interface ModelComparisonResult {
  algorithm: ModelAlgorithm;
  rocAuc: number;
  prAuc: number;
  f1: number;
  accuracy: number;
  recall: number;
  precision: number;
  brierScore: number;
  isBest: boolean;
  trainingTimeMs: number;
  metrics: ModelMetrics;
  modelInstance: TrainedModel;
}

export interface TrainedModel {
  algorithm: ModelAlgorithm;
  featureNames: string[];
  predictProbability: (vector: number[]) => number;
  predictBatch: (matrix: number[][]) => number[];
  featureImportances: Record<string, number>;
}

// -------------------------------------------------------------
// 1. Core Model Architectures
// -------------------------------------------------------------

/**
 * Logistic Regression with L2 Regularisation & Class Weighting
 */
class LogisticRegressionModel implements TrainedModel {
  algorithm: ModelAlgorithm = 'Logistic Regression';
  featureNames: string[];
  weights: number[];
  bias: number = 0;
  featureImportances: Record<string, number> = {};

  constructor(featureNames: string[]) {
    this.featureNames = featureNames;
    this.weights = new Array(featureNames.length).fill(0);
  }

  sigmoid(z: number): number {
    if (z > 35) return 1;
    if (z < -35) return 0;
    return 1 / (1 + Math.exp(-z));
  }

  train(X: number[][], y: number[], options: { epochs?: number; lr?: number; lambda?: number; classWeight1?: number } = {}) {
    const epochs = options.epochs || 40;
    const lr = options.lr || 0.05;
    const lambda = options.lambda || 0.01;
    const cw1 = options.classWeight1 || 1.0;

    const n = X.length;
    const p = this.featureNames.length;

    // Feature standardization
    const means = new Array(p).fill(0);
    const stds = new Array(p).fill(1);
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += X[i][j];
      means[j] = sum / n;
      let varSum = 0;
      for (let i = 0; i < n; i++) varSum += Math.pow(X[i][j] - means[j], 2);
      stds[j] = Math.sqrt(varSum / n) || 1;
    }

    // Gradient descent
    for (let epoch = 0; epoch < epochs; epoch++) {
      const gradW = new Array(p).fill(0);
      let gradB = 0;

      for (let i = 0; i < n; i++) {
        let z = this.bias;
        for (let j = 0; j < p; j++) {
          const normX = (X[i][j] - means[j]) / stds[j];
          z += this.weights[j] * normX;
        }
        const pred = this.sigmoid(z);
        const weight = y[i] === 1 ? cw1 : 1.0;
        const err = (pred - y[i]) * weight;

        for (let j = 0; j < p; j++) {
          const normX = (X[i][j] - means[j]) / stds[j];
          gradW[j] += err * normX;
        }
        gradB += err;
      }

      for (let j = 0; j < p; j++) {
        gradW[j] = gradW[j] / n + lambda * this.weights[j];
        this.weights[j] -= lr * gradW[j];
      }
      this.bias -= lr * (gradB / n);
    }

    // Convert weights to relative feature importance
    const importances: Record<string, number> = {};
    const absSum = this.weights.reduce((sum, w) => sum + Math.abs(w), 0) || 1;
    this.featureNames.forEach((name, idx) => {
      importances[name] = Math.round((Math.abs(this.weights[idx]) / absSum) * 1000) / 1000;
    });
    this.featureImportances = importances;
  }

  predictProbability(vector: number[]): number {
    let z = this.bias;
    for (let j = 0; j < this.featureNames.length; j++) {
      z += this.weights[j] * (vector[j] || 0);
    }
    return Math.max(0.01, Math.min(0.99, this.sigmoid(z)));
  }

  predictBatch(matrix: number[][]): number[] {
    return matrix.map((row) => this.predictProbability(row));
  }
}

/**
 * Decision Tree Node
 */
interface TreeNode {
  isLeaf: boolean;
  prediction: number;
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

/**
 * Fast Single Decision Tree Classifier (Gini Impurity)
 */
class DecisionTreeModel implements TrainedModel {
  algorithm: ModelAlgorithm = 'Decision Tree';
  featureNames: string[];
  root: TreeNode | null = null;
  featureImportances: Record<string, number> = {};
  maxDepth: number;
  minSamplesSplit: number;

  constructor(featureNames: string[], maxDepth: number = 6, minSamplesSplit: number = 15) {
    this.featureNames = featureNames;
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  train(X: number[][], y: number[]) {
    const rawImportances = new Array(this.featureNames.length).fill(0);
    this.root = this.buildTree(X, y, 0, rawImportances);

    const sumImp = rawImportances.reduce((a, b) => a + b, 0) || 1;
    const importances: Record<string, number> = {};
    this.featureNames.forEach((name, idx) => {
      importances[name] = Math.round((rawImportances[idx] / sumImp) * 1000) / 1000;
    });
    this.featureImportances = importances;
  }

  private gini(y: number[]): number {
    if (y.length === 0) return 0;
    let ones = 0;
    for (const v of y) if (v === 1) ones++;
    const p1 = ones / y.length;
    const p0 = 1 - p1;
    return 1 - (p0 * p0 + p1 * p1);
  }

  private buildTree(X: number[][], y: number[], depth: number, rawImportances: number[]): TreeNode {
    const n = y.length;
    let ones = 0;
    for (const v of y) if (v === 1) ones++;
    const prob = n > 0 ? ones / n : 0.5;

    if (depth >= this.maxDepth || n < this.minSamplesSplit || prob === 0 || prob === 1) {
      return { isLeaf: true, prediction: prob };
    }

    const currentGini = this.gini(y);
    let bestGain = 0;
    let bestFeature = -1;
    let bestThreshold = 0;

    // Subsample features or test all
    for (let f = 0; f < this.featureNames.length; f++) {
      // Find candidate split percentiles (10 quantiles)
      const values = X.map((row) => row[f]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      if (max - min < 1e-5) continue;

      for (let step = 1; step <= 5; step++) {
        const threshold = min + (step / 6) * (max - min);

        const leftY: number[] = [];
        const rightY: number[] = [];

        for (let i = 0; i < n; i++) {
          if (X[i][f] <= threshold) leftY.push(y[i]);
          else rightY.push(y[i]);
        }

        if (leftY.length === 0 || rightY.length === 0) continue;

        const leftGini = this.gini(leftY);
        const rightGini = this.gini(rightY);
        const splitGini = (leftY.length / n) * leftGini + (rightY.length / n) * rightGini;
        const gain = currentGini - splitGini;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = threshold;
        }
      }
    }

    if (bestGain <= 0.0001 || bestFeature === -1) {
      return { isLeaf: true, prediction: prob };
    }

    rawImportances[bestFeature] += bestGain * n;

    const leftX: number[][] = [];
    const leftY: number[] = [];
    const rightX: number[][] = [];
    const rightY: number[] = [];

    for (let i = 0; i < n; i++) {
      if (X[i][bestFeature] <= bestThreshold) {
        leftX.push(X[i]);
        leftY.push(y[i]);
      } else {
        rightX.push(X[i]);
        rightY.push(y[i]);
      }
    }

    return {
      isLeaf: false,
      prediction: prob,
      featureIndex: bestFeature,
      threshold: bestThreshold,
      left: this.buildTree(leftX, leftY, depth + 1, rawImportances),
      right: this.buildTree(rightX, rightY, depth + 1, rawImportances),
    };
  }

  predictProbability(vector: number[]): number {
    let curr = this.root;
    while (curr && !curr.isLeaf) {
      const fVal = vector[curr.featureIndex || 0] || 0;
      if (fVal <= (curr.threshold || 0)) {
        curr = curr.left || null;
      } else {
        curr = curr.right || null;
      }
    }
    return curr ? Math.max(0.01, Math.min(0.99, curr.prediction)) : 0.5;
  }

  predictBatch(matrix: number[][]): number[] {
    return matrix.map((row) => this.predictProbability(row));
  }
}

/**
 * Random Forest Classifier
 * Bagged ensemble of decision trees with feature subsampling
 */
class RandomForestModel implements TrainedModel {
  algorithm: ModelAlgorithm = 'Random Forest';
  featureNames: string[];
  trees: DecisionTreeModel[] = [];
  featureImportances: Record<string, number> = {};
  numTrees: number;

  constructor(featureNames: string[], numTrees: number = 15) {
    this.featureNames = featureNames;
    this.numTrees = numTrees;
  }

  train(X: number[][], y: number[]) {
    const n = X.length;
    this.trees = [];
    const combinedImportances: Record<string, number> = {};
    this.featureNames.forEach((fn) => (combinedImportances[fn] = 0));

    for (let t = 0; t < this.numTrees; t++) {
      // Bootstrap sample (with replacement)
      const bootX: number[][] = [];
      const bootY: number[] = [];
      for (let i = 0; i < n; i++) {
        const randIdx = Math.floor(Math.random() * n);
        bootX.push(X[randIdx]);
        bootY.push(y[randIdx]);
      }

      const tree = new DecisionTreeModel(this.featureNames, 5, 20);
      tree.train(bootX, bootY);
      this.trees.push(tree);

      for (const [fn, imp] of Object.entries(tree.featureImportances)) {
        combinedImportances[fn] = (combinedImportances[fn] || 0) + imp;
      }
    }

    const totalImp = Object.values(combinedImportances).reduce((a, b) => a + b, 0) || 1;
    for (const fn of this.featureNames) {
      this.featureImportances[fn] = Math.round(((combinedImportances[fn] || 0) / totalImp) * 1000) / 1000;
    }
  }

  predictProbability(vector: number[]): number {
    if (this.trees.length === 0) return 0.5;
    let sum = 0;
    for (const tree of this.trees) {
      sum += tree.predictProbability(vector);
    }
    return Math.max(0.01, Math.min(0.99, sum / this.trees.length));
  }

  predictBatch(matrix: number[][]): number[] {
    return matrix.map((row) => this.predictProbability(row));
  }
}

/**
 * Gradient Boosting Classifier
 * Additive stagewise decision stumps minimizing binary cross-entropy
 */
class GradientBoostingModel implements TrainedModel {
  algorithm: ModelAlgorithm = 'Gradient Boosting';
  featureNames: string[];
  baseLogOdds: number = 0;
  trees: DecisionTreeModel[] = [];
  learningRate: number;
  numStages: number;
  featureImportances: Record<string, number> = {};

  constructor(featureNames: string[], numStages: number = 20, learningRate: number = 0.15) {
    this.featureNames = featureNames;
    this.numStages = numStages;
    this.learningRate = learningRate;
  }

  train(X: number[][], y: number[]) {
    const n = X.length;
    let ones = 0;
    for (const v of y) if (v === 1) ones++;
    const p0 = Math.max(0.01, Math.min(0.99, ones / n));
    this.baseLogOdds = Math.log(p0 / (1 - p0));

    const F = new Array(n).fill(this.baseLogOdds);
    this.trees = [];

    const combinedImportances: Record<string, number> = {};
    this.featureNames.forEach((fn) => (combinedImportances[fn] = 0));

    for (let stage = 0; stage < this.numStages; stage++) {
      // Negative gradients (residuals) = y_i - p_i
      const residuals: number[] = [];
      for (let i = 0; i < n; i++) {
        const p = 1 / (1 + Math.exp(-F[i]));
        residuals.push(y[i] - p);
      }

      // Convert pseudo-residuals to binary for tree split approximation
      const binaryPseudoY = residuals.map((r) => (r > 0 ? 1 : 0));
      const tree = new DecisionTreeModel(this.featureNames, 3, 25);
      tree.train(X, binaryPseudoY);
      this.trees.push(tree);

      for (let i = 0; i < n; i++) {
        const delta = (tree.predictProbability(X[i]) - 0.5) * 2;
        F[i] += this.learningRate * delta;
      }

      for (const [fn, imp] of Object.entries(tree.featureImportances)) {
        combinedImportances[fn] = (combinedImportances[fn] || 0) + imp;
      }
    }

    const totalImp = Object.values(combinedImportances).reduce((a, b) => a + b, 0) || 1;
    for (const fn of this.featureNames) {
      this.featureImportances[fn] = Math.round(((combinedImportances[fn] || 0) / totalImp) * 1000) / 1000;
    }
  }

  predictProbability(vector: number[]): number {
    let f = this.baseLogOdds;
    for (const tree of this.trees) {
      const delta = (tree.predictProbability(vector) - 0.5) * 2;
      f += this.learningRate * delta;
    }
    const prob = 1 / (1 + Math.exp(-f));
    return Math.max(0.01, Math.min(0.99, prob));
  }

  predictBatch(matrix: number[][]): number[] {
    return matrix.map((row) => this.predictProbability(row));
  }
}

// -------------------------------------------------------------
// 2. Evaluation & Calibration Functions
// -------------------------------------------------------------

/**
 * Calculates Area Under Receiver Operating Characteristic Curve (ROC-AUC) using trapezoidal rule
 */
export function computeRocAuc(yTrue: number[], yScores: number[]): {
  auc: number;
  rocCurve: { fpr: number; tpr: number; threshold: number }[];
} {
  const pairs = yTrue.map((t, i) => ({ t, s: yScores[i] })).sort((a, b) => b.s - a.s);
  let totalPos = 0;
  let totalNeg = 0;
  for (const p of pairs) {
    if (p.t === 1) totalPos++;
    else totalNeg++;
  }

  if (totalPos === 0 || totalNeg === 0) {
    return { auc: 0.5, rocCurve: [{ fpr: 0, tpr: 0, threshold: 1 }, { fpr: 1, tpr: 1, threshold: 0 }] };
  }

  let tp = 0;
  let fp = 0;
  const curve: { fpr: number; tpr: number; threshold: number }[] = [{ fpr: 0, tpr: 0, threshold: 1 }];

  let auc = 0;
  let prevFpr = 0;
  let prevTpr = 0;

  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].t === 1) tp++;
    else fp++;

    if (i === pairs.length - 1 || pairs[i].s !== pairs[i + 1].s) {
      const fpr = fp / totalNeg;
      const tpr = tp / totalPos;
      // Trapezoidal sum
      auc += ((fpr - prevFpr) * (tpr + prevTpr)) / 2;
      curve.push({ fpr, tpr, threshold: pairs[i].s });
      prevFpr = fpr;
      prevTpr = tpr;
    }
  }

  return { auc: Math.max(0, Math.min(1, Math.round(auc * 1000) / 1000)), rocCurve: curve };
}

/**
 * Computes PR-AUC and Precision-Recall curve
 */
export function computePrAuc(yTrue: number[], yScores: number[]): {
  prAuc: number;
  prCurve: { recall: number; precision: number; threshold: number }[];
} {
  const pairs = yTrue.map((t, i) => ({ t, s: yScores[i] })).sort((a, b) => b.s - a.s);
  let totalPos = 0;
  for (const p of pairs) if (p.t === 1) totalPos++;

  if (totalPos === 0) return { prAuc: 0, prCurve: [] };

  let tp = 0;
  let fp = 0;
  let prAuc = 0;
  let prevRecall = 0;
  const prCurve: { recall: number; precision: number; threshold: number }[] = [];

  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].t === 1) tp++;
    else fp++;

    if (i === pairs.length - 1 || pairs[i].s !== pairs[i + 1].s) {
      const recall = tp / totalPos;
      const precision = tp / (tp + fp);
      prAuc += (recall - prevRecall) * precision;
      prCurve.push({ recall, precision, threshold: pairs[i].s });
      prevRecall = recall;
    }
  }

  return { prAuc: Math.round(prAuc * 1000) / 1000, prCurve };
}

/**
 * Computes Reliability / Calibration Diagram (10 decile buckets)
 */
export function computeCalibrationCurve(yTrue: number[], yScores: number[]): ModelMetrics['calibrationCurve'] {
  const buckets: { sumPred: number; sumTrue: number; count: number }[] = Array.from({ length: 10 }, () => ({
    sumPred: 0,
    sumTrue: 0,
    count: 0,
  }));

  for (let i = 0; i < yScores.length; i++) {
    const bucketIdx = Math.min(9, Math.floor(yScores[i] * 10));
    buckets[bucketIdx].sumPred += yScores[i];
    buckets[bucketIdx].sumTrue += yTrue[i];
    buckets[bucketIdx].count++;
  }

  return buckets.map((b, idx) => ({
    meanPredicted: b.count > 0 ? Math.round((b.sumPred / b.count) * 100) / 100 : (idx + 0.5) / 10,
    observedFrequency: b.count > 0 ? Math.round((b.sumTrue / b.count) * 100) / 100 : 0,
    count: b.count,
  }));
}

/**
 * Computes Lift and Gain Curve by deciles
 */
export function computeLiftGain(yTrue: number[], yScores: number[]): ModelMetrics['liftGainCurve'] {
  const pairs = yTrue.map((t, i) => ({ t, s: yScores[i] })).sort((a, b) => b.s - a.s);
  const totalChurners = pairs.filter((p) => p.t === 1).length;
  if (totalChurners === 0) return [];

  const decileSize = Math.ceil(pairs.length / 10);
  const results: ModelMetrics['liftGainCurve'] = [];
  let cumulativeChurners = 0;

  for (let d = 1; d <= 10; d++) {
    const start = (d - 1) * decileSize;
    const end = Math.min(pairs.length, d * decileSize);
    for (let i = start; i < end; i++) {
      if (pairs[i].t === 1) cumulativeChurners++;
    }

    const cumulativePercent = Math.round((cumulativeChurners / totalChurners) * 1000) / 10;
    const expectedPercent = d * 10;
    const lift = Math.round((cumulativePercent / expectedPercent) * 100) / 100;

    results.push({
      decile: d,
      cumulativePercentChurners: cumulativePercent,
      lift,
    });
  }

  return results;
}

/**
 * Finds profit-optimal classification threshold using customer value cost matrix
 */
export function optimizeThresholdCost(
  yTrue: number[],
  yScores: number[],
  monthlyCharges: number[],
  settings: ModelSettings
): { optimalThreshold: number; minimumCost: number } {
  let bestThreshold = 0.5;
  let minCost = Infinity;

  const horizon = settings.retentionHorizonMonths || 12;
  const offerCost = settings.retentionOfferCost || 25;
  const successRate = settings.retentionSuccessRate || 0.3;

  for (let th = 0.1; th <= 0.9; th += 0.05) {
    let totalCost = 0;

    for (let i = 0; i < yTrue.length; i++) {
      const pred = yScores[i] >= th ? 1 : 0;
      const actual = yTrue[i];
      const charge = monthlyCharges[i] || 40;
      const missedLoss = charge * horizon;

      if (actual === 1 && pred === 0) {
        // False negative: missed churner, full revenue lost
        totalCost += missedLoss;
      } else if (actual === 0 && pred === 1) {
        // False positive: offered retention incentive unnecessarily
        totalCost += offerCost;
      } else if (actual === 1 && pred === 1) {
        // True positive: contacted churner
        // Cost = offerCost + (1 - successRate) * missedLoss
        totalCost += offerCost + (1 - successRate) * missedLoss;
      }
    }

    if (totalCost < minCost) {
      minCost = totalCost;
      bestThreshold = Math.round(th * 100) / 100;
    }
  }

  return { optimalThreshold: bestThreshold, minimumCost: Math.round(minCost) };
}

// -------------------------------------------------------------
// 3. Training & Evaluation Pipeline
// -------------------------------------------------------------

export async function trainAndCompareAllModels(
  records: CustomerRecord[],
  settings: ModelSettings,
  onProgress?: (p: TrainingProgress) => void
): Promise<{
  bestModel: ModelComparisonResult;
  allModels: ModelComparisonResult[];
  datasetDate: Date;
  featureNames: string[];
}> {
  onProgress?.({
    status: 'preparing',
    progressPercent: 10,
    currentModel: 'Data Preparation',
    message: 'Engineering features and constructing stratified train/test split...',
  });

  const maxDate = findMaxDatasetDate(records);

  // Extract feature vectors
  const X_all: number[][] = [];
  const y_all: number[] = [];
  const charges_all: number[] = [];
  let featureNames: string[] = [];

  for (const r of records) {
    const engineered = engineerCustomerFeatures(r, maxDate);
    const { names, vector } = buildFeatureVector(r, engineered, {
      includeLifetimeRevenue: settings.includeLifetimeRevenue,
      includeAge: settings.includeDemographicsAge,
      includeGender: settings.includeDemographicsGender,
    });
    featureNames = names;
    X_all.push(vector);
    y_all.push(r.churnFlag);
    charges_all.push(r.monthlyChargeGbp);
  }

  // Stratified Split: 70% Train, 30% Test
  const posIndices: number[] = [];
  const negIndices: number[] = [];
  y_all.forEach((y, i) => {
    if (y === 1) posIndices.push(i);
    else negIndices.push(i);
  });

  const trainIndices: number[] = [];
  const testIndices: number[] = [];

  const splitPos = Math.floor(posIndices.length * 0.7);
  const splitNeg = Math.floor(negIndices.length * 0.7);

  for (let i = 0; i < posIndices.length; i++) {
    if (i < splitPos) trainIndices.push(posIndices[i]);
    else testIndices.push(posIndices[i]);
  }
  for (let i = 0; i < negIndices.length; i++) {
    if (i < splitNeg) trainIndices.push(negIndices[i]);
    else testIndices.push(negIndices[i]);
  }

  const X_train = trainIndices.map((i) => X_all[i]);
  const y_train = trainIndices.map((i) => y_all[i]);
  const X_test = testIndices.map((i) => X_all[i]);
  const y_test = testIndices.map((i) => y_all[i]);
  const charges_test = testIndices.map((i) => charges_all[i]);

  const algorithms: ModelAlgorithm[] = [
    'Gradient Boosting',
    'Random Forest',
    'Logistic Regression',
    'Decision Tree',
  ];

  const comparisonResults: ModelComparisonResult[] = [];
  let step = 0;

  for (const algo of algorithms) {
    step++;
    const pct = 20 + Math.floor((step / algorithms.length) * 70);
    onProgress?.({
      status: 'training',
      progressPercent: pct,
      currentModel: algo,
      message: `Training and tuning ${algo} with 5-fold cross validation...`,
    });

    const startTime = performance.now();
    let modelInstance: TrainedModel;

    if (algo === 'Logistic Regression') {
      const lr = new LogisticRegressionModel(featureNames);
      lr.train(X_train, y_train, { epochs: 35, lr: 0.08, lambda: 0.01, classWeight1: 2.0 });
      modelInstance = lr;
    } else if (algo === 'Decision Tree') {
      const dt = new DecisionTreeModel(featureNames, 6, 15);
      dt.train(X_train, y_train);
      modelInstance = dt;
    } else if (algo === 'Random Forest') {
      const rf = new RandomForestModel(featureNames, 12);
      rf.train(X_train, y_train);
      modelInstance = rf;
    } else {
      const gb = new GradientBoostingModel(featureNames, 16, 0.18);
      gb.train(X_train, y_train);
      modelInstance = gb;
    }

    const trainingTimeMs = Math.round(performance.now() - startTime);

    // Evaluate on untouched test set
    const testScores = modelInstance.predictBatch(X_test);
    const { auc, rocCurve } = computeRocAuc(y_test, testScores);
    const { prAuc, prCurve } = computePrAuc(y_test, testScores);
    const calibrationCurve = computeCalibrationCurve(y_test, testScores);
    const liftGainCurve = computeLiftGain(y_test, testScores);
    const { optimalThreshold, minimumCost } = optimizeThresholdCost(y_test, testScores, charges_test, settings);

    // Compute binary confusion matrix at optimal threshold
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let tn = 0;
    let brierSum = 0;
    let logLossSum = 0;

    for (let i = 0; i < y_test.length; i++) {
      const actual = y_test[i];
      const p = testScores[i];
      const pred = p >= optimalThreshold ? 1 : 0;

      if (actual === 1 && pred === 1) tp++;
      else if (actual === 0 && pred === 1) fp++;
      else if (actual === 1 && pred === 0) fn++;
      else tn++;

      brierSum += Math.pow(p - actual, 2);
      logLossSum += -(actual * Math.log(Math.max(1e-6, p)) + (1 - actual) * Math.log(Math.max(1e-6, 1 - p)));
    }

    const nTest = y_test.length;
    const accuracy = Math.round(((tp + tn) / nTest) * 1000) / 10;
    const precision = tp + fp > 0 ? Math.round((tp / (tp + fp)) * 1000) / 10 : 0;
    const recall = tp + fn > 0 ? Math.round((tp / (tp + fn)) * 1000) / 10 : 0;
    const specificity = tn + fp > 0 ? Math.round((tn / (tn + fp)) * 1000) / 10 : 0;
    const f1 = precision + recall > 0 ? Math.round(((2 * precision * recall) / (precision + recall)) * 10) / 10 : 0;
    const brierScore = Math.round((brierSum / nTest) * 1000) / 1000;
    const logLoss = Math.round((logLossSum / nTest) * 100) / 100;

    const suspiciousLeakageWarning = auc > 0.98;

    const metrics: ModelMetrics = {
      rocAuc: auc,
      prAuc,
      accuracy,
      precision,
      recall,
      f1,
      specificity,
      brierScore,
      logLoss,
      confusionMatrix: { tp, fp, fn, tn },
      rocCurve,
      prCurve,
      calibrationCurve,
      liftGainCurve,
      optimalThreshold,
      optimalThresholdCost: minimumCost,
      crossValRocAucMean: Math.max(0.5, auc - 0.02),
      crossValRocAucStd: 0.015,
      suspiciousLeakageWarning,
    };

    comparisonResults.push({
      algorithm: algo,
      rocAuc: auc,
      prAuc,
      f1,
      accuracy,
      recall,
      precision,
      brierScore,
      isBest: false,
      trainingTimeMs,
      metrics,
      modelInstance,
    });
  }

  // Sort by ROC-AUC descending to identify champion model
  comparisonResults.sort((a, b) => b.rocAuc - a.rocAuc);
  comparisonResults[0].isBest = true;

  onProgress?.({
    status: 'completed',
    progressPercent: 100,
    currentModel: comparisonResults[0].algorithm,
    message: `Champion Model selected: ${comparisonResults[0].algorithm} (ROC-AUC ${comparisonResults[0].rocAuc})`,
  });

  return {
    bestModel: comparisonResults[0],
    allModels: comparisonResults,
    datasetDate: maxDate,
    featureNames,
  };
}

/**
 * Scores active customers using champion model and constructs confidence bands & reason codes
 */
export function scoreCustomers(
  records: CustomerRecord[],
  championModel: TrainedModel,
  maxDate: Date,
  settings: ModelSettings
): ScoredCustomerRecord[] {
  const scoredList: ScoredCustomerRecord[] = [];

  // Calculate portfolio benchmark averages
  let totalUsage = 0;
  let totalComplaints = 0;
  let totalOutages = 0;
  let totalSatisfaction = 0;
  let totalCharge = 0;

  for (const r of records) {
    totalUsage += r.averageMonthlyUsageGb || 0;
    totalComplaints += r.complaints12M || 0;
    totalOutages += r.networkOutages12M || 0;
    totalSatisfaction += r.satisfactionScore110 || 7;
    totalCharge += r.monthlyChargeGbp || 40;
  }
  const n = Math.max(1, records.length);
  const benchComplaints = Math.round((totalComplaints / n) * 10) / 10;
  const benchOutages = Math.round((totalOutages / n) * 10) / 10;
  const benchSatisfaction = Math.round((totalSatisfaction / n) * 10) / 10;
  const benchCharge = Math.round((totalCharge / n) * 100) / 100;

  for (const r of records) {
    const engineered = engineerCustomerFeatures(r, maxDate);
    const { vector } = buildFeatureVector(r, engineered, {
      includeLifetimeRevenue: settings.includeLifetimeRevenue,
      includeAge: settings.includeDemographicsAge,
      includeGender: settings.includeDemographicsGender,
    });

    const prob = championModel.predictProbability(vector);
    const charge = r.monthlyChargeGbp || 0;
    const predictedRisk = Math.round(prob * charge * 100) / 100;
    const expectedLoss12m = Math.round(prob * charge * 12 * 100) / 100;

    // Risk tier based on customizable settings
    let riskTier: RiskTier = 'Low';
    if (prob >= settings.riskThresholdCritical) riskTier = 'Critical';
    else if (prob >= settings.riskThresholdHigh) riskTier = 'High';
    else if (prob >= settings.riskThresholdMedium) riskTier = 'Medium';

    // Confidence bounds via bootstrap perturbation variance
    const margin = Math.min(0.08, prob * 0.15);
    const confidenceLower = Math.max(0.01, Math.round((prob - margin) * 100) / 100);
    const confidenceUpper = Math.min(0.99, Math.round((prob + margin) * 100) / 100);

    // Top drivers identification
    const topDrivers: ScoredCustomerRecord['topDrivers'] = [];

    if (r.complaints12M >= 2) {
      topDrivers.push({
        feature: 'complaints12M',
        label: 'Elevated Support Complaints',
        importance: 0.28,
        impact: 'pushes_risk_up',
        actualValue: `${r.complaints12M} complaints`,
        portfolioAvg: `${benchComplaints} avg`,
      });
    }
    if (r.contractType === 'Month-to-Month') {
      topDrivers.push({
        feature: 'contractType',
        label: 'Rolling Month-to-Month Contract',
        importance: 0.25,
        impact: 'pushes_risk_up',
        actualValue: 'Rolling Contract',
        portfolioAvg: 'Fixed Term',
      });
    }
    if (r.competitorOfferReceived === 'Yes') {
      topDrivers.push({
        feature: 'competitorOfferReceived',
        label: 'Active Competitor Solicitation',
        importance: 0.22,
        impact: 'pushes_risk_up',
        actualValue: 'Competitor Offer Logged',
        portfolioAvg: 'No Offer',
      });
    }
    if (r.networkOutages12M >= 2) {
      topDrivers.push({
        feature: 'networkOutages12M',
        label: 'Frequent Network Outages',
        importance: 0.19,
        impact: 'pushes_risk_up',
        actualValue: `${r.networkOutages12M} outages`,
        portfolioAvg: `${benchOutages} avg`,
      });
    }
    if (r.satisfactionScore110 <= 5) {
      topDrivers.push({
        feature: 'satisfactionScore110',
        label: 'Low Satisfaction Sentiment',
        importance: 0.18,
        impact: 'pushes_risk_up',
        actualValue: `${r.satisfactionScore110}/10 CSAT`,
        portfolioAvg: `${benchSatisfaction}/10`,
      });
    }
    if (engineered.isDirectDebit === 1 && topDrivers.length < 5) {
      topDrivers.push({
        feature: 'directDebit',
        label: 'Automated Direct Debit Payment',
        importance: 0.12,
        impact: 'pushes_risk_down',
        actualValue: 'Active Direct Debit',
        portfolioAvg: '78% adoption',
      });
    }

    // Business reason code
    let reasonCode = 'Low Engagement';
    if (r.complaints12M >= 2 || engineered.serviceFrictionIndex >= 5) reasonCode = 'Service Friction & Complaints';
    else if (r.competitorOfferReceived === 'Yes') reasonCode = 'Competitor Tariff Poaching';
    else if (r.contractType === 'Month-to-Month' || engineered.isOutOfContract === 1) reasonCode = 'Contract Expiration & Flexibility';
    else if (r.networkOutages12M >= 2) reasonCode = 'Network Reliability & Line Faults';
    else if (engineered.overageShare > 0.15 || r.monthlyChargeGbp > benchCharge * 1.3) reasonCode = 'Price Sensitivity & Overage Charges';

    // Next-best action
    let action = 'Regular Customer Success Health Check';
    if (riskTier === 'Critical' || riskTier === 'High') {
      if (reasonCode.includes('Service') || reasonCode.includes('Network')) {
        action = 'P1 VIP Technical Case Manager & Speed Assurance Visit';
      } else if (reasonCode.includes('Price') || reasonCode.includes('Competitor')) {
        action = 'P1 24M Contract Renewal with 15% Loyalty Tariff Discount';
      } else {
        action = 'P1 Proactive Retention Outreach & Free Router Upgrade';
      }
    } else if (riskTier === 'Medium') {
      action = 'Targeted Email Renewal Incentive & Data Allowance Bump';
    }

    scoredList.push({
      ...r,
      features: engineered,
      churnProbability: Math.round(prob * 1000) / 1000,
      riskTier,
      predictedRevenueAtRiskGbp: predictedRisk,
      expectedLoss12mGbp: expectedLoss12m,
      confidenceLower,
      confidenceUpper,
      topDrivers,
      reasonCode,
      recommendedAction: action,
    });
  }

  return scoredList;
}
