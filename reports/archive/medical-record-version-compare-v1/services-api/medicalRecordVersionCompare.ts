/**
 * 健澜科技 jlmedaios - 病历版本对比 API（M615，P0）
 *
 * 复用 M542 后端：GET /api/v1/medical-records/:recordId/versions
 * 与 GET /api/v1/medical-records/:recordId/versions/:versionNo。
 * 前端在内存中对两版本 content 做结构化行级 diff（不引入 diff 库依赖）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';
import { fetchVersionDetail, type RecordVersion } from './medicalRecordVersions';

export interface VersionDiffRow {
  key: string;
  kind: 'same' | 'removed' | 'added' | 'modified';
  left: string;
  right: string;
}

/**
 * 行级 diff：按行拆分 content，逐行对齐（相同行标记 same；左侧缺失行 added、右侧缺失行 removed；
 * 同序但内容不同 modified）。实现 O(n+m) 有序对齐，不做 LCS，保证零依赖。
 */
export function diffVersions(left: RecordVersion, right: RecordVersion): VersionDiffRow[] {
  const leftLines = left.content.split('\n').filter(Boolean);
  const rightLines = right.content.split('\n').filter(Boolean);
  const rows: VersionDiffRow[] = [];
  const max = Math.max(leftLines.length, rightLines.length);
  for (let i = 0; i < max; i += 1) {
    const l = leftLines[i];
    const r = rightLines[i];
    if (l === undefined) rows.push({ key: `a-${i}`, kind: 'added', left: '', right: r ?? '' });
    else if (r === undefined) rows.push({ key: `r-${i}`, kind: 'removed', left: l, right: '' });
    else if (l === r) rows.push({ key: `s-${i}`, kind: 'same', left: l, right: r });
    else rows.push({ key: `m-${i}`, kind: 'modified', left: l, right: r });
  }
  return rows;
}

export async function loadVersionsForCompare(recordId: string): Promise<RecordVersion[]> {
  try {
    const res = await get<{ versions: RecordVersion[] }>(`/medical-records/${recordId}/versions`);
    return res.versions;
  } catch {
    const v1 = await fetchVersionDetail(recordId, 1);
    const v2 = await fetchVersionDetail(recordId, 2);
    const v3 = await fetchVersionDetail(recordId, 3);
    return [v1.version, v2.version, v3.version];
  }
}

export { fetchVersionDetail };
