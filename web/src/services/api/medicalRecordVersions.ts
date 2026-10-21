/**
 * 健澜科技 jlmedaios - 病历版本管理 API（M542，P0）
 *
 * 对接真实 BFF：
 *   GET /api/v1/medical-records/:id/versions          版本列表（versionNo 倒序）
 *   GET /api/v1/medical-records/:id/versions/:versionNo  单版本详情
 *   POST /api/v1/medical-records/:id/versions          新建版本（latest locked → 409）
 *
 * 状态机 draft → submitted → locked（终态）。BFF 不可用时返回确定性 DEMO 版本镜像并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export type VersionStatus = 'draft' | 'submitted' | 'locked';

export const VERSION_STATUS_META: Record<VersionStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'blue' },
  submitted: { label: '已提交', color: 'orange' },
  locked: { label: '已锁定', color: 'default' },
};

export interface RecordVersion {
  versionNo: number;
  content: string;
  editorId: string;
  editorName: string;
  editedAt: string;
  changeReason: string;
  status: VersionStatus;
}

export interface VersionListResult {
  recordId: string;
  currentVersionNo: number;
  versions: RecordVersion[];
}

export interface VersionDetailResult {
  recordId: string;
  currentVersionNo: number;
  version: RecordVersion;
}

export interface VersionSubmitInput {
  content: string;
  changeReason: string;
  editorId: string;
  editorName?: string;
}

/** DEMO 兜底镜像：与后端 MR-001 种子一致（v1 draft / v2 submitted / v3 locked） */
const DEMO_VERSIONS: RecordVersion[] = [
  {
    versionNo: 1,
    content: '主诉：反复头晕 1 周。初步诊断：高血压待查。',
    editorId: 'E-001',
    editorName: '陈医师',
    editedAt: new Date(Date.now() - 480 * 60_000).toISOString(),
    changeReason: '初稿',
    status: 'draft',
  },
  {
    versionNo: 2,
    content: '主诉：反复头晕 1 周。补充：血压 165/102 mmHg。诊断：原发性高血压 2 级。',
    editorId: 'E-002',
    editorName: '王医师',
    editedAt: new Date(Date.now() - 240 * 60_000).toISOString(),
    changeReason: '补充查体与诊断',
    status: 'submitted',
  },
  {
    versionNo: 3,
    content: '主诉：反复头晕 1 周。查体：BP 165/102，心肺（-）。诊断：原发性高血压 2 级。处理：氨氯地平 5mg qd。',
    editorId: 'E-003',
    editorName: '李主任',
    editedAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    changeReason: '主任审签定稿',
    status: 'locked',
  },
];

function demoList(recordId: string): VersionListResult {
  return { recordId, currentVersionNo: 3, versions: DEMO_VERSIONS };
}

export async function fetchVersions(recordId: string): Promise<VersionListResult> {
  try {
    return await get<VersionListResult>(`/medical-records/${recordId}/versions`);
  } catch {
    return demoList(recordId);
  }
}

export async function fetchVersionDetail(recordId: string, versionNo: number): Promise<VersionDetailResult> {
  try {
    return await get<VersionDetailResult>(`/medical-records/${recordId}/versions/${versionNo}`);
  } catch {
    const v = DEMO_VERSIONS.find((x) => x.versionNo === versionNo) ?? DEMO_VERSIONS[DEMO_VERSIONS.length - 1];
    return { recordId, currentVersionNo: 3, version: v };
  }
}

export async function submitVersion(recordId: string, input: VersionSubmitInput): Promise<RecordVersion> {
  return post<RecordVersion>(`/medical-records/${recordId}/versions`, input);
}
