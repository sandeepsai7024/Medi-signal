import { MedicineItem, ComputedRisk } from '../types/pharmacy';

/**
 * Standard Normal Cumulative Distribution Function (Abramowitz & Stegun approximation)
 */
export function normalCDF(x: number): number {
  if (isNaN(x)) return 0.5;
  if (x < -6) return 0.000001;
  if (x > 6) return 0.999999;

  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const prob =
    d *
    t *
    (0.31938153 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));

  return x > 0 ? 1 - prob : prob;
}

/**
 * Compute probabilistic risk, runway percentiles, and depletion cone for a medicine item
 */
export function calculateMedicineRisk(
  item: MedicineItem,
  leadTimeShock: number = 0,
  demandSurge: number = 1.0
): ComputedRisk {
  const stock = Math.max(0, item.stock);
  const effectiveLeadTime = Math.max(0.2, item.baseLeadTime + leadTimeShock);
  const effectiveDailyDemand = Math.max(0.1, item.baseDailyDemand * demandSurge);
  const effectiveStdDev = Math.max(0.05, item.demandStdDev * Math.sqrt(demandSurge));

  // Naive static runway (Deterministic)
  const naiveRunwayDays = Number((stock / effectiveDailyDemand).toFixed(1));

  // Percentiles for runway days
  // P10 (worst case: high daily demand = mu + 1.2816*sigma)
  const highDailyBurn = effectiveDailyDemand + 1.2816 * effectiveStdDev;
  const p10RunwayDays = Number(Math.max(0.1, stock / highDailyBurn).toFixed(1));

  // P50 (median runway)
  const p50RunwayDays = naiveRunwayDays;

  // P90 (optimistic: lower daily demand = max(0.1, mu - 1.2816*sigma))
  const lowDailyBurn = Math.max(0.1, effectiveDailyDemand - 1.2816 * effectiveStdDev);
  const p90RunwayDays = Number(Math.max(p50RunwayDays, stock / lowDailyBurn).toFixed(1));

  // Lead-time demand distribution: D_L ~ Normal(mu * L, sigma^2 * L)
  const meanLeadDemand = effectiveDailyDemand * effectiveLeadTime;
  const leadDemandStd = effectiveStdDev * Math.sqrt(effectiveLeadTime);

  // Z-score for stock sufficiency
  const z = (stock - meanLeadDemand) / (leadDemandStd || 0.1);
  // P(Stockout) = P(D_L > Stock) = 1 - CDF(z)
  const stockoutProb = Math.min(0.999, Math.max(0.001, 1 - normalCDF(z)));
  const stockoutProbPercent = Math.round(stockoutProb * 100);

  // Categorize risk level
  let riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' = 'LOW';
  if (stockoutProbPercent >= 50 || p10RunwayDays <= effectiveLeadTime) {
    riskLevel = 'CRITICAL';
  } else if (stockoutProbPercent >= 25 || p50RunwayDays <= effectiveLeadTime + 1.5) {
    riskLevel = 'HIGH';
  } else if (stockoutProbPercent >= 10 || p90RunwayDays <= effectiveLeadTime + 3) {
    riskLevel = 'MODERATE';
  } else {
    riskLevel = 'LOW';
  }

  // Lead time warning gain vs naive static reorder
  // Naive reorders only when naiveRunway <= baseLeadTime.
  // MediSignal flags when p10Runway <= effectiveLeadTime, providing advance delta days.
  const warningLeadGainDays = Math.max(
    0.5,
    Number((p50RunwayDays - p10RunwayDays + Math.max(0, effectiveLeadTime - item.baseLeadTime) * 0.8).toFixed(1))
  );

  // Generate depletion cone trajectory points (Day 0 to Day 14)
  const trajectoryDays = 14;
  const depletionTrajectory: { day: number; p10: number; p50: number; p90: number }[] = [];

  for (let d = 0; d <= trajectoryDays; d++) {
    // Cumulative variance grows with sqrt(d)
    const cumulativeStd = effectiveStdDev * Math.sqrt(Math.max(1, d));
    const meanDepletion = effectiveDailyDemand * d;

    // P10 worst case remaining stock (highest burn)
    const p10Stock = Math.max(0, stock - (meanDepletion + 1.2816 * cumulativeStd));
    // P50 median remaining stock
    const p50Stock = Math.max(0, stock - meanDepletion);
    // P90 optimistic remaining stock (lowest burn)
    const p90Stock = Math.max(0, stock - Math.max(0, meanDepletion - 1.2816 * cumulativeStd));

    depletionTrajectory.push({
      day: d,
      p10: Number(p10Stock.toFixed(1)),
      p50: Number(p50Stock.toFixed(1)),
      p90: Number(p90Stock.toFixed(1)),
    });
  }

  // Formulate mathematical zero-hallucination explainer brief
  let mathSummary = '';
  if (p10RunwayDays <= effectiveLeadTime) {
    mathSummary = `CRITICAL DEFICIT DETECTED: Physical stock (${stock} packs) burns to 0 in ${p10RunwayDays}d under P10 stress (burn rate: ${highDailyBurn.toFixed(1)} packs/d). Wholesaler replenishment requires ${effectiveLeadTime.toFixed(1)}d. Stock-out probability before truck arrival is ${stockoutProbPercent}%. Static threshold fails to account for ${effectiveStdDev.toFixed(1)}σ dispensing volatility.`;
  } else if (p50RunwayDays <= effectiveLeadTime + 1.5) {
    mathSummary = `ELEVATED VULNERABILITY: Median shelf exhaustion (${p50RunwayDays}d) leaves a narrow buffer of ${(p50RunwayDays - effectiveLeadTime).toFixed(1)}d against supplier lead time (${effectiveLeadTime.toFixed(1)}d). Volatility shock pushes stockout likelihood to ${stockoutProbPercent}%. Recommended: Reserve secondary wholesaler quota.`;
  } else {
    mathSummary = `STABLE SHELF POSITION: Active inventory of ${stock} packs provides ${p50RunwayDays}d median runway (P10: ${p10RunwayDays}d). Lead time horizon of ${effectiveLeadTime.toFixed(1)}d is safely covered with P(Stockout) = ${stockoutProbPercent}%. Continue baseline automated replenishment monitor.`;
  }

  return {
    medicineId: item.id,
    effectiveLeadTime: Number(effectiveLeadTime.toFixed(1)),
    effectiveDailyDemand: Number(effectiveDailyDemand.toFixed(1)),
    effectiveStdDev: Number(effectiveStdDev.toFixed(2)),
    naiveRunwayDays,
    p10RunwayDays,
    p50RunwayDays,
    p90RunwayDays,
    stockoutProbPercent,
    riskLevel,
    warningLeadGainDays,
    depletionTrajectory,
    mathSummary,
  };
}
