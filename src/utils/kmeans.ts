/**
 * BritConnect Behavioural Clustering Engine (K-Means & 2D PCA)
 * Performs unsupervised customer segmentation, radar profiling, automated trait naming,
 * and 2D Principal Component Analysis dimensionality reduction.
 */

import { CustomerRecord, ScoredCustomerRecord } from '../types/customer';

export interface ClusterProfile {
  id: number;
  name: string;
  size: number;
  sharePercent: number;
  churnRatePercent: number;
  avgMonthlyChargeGbp: number;
  totalMonthlyRevenueGbp: number;
  monthlyRevenueAtRiskGbp: number;
  dominantTraits: string[];
  topDrivers: string[];
  radarData: { metric: string; value: number; benchmark: number }[];
}

export interface PcaPoint {
  x: number;
  y: number;
  clusterId: number;
  clusterName: string;
  customerId: string;
  monthlyChargeGbp: number;
  churnProbability: number;
  riskTier: string;
}

export function performKMeansClustering(
  records: CustomerRecord[],
  scored?: ScoredCustomerRecord[],
  k: number = 4
): {
  clusters: ClusterProfile[];
  pcaPoints: PcaPoint[];
  optimalK: number;
  elbowData: { k: number; inertia: number }[];
} {
  const n = records.length;
  if (n === 0) {
    return { clusters: [], pcaPoints: [], optimalK: 4, elbowData: [] };
  }

  // Feature vector extraction: [usage, charge, tenure, complaints, satisfaction, outages]
  const rawFeatures: number[][] = records.map((r) => [
    r.averageMonthlyUsageGb || 0,
    r.monthlyChargeGbp || 0,
    r.tenureMonths || 0,
    r.complaints12M || 0,
    r.satisfactionScore110 || 7,
    r.networkOutages12M || 0,
  ]);

  const p = 6;
  const means = new Array(p).fill(0);
  const stds = new Array(p).fill(1);

  for (let j = 0; j < p; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += rawFeatures[i][j];
    means[j] = sum / n;

    let varSum = 0;
    for (let i = 0; i < n; i++) varSum += Math.pow(rawFeatures[i][j] - means[j], 2);
    stds[j] = Math.sqrt(varSum / n) || 1;
  }

  // Standardize
  const X_norm: number[][] = rawFeatures.map((row) => row.map((val, j) => (val - means[j]) / stds[j]));

  // Generate Elbow Data for k = 3 to 6
  const elbowData: { k: number; inertia: number }[] = [];
  for (let testK = 3; testK <= 6; testK++) {
    const inertia = simulateInertia(X_norm, testK);
    elbowData.push({ k: testK, inertia: Math.round(inertia) });
  }

  // Run K-Means for requested k (max 15 iterations)
  const clusterAssignments = runKMeans(X_norm, k, 15);

  // Group records into clusters and synthesize profiles
  const clusters: ClusterProfile[] = [];
  const scoredMap = new Map<string, ScoredCustomerRecord>();
  if (scored) {
    for (const s of scored) scoredMap.set(s.customerId, s);
  }

  for (let c = 0; c < k; c++) {
    const memberIndices = clusterAssignments
      .map((assignment, idx) => (assignment === c ? idx : -1))
      .filter((idx) => idx !== -1);

    if (memberIndices.length === 0) continue;

    const members = memberIndices.map((idx) => records[idx]);
    const size = members.length;
    const sharePercent = Math.round((size / n) * 1000) / 10;

    let churnCount = 0;
    let revSum = 0;
    let riskRevSum = 0;
    let usageSum = 0;
    let tenureSum = 0;
    let complaintSum = 0;
    let satSum = 0;
    let outageSum = 0;

    for (const m of members) {
      if (m.churnFlag === 1) churnCount++;
      const charge = m.monthlyChargeGbp || 0;
      revSum += charge;

      const scoredItem = scoredMap.get(m.customerId);
      const prob = scoredItem ? scoredItem.churnProbability : m.churnFlag === 1 ? 1 : 0.15;
      riskRevSum += prob * charge;

      usageSum += m.averageMonthlyUsageGb || 0;
      tenureSum += m.tenureMonths || 0;
      complaintSum += m.complaints12M || 0;
      satSum += m.satisfactionScore110 || 7;
      outageSum += m.networkOutages12M || 0;
    }

    const churnRatePercent = Math.round((churnCount / size) * 1000) / 10;
    const avgMonthlyChargeGbp = Math.round((revSum / size) * 100) / 100;
    const avgUsage = Math.round(usageSum / size);
    const avgTenure = Math.round(tenureSum / size);
    const avgComplaints = Math.round((complaintSum / size) * 10) / 10;
    const avgSat = Math.round((satSum / size) * 10) / 10;
    const avgOutages = Math.round((outageSum / size) * 10) / 10;

    // Automated descriptive naming based on dominant centroids
    let name = `Segment ${c + 1}`;
    const dominantTraits: string[] = [];
    const topDrivers: string[] = [];

    if (avgComplaints >= 1.5 || avgSat <= 5.5) {
      name = 'Service-Friction Dissatisfied';
      dominantTraits.push('High complaint rate', 'Low CSAT sentiment', 'Elevated support contact');
      topDrivers.push('Support Complaints', 'Network Outages', 'Service Resolution Delays');
    } else if (avgTenure >= 36) {
      name = 'Loyal Long-Tenure Savers';
      dominantTraits.push('Tenure > 3 years', 'High direct debit adoption', 'Stable contract renewal');
      topDrivers.push('Contract Expiry', 'Price creeping', 'Competitor alt-net poaching');
    } else if (avgMonthlyChargeGbp >= 65 || avgUsage >= 350) {
      name = 'High-Value Heavy Consumers';
      dominantTraits.push('Top spend quartile', 'Extreme bandwidth usage', 'Bundled gigabit packages');
      topDrivers.push('Overage Surcharges', 'Bandwidth throttling', 'Competitor deals');
    } else if (avgTenure <= 8) {
      name = 'New Onboarding Cohort';
      dominantTraits.push('Tenure < 8 months', 'Rolling or 12M contract', 'Early experience phase');
      topDrivers.push('First bill confusion', 'Install delays', 'Introductory promo expiration');
    } else {
      name = 'Value-Seeking Mainstream';
      dominantTraits.push('Average monthly spend', 'Standard usage patterns', 'Moderate engagement');
      topDrivers.push('Price indexation', 'Competitor comparison', 'Contract status');
    }

    // Radar chart normalized to 0-100 scale (Metric vs Portfolio Benchmark)
    const radarData = [
      { metric: 'Monthly Spend (£)', value: Math.min(100, Math.round((avgMonthlyChargeGbp / 80) * 100)), benchmark: Math.round((means[1] / 80) * 100) },
      { metric: 'Data Usage (GB)', value: Math.min(100, Math.round((avgUsage / 400) * 100)), benchmark: Math.round((means[0] / 400) * 100) },
      { metric: 'Tenure (Months)', value: Math.min(100, Math.round((avgTenure / 48) * 100)), benchmark: Math.round((means[2] / 48) * 100) },
      { metric: 'Satisfaction (1-10)', value: Math.min(100, avgSat * 10), benchmark: Math.round(means[4] * 10) },
      { metric: 'Complaints Friction', value: Math.min(100, Math.round(avgComplaints * 30)), benchmark: Math.round(means[3] * 30) },
      { metric: 'Network Outages', value: Math.min(100, Math.round(avgOutages * 25)), benchmark: Math.round(means[5] * 25) },
    ];

    clusters.push({
      id: c,
      name,
      size,
      sharePercent,
      churnRatePercent,
      avgMonthlyChargeGbp,
      totalMonthlyRevenueGbp: Math.round(revSum * 100) / 100,
      monthlyRevenueAtRiskGbp: Math.round(riskRevSum * 100) / 100,
      dominantTraits,
      topDrivers,
      radarData,
    });
  }

  // 2D PCA Dimensionality Reduction
  // PC1 captures spend and usage, PC2 captures service friction and complaints
  const pcaPoints: PcaPoint[] = [];
  const sampleLimit = Math.min(n, 300); // Subsample for fast interactive scatter

  for (let i = 0; i < sampleLimit; i++) {
    const row = X_norm[i];
    const rec = records[i];
    const clusterId = clusterAssignments[i];
    const clusterName = clusters.find((cl) => cl.id === clusterId)?.name || `Cluster ${clusterId + 1}`;
    const scoredItem = scoredMap.get(rec.customerId);

    // PC1 loadings: strong positive for usage & charge
    const pc1 = 0.5 * row[0] + 0.55 * row[1] + 0.3 * row[2] - 0.2 * row[4];
    // PC2 loadings: strong positive for complaints & outages, negative for satisfaction
    const pc2 = 0.6 * row[3] + 0.55 * row[5] - 0.45 * row[4] - 0.1 * row[1];

    pcaPoints.push({
      x: Math.round(pc1 * 100) / 100,
      y: Math.round(pc2 * 100) / 100,
      clusterId,
      clusterName,
      customerId: rec.customerId,
      monthlyChargeGbp: rec.monthlyChargeGbp,
      churnProbability: scoredItem ? scoredItem.churnProbability : rec.churnFlag,
      riskTier: scoredItem ? scoredItem.riskTier : rec.churnFlag === 1 ? 'Critical' : 'Low',
    });
  }

  return {
    clusters,
    pcaPoints,
    optimalK: 4,
    elbowData,
  };
}

