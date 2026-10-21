/**
 * 健澜科技 jlmedaios - 病历版本对比 v2 API（M628，P0 合规）
 *
 * 复用 M542 后端 GET /api/v1/medical-records/:recordId/versions
 *   真实响应：{ recordId, currentVersionNo, versions: RecordVersion[] }。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';
import type { RecordVersion } from './medicalRecordVersions';

export type { RecordVersion };

export interface VersionCompareRow {
  field: string;
  left: string;
  right: string;
  same: boolean;
}

export async function fetchVersionsForCompare(recordId: string): Promise<{ versions: RecordVersion[]; demo: boolean }> {
  try {
    const res = await get<{ versions: RecordVersion[] }>(`/medical-records/${recordId}/versions`);
    return { versions: res.versions ?? [], demo: false };
  } catch {
    return { versions: [], demo: true };
  }
}

/** 结构化字段对比 */
export function diffStructured(left: RecordVersion | null, right: RecordVersion | null): VersionCompareRow[] {
  if (!left || !right) return [];
  const cells: Array<[string, string, string]> = [
    ['版本号', `v${left.versionNo}`, `v${right.versionNo}`],
    ['提交人', left.editorName, right.editorName],
    ['提交时间', left.editedAt, right.editedAt],
    ['状态', left.status, right.status],
    ['变更说明', left.changeReason, right.changeReason],
    ['正文长度', `${left.content?.length ?? 0} 字`, `${right.content?.length ?? 0} 字`],
  ];
  return cells.map(([field, a, b]) => ({ field, left: a, right: b, same: a === b }));
}
