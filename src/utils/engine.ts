import { InventoryItem, ComputedInventoryItem } from '../types';

/**
 * Standard Normal Cumulative Distribution Function (Abramowitz & Stegun approximation)
 * Accuracy: ~1e-7
 */
export function normalCDF(x: number): number {
  if (isNaN(x)) return 0.5;
  if (x < -6) return 0.000001;
  if (x > 6) return 0.999999;

  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t *
        (-0.3565638 +
          t * (1.781478 + t * (-1.821256 + t * 1.330274))));

  return x > 0 ? 1 - prob : prob;
}

/**
 * Compute compound stochastic probabilistic forecasts for all items
 */
export function computeItemForecasts(
  items: InventoryItem[],
  leadShock: number,
  demandSurge: number
): { computedItems: ComputedInventoryItem[]; criticalCount: number; caughtBeforeNaive: number } {
  let criticalCount = 0;
  let caughtBeforeNaive = 0;

  const computedItems: ComputedInventoryItem[] = items.map((item) => {
    const noticeShock =
      item.officialNotice !== 'None' && !item.officialNotice.toLowerCase().includes('watchlist')
        ? 1.15
        : 1.0;

    const effectiveDemand = item.avgDailyDemand * demandSurge;
    const effectiveDemandStd = item.demandStdDev * demandSurge * noticeShock;
    const effectiveLeadTime = Math.max(0.1, item.supplierLeadTime + leadShock);
    const effectiveLeadStd = Math.max(0.05, item.leadTimeStdDev * noticeShock);

    // Naive Point Estimate
    const naiveDays = item.stockQty / Math.max(0.1, effectiveDemand);
    const naiveReorderFlag = naiveDays <= item.supplierLeadTime;

    // Compound Demand During Lead Time Distribution:
    // mu_DL = mu_D * mu_L
    // sigma_DL = sqrt(mu_L * sigma_D^2 + mu_D^2 * sigma_L^2)
    const muDL = effectiveDemand * effectiveLeadTime;
    const sigmaDL = Math.sqrt(
      effectiveLeadTime * Math.pow(effectiveDemandStd, 2) +
        Math.pow(effectiveDemand, 2) * Math.pow(effectiveLeadStd, 2)
    );

    const zScore = (item.stockQty - muDL) / Math.max(0.01, sigmaDL);
    const stockoutProb = Math.min(99.9, Math.max(0.1, (1 - normalCDF(zScore)) * 100));

    // Uncertainty Runway Bounds (P10 = High demand spike, P50 = Median, P90 = Low demand)
    const dailyHighP90Demand =
      effectiveDemand + 1.28 * (effectiveDemandStd / Math.sqrt(Math.max(1, effectiveLeadTime)));
    const dailyLowP10Demand = Math.max(
      0.2 * effectiveDemand,
      effectiveDemand - 1.28 * (effectiveDemandStd / Math.sqrt(Math.max(1, effectiveLeadTime)))
    );

    const p10Days = item.stockQty / Math.max(0.01, dailyHighP90Demand);
    const p50Days = item.stockQty / Math.max(0.01, effectiveDemand);
    const p90Days = item.stockQty / Math.max(0.01, dailyLowP10Demand);

    if (stockoutProb >= 50) {
      criticalCount++;
      if (!naiveReorderFlag) caughtBeforeNaive++;
    }

    return {
      ...item,
      effectiveDemand,
      effectiveLeadTime,
      naiveDays,
      naiveReorderFlag,
      stockoutProb,
      p10Days,
      p50Days,
      p90Days,
      dailyHighDemand: dailyHighP90Demand,
      dailyLowDemand: dailyLowP10Demand,
    };
  });

  return { computedItems, criticalCount, caughtBeforeNaive };
}

/**
 * Generate sample CSV matching MediSignal MVP specification
 */
