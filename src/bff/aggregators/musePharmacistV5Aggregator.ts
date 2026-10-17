/**
 * 健澜科技 jlmedaios - 药师 MUSE 工作台 V5 纯函数（M283-C）
 *
 * buildPharmacistDailyV5 / flagInteractionV5 / prioritizeReviewV5 / buildMusePharmacistV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 处方 */
export interface Prescription {
  rxId: string;
  patientId: string;
  drugs: string[];
  urgency: number;
  isPediatric: boolean;
  isElderly: boolean;
}

/** 相互作用标记 */
export interface InteractionFlag {
  rxId: string;
  hasInteraction: boolean;
  interactingPair: string[];
}

/**
 * 药物相互作用检测 V5（纯函数）：常见相互作用对黑名单。
 *
 * @param rx 处方
 * @returns 标记结果
 */
export function flagInteractionV5(rx: Prescription): InteractionFlag {
  const pairs: [string, string][] = [
    ["华法林", "阿司匹林"],
    ["他汀", "红霉素"],
  ];
  for (const [a, b] of pairs) {
    if (rx.drugs.includes(a) && rx.drugs.includes(b)) {
      return { rxId: rx.rxId, hasInteraction: true, interactingPair: [a, b] };
    }
  }
  return { rxId: rx.rxId, hasInteraction: false, interactingPair: [] };
}

/**
 * 审方优先级 V5（纯函数）：相互作用/儿童/老年/高紧急者优先。
 *
 * @param queue 处方队列
 * @returns 排序后队列
 */
export function prioritizeReviewV5(queue: Prescription[]): Prescription[] {
  const score = (rx: Prescription): number => {
    let s = rx.urgency;
    if (flagInteractionV5(rx).hasInteraction) s += 50;
    if (rx.isPediatric) s += 20;
    if (rx.isElderly) s += 15;
    return s;
  };
  return [...queue].sort((a, b) => score(b) - score(a));
}

/**
 * 药师日工作台 V5（纯函数）。
 *
 * @param pharmId 药师ID
 * @param queue 处方队列
 * @returns 工作台摘要
 */
export function buildPharmacistDailyV5(
  pharmId: string,
  queue: Prescription[],
): { pharmId: string; pendingCount: number; interactionCount: number; pediatricCount: number } {
  const interactionCount = queue.filter((rx) => flagInteractionV5(rx).hasInteraction).length;
  const pediatricCount = queue.filter((rx) => rx.isPediatric).length;
  return {
    pharmId,
    pendingCount: queue.length,
    interactionCount,
    pediatricCount,
  };
}

/** 药师看板输出 */
export interface MusePharmacistV5Report {
  totalPharm: number;
  avgInteractionPerPharm: number;
}

/**
 * 构建药师看板（纯函数）。
 *
 * @param summaries 各药师摘要
 * @returns 看板
 */
export function buildMusePharmacistV5Report(summaries: { interactionCount: number }[]): MusePharmacistV5Report {
  const avgInteractionPerPharm = summaries.length > 0
    ? Math.round((summaries.reduce((s, x) => s + x.interactionCount, 0) / summaries.length) * 10) / 10
    : 0;
  return { totalPharm: summaries.length, avgInteractionPerPharm };
}
