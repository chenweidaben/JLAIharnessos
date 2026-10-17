/**
 * 健澜科技 jlmedaios - 失败案例回灌学习飞轮 V5 纯函数（M275-C）
 *
 * extractLessonV5 / backtrackToKnowledgeV5 / verifyLearningV5 / buildFailureFlywheelV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 不良事件 */
export interface AdverseEvent {
  id: string;
  eventType: string;
  caseRef: string;
  description: string;
  severity: "mild" | "moderate" | "severe";
}

/** 回灌条目 */
export interface FeedbackLoop {
  eventType: string;
  caseRef: string;
  rootCause: string;
  actionItem: string;
  knowledgeArtifact: string;
  ruleId: string;
  verifiedBy: string;
  verified: boolean;
}

/**
 * 从不良事件抽取教训 V5（纯函数）。
 *
 * @param event 不良事件
 * @returns 教训与根因
 */
export function extractLessonV5(event: AdverseEvent): { rootCause: string; lesson: string; severity: string } {
  let rootCause = "流程疏漏";
  let lesson = "加强流程培训与复核";
  if (event.eventType.includes("药物") || event.eventType.includes("用药")) {
    rootCause = "用药核对疏漏";
    lesson = "执行三查七对，药师前置审方";
  } else if (event.eventType.includes("跌倒")) {
    rootCause = "风险评估不足";
    lesson = "入院Morse评分，高风险床旁警示";
  }
  return { rootCause, lesson, severity: event.severity };
}

/**
 * 回灌到知识库 V5（纯函数）。
 *
 * @param lesson 抽取的教训
 * @returns 知识条目与规则ID
 */
export function backtrackToKnowledgeV5(lesson: { rootCause: string; lesson: string }): { knowledgeArtifact: string; ruleId: string } {
  const knowledgeArtifact = `【知识条目】${lesson.rootCause}：${lesson.lesson}`;
  const ruleId = `rule-${Date.now()}`;
  return { knowledgeArtifact, ruleId };
}

/**
 * 验证学习 V5（纯函数）。
 *
 * @param loop 回灌条目
 * @param verifier 验证人
 * @returns 验证结果
 */
export function verifyLearningV5(loop: FeedbackLoop, verifier: string): { verified: boolean; verifier: string; passed: boolean } {
  const passed = verifier.length > 0 && loop.actionItem.length > 0;
  return { verified: passed, verifier, passed };
}

/** 学习飞轮报告输出 */
export interface FailureFlywheelV5Report {
  totalEvents: number;
  byType: Record<string, number>;
  verifiedCount: number;
  pendingCount: number;
  verifiedRate: number;
  suggestions: string[];
}

/**
 * 构建学习飞轮报告（纯函数）。
 *
 * @param loops 回灌条目列表
 * @returns 报告
 */
export function buildFailureFlywheelV5Report(loops: FeedbackLoop[]): FailureFlywheelV5Report {
  const byType: Record<string, number> = {};
  for (const l of loops) {
    byType[l.eventType] = (byType[l.eventType] ?? 0) + 1;
  }
  const verifiedCount = loops.filter((l) => l.verified).length;
  const pendingCount = loops.length - verifiedCount;
  const verifiedRate = loops.length > 0 ? Math.round((verifiedCount / loops.length) * 1000) / 10 : 0;
  return {
    totalEvents: loops.length,
    byType,
    verifiedCount,
    pendingCount,
    verifiedRate,
    suggestions: verifiedRate < 80
      ? ["加快未验证条目的专家复核"]
      : ["知识已验证，纳入预警规则上线"],
  };
}
