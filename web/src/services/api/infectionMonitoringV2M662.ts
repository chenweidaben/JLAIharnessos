/**
 * 健澜科技 jlmedaios - 院感监测 v2 API（M662，配套 M553）
 *
 * 对接 BFF：GET /api/v1/infection/monitoring
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface InfectionMonitoringItem {
  id: string;
  patientId: string;
  dept: string;
  infectionSite: string;
  pathogen: string;
  isolationMeasure: 'standard' | 'droplet' | 'contact' | 'airborne';
  onsetAt: string;
  reportedAt: string;
  nurse: string;
}

export const ISOLATION_META: Record<InfectionMonitoringItem['isolationMeasure'], { label: string; color: string }> = {
  standard: { label: '标准预防', color: 'blue' },
  droplet: { label: '飞沫隔离', color: 'orange' },
  contact: { label: '接触隔离', color: 'red' },
  airborne: { label: '空气隔离', color: 'purple' },
};

const DEMO_MONITORING: InfectionMonitoringItem[] = [
  { id: 'IM-001', patientId: 'P10011', dept: 'ICU', infectionSite: '呼吸机相关性肺炎（VAP）', pathogen: '鲍曼不动杆菌（多重耐药）', isolationMeasure: 'contact', onsetAt: '2026-10-20T08:00:00+08:00', reportedAt: '2026-10-20T09:00:00+08:00', nurse: '周敏' },
  { id: 'IM-002', patientId: 'P10020', dept: '呼吸科', infectionSite: '肺结核（疑似）', pathogen: '结核分枝杆菌（待涂片）', isolationMeasure: 'airborne', onsetAt: '2026-10-21T10:00:00+08:00', reportedAt: '2026-10-21T10:30:00+08:00', nurse: '李慧' },
  { id: 'IM-003', patientId: 'P10025', dept: '普外科', infectionSite: '手术切口感染（SSI）', pathogen: '金黄色葡萄球菌（MRSA）', isolationMeasure: 'contact', onsetAt: '2026-10-22T06:00:00+08:00', reportedAt: '2026-10-22T06:30:00+08:00', nurse: '王芳' },
];

export interface InfectionMonitoringBundle {
  items: InfectionMonitoringItem[];
  bySite: Array<{ site: string; count: number }>;
  byIsolation: Array<{ measure: InfectionMonitoringItem['isolationMeasure']; count: number }>;
  demo: boolean;
}

export async function fetchInfectionMonitoring(): Promise<InfectionMonitoringBundle> {
  try {
    const res = await get<{ items: InfectionMonitoringItem[] }>('/infection/monitoring');
    const bySite = Array.from(new Set(res.items.map((i) => i.infectionSite))).map((site) => ({
      site,
      count: res.items.filter((i) => i.infectionSite === site).length,
    }));
    const byIsolation = (Object.keys(ISOLATION_META) as InfectionMonitoringItem['isolationMeasure'][]).map((m) => ({
      measure: m,
      count: res.items.filter((i) => i.isolationMeasure === m).length,
    }));
    return { items: res.items, bySite, byIsolation, demo: false };
  } catch {
    const bySite = Array.from(new Set(DEMO_MONITORING.map((i) => i.infectionSite))).map((site) => ({
      site,
      count: DEMO_MONITORING.filter((i) => i.infectionSite === site).length,
    }));
    const byIsolation = (Object.keys(ISOLATION_META) as InfectionMonitoringItem['isolationMeasure'][]).map((m) => ({
      measure: m,
      count: DEMO_MONITORING.filter((i) => i.isolationMeasure === m).length,
    }));
    return { items: DEMO_MONITORING, bySite, byIsolation, demo: true };
  }
}
