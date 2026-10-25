/**
 * Sentinel 审批网关与草稿去重（契约 §8）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 三态决策：approved / duplicate / rejected。
 * - 同线程同哈希已审批 -> duplicate，返回既有草稿，不重复审批、不重复落库；
 * - 缺证据、安全等级 acute、违背红线（未强制医师复核 / 院外处方 / 非待复核态）-> rejected；
 * - 其余 approved，并把 draftHash -> draftId 写入审批表供后续去重。
 */

import { computeDraftHash } from '../draftHash';
import type { ConsultDraft, SafetyLevel } from '../types';

/** 哨兵决策结果 */
export interface SentinelDecision {
  decision: 'approved' | 'duplicate' | 'rejected';
  draftHash: string;
  reason?: string;
  existingDraftId?: string;
}

/** 审批上下文选项：可传入当前线程安全等级，急症草稿一律驳回 */
export interface SentinelApproveOptions {
  safetyLevel?: SafetyLevel;
}

/**
 * 审批 AI 草稿
 *
 * @param draft 待审批草稿
 * @param approvedHashes 已审批哈希表：draftHash -> draftId（approved 时由本函数写入）
 * @param options 审批上下文（安全等级等）
 */
export function approveDraft(
  draft: ConsultDraft,
  approvedHashes: Map<string, string>,
  options: SentinelApproveOptions = {},
): SentinelDecision {
  const draftHash = computeDraftHash(draft);

  // 红线校验：AI 草稿必须待医师复核、不得为院外处方、状态恒为 pending_review
  if (draft.needsPhysicianReview !== true) {
    return { decision: 'rejected', draftHash, reason: '红线驳回：AI 草稿必须标记需执业医师复核。' };
  }
  if (draft.isOutOfHospitalPrescription !== false) {
    return { decision: 'rejected', draftHash, reason: '红线驳回：AI 不得开具院外处方。' };
  }
  if (draft.status !== 'pending_review') {
    return {
      decision: 'rejected',
      draftHash,
      reason: '红线驳回：AI 草稿状态必须为 pending_review。',
    };
  }
  if (!draft.evidence || draft.evidence.length === 0) {
    return { decision: 'rejected', draftHash, reason: '缺少证据支撑，不予审批。' };
  }
  if (options.safetyLevel === 'acute') {
    return { decision: 'rejected', draftHash, reason: '急症旁路状态下不产出草稿。' };
  }

  const existingDraftId = approvedHashes.get(draftHash);
  if (existingDraftId) {
    return {
      decision: 'duplicate',
      draftHash,
      existingDraftId,
      reason: '同一业务草稿已审批，不重复落库。',
    };
  }

  approvedHashes.set(draftHash, draft.id);
  return { decision: 'approved', draftHash, reason: '草稿通过哨兵校验，待执业医师 / 药师复核。' };
}