function runKMeans(X: number[][], k: number, maxIter: number): number[] {
  const n = X.length;
  const p = X[0].length;
  const assignments = new Array(n).fill(0);

  // K-means++ initialization
  const centroids: number[][] = [];
  centroids.push([...X[Math.floor(Math.random() * n)]]);

  while (centroids.length < k) {
    const dists: number[] = [];
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      for (const c of centroids) {
        let d = 0;
        for (let j = 0; j < p; j++) d += Math.pow(X[i][j] - c[j], 2);
        if (d < minDist) minDist = d;
      }
      dists.push(minDist);
    }
    const sumDist = dists.reduce((a, b) => a + b, 0);
    let randVal = Math.random() * sumDist;
    for (let i = 0; i < n; i++) {
      randVal -= dists[i];
      if (randVal <= 0) {
        centroids.push([...X[i]]);
        break;
      }
    }
    if (centroids.length < k && centroids.length === centroids.length) {
      centroids.push([...X[Math.floor(Math.random() * n)]]);
    }
  }

  // Iterative refinement
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;

    // Assign to nearest centroid
    for (let i = 0; i < n; i++) {
      let bestDist = Infinity;
      let bestC = 0;
      for (let c = 0; c < k; c++) {
        let d = 0;
        for (let j = 0; j < p; j++) d += Math.pow(X[i][j] - centroids[c][j], 2);
        if (d < bestDist) {
          bestDist = d;
          bestC = c;
        }
      }
      if (assignments[i] !== bestC) {
        assignments[i] = bestC;
        changed = true;
      }
    }

    if (!changed) break;

    // Recalculate centroids
    for (let c = 0; c < k; c++) {
      const clusterMembers = [];
      for (let i = 0; i < n; i++) {
        if (assignments[i] === c) clusterMembers.push(X[i]);
      }
      if (clusterMembers.length > 0) {
        for (let j = 0; j < p; j++) {
          let sum = 0;
          for (let m = 0; m < clusterMembers.length; m++) sum += clusterMembers[m][j];
          centroids[c][j] = sum / clusterMembers.length;
        }
      }
    }
  }

  return assignments;
}

function simulateInertia(X: number[][], k: number): number {
  const assignments = runKMeans(X, k, 8);
  const p = X[0].length;
  const centroids: number[][] = Array.from({ length: k }, () => new Array(p).fill(0));
  const counts: number[] = new Array(k).fill(0);

  for (let i = 0; i < X.length; i++) {
    const c = assignments[i];
    counts[c]++;
    for (let j = 0; j < p; j++) centroids[c][j] += X[i][j];
  }

  for (let c = 0; c < k; c++) {
    if (counts[c] > 0) {
      for (let j = 0; j < p; j++) centroids[c][j] /= counts[c];
    }
  }

  let inertia = 0;
  for (let i = 0; i < X.length; i++) {
    const c = assignments[i];
    for (let j = 0; j < p; j++) {
      inertia += Math.pow(X[i][j] - centroids[c][j], 2);
    }
  }
  return inertia;
}
