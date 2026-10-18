export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stockQty: number;
  avgDailyDemand: number;
  demandStdDev: number;
  supplierLeadTime: number;
  leadTimeStdDev: number;
  officialNotice: string;
  wholesalerStatus: string;
  dataFreshnessHours: number;
  approvedSuppliers: string;
  nearbyStock: string;
  clinicalAlternative: string;
}

export interface ComputedInventoryItem extends InventoryItem {
  effectiveDemand: number;
  effectiveLeadTime: number;
  naiveDays: number;
  naiveReorderFlag: boolean;
  stockoutProb: number;
  p10Days: number;
  p50Days: number;
  p90Days: number;
  dailyHighDemand: number;
  dailyLowDemand: number;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  medicineId: string;
  medicineName: string;
  actionType: 'WHOLESALER_ORDER' | 'BRANCH_TRANSFER' | 'CLINICAL_SSP_PROTOCOL';
  details: string;
  clinicianId?: string;
  status: 'RESOLVED' | 'PENDING' | 'AUTHORIZED' | 'CONFIRMED';
}

export type TriageFilter = 'ALL' | 'CRITICAL' | 'NOTICE' | 'ANTIBIOTIC' | 'CONTROLLED';
export type ActiveTab = 'dashboard' | 'evidence';