export function generateSampleCSV(items: InventoryItem[]): string {
  const headers = [
    'id',
    'name',
    'category',
    'stockQty',
    'avgDailyDemand',
    'demandStdDev',
    'supplierLeadTime',
    'leadTimeStdDev',
    'officialNotice',
    'wholesalerStatus',
    'dataFreshnessHours',
    'approvedSuppliers',
    'nearbyStock',
    'clinicalAlternative',
  ];

  const escapeCSV = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = items.map((item) => [
    escapeCSV(item.id),
    escapeCSV(item.name),
    escapeCSV(item.category),
    item.stockQty,
    item.avgDailyDemand,
    item.demandStdDev,
    item.supplierLeadTime,
    item.leadTimeStdDev,
    escapeCSV(item.officialNotice),
    escapeCSV(item.wholesalerStatus),
    item.dataFreshnessHours,
    escapeCSV(item.approvedSuppliers),
    escapeCSV(item.nearbyStock),
    escapeCSV(item.clinicalAlternative),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Parse CSV file into InventoryItem array
 */
export function parseInventoryCSV(text: string): InventoryItem[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row.');
  }

  // Tokenize CSV line taking into account quotes
  const tokenizeLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = tokenizeLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const getIdx = (candidates: string[]) => {
    for (const cand of candidates) {
      const idx = headers.findIndex((h) => h.includes(cand));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const nameIdx = getIdx(['name', 'medicine', 'drug']);
  const stockIdx = getIdx(['stock', 'qty', 'quantity']);
  const demandIdx = getIdx(['avgdailydemand', 'demand', 'rate']);
  const demandStdIdx = getIdx(['demandstd', 'stddev', 'variance']);
  const leadIdx = getIdx(['supplierleadtime', 'leadtime', 'lead']);
  const leadStdIdx = getIdx(['leadtimestd', 'leadstd']);
  const catIdx = getIdx(['category', 'class']);
  const noticeIdx = getIdx(['officialnotice', 'notice', 'ssp']);
  const statusIdx = getIdx(['wholesalerstatus', 'status']);
  const freshIdx = getIdx(['freshness', 'hours', 'updated']);
  const suppIdx = getIdx(['approvedsuppliers', 'suppliers', 'wholesaler']);
  const nearbyIdx = getIdx(['nearbystock', 'sister', 'branch']);
  const altIdx = getIdx(['clinicalalternative', 'alternative', 'protocol']);

  const parsedItems: InventoryItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = tokenizeLine(lines[i]);
    if (cols.length < 3) continue;

    const id = cols[0] || `MED-${String(i).padStart(3, '0')}`;
    const name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : cols[1] || `Medicine ${i}`;
    const stockQty = stockIdx !== -1 ? Math.max(0, parseFloat(cols[stockIdx]) || 0) : 100;
    const avgDailyDemand = demandIdx !== -1 ? Math.max(0.1, parseFloat(cols[demandIdx]) || 10) : 10;
    const demandStdDev = demandStdIdx !== -1 ? Math.max(0.1, parseFloat(cols[demandStdIdx]) || 2) : 2.5;
    const supplierLeadTime = leadIdx !== -1 ? Math.max(0.5, parseFloat(cols[leadIdx]) || 2) : 3;
    const leadTimeStdDev = leadStdIdx !== -1 ? Math.max(0.1, parseFloat(cols[leadStdIdx]) || 0.5) : 1.0;
    const category = catIdx !== -1 && cols[catIdx] ? cols[catIdx] : 'General';
    const officialNotice = noticeIdx !== -1 && cols[noticeIdx] ? cols[noticeIdx] : 'None';
    const wholesalerStatus = statusIdx !== -1 && cols[statusIdx] ? cols[statusIdx] : 'In Stock';
    const dataFreshnessHours = freshIdx !== -1 ? parseFloat(cols[freshIdx]) || 1.0 : 1.0;
    const approvedSuppliers =
      suppIdx !== -1 && cols[suppIdx]
        ? cols[suppIdx]
        : 'Primary Wholesaler: Available in regional hub (24h lead)';
    const nearbyStock =
      nearbyIdx !== -1 && cols[nearbyIdx]
        ? cols[nearbyIdx]
        : 'Nearby Branch (4.5 km) — Normal stock buffer';
    const clinicalAlternative =
      altIdx !== -1 && cols[altIdx]
        ? cols[altIdx]
        : 'Consult prescriber for alternative therapeutic class options.';

    parsedItems.push({
      id,
      name,
      category,
      stockQty,
      avgDailyDemand,
      demandStdDev,
      supplierLeadTime,
      leadTimeStdDev,
      officialNotice,
      wholesalerStatus,
      dataFreshnessHours,
      approvedSuppliers,
      nearbyStock,
      clinicalAlternative,
    });
  }

  if (parsedItems.length === 0) {
    throw new Error('No valid medicine rows found in the uploaded file.');
  }

  return parsedItems;
}
