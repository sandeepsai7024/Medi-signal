import React, { useState } from 'react';
import { ComputedInventoryItem, AuditEntry } from '../types';
import { X, CheckCircle, Truck, Package, FileText, AlertTriangle, Copy, ShieldCheck } from 'lucide-react';

interface WholesalerModalProps {
  item: ComputedInventoryItem;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (entry: AuditEntry) => void;
}

export const WholesalerOrderModal: React.FC<WholesalerModalProps> = ({
  item,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [packCount, setPackCount] = useState<number>(Math.max(10, Math.ceil(item.effectiveDemand * item.effectiveLeadTime * 1.5)));
  const [selectedSupplier, setSelectedSupplier] = useState<string>('AAH Pharmaceuticals');
  const [deliverySpeed, setDeliverySpeed] = useState<string>('Next-Day AM (Priority Dispatch)');

  if (!isOpen) return null;

  const unitCost = 4.85;
  const totalCost = (packCount * unitCost).toFixed(2);
  const poNumber = `PO-${Math.floor(100000 + Math.random() * 900000)}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: AuditEntry = {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      medicineId: item.id,
      medicineName: item.name,
      actionType: 'WHOLESALER_ORDER',
      details: `Ordered ${packCount} packs via ${selectedSupplier} (${deliverySpeed}, Ref: ${poNumber}, Total: $${totalCost})`,
      status: 'CONFIRMED',
    };
    onConfirm(entry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 text-slate-100">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Tier 1: Wholesaler Auto-Order</h3>
              <p className="text-xs text-slate-400">Electronic EDI Order Transmission</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/80">
            <div className="font-semibold text-slate-200 text-sm mb-1">{item.name}</div>
            <div className="flex flex-wrap items-center gap-3 text-slate-400">
              <span>Current Stock: <strong className="text-rose-400 mono">{item.stockQty} packs</strong></span>
              <span>Daily Demand: <strong className="text-slate-200 mono">{item.effectiveDemand.toFixed(1)}/d</strong></span>
              <span>Stockout Risk: <strong className="text-rose-400 mono">{item.stockoutProb.toFixed(1)}%</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Approved Supplier Feed</label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="AAH Pharmaceuticals">AAH Pharmaceuticals (Primary)</option>
                <option value="Alliance Healthcare">Alliance Healthcare (Allocation Quota)</option>
                <option value="Phoenix Healthcare">Phoenix Healthcare (Regional Depot)</option>
                <option value="Sigma Pharmaceuticals">Sigma Pharmaceuticals (Short-Line)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Order Quantity (Packs)</label>
              <input
                type="number"
                min="1"
                max="2000"
                value={packCount}
                onChange={(e) => setPackCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 mono font-semibold focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Dispatch Speed & Cutoff</label>
            <select
              value={deliverySpeed}
              onChange={(e) => setDeliverySpeed(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="Next-Day AM (Priority Dispatch)">Next-Day AM (Order before 17:30, Arrives ~08:30)</option>
              <option value="Same-Day Express Courier">Same-Day Express Courier (Cut-off 11:30, Arrives ~16:00)</option>
              <option value="Standard Scheduled Route">Standard Scheduled Delivery (48h lead)</option>
            </select>
          </div>

          <div className="p-3 rounded-lg bg-sky-950/30 border border-sky-500/30 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block">Estimated Wholesale Total</span>
              <span className="text-sm font-bold text-sky-400 mono">${totalCost} <span className="text-[10px] text-slate-400 font-normal">(@ ${unitCost}/pk)</span></span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block">Generated PO Number</span>
              <span className="text-xs font-semibold text-slate-200 mono">{poNumber}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold flex items-center gap-1.5 transition shadow-lg shadow-sky-500/20"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirm & Dispatch Order</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface BranchTransferModalProps {
  item: ComputedInventoryItem;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (entry: AuditEntry) => void;
}

export const BranchTransferModal: React.FC<BranchTransferModalProps> = ({
  item,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [transferQty, setTransferQty] = useState<number>(30);
  const [courierUrgency, setCourierUrgency] = useState<string>('Rapid Van Transfer (under 3h)');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: AuditEntry = {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      medicineId: item.id,
      medicineName: item.name,
      actionType: 'BRANCH_TRANSFER',
      details: `Transferred ${transferQty} packs from ${item.nearbyStock.split('—')[0].trim()} via ${courierUrgency}`,
      status: 'PENDING',
    };
    onConfirm(entry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 text-slate-100">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Tier 2: Inter-Branch Stock Transfer</h3>
              <p className="text-xs text-slate-400">Sister Branch Network Surplus Balancing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/30">
            <div className="text-[11px] uppercase tracking-wider text-indigo-400 font-semibold mb-1">Verified Source Branch</div>
            <div className="text-slate-200 font-medium text-sm">{item.nearbyStock}</div>
            <p className="text-slate-400 mt-1">Source branch maintains safe runway surplus above safety threshold (&gt;21 days).</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Transfer Quantity (Packs)</label>
              <input
                type="number"
                min="5"
                max="500"
                value={transferQty}
                onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 mono font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Courier Logistics</label>
              <select
                value={courierUrgency}
                onChange={(e) => setCourierUrgency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Rapid Van Transfer (under 3h)">Rapid Van Transfer (under 3h)</option>
                <option value="End-of-Day Internal Shuttle">End-of-Day Internal Shuttle (No fee)</option>
                <option value="Next Morning Regular Run">Next Morning Regular Run</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 leading-relaxed">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
              <CheckCircle className="w-4 h-4" /> Good Distribution Practice (GDP) Verified
            </div>
            <p className="text-[11px] text-slate-400">
              Electronic Stock Transfer Slip #ST-{Math.floor(10000 + Math.random() * 90000)} will be auto-synced across both PMR databases.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold flex items-center gap-1.5 transition shadow-lg shadow-indigo-500/20"
            >
              <Truck className="w-4 h-4" />
              <span>Dispatch Transfer Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ClinicalLetterModalProps {
  item: ComputedInventoryItem;
  clinicianId: string;
  isOpen: boolean;
  onClose: () => void;
  onAuthorized: (entry: AuditEntry) => void;
}

export const ClinicalLetterModal: React.FC<ClinicalLetterModalProps> = ({
  item,
  clinicianId,
  isOpen,
  onClose,
  onAuthorized,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const protocolRef = item.officialNotice.includes('SSP') ? item.officialNotice : 'SSP-088 (General Shortage Protocol)';
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const letterText = `CLINICAL SHORTAGE NOTIFICATION & PHARMACIST DISPENSING ENDORSEMENT
Date: ${dateStr}
Reference: ${protocolRef}
Prescribed Medicine: ${item.name} (${item.category})
Shortage Status: ${item.officialNotice}
Dispensing Pharmacy License/Reg: ${clinicianId}

CLINICAL TRIAGE ASSESSMENT:
Physical stock is exhausted / allocation constrained (Runway: ${item.p10Days.toFixed(1)}d worst-case vs ${item.effectiveLeadTime.toFixed(1)}d supplier lead time).
P(Stockout) during lead time exceeds safety threshold (${item.stockoutProb.toFixed(1)}%).

APPROVED CLINICAL ACTION:
${item.clinicalAlternative}

SAFETY AUDIT ENDORSEMENT:
1. Patient allergy history and known contraindications reviewed.
2. Pharmacist consultation completed regarding dosage conversion and adherence instructions.
3. Endorsement code logged on PMR electronic claim system.

Authorized by Registered Pharmacist: GPhC/License #${clinicianId}
System: MediSignal Clinical Governance Module`;

  const handleCopy = () => {
    navigator.clipboard.writeText(letterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAuthorize = () => {
    const entry: AuditEntry = {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      medicineId: item.id,
      medicineName: item.name,
      actionType: 'CLINICAL_SSP_PROTOCOL',
      details: `Authorized Clinical Protocol for ${item.name}. License: ${clinicianId}. Protocol: ${protocolRef}`,
      clinicianId,
      status: 'AUTHORIZED',
    };
    onAuthorized(entry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-amber-500/40 rounded-xl max-w-xl w-full p-5 shadow-2xl flex flex-col gap-4 text-slate-100">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Clinical SSP Protocol Authorization</h3>
              <p className="text-xs text-amber-300">Therapeutic Alternative / Prescriber Letter Generation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3 text-xs">
          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-center gap-2.5 text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              Pharmacist License <strong>#{clinicianId}</strong> is legally stamped onto this clinical audit certificate.
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-300 font-medium">
            <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-sky-400" /> Prescriber & GP Notification Record</span>
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 flex items-center gap-1 text-[11px] border border-slate-700 transition"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Letter'}</span>
            </button>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 mono text-[11px] leading-relaxed text-slate-300 max-h-56 overflow-y-auto whitespace-pre-wrap select-all">
            {letterText}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAuthorize}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Authorize Protocol & Sign Audit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
