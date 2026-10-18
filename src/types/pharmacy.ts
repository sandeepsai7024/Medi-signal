export interface MedicineItem {
  id: string;
  name: string;
  strength: string;
  formulation: string;
  category: 'Antibiotics' | 'Endocrine & Diabetes' | 'Respiratory' | 'CNS & Controlled' | 'Cardiovascular' | 'Gastrointestinal';
  code: string; // BNF, dm+d, or NDC code
  stock: number; // In packs/vials
  baseDailyDemand: number; // mean μ
  demandStdDev: number; // standard deviation σ
  baseLeadTime: number; // supplier lead time in days L
  officialNotice: boolean;
  noticeAgency: 'DHSC' | 'FDA' | 'EMA' | 'None';
  noticeDetails: string;
  resupplyDate: string;
  freshness: string;
  tier1Wholesaler: {
    supplier: string;
    availablePacks: number;
    packPrice: number;
    orderCutoff: string;
    guaranteedEtaHours: number;
    status: 'In Stock' | 'Allocated / Capped' | 'Out of Stock';
  };
  tier2SisterBranch: {
    branchName: string;
    distanceMiles: number;
    surplusStock: number;
    branchRunwayDays: number;
  };
  tier3Alternative: {
    alternativeDrug: string;
    protocolCode: string;
    clinicalNotes: string;
    dosageConversion: string;
    contraindicationWarnings: string[];
    sspActive: boolean;
  };
}

export interface ComputedRisk {
  medicineId: string;
  effectiveLeadTime: number;
  effectiveDailyDemand: number;
  effectiveStdDev: number;
  naiveRunwayDays: number;
  p10RunwayDays: number;
  p50RunwayDays: number;
  p90RunwayDays: number;
  stockoutProbPercent: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  warningLeadGainDays: number;
  depletionTrajectory: { day: number; p10: number; p50: number; p90: number }[];
  mathSummary: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  medicineName: string;
  actionType: 'TIER_1_WHOLESALER_ORDER' | 'TIER_2_BRANCH_TRANSFER' | 'TIER_3_CLINICAL_SSP';
  details: string;
  licenseNumber?: string;
  pharmacistSignature?: string;
  status: 'PENDING_DISPATCH' | 'CONFIRMED' | 'CLINICALLY_AUTHORIZED';
}

export type ViewTab = 'dashboard' | 'evidence';
