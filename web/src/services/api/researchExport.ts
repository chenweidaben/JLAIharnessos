/**
 * 健澜科技 jlmedaios - 科研专病队列导出 API 服务
 *
 * 对接 BFF GET /api/v1/research/export（登录态）：
 *  - previewCohort：按纳排条件取队列表格预览（JSON）；
 *  - downloadCohortCsv：以 blob 方式拉取 CSV，携带 Bearer 令牌后触发浏览器下载。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import instance, { get } from '../request';
import { downloadBlob } from '@/utils/download';

/** 纳排筛选条件（与 BFF 一致，均可选） */
export interface CohortExportFilters {
  disease?: string;
  gender?: string;
  minAge?: number | undefined;
  maxAge?: number | undefined;
  minLos?: number | undefined;
  department?: string;
}

/** 队列预览行 */
export interface CohortExportRow {
  patientId: string;
  name: string;
  gender: string;
  age: number;
  department: string;
  primaryDx: string;
  icd: string;
  losDays: number;
  lastVisit: string;
  demo?: boolean;
}

const BASE = '/research/export';

/** 把筛选条件序列化为 query（跳过空值） */
function toQuery(f: CohortExportFilters): Record<string, string> {
  const q: Record<string, string> = {};
  if (f.disease) q.disease = f.disease;
  if (f.gender) q.gender = f.gender;
  if (typeof f.minAge === 'number') q.minAge = String(f.minAge);
  if (typeof f.maxAge === 'number') q.maxAge = String(f.maxAge);
  if (typeof f.minLos === 'number') q.minLos = String(f.minLos);
  if (f.department) q.department = f.department;
  return q;
}

/** 纳排预览（JSON）：表格展示命中队列 */
export function previewCohort(filters: CohortExportFilters): Promise<CohortExportRow[]> {
  // BFF 导出端点直接返回 CSV；预览此处走同源聚合，以 JSON 信封回传行。
  // 为避免在前端重复 CSV 解析，预览直接消费纯聚合层镜像（GET 返回 JSON 信封）。
  return get<CohortExportRow[]>(`${BASE}/preview`, toQuery(filters));
}

/** 触发浏览器下载 CSV（携带令牌，blob 落盘） */
export async function downloadCohortCsv(
  filters: CohortExportFilters,
  filename = 'cohort-export.csv',
): Promise<void> {
  const res = await instance.get<Blob>(BASE, {
    params: toQuery(filters),
    responseType: 'blob',
  });
  downloadBlob(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }), filename);
}
