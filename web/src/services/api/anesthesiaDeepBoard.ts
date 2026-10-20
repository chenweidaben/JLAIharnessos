/**
 * 健澜科技 jlmedaios - 手术麻醉深度监控看板 API（M517）
 * 对接 BFF /api/v1/anesthesia/* ：
 *   /anesthesia/grading   麻醉分级
 *   /anesthesia/intraop   术中安全
 *   /anesthesia/followup  术后随访
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface GradingRow {
  id: string;
  patient: string;
  surgery: string;
  asa: 'I' | 'II' | 'III' | 'IV' | 'V';
  method: 'general' | 'spinal' | 'nerveBlock' | 'local';
  demo?: boolean;
}

export interface IntraopRow {
  id: string;
  surgery: string;
  anesthetist: string;
  event: 'hypotension' | 'hypoxemia' | 'arrhythmia' | 'transfusion' | 'checkOk';
  durationMin: number;
  demo?: boolean;
}

export interface FollowupRow {
  id: string;
  patient: string;
  vas: number; // 0-10
  nauseaVomiting: boolean;
  completed: boolean;
  demo?: boolean;
}

const DEMO_GRADING: GradingRow[] = [
  { id: 'gr-1', patient: '张三', surgery: '腹腔镜胆囊切除术', asa: 'II', method: 'general', demo: true },
  { id: 'gr-2', patient: '李四', surgery: '全髋关节置换术', asa: 'III', method: 'spinal', demo: true },
  { id: 'gr-3', patient: '王五', surgery: '阑尾切除术', asa: 'I', method: 'general', demo: true },
  { id: 'gr-4', patient: '赵六', surgery: '乳腺癌根治术', asa: 'II', method: 'nerveBlock', demo: true },
];

const DEMO_INTRAOP: IntraopRow[] = [
  { id: 'io-1', surgery: '腹腔镜胆囊切除术', anesthetist: '陈医师', event: 'hypotension', durationMin: 95, demo: true },
  { id: 'io-2', surgery: '全髋关节置换术', anesthetist: '刘医师', event: 'transfusion', durationMin: 140, demo: true },
  { id: 'io-3', surgery: '阑尾切除术', anesthetist: '王医师', event: 'checkOk', durationMin: 45, demo: true },
  { id: 'io-4', surgery: '乳腺癌根治术', anesthetist: '孙医师', event: 'arrhythmia', durationMin: 180, demo: true },
];

const DEMO_FOLLOWUP: FollowupRow[] = [
  { id: 'fu-1', patient: '张三', vas: 2, nauseaVomiting: false, completed: true, demo: true },
  { id: 'fu-2', patient: '李四', vas: 5, nauseaVomiting: true, completed: true, demo: true },
  { id: 'fu-3', patient: '王五', vas: 1, nauseaVomiting: false, completed: true, demo: true },
  { id: 'fu-4', patient: '赵六', vas: 7, nauseaVomiting: false, completed: false, demo: true },
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

export const fetchGrading = () => safeGet<GradingRow>('/anesthesia/grading', DEMO_GRADING);
export const fetchIntraop = () => safeGet<IntraopRow>('/anesthesia/intraop', DEMO_INTRAOP);
export const fetchFollowup = () => safeGet<FollowupRow>('/anesthesia/followup', DEMO_FOLLOWUP);
