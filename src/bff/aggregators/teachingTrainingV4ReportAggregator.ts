/**
 * 健澜科技 jlmedaios - 教学培训 V4 纯函数（M254-C）
 *
 * buildTeachingTrainingV4Report / assessTeachingQualityV4 / trackCMECreditsV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估教学质量 V4（纯函数）。
 *
 * @param evaluations 评估
 * @returns 质量
 */
export function assessTeachingQualityV4(evaluations: { student: number; peer: number; osce: number }): { score: number; adequate: boolean } {
  const score = Math.round((evaluations.student + evaluations.peer + evaluations.osce) / 3);
  return { score, adequate: score >= 85 };
}

/**
 * 追踪 CME 学分 V4（纯函数）。
 *
 * @param staff 人员
 * @param credits 学分
 * @returns 学分
 */
export function trackCMECreditsV4(staff: number, credits: number): { total: number; perCapita: number; adequate: boolean } {
  const perCapita = Math.round((credits / Math.max(staff, 1)) * 10) / 10;
  return { total: credits, perCapita, adequate: perCapita >= 25 };
}

/** 教学培训 V4 报告输出 */
export interface TeachingTrainingV4Report {
  timeRange: string;
  residency: { base: number; specialty: number; trainee: number; faculty: number; exam: number; graduation: number };
  graduate: { phd: number; md: number; supervisor: number; admission: number; thesis: number };
  cme: { typeI: number; typeII: number; course: number; online: number; passRate: number; verification: number };
  postGrad: { specialty: number; transfer: number; general: number; assistant: number; subspecialty: number };
  onboarding: { newStaff: number; newNurse: number; newDoctor: number; newTech: number; exam: number; mentor: number };
  faculty: { development: number; method: number; competition: number; mentorTraining: number };
  quality: { rounds: number; caseDiscussion: number; lecture: number; osce: number; studentEval: number; peerEval: number };
  management: { policy: number; archive: number; assessment: number; teachingHospital: number; medicalSchool: number; kpi: number };
  suggestions: string[];
}

/**
 * 构建教学培训 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 教学培训 V4 报告
 */
export function buildTeachingTrainingV4Report(timeRange: string): TeachingTrainingV4Report {
  return {
    timeRange,
    residency: { base: 10, specialty: 30, trainee: 500, faculty: 200, exam: 480, graduation: 450 },
    graduate: { phd: 50, md: 200, supervisor: 100, admission: 250, thesis: 200 },
    cme: { typeI: 100, typeII: 200, course: 300, online: 500, passRate: 90, verification: 95 },
    postGrad: { specialty: 100, transfer: 50, general: 80, assistant: 30, subspecialty: 20 },
    onboarding: { newStaff: 100, newNurse: 150, newDoctor: 50, newTech: 30, exam: 320, mentor: 320 },
    faculty: { development: 50, method: 30, competition: 10, mentorTraining: 20 },
    quality: { rounds: 1000, caseDiscussion: 500, lecture: 800, osce: 100, studentEval: 90, peerEval: 85 },
    management: { policy: 100, archive: 1000, assessment: 90, teachingHospital: 1, medicalSchool: 1, kpi: 85 },
    suggestions: ["提升住培结业率", "扩大 CME 覆盖"],
  };
}
