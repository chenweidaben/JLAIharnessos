/**
 * 健澜科技 jlmedaios - Personal Agent 2.0 V5 纯函数（M257-B）
 *
 * buildPersonalAgentV5Report / buildAgentTaskV5 / learnFromExperienceV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 构建 Agent 任务 V5（纯函数）。
 *
 * @param role 角色
 * @param context 上下文
 * @returns 任务
 */
export function buildAgentTaskV5(role: string, context: { patient: string; urgency: string }): { role: string; task: string; priority: number; proactive: boolean } {
  let task = "常规服务";
  let priority = 2;
  let proactive = false;
  if (role === "DoctorMUSE") {
    task = context.urgency === "high" ? "主动鉴别诊断+用药建议" : "病历生成+医嘱推荐";
    proactive = true;
  } else if (role === "NurseMUSE") {
    task = context.urgency === "high" ? "主动风险预警+巡视提醒" : "护理计划+记录辅助";
    proactive = true;
  } else if (role === "PatientMUSE") {
    task = "报告解读+用药提醒+随访";
    proactive = true;
  }
  if (context.urgency === "high") priority = 1;
  return { role, task, priority, proactive };
}

/**
 * 从经验学习 V5（纯函数）。
 *
 * @param interaction 交互
 * @param outcome 结果
 * @returns 学习
 */
export function learnFromExperienceV5(interaction: { type: string }, outcome: { success: boolean; feedback: number }): { experience: string; score: number; successorCanUse: boolean } {
  let experience = "常规经验";
  let score = 50;
  if (outcome.success) {
    experience = `成功经验: ${interaction.type}`;
    score = Math.round(60 + outcome.feedback * 0.4);
  } else {
    experience = `失败复盘: ${interaction.type}`;
    score = Math.round(30 + outcome.feedback * 0.2);
  }
  return { experience, score, successorCanUse: score >= 60 };
}

/** Personal Agent 2.0 V5 报告输出 */
export interface PersonalAgentV5Report {
  timeRange: string;
  doctorMUSE: { orderRecommend: number; noteGenerate: number; differentialDx: number; medicationAdvice: number; researchAssistant: number; proactiveService: number };
  nurseMUSE: { carePlan: number; roundingReminder: number; riskAlert: number; noteRecord: number; handover: number; proactiveReminder: number };
  pharmaMUSE: { rxReview: number; medicationGuidance: number; adr: number; consultation: number; inventory: number; safety: number };
  adminMUSE: { reportGenerate: number; anomalyAlert: number; approval: number; meetingMinutes: number; decisionSupport: number };
  patientMUSE: { triage: number; booking: number; reportInterpret: number; medicationReminder: number; followup: number; education: number; companion: number };
  proactive: { alert: number; recommend: number; reminder: number; learning: number; smarter: number };
  learningFlywheel: { successRecord: number; failureReview: number; experience: number; successor: number; evolution: number };
  safety: { permission: number; confirm: number; audit: number; takeover: number; explainability: number; guard: number };
  suggestions: string[];
}

/**
 * 构建 Personal Agent 2.0 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns Personal Agent 2.0 V5 报告
 */
export function buildPersonalAgentV5Report(timeRange: string): PersonalAgentV5Report {
  return {
    timeRange,
    doctorMUSE: { orderRecommend: 50000, noteGenerate: 30000, differentialDx: 10000, medicationAdvice: 20000, researchAssistant: 500, proactiveService: 15000 },
    nurseMUSE: { carePlan: 20000, roundingReminder: 10000, riskAlert: 5000, noteRecord: 30000, handover: 5000, proactiveReminder: 8000 },
    pharmaMUSE: { rxReview: 100000, medicationGuidance: 20000, adr: 200, consultation: 5000, inventory: 1000, safety: 99 },
    adminMUSE: { reportGenerate: 500, anomalyAlert: 200, approval: 1000, meetingMinutes: 50, decisionSupport: 100 },
    patientMUSE: { triage: 5000, booking: 100000, reportInterpret: 30000, medicationReminder: 50000, followup: 20000, education: 10000, companion: 5000 },
    proactive: { alert: 5000, recommend: 20000, reminder: 30000, learning: 1000, smarter: 85 },
    learningFlywheel: { successRecord: 5000, failureReview: 500, experience: 10000, successor: 90, evolution: 80 },
    safety: { permission: 100, confirm: 100, audit: 100, takeover: 100, explainability: 85, guard: 100 },
    suggestions: ["提升主动服务覆盖率", "扩大 Agent 学习飞轮"],
  };
}
