/**
 * 健澜科技 jlmedaios - AI病历质控 API（M90-A）
 *
 * 真实模式直连 BFF（baseURL 已含 /api/v1，此处路径不再重复前缀）。
 * 本服务不提供任何本地假数据；BFF/数据库不可用时由 request 层显式抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';

export interface AiNoteQcIssue {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface AiNoteQcRecord {
  id: string;
  visitId: string;
  noteType: string | null;
  issues: AiNoteQcIssue[];
  score: number | null;
  status: string;
  createdAt: string;
}

/** 触发一次质控扫描（visitId 走 query），落库并返回新建记录 */
export function scanAiNoteQc(visitId: string): Promise<AiNoteQcRecord> {
  return post<AiNoteQcRecord>(`/ai-note-qc/scan?visitId=${encodeURIComponent(visitId)}`);
}

/** 查询某就诊最新 N 条质控记录 */
export function listAiNoteQc(visitId: string): Promise<AiNoteQcRecord[]> {
  return get<AiNoteQcRecord[]>('/ai-note-qc', { visitId });
}
