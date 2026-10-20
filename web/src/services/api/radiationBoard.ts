/**
 * 健澜科技 jlmedaios - 放射防护监控看板 API（M520）
 * 对接 BFF /api/v1/radiation/* ：
 *   /radiation/doses     患者剂量
 *   /radiation/equipment 设备巡检
 *   /radiation/personnel 个人剂量
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * 严格按后端契约使用枚举/数值/布尔。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface DoseRow {
  id: string;
  patient: string;
  examType: 'CT' | 'DR' | 'MRI' | 'CARM';
  doseMSv: number;
  dept: string;
  examDate: string;
  demo?: boolean;
}

export interface EquipmentRow {
  id: string;
  deviceName: string;
  deviceType: 'CT' | 'DR' | 'MRI' | 'CARM';
  lastInspectionAt: string;
  status: 'normal' | 'attention' | 'abnormal';
  nextInspectionDue: string;
  demo?: boolean;
}

export interface PersonnelRow {
  id: string;
  staffName: string;
  role: 'radiologist' | 'nurse' | 'technician';
  badgeId: string;
  monthlyDoseMSv: number;
  limitMSv: number;
  overLimit: boolean;
  demo?: boolean;
}

const DEMO_DOSES: DoseRow[] = [
  { id: 'do-1', patient: '张三', examType: 'CT', doseMSv: 8.5, dept: '放射科', examDate: '2026-10-20', demo: true },
  { id: 'do-2', patient: '李四', examType: 'DR', doseMSv: 1.2, dept: '放射科', examDate: '2026-10-20', demo: true },
  { id: 'do-3', patient: '王五', examType: 'CARM', doseMSv: 15.6, dept: '导管室', examDate: '2026-10-20', demo: true },
  { id: 'do-4', patient: '赵六', examType: 'MRI', doseMSv: 0.0, dept: 'MR 室', examDate: '2026-10-20', demo: true },
];

const DEMO_EQUIPMENT: EquipmentRow[] = [
  { id: 'eq-1', deviceName: 'GE LightSpeed 64', deviceType: 'CT', lastInspectionAt: '2026-09-15', status: 'normal', nextInspectionDue: '2026-12-15', demo: true },
  { id: 'eq-2', deviceName: 'Siemens Ysio', deviceType: 'DR', lastInspectionAt: '2026-08-20', status: 'attention', nextInspectionDue: '2026-11-20', demo: true },
  { id: 'eq-3', deviceName: 'Philips Allura', deviceType: 'CARM', lastInspectionAt: '2026-07-10', status: 'abnormal', nextInspectionDue: '2026-10-25', demo: true },
];

const DEMO_PERSONNEL: PersonnelRow[] = [
  { id: 'pe-1', staffName: '陈医师', role: 'radiologist', badgeId: 'B-001', monthlyDoseMSv: 0.85, limitMSv: 5, overLimit: false, demo: true },
  { id: 'pe-2', staffName: '刘技师', role: 'technician', badgeId: 'B-002', monthlyDoseMSv: 5.6, limitMSv: 5, overLimit: true, demo: true },
  { id: 'pe-3', staffName: '王护士', role: 'nurse', badgeId: 'B-003', monthlyDoseMSv: 1.2, limitMSv: 5, overLimit: false, demo: true },
];

async function safeGet<T>(url: string, fallback: T[]): Promise<{ data: T[]; demo: boolean }> {
  try {
    const res = await get<{ items?: T[] } | T[]>(url);
    const items = Array.isArray(res) ? (res as T[]) : ((res as { items?: T[] })?.items ?? []);
    if (items.length > 0) return { data: items, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchDoses = () => safeGet<DoseRow>('/radiation/doses', DEMO_DOSES);
export const fetchEquipment = () => safeGet<EquipmentRow>('/radiation/equipment', DEMO_EQUIPMENT);
export const fetchPersonnel = () => safeGet<PersonnelRow>('/radiation/personnel', DEMO_PERSONNEL);
