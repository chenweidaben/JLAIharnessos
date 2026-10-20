/**
 * 健澜科技 jlmedaios - 医疗技术临床应用管理看板 API（M498）
 * 对接 BFF /api/v1/tech/* ：
 *   /tech/catalog     技术目录
 *   /tech/authority   医师授权
 *   /tech/quality     技术质量
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface CatalogRow {
  id: string;
  name: string;
  level: 'level1' | 'level2' | 'level3';
  dept: string;
  risk: 'low' | 'medium' | 'high';
  demo?: boolean;
}

export interface AuthorityRow {
  id: string;
  doctor: string;
  dept: string;
  authLevel: 'level1' | 'level2' | 'level3' | 'level4';
  grantedAt: string;
  expiresAt: string;
  demo?: boolean;
}

export interface QualityRow {
  id: string;
  tech: string;
  cases: number;
  complicationRate: number; // %
  successRate: number; // %
  grade: 'excellent' | 'good' | 'average' | 'poor';
  demo?: boolean;
}

const DEMO_CATALOG: CatalogRow[] = [
  { id: 'c-1', name: '腹腔镜胆囊切除术', level: 'level1', dept: '普外科', risk: 'low', demo: true },
  { id: 'c-2', name: '经皮冠状动脉介入治疗（PCI）', level: 'level2', dept: '心内科', risk: 'medium', demo: true },
  { id: 'c-3', name: '心脏移植技术', level: 'level3', dept: '心外科', risk: 'high', demo: true },
  { id: 'c-4', name: '脑卒中取栓技术', level: 'level2', dept: '神经内科', risk: 'medium', demo: true },
  { id: 'c-5', name: '微创脊柱内镜手术', level: 'level1', dept: '骨科', risk: 'low', demo: true },
];

const DEMO_AUTH: AuthorityRow[] = [
  { id: 'a-1', doctor: '王**', dept: '心外科', authLevel: 'level4', grantedAt: '2024-01-15', expiresAt: '2027-01-14', demo: true },
  { id: 'a-2', doctor: '李**', dept: '心内科', authLevel: 'level3', grantedAt: '2024-03-20', expiresAt: '2027-03-19', demo: true },
  { id: 'a-3', doctor: '赵**', dept: '普外科', authLevel: 'level2', grantedAt: '2025-06-01', expiresAt: '2028-05-31', demo: true },
  { id: 'a-4', doctor: '陈**', dept: '骨科', authLevel: 'level1', grantedAt: '2025-09-10', expiresAt: '2028-09-09', demo: true },
];

const DEMO_QUALITY: QualityRow[] = [
  { id: 'q-1', tech: '腹腔镜胆囊切除术', cases: 420, complicationRate: 1.2, successRate: 99.2, grade: 'excellent', demo: true },
  { id: 'q-2', tech: 'PCI', cases: 268, complicationRate: 3.5, successRate: 96.8, grade: 'good', demo: true },
  { id: 'q-3', tech: '脑卒中取栓', cases: 86, complicationRate: 8.4, successRate: 88.4, grade: 'average', demo: true },
  { id: 'q-4', tech: '心脏移植', cases: 6, complicationRate: 16.7, successRate: 83.3, grade: 'poor', demo: true },
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

export const fetchCatalog = () => safeGet<CatalogRow>('/tech/catalog', DEMO_CATALOG);
export const fetchAuthority = () => safeGet<AuthorityRow>('/tech/authority', DEMO_AUTH);
export const fetchQuality = () => safeGet<QualityRow>('/tech/quality', DEMO_QUALITY);
