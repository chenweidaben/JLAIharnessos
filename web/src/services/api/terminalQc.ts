/**
 * 健澜科技 jlmedaios - 病历终末质控评分 API（M90-B）
 *
 * 真实模式直连 BFF（baseURL 已含 /api/v1，此处路径不再重复前缀）。
 * 本服务不提供任何本地假数据；BFF/数据库不可用时由 request 层显式抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';

export interface TerminalQcIssue {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export type TerminalGrade = '甲级' | '乙级' | '丙级';

export interface TerminalQcRecord {
  id: string;
  visitId: string;
  grade: TerminalGrade | null;
  score: number | null;
  issues: TerminalQcIssue[];
  createdAt: string;
}

/** 触发一次终末质控评分（visitId 走 query），落库并返回新建记录 */
export function scanTerminalQc(visitId: string): Promise<TerminalQcRecord> {
  return post<TerminalQcRecord>(`/terminal-qc/scan?visitId=${encodeURIComponent(visitId)}`);
}

/** 查询某就诊历史终末质控记录 */
export function listTerminalQc(visitId: string): Promise<TerminalQcRecord[]> {
  return get<TerminalQcRecord[]>('/terminal-qc', { visitId });
}
