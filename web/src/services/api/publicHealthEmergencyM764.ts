/**
 * 健澜科技 jlmedaios - 突发公共卫生事件应急 API（M764）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type EmergencyLevel = 'I' | 'II' | 'III' | 'IV';
export type EmergencyStatus = 'detected' | 'responding' | 'contained' | 'closed';

export interface PublicHealthEmergency {
  id: string;
  eventNo: string;
  name: string;
  level: EmergencyLevel;
  occurredAt: string;
  status: EmergencyStatus;
  process: string;
  response: string;
  measures: string;
  summary: string;
}

export const EM_LEVEL_META: Record<EmergencyLevel, { label: string; color: string }> = {
  I: { label: '特别重大（I 级）', color: 'red' },
  II: { label: '重大（II 级）', color: 'volcano' },
  III: { label: '较大（III 级）', color: 'orange' },
  IV: { label: '一般（IV 级）', color: 'blue' },
};

export const EM_STATUS_META: Record<EmergencyStatus, { label: string; color: string }> = {
  detected: { label: '已发现', color: 'orange' },
  responding: { label: '响应中', color: 'processing' },
  contained: { label: '已控制', color: 'blue' },
  closed: { label: '已结束', color: 'green' },
};

const DEMO: PublicHealthEmergency[] = [
  {
    id: 'PE-001',
    eventNo: 'EM-261001',
    name: '某科室诺如病毒感染聚集性疫情',
    level: 'III',
    occurredAt: '2026-10-18',
    status: 'contained',
    process: '某病区 24h 内出现 5 例呕吐腹泻病例，诺如病毒核酸阳性。',
    response: '启动 III 级响应，院感科 + 疾控中心联合处置。',
    measures: '封闭管理 3 天、环境终末消毒、健康监测 7 天。',
    summary: '3 日后无新增病例，疫情已控制。',
  },
];

export interface EmergListResult {
  items: PublicHealthEmergency[];
  demo: boolean;
}

export async function fetchPublicHealthEmergencies(): Promise<EmergListResult> {
  try {
    const res = await get<{ items: PublicHealthEmergency[] }>('/public-health/emergencies');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
