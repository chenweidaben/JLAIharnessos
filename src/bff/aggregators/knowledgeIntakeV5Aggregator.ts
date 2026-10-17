/**
 * 健澜科技 jlmedaios - 新知识自动入库与指南更新监测 V5 纯函数（M276-B）
 *
 * extractKnowledgePointsV5 / deduplicateKnowledgeV5 / detectUpdateV5 / buildKnowledgeIntakeV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 知识条目 */
export interface KnowledgePoint {
  title: string;
  sourceType: string;
  content: string;
  dedupKey: string;
}

/** 摄入条目 */
export interface KnowledgeIntake {
  id: string;
  sourceType: string;
  title: string;
  sourceUrl: string;
  extractedPoints: KnowledgePoint[];
  status: "pending" | "approved" | "rejected";
  reviewedBy: string;
}

/**
 * 从文本抽取知识要点 V5（纯函数）：按句号/分号切分。
 *
 * @param text 原文
 * @param sourceType 来源类型
 * @returns 知识要点列表
 */
export function extractKnowledgePointsV5(text: string, sourceType: string): KnowledgePoint[] {
  const sentences = text.split(/[。；;\n]/).map((s) => s.trim()).filter((s) => s.length > 4);
  return sentences.map((s, i) => ({
    title: `要点-${i + 1}`,
    sourceType,
    content: s,
    dedupKey: s.slice(0, 32),
  }));
}

/**
 * 知识要点去重 V5（纯函数）。
 *
 * @param points 要点列表
 * @returns 去重后列表
 */
export function deduplicateKnowledgeV5(points: KnowledgePoint[]): KnowledgePoint[] {
  const seen = new Set<string>();
  const out: KnowledgePoint[] = [];
  for (const p of points) {
    if (!seen.has(p.dedupKey)) {
      seen.add(p.dedupKey);
      out.push(p);
    }
  }
  return out;
}

/**
 * 检测指南更新 V5（纯函数）：新旧版本要点差异。
 *
 * @param oldPoints 旧版要点
 * @param newPoints 新版要点
 * @returns 差异
 */
export function detectUpdateV5(oldPoints: string[], newPoints: string[]): { added: string[]; removed: string[]; changed: boolean } {
  const oldSet = new Set(oldPoints);
  const newSet = new Set(newPoints);
  const added = newPoints.filter((p) => !oldSet.has(p));
  const removed = oldPoints.filter((p) => !newSet.has(p));
  return { added, removed, changed: added.length > 0 || removed.length > 0 };
}

/** 知识入库报告输出 */
export interface KnowledgeIntakeV5Report {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  bySource: Record<string, number>;
  suggestions: string[];
}

/**
 * 构建知识入库报告（纯函数）。
 *
 * @param intakes 摄入条目
 * @returns 报告
 */
export function buildKnowledgeIntakeV5Report(intakes: KnowledgeIntake[]): KnowledgeIntakeV5Report {
  const bySource: Record<string, number> = {};
  for (const i of intakes) {
    bySource[i.sourceType] = (bySource[i.sourceType] ?? 0) + 1;
  }
  const pending = intakes.filter((i) => i.status === "pending").length;
  const approved = intakes.filter((i) => i.status === "approved").length;
  const rejected = intakes.filter((i) => i.status === "rejected").length;
  return {
    total: intakes.length,
    pending,
    approved,
    rejected,
    bySource,
    suggestions: pending > approved
      ? ["待审核知识积压，需专家加快审核发布"]
      : ["知识审核流转良好"],
  };
}
