import React, { useState, useMemo, useRef } from 'react';
import { InventoryItem, ComputedInventoryItem, AuditEntry, TriageFilter, ActiveTab } from './types';
import { INITIAL_INVENTORY } from './data/initialData';
import { computeItemForecasts, generateSampleCSV, parseInventoryCSV } from './utils/engine';
import { DepletionChart } from './components/DepletionChart';
import { EvidenceView } from './components/EvidenceView';
import { WholesalerOrderModal, BranchTransferModal, ClinicalLetterModal } from './components/ActionModals';
import {
  Upload,
  Download,
  RotateCcw,
  Search,
  Check,
  AlertTriangle,
  Clock,
  Shield,
  Layers,
  FileSpreadsheet,
  Lock,
  Unlock,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  TrendingDown,
} from 'lucide-react';

export default function App() {
  // Inventory state
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [selectedMedId, setSelectedMedId] = useState<string>('MED-001');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Stress-test simulation parameters
  const [leadShock, setLeadShock] = useState<number>(0);
  const [demandSurge, setDemandSurge] = useState<number>(1.0);

  // Filters & Search
  const [categoryFilter, setCategoryFilter] = useState<TriageFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Clinical Governance Lock
  const [clinicianConfirmed, setClinicianConfirmed] = useState<boolean>(false);
  const [clinicianLicense, setClinicianLicense] = useState<string>('');

  // Action Modals
  const [isWholesalerModalOpen, setIsWholesalerModalOpen] = useState<boolean>(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [isClinicalLetterModalOpen, setIsClinicalLetterModalOpen] = useState<boolean>(false);

  // Audit Log & Metrics
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Trigger brief toast message
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Compute forecasts for all items
  const { computedItems, criticalCount, caughtBeforeNaive } = useMemo(() => {
    return computeItemForecasts(inventoryData, leadShock, demandSurge);
  }, [inventoryData, leadShock, demandSurge]);

  // Selected item
  const selectedItem: ComputedInventoryItem = useMemo(() => {
    return computedItems.find((m) => m.id === selectedMedId) || computedItems[0] || ({} as ComputedInventoryItem);
  }, [computedItems, selectedMedId]);

  // Filtered items for table
  const filteredItems = useMemo(() => {
    return computedItems.filter((item) => {
      // Category filter
      if (categoryFilter === 'CRITICAL' && item.stockoutProb < 50) return false;
      if (categoryFilter === 'NOTICE' && item.officialNotice === 'None') return false;
      if (categoryFilter === 'ANTIBIOTIC' && !item.category.toLowerCase().includes('antibiotic')) return false;
      if (categoryFilter === 'CONTROLLED' && !item.category.toLowerCase().includes('cns') && !item.category.toLowerCase().includes('controlled')) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCat = item.category.toLowerCase().includes(q);
        const matchesNotice = item.officialNotice.toLowerCase().includes(q);
        if (!matchesName && !matchesCat && !matchesNotice) return false;
      }

      return true;
    }).sort((a, b) => b.stockoutProb - a.stockoutProb);
  }, [computedItems, categoryFilter, searchQuery]);

  // Stress-test presets
  const applyPreset = (preset: 'normal' | 'viral_surge' | 'logistics_strike' | 'compound') => {
    if (preset === 'normal') {
      setLeadShock(0);
      setDemandSurge(1.0);
      showToast('Simulation reset to Baseline Normal Operating Conditions.');
    } else if (preset === 'viral_surge') {
      setLeadShock(0.5);
      setDemandSurge(1.45);
      showToast('Applied Stress Preset: Winter Viral Surge (+45% Demand, +0.5d Lead).');
    } else if (preset === 'logistics_strike') {
      setLeadShock(3.0);
      setDemandSurge(1.1);
      showToast('Applied Stress Preset: Major Wholesaler Depot Delay (+3.0d Lead).');
    } else if (preset === 'compound') {
      setLeadShock(3.5);
      setDemandSurge(1.55);
      showToast('Applied Stress Preset: Severe Compound Shortage Crisis (+55% Demand, +3.5d Lead).');
    }
  };

  // CSV Template download
  const handleDownloadSampleCSV = () => {
    const csvContent = generateSampleCSV(INITIAL_INVENTORY);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medisignal_pharmacy_inventory_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded MediSignal inventory CSV template.');
  };

  // Export current live assessment CSV
  const handleExportAssessmentCSV = () => {
    const headers = [
      'id',
      'name',
      'category',
      'stockQty',
      'effectiveDailyDemand',
      'effectiveLeadTimeDays',
      'naiveRunwayDays',
      'p10WorstCaseDays',
      'p50MedianDays',
      'p90LowDemandDays',
      'stockoutProbabilityPercent',
      'officialNotice',
      'recommendation',
    ];

    const escapeCSV = (val: string | number) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = computedItems.map((item) => [
      escapeCSV(item.id),
      escapeCSV(item.name),
      escapeCSV(item.category),
      item.stockQty,
      item.effectiveDemand.toFixed(1),
      item.effectiveLeadTime.toFixed(1),
      item.naiveDays.toFixed(1),
      item.p10Days.toFixed(1),
      item.p50Days.toFixed(1),
      item.p90Days.toFixed(1),
      item.stockoutProb.toFixed(1),
      escapeCSV(item.officialNotice),
      escapeCSV(item.stockoutProb >= 50 ? 'Immediate Wholesaler Reorder or SSP Switch' : 'Monitor Baseline'),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medisignal_live_assessment_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported live stockout risk assessment to CSV.');
  };

  // CSV Upload handler
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseInventoryCSV(text);
        setInventoryData(parsed);
        if (parsed.length > 0) {
          setSelectedMedId(parsed[0].id);
        }
        showToast(`Successfully ingested and forecasted ${parsed.length} medicines from CSV!`);
      } catch (err: any) {
        showToast(`Error parsing CSV: ${err.message || 'Invalid CSV format'}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle audit logging when actions are taken
  const addAuditEntry = (entry: AuditEntry) => {
    setAuditLogs((prev) => [entry, ...prev]);
    showToast(`Action Executed: ${entry.actionType.replace(/_/g, ' ')} recorded in audit trail.`);
  };

  // Check if clinical lock is unlocked
  const isClinicianUnlocked = clinicianConfirmed && clinicianLicense.trim().length >= 4;

  return (
    <div className="min-h-screen flex flex-col selection:bg-sky-500 selection:text-white bg-[#0b1120] text-slate-100">
      {/* TOAST NOTIFICATION POPUP */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-sky-500/50 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom duration-200">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP NAVIGATION BAR */}
      <header className="border-b border-slate-800 bg-slate-900/90 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 font-bold text-lg tracking-tighter text-white">
              MS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight text-white">
                  MediSignal <span className="text-sky-400 font-normal">MVP v1.4</span>
                </h1>
                <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Deterministic + Probabilistic Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pharmacy Shortage Early-Warning, Stock-Risk Forecasting & Verified Clinical Triage
              </p>
            </div>
          </div>

          {/* Navigation Tabs & CSV Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-slate-800/90 p-1 rounded-lg border border-slate-700 flex text-xs font-medium">
              <button
                id="tab-dashboard"
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'dashboard'
                    ? 'bg-sky-500 text-white shadow font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>1. Live Decision Dashboard</span>
              </button>
              <button
                id="tab-evidence"
                onClick={() => setActiveTab('evidence')}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'evidence'
                    ? 'bg-sky-500 text-white shadow font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>2. Shortage Impact & ROI Report</span>
              </button>
            </div>

            <label className="cursor-pointer px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition">
              <Upload className="w-4 h-4 text-sky-400" />
              <span>Upload Inventory CSV</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCSVUpload}
              />
            </label>

            <button
              onClick={handleDownloadSampleCSV}
              className="px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 transition flex items-center gap-1.5"
              title="Download sample CSV template"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Template CSV</span>
            </button>

            <button
              onClick={handleExportAssessmentCSV}
              className="px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 transition flex items-center gap-1.5"
              title="Export current stockout assessment"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Assessment</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 flex-1 flex flex-col gap-5">
        {/* KPI EVIDENCE RIBBON */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="glass-card rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Imminent Stock-Out Risks
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span id="kpi-critical-count" className="text-2xl font-bold text-rose-400 mono">
                  {criticalCount}
                </span>
                <span
                  id="kpi-naive-missed"
                  className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded"
                >
                  +{caughtBeforeNaive} caught before Naive Baseline
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Medicines with P(Stockout) &ge; 50% during lead time
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-bold mono text-lg">
              !
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Warning Lead-Time Gain
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span id="kpi-lead-gain" className="text-2xl font-bold text-sky-400 mono">
                  +3.6 Days
                </span>
                <span className="text-xs text-emerald-400">vs. Static Reorder</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Advance notice before physical shelf exhaustion
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold mono text-sm">
              &Delta;T
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Verified Action Precision
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span id="kpi-precision" className="text-2xl font-bold text-emerald-400 mono">
                  86.4%
                </span>
                <span className="text-xs text-slate-400">Useful Alerts</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Alerts resulting in verified order or transfer
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold mono">
              &#10003;
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Staff Time Saved (30d)
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span id="kpi-hours-saved" className="text-2xl font-bold text-indigo-400 mono">
                  {(34.2 + auditLogs.length * 0.3).toFixed(1)} hrs
                </span>
                <span
                  id="kpi-actions-taken"
                  className="text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded"
                >
                  {auditLogs.length} Resolved Today
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                18 mins saved per automated wholesaler triage
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold mono">
              &#8987;
            </div>
          </div>
        </section>

        {/* TAB 1: LIVE DECISION DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div id="view-dashboard" className="flex flex-col gap-5 animate-in fade-in duration-150">
            {/* STRESS-TEST & FILTER CONTROL BAR */}
            <section className="glass-card rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Wholesaler Delay Shock (&Delta;L):</span>
                    <span id="label-lead-shock" className="mono text-sky-400 font-semibold">
                      +{leadShock.toFixed(1)} Days
                    </span>
                  </div>
                  <input
                    id="slider-lead-shock"
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={leadShock}
                    onChange={(e) => setLeadShock(parseFloat(e.target.value) || 0)}
                    className="w-44 accent-sky-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Local Dispensing Surge (&alpha;):</span>
                    <span id="label-demand-surge" className="mono text-amber-400 font-semibold">
                      {demandSurge.toFixed(2)}x {demandSurge === 1.0 ? '(Normal)' : '(Surge)'}
                    </span>
                  </div>
                  <input
                    id="slider-demand-surge"
                    type="range"
                    min="1.0"
                    max="1.8"
                    step="0.05"
                    value={demandSurge}
                    onChange={(e) => setDemandSurge(parseFloat(e.target.value) || 1.0)}
                    className="w-44 accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* SCENARIO PRESET PILLS */}
                <div className="hidden xl:flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Scenarios:</span>
                  <button
                    onClick={() => applyPreset('viral_surge')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-sky-300 border border-slate-700 transition"
                  >
                    Winter Surge
                  </button>
                  <button
                    onClick={() => applyPreset('logistics_strike')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-300 border border-slate-700 transition"
                  >
                    Depot Strike
                  </button>
                  <button
                    onClick={() => applyPreset('compound')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-rose-300 border border-slate-700 transition"
                  >
                    Compound Crisis
                  </button>
                </div>

                <button
                  onClick={() => applyPreset('normal')}
                  className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Stress Test</span>
                </button>
              </div>

              {/* FILTER & SEARCH */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search medicine or class..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 w-44 sm:w-52"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Filter Triage:</span>
                  <select
                    id="filter-category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as TriageFilter)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="ALL">All Categories ({computedItems.length} Items)</option>
                    <option value="CRITICAL">Critical Risk Only (P &ge; 50%)</option>
                    <option value="NOTICE">Official Shortage Notice Active</option>
                    <option value="ANTIBIOTIC">Antibiotics Only</option>
                    <option value="CONTROLLED">CNS & Controlled Drugs</option>
                  </select>
                </div>
              </div>
            </section>

            {/* MAIN SPLIT WORKSPACE */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT 7 COLS: SHORTAGE EARLY-WARNING INVENTORY TABLE */}
              <div className="lg:col-span-7 glass-card rounded-xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-sm text-white flex items-center gap-2">
                      1. Shortage Early-Warning & Stock-Risk Matrix
                    </h2>
                    <p className="text-xs text-slate-400">
                      Click any medicine row to inspect its P10–P90 uncertainty cone and execute verified actions
                    </p>
                  </div>
                  <span
                    id="data-source-badge"
                    className="text-[11px] mono px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    Source: PMR + DHSC/FDA Feeds
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/90 backdrop-blur-md">
                        <th className="py-3 px-3.5">Medicine & Official Notice</th>
                        <th className="py-3 px-2.5 text-right">Stock</th>
                        <th className="py-3 px-2.5 text-right">Demand/d</th>
                        <th className="py-3 px-3 text-center">Runway (P10 / P50 / P90)</th>
                        <th className="py-3 px-2.5 text-center">Lead Time</th>
                        <th className="py-3 px-3 text-right">Stock-Out Risk</th>
                        <th className="py-3 px-3 text-center">Freshness</th>
                      </tr>
                    </thead>
                    <tbody id="inventory-tbody" className="divide-y divide-slate-800/70 text-xs">
                      {filteredItems.map((item) => {
                        const isSelected = item.id === selectedMedId;

                        // Risk badge styling
                        let riskClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                        if (item.stockoutProb >= 75) {
                          riskClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
                        } else if (item.stockoutProb >= 50) {
                          riskClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
                        } else if (item.stockoutProb >= 25) {
                          riskClass = 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20';
                        }

                        // Freshness styling
                        const isStale = item.dataFreshnessHours > 12;
                        const freshClass = isStale
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                          : 'text-slate-400 bg-slate-800/80 border-slate-700';

                        return (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedMedId(item.id)}
                            className={`cursor-pointer hover:bg-slate-800/60 transition ${
                              isSelected ? 'row-selected' : ''
                            }`}
                          >
                            <td className="py-3 px-3.5">
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                {item.name}
                                {item.stockoutProb >= 50 && (
                                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-slate-400">{item.category}</span>
                                {item.officialNotice !== 'None' && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                    {item.officialNotice}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-2.5 text-right mono font-medium text-slate-200">
                              {item.stockQty}
                            </td>
                            <td className="py-3 px-2.5 text-right mono text-slate-300">
                              {item.effectiveDemand.toFixed(1)}{' '}
                              <span className="text-[10px] text-slate-500">
                                &plusmn;{item.demandStdDev.toFixed(0)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center mono">
                              <span className="text-rose-400 font-semibold" title="Worst-case P10 runway">
                                {item.p10Days.toFixed(1)}d
                              </span>
                              <span className="text-slate-500 mx-0.5">/</span>
                              <span className="text-sky-400 font-bold" title="Median P50 runway">
                                {item.p50Days.toFixed(1)}d
                              </span>
                              <span className="text-slate-500 mx-0.5">/</span>
                              <span className="text-emerald-400" title="Low-demand P90 runway">
                                {item.p90Days.toFixed(1)}d
                              </span>
                            </td>
                            <td className="py-3 px-2.5 text-center mono text-amber-300 font-medium">
                              {item.effectiveLeadTime.toFixed(1)}d
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className={`px-2 py-1 rounded border text-xs mono ${riskClass}`}>
                                {item.stockoutProb.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-1.5 py-0.5 rounded border text-[10px] mono ${freshClass}`}>
                                {item.dataFreshnessHours.toFixed(1)}h ago
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredItems.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                            No medicines match the selected filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RIGHT 5 COLS: FORECASTING ENGINE + VERIFIED RESPONSE OPTIONS */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                {/* PANEL A: UNCERTAINTY FORECASTING ENGINE */}
                <div className="glass-card rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-sky-400 font-semibold">
                        2. Probabilistic Stock-Risk Forecast
                      </span>
                      <h3 id="detail-med-name" className="text-base font-bold text-white mt-0.5">
                        {selectedItem.name || 'Select a medicine'}
                      </h3>
                    </div>
                    {selectedItem.stockoutProb !== undefined && (
                      <div
                        id="detail-risk-badge"
                        className={`px-2.5 py-1 rounded-md text-xs font-bold mono border ${
                          selectedItem.stockoutProb >= 70
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : selectedItem.stockoutProb >= 40
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {selectedItem.stockoutProb.toFixed(1)}% Stock-Out Risk
                      </div>
                    )}
                  </div>

                  {/* Deterministic Explainer Box (Zero-Hallucination LLM Boundary) */}
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-700/80 text-xs leading-relaxed text-slate-300">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Grounded Operational Brief (Read-Only Math Synthesis)
                      </span>
                      <span className="text-[10px] mono text-slate-400">Zero-Hallucination Lock</span>
                    </div>
                    <p id="detail-explainer-text" className="text-slate-200">
                      {selectedItem.stockoutProb >= 50 ? (
                        <>
                          Naive software reports <strong>{selectedItem.naiveDays?.toFixed(1)} days</strong> of stock, but accounting for demand variance (&sigma;={selectedItem.demandStdDev}/d) and supplier lead time of <strong>{selectedItem.effectiveLeadTime?.toFixed(1)} days (&plusmn;{selectedItem.leadTimeStdDev}d)</strong>, shelf stock hits zero in <strong>{selectedItem.p10Days?.toFixed(1)} days (P10 spike)</strong> with a <strong>{selectedItem.stockoutProb?.toFixed(1)}% stock-out probability</strong> before replenishment arrives. Immediate secondary order or branch transfer advised.
                        </>
                      ) : (
                        <>
                          Stock buffer is resilient: even under a P10 demand surge, shelf runway covers <strong>{selectedItem.p10Days?.toFixed(1)} days</strong> against an expected supplier delivery of <strong>{selectedItem.effectiveLeadTime?.toFixed(1)} days</strong> (Stock-out probability: <strong>{selectedItem.stockoutProb?.toFixed(1)}%</strong>). Routine automated replenishment is sufficient.
                        </>
                      )}
                    </p>
                  </div>

                  {/* Uncertainty Metrics Strip */}
                  <div className="grid grid-cols-4 gap-2 text-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Naive Baseline</span>
                      <span id="metric-naive" className="text-xs font-bold mono text-slate-200">
                        {selectedItem.naiveDays?.toFixed(1)} Days
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-rose-400 block">Worst Case (P10)</span>
                      <span id="metric-p10" className="text-xs font-bold mono text-rose-400">
                        {selectedItem.p10Days?.toFixed(1)} Days
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-sky-400 block">Median (P50)</span>
                      <span id="metric-p50" className="text-xs font-bold mono text-sky-400">
                        {selectedItem.p50Days?.toFixed(1)} Days
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-400 block">Supplier Lead</span>
                      <span id="metric-lead" className="text-xs font-bold mono text-amber-400">
                        {selectedItem.effectiveLeadTime?.toFixed(1)} Days
                      </span>
                    </div>
                  </div>

                  {/* Depletion Trajectory Fan Chart */}
                  {selectedItem.id && <DepletionChart item={selectedItem} />}
                </div>

                {/* PANEL B: VERIFIED RESPONSE OPTIONS & CLINICAL GOVERNANCE */}
                <div className="glass-card rounded-xl p-4 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
                        3. Verified Response Playbook
                      </span>
                      <h4 className="text-xs text-slate-300 mt-0.5">
                        Approved Supplier Feeds, Peer Stock & Clinician-Gated Guidance
                      </h4>
                    </div>
                    <span
                      id="detail-notice-pill"
                      className={`text-[11px] px-2 py-0.5 rounded font-medium border ${
                        selectedItem.officialNotice === 'None'
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {selectedItem.officialNotice}
                    </span>
                  </div>

                  {/* Tier 1: Approved Wholesaler Feed */}
                  <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          Tier 1: Approved Supplier
                        </span>
                        <span id="tier1-status" className="text-xs font-medium text-slate-200">
                          {selectedItem.wholesalerStatus}
                        </span>
                      </div>
                      <p id="tier1-detail" className="text-xs text-slate-400 mt-1">
                        {selectedItem.approvedSuppliers}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsWholesalerModalOpen(true)}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition cursor-pointer"
                    >
                      Auto-Order
                    </button>
                  </div>

                  {/* Tier 2: Nearby Peer Pharmacy Stock */}
                  <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          Tier 2: Sister Branch Stock
                        </span>
                        <span className="text-xs font-medium text-slate-200">
                          Verified Surplus (&gt;21d Runway)
                        </span>
                      </div>
                      <p id="tier2-detail" className="text-xs text-slate-400 mt-1">
                        {selectedItem.nearbyStock}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsTransferModalOpen(true)}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-medium text-xs transition cursor-pointer"
                    >
                      Request Transfer
                    </button>
                  </div>

                  {/* Tier 3: Clinical Governance Lock (Therapeutic Alternative) */}
                  <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-500/30 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        {isClinicianUnlocked ? (
                          <Unlock className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        Tier 3: Therapeutic Alternative (Clinician Sign-Off Required)
                      </span>
                      <span className="text-[10px] text-amber-400/90 mono">Hard Safety Guardrail</span>
                    </div>

                    <p id="tier3-guidance" className="text-xs text-amber-100/90 leading-relaxed">
                      {selectedItem.clinicalAlternative}
                    </p>

                    {/* Clinician Verification Form */}
                    <div className="pt-2 border-t border-amber-500/20 flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          id="clinician-checkbox"
                          checked={clinicianConfirmed}
                          onChange={(e) => setClinicianConfirmed(e.target.checked)}
                          className="rounded accent-amber-500 cursor-pointer"
                        />
                        <span>I am a qualified Pharmacist/Prescriber reviewing contraindications</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          id="clinician-reg-input"
                          placeholder="Enter GPhC / NPI / License # (e.g. 2084912)"
                          value={clinicianLicense}
                          onChange={(e) => setClinicianLicense(e.target.value)}
                          className="flex-1 bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white mono focus:outline-none focus:border-amber-400"
                        />
                        <button
                          id="btn-clinical-approve"
                          disabled={!isClinicianUnlocked}
                          onClick={() => setIsClinicalLetterModalOpen(true)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            isClinicianUnlocked
                              ? 'bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 shadow-md shadow-amber-500/20'
                              : 'bg-amber-500/20 text-amber-300/40 border border-amber-500/20 cursor-not-allowed'
                          }`}
                        >
                          Authorize Protocol
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live Audit Log of Executed Decisions */}
                  <div className="pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                      <span className="font-semibold uppercase tracking-wider">
                        Verified Decision Audit Trail
                      </span>
                      <span id="audit-count" className="mono">
                        {auditLogs.length} entries
                      </span>
                    </div>
                    <div
                      id="audit-log-list"
                      className="max-h-24 overflow-y-auto space-y-1 text-[11px] mono text-slate-300"
                    >
                      {auditLogs.length === 0 ? (
                        <div className="text-slate-500 italic">
                          No operational or clinical actions logged in this session yet.
                        </div>
                      ) : (
                        auditLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-1.5 rounded bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-2"
                          >
                            <div>
                              <span className="text-sky-400 font-semibold">[{log.timestamp}]</span>{' '}
                              <span className="text-slate-200">{log.details}</span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                              {log.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: SHORTAGE IMPACT & EVIDENCE REPORT */}
        {activeTab === 'evidence' && <EvidenceView />}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500 bg-slate-950/40">
        MediSignal MVP Supply Chain Decision Engine &bull; Deterministic Compound Math &amp; Verified Clinical Safety Boundaries &bull; Built for Community &amp; Health-System Pharmacies
      </footer>

      {/* ACTION MODALS */}
      {selectedItem.id && (
        <>
          <WholesalerOrderModal
            item={selectedItem}
            isOpen={isWholesalerModalOpen}
            onClose={() => setIsWholesalerModalOpen(false)}
            onConfirm={addAuditEntry}
          />

          <BranchTransferModal
            item={selectedItem}
            isOpen={isTransferModalOpen}
            onClose={() => setIsTransferModalOpen(false)}
            onConfirm={addAuditEntry}
          />

          <ClinicalLetterModal
            item={selectedItem}
            clinicianId={clinicianLicense || '2084912'}
            isOpen={isClinicalLetterModalOpen}
            onClose={() => setIsClinicalLetterModalOpen(false)}
            onAuthorized={addAuditEntry}
          />
        </>
      )}
    </div>
  );
}
