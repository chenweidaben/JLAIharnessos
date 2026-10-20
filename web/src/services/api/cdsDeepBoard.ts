/**
 * 健澜科技 jlmedaios - CDS 深度规则监控看板 API（M509）
 * 对接 BFF /api/v1/cds/* ：
 *   /cds/medication-review   合理用药审查
 *   /cds/lab-interpretation   检验智能解读
 *   /cds/pathway-recommend   路径推荐
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface MedReviewRow {
  id: string;
  drug: string;
  reviewType: 'interaction' | 'contraindication' | 'dose' | 'route';
  result: 'pass' | 'warning' | 'block';
  demo?: boolean;
}

export interface LabInterpretRow {
  id: string;
  item: string;
  value: string;
  flag: 'normal' | 'abnormal' | 'critical';
  suggestion: string;
  demo?: boolean;
}

export interface PathwayRow {
  id: string;
  diagnosis: string;
  pathway: string;
  match: number; // %
  dept: string;
  demo?: boolean;
}

const DEMO_MED: MedReviewRow[] = [
  { id: 'm-1', drug: '华法林 5mg', reviewType: 'interaction', result: 'warning', demo: true },
  { id: 'm-2', drug: '二甲双胍 0.5g', reviewType: 'dose', result: 'pass', demo: true },
  { id: 'm-3', drug: '布洛芬 0.3g', reviewType: 'contraindication', result: 'block', demo: true },
  { id: 'm-4', drug: '维生素 C 100mg', reviewType: 'route', result: 'pass', demo: true },
];

const DEMO_LAB: LabInterpretRow[] = [
  { id: 'l-1', item: '白细胞计数', value: '6.5 10^9/L', flag: 'normal', suggestion: '正常范围', demo: true },
  { id: 'l-2', item: '血钾', value: '5.8 mmol/L', flag: 'critical', suggestion: '危急值，建议立即复查并降钾治疗', demo: true },
  { id: 'l-3', item: '血红蛋白', value: '108 g/L', flag: 'abnormal', suggestion: '轻度贫血，建议补充铁剂', demo: true },
];

const DEMO_PATHWAY: PathwayRow[] = [
  { id: 'p-1', diagnosis: 'STEMI', pathway: '急诊 PCI 路径', match: 95.0, dept: '心内科', demo: true },
  { id: 'p-2', diagnosis: '社区获得性肺炎', pathway: 'CAP 抗菌药物路径', match: 82.0, dept: '呼吸内科', demo: true },
  { id: 'p-3', diagnosis: '2 型糖尿病', pathway: '胰岛素强化治疗路径', match: 65.0, dept: '内分泌科', demo: true },
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

export const fetchMedicationReview = () => safeGet<MedReviewRow>('/cds/medication-review', DEMO_MED);
export const fetchLabInterpretation = () => safeGet<LabInterpretRow>('/cds/lab-interpretation', DEMO_LAB);
export const fetchPathwayRecommend = () => safeGet<PathwayRow>('/cds/pathway-recommend', DEMO_PATHWAY);
