/**
 * 健澜科技 jlmedaios - M605 新标准 P15：设备管理 5 端点
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type EqCategory = 'imaging' | 'lab' | 'therapy' | 'monitoring' | 'furniture';
type MaintenanceType = 'preventive' | 'corrective' | 'inspection';

interface MaintenanceRecord {
  id: string;
  maintenanceType: MaintenanceType;
  maintenanceDate: string;
  maintenanceEngineer: string;
  cost: number;
  nextMaintenanceDate: string;
  notes: string;
}

interface EquipmentRecord {
  id: string;
  equipmentCode: string;
  equipmentName: string;
  category: EqCategory;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  department: string;
  location: string;
  warrantyExpiry: string;
  isExpired: boolean;
  isScrapped: boolean;
  scrapReason: string | null;
  scrapDate: string | null;
  maintenanceHistory: MaintenanceRecord[];
  createdAt: string;
}

const eqStore = new Map<string, EquipmentRecord>();
let eqSeq = 0;
let mtnSeq = 0;

function addEquipment(r: Omit<EquipmentRecord, 'id' | 'isExpired' | 'isScrapped' | 'scrapReason' | 'scrapDate' | 'maintenanceHistory'>): EquipmentRecord {
  eqSeq += 1;
  const today = new Date().toISOString().slice(0, 10);
  const rec: EquipmentRecord = {
    ...r,
    id: `EQP-${String(eqSeq).padStart(3, '0')}`,
    isExpired: r.warrantyExpiry < today,
    isScrapped: false,
    scrapReason: null,
    scrapDate: null,
    maintenanceHistory: [],
  };
  eqStore.set(rec.id, rec);
  return rec;
}

function seedEquipment(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const cats: EqCategory[] = ['imaging', 'lab', 'therapy', 'monitoring', 'furniture'];
  const brands = ['GE', 'Siemens', 'Philips', 'Olympus', 'Hitachi'];
  const depts = ['DEPT-INT', 'DEPT-SURG', 'DEORT', 'DEPT-PED', 'DEPT-GYN', 'DEPT-EMERG'];
  for (let i = 0; i < 40; i += 1) {
    const cat = cats[i % cats.length];
    const brand = brands[i % brands.length];
    const dept = depts[i % depts.length];
    const yearsAgo = 1 + (i % 8);
    const purchaseDate = new Date(now - yearsAgo * 365 * 86_400_000).toISOString().slice(0, 10);
    const warrantyYears = i < 8 ? yearsAgo - 1 : yearsAgo + 2;
    const warrantyExpiry = new Date(new Date(purchaseDate).getTime() + warrantyYears * 365 * 86_400_000).toISOString().slice(0, 10);
    addEquipment({
      equipmentCode: `EQ-${String(i + 1).padStart(3, '0')}`,
      equipmentName: `${brand} ${cat}-${i + 1}`,
      category: cat,
      brand,
      model: `Model-${100 + i}`,
      serialNumber: `SN${100000 + i}`,
      purchaseDate,
      purchasePrice: Math.round(50000 + (i % 20) * 25000),
      department: dept,
      location: `${dept}-Room ${100 + i}`,
      warrantyExpiry,
      createdAt: iso(i * 60),
    });
  }
  for (let i = 0; i < 5; i += 1) {
    const rec = Array.from(eqStore.values())[i * 7];
    if (rec) {
      mtnSeq += 1;
      rec.maintenanceHistory.push({
        id: `MTN-${String(mtnSeq).padStart(3, '0')}`,
        maintenanceType: 'preventive',
        maintenanceDate: iso(i * 1440),
        maintenanceEngineer: 'engineer01',
        cost: 2000 + i * 500,
        nextMaintenanceDate: new Date(now + 30 * 86_400_000).toISOString().slice(0, 10),
        notes: '例行保养',
      });
    }
  }
}

seedEquipment();

async function handleEquipmentList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const category = (c.query.get('category') ?? '').trim();
  const deptCode = (c.query.get('deptCode') ?? '').trim();
  let items = Array.from(eqStore.values());
  if (category) items = items.filter((r) => r.category === category);
  if (deptCode) items = items.filter((r) => r.department === deptCode);
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(ok({ items, totalCount: items.length }), 200);
}

async function handleEquipmentCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  let body: Record<string, unknown> | null = null;
  try { body = await c.body<Record<string, unknown>>(); } catch { body = null; }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);
  const sn = typeof body.serialNumber === 'string' ? body.serialNumber : '';
  const dup = Array.from(eqStore.values()).find((r) => r.serialNumber === sn);
  if (dup) return json({ code: 409, message: 'serial_number_duplicate' }, 409);
  const rec = addEquipment({
    equipmentCode: typeof body.equipmentCode === 'string' ? body.equipmentCode : '',
    equipmentName: typeof body.equipmentName === 'string' ? body.equipmentName : '',
    category: (typeof body.category === 'string' ? body.category : 'furniture') as EqCategory,
    brand: typeof body.brand === 'string' ? body.brand : '',
    model: typeof body.model === 'string' ? body.model : '',
    serialNumber: sn,
    purchaseDate: typeof body.purchaseDate === 'string' ? body.purchaseDate : '',
    purchasePrice: Number(body.purchasePrice || 0),
    department: typeof body.department === 'string' ? body.department : '',
    location: typeof body.location === 'string' ? body.location : '',
    warrantyExpiry: typeof body.warrantyExpiry === 'string' ? body.warrantyExpiry : '',
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

async function handleEquipmentMaintenance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = eqStore.get(id);
  if (!rec) return json({ code: 404, message: 'not_found' }, 404);
  let body: Record<string, unknown> | null = null;
  try { body = await c.body<Record<string, unknown>>(); } catch { body = null; }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);
  const date = typeof body.maintenanceDate === 'string' ? body.maintenanceDate : '';
  const dup = rec.maintenanceHistory.find((m) => m.maintenanceDate === date);
  if (dup) return json({ code: 409, message: 'already_maintained_today' }, 409);
  mtnSeq += 1;
  const mtn: MaintenanceRecord = {
    id: `MTN-${String(mtnSeq).padStart(3, '0')}`,
    maintenanceType: (typeof body.maintenanceType === 'string' ? body.maintenanceType : 'preventive') as MaintenanceType,
    maintenanceDate: date,
    maintenanceEngineer: typeof body.maintenanceEngineer === 'string' ? body.maintenanceEngineer : '',
    cost: Number(body.cost || 0),
    nextMaintenanceDate: typeof body.nextMaintenanceDate === 'string' ? body.nextMaintenanceDate : '',
    notes: typeof body.notes === 'string' ? body.notes : '',
  };
  rec.maintenanceHistory.push(mtn);
  return json(ok(mtn), 200);
}

async function handleMaintenanceHistory(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = eqStore.get(id);
  if (!rec) return json({ code: 404, message: 'not_found' }, 404);
  return json(ok({
    equipmentId: rec.id,
    equipmentName: rec.equipmentName,
    history: [...rec.maintenanceHistory].sort((a, b) => b.maintenanceDate.localeCompare(a.maintenanceDate)),
    totalCount: rec.maintenanceHistory.length,
  }), 200);
}

async function handleEquipmentScrap(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = eqStore.get(id);
  if (!rec) return json({ code: 404, message: 'not_found' }, 404);
  if (rec.isScrapped) return json({ code: 409, message: 'already_scrapped' }, 409);
  let body: Record<string, unknown> | null = null;
  try { body = await c.body<Record<string, unknown>>(); } catch { body = null; }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);
  rec.isScrapped = true;
  rec.scrapReason = typeof body.scrapReason === 'string' ? body.scrapReason : '';
  rec.scrapDate = new Date().toISOString().slice(0, 10);
  return json(ok(rec), 200);
}

async function handleEquipmentStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = Array.from(eqStore.values());
  const byCat = new Map<EqCategory, number>();
  let expired = 0;
  let scrapped = 0;
  let pendingMtn = 0;
  for (const r of items) {
    byCat.set(r.category, (byCat.get(r.category) || 0) + 1);
    if (r.isExpired) expired += 1;
    if (r.isScrapped) scrapped += 1;
    if (r.maintenanceHistory.length > 0) pendingMtn += 1;
  }
  return json(ok({
    total: items.length,
    byCategory: Array.from(byCat.entries()).map(([category, count]) => ({ category, count })),
    expiredCount: expired,
    scrappedCount: scrapped,
    pendingMaintenanceCount: pendingMtn,
  }), 200);
}

export const m605Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/equipment', handle: handleEquipmentList, auth: true },
  { method: 'POST', path: '/api/v1/equipment', handle: handleEquipmentCreate, auth: true },
  { method: 'POST', path: '/api/v1/equipment/:id/maintenance', handle: handleEquipmentMaintenance, auth: true },
  { method: 'GET', path: '/api/v1/equipment/:id/maintenance-history', handle: handleMaintenanceHistory, auth: true },
  { method: 'POST', path: '/api/v1/equipment/:id/scrap', handle: handleEquipmentScrap, auth: true },
  { method: 'GET', path: '/api/v1/equipment/stats', handle: handleEquipmentStats, auth: true },
];
