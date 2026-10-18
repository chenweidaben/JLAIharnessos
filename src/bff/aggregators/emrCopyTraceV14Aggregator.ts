/**
 * 健澜科技 jlmedaios - 病历复制痕迹保留 V14 聚合器（M463-B）
 *
 * 纯函数：构造复制痕迹记录 + 按用户/来源统计复制次数。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 复制痕迹记录 */
export interface CopyTraceV14 {
  traceId: string;
  sourceNoteId: string;
  targetNoteId: string;
  userId: string;
  copiedAt: string;
}

/** 按用户统计结果 */
export interface ByUserCountV14 {
  userId: string;
  count: number;
}

/** 按来源统计结果 */
export interface BySourceCountV14 {
  sourceNoteId: string;
  count: number;
}

/** 审计结果 */
export interface CopyTraceAuditV14 {
  total: number;
  byUser: ByUserCountV14[];
  bySource: BySourceCountV14[];
}

/**
 * 构造复制痕迹记录。
 *
 * @param sourceNoteId 源病历 ID
 * @param targetNoteId 目标病历 ID
 * @param userId 操作人 ID
 * @returns 复制痕迹记录
 */
export function recordCopy(sourceNoteId: string, targetNoteId: string, userId: string): CopyTraceV14 {
  return {
    traceId: `${sourceNoteId}->${targetNoteId}@${userId}`,
    sourceNoteId,
    targetNoteId,
    userId,
    copiedAt: new Date().toISOString(),
  };
}

/**
 * 审计复制痕迹：按用户和来源统计复制次数。
 *
 * @param traces 复制痕迹列表
 * @returns total + byUser + bySource
 */
export function auditCopyTraces(traces: CopyTraceV14[]): CopyTraceAuditV14 {
  const userMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();
  for (const trace of traces) {
    userMap.set(trace.userId, (userMap.get(trace.userId) ?? 0) + 1);
    sourceMap.set(trace.sourceNoteId, (sourceMap.get(trace.sourceNoteId) ?? 0) + 1);
  }
  const byUser: ByUserCountV14[] = Array.from(userMap.entries()).map(([userId, count]) => ({ userId, count }));
  const bySource: BySourceCountV14[] = Array.from(sourceMap.entries()).map(([sourceNoteId, count]) => ({ sourceNoteId, count }));
  return { total: traces.length, byUser, bySource };
}
