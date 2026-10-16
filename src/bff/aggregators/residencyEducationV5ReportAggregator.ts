/**
 * 健澜科技 jlmedaios - 住培教学考核 OSCE V5 纯函数（M269-D）
 *
 * buildResidencyEducationV5Report / scheduleOSCEV5 / scoreResidentV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * OSCE排考 V5（纯函数）。
 *
 * @param stations 考站
 * @param trainees 学员
 * @returns 排考
 */
export function scheduleOSCEV5(stations: { id: string; name: string; capacity: number }[], trainees: number): { slots: number; rounds: number; feasible: boolean } {
  const totalCapacity = stations.reduce((sum, s) => sum + s.capacity, 0);
  const rounds = Math.ceil(trainees / Math.max(totalCapacity, 1));
  const feasible = rounds <= 4;
  return { slots: totalCapacity, rounds, feasible };
}

/**
 * 学员评分 V5（纯函数）。
 *
 * @param assessments 考核
 * @returns 评分
 */
export function scoreResidentV5(assessments: { theory: number; skill: number; daily: number; osce: number }): { total: number; grade: string; pass: boolean } {
  const total = (assessments.theory + assessments.skill + assessments.daily + assessments.osce) / 4;
  let grade = "合格";
  if (total >= 90) {
    grade = "优秀";
  } else if (total < 60) {
    grade = "不合格";
  }
  const pass = total >= 60;
  return { total: Math.round(total), grade, pass };
}

/** 住培教学考核 OSCE V5 报告输出 */
export interface ResidencyEducationV5Report {
  timeRange: string;
  residencyBase: { specialty: number; rotation: number; faculty: number; trainee: number; recruitment: number; graduation: number; passRate: number };
  teaching: { rounds: number; caseDiscussion: number; lecture: number; skillsDemo: number; log: number; supervision: number };
  osce: { stations: number; sp: number; checklist: number; scoring: number; feedback: number; multistation: number };
  process: { rotationOut: number; monthly: number; yearly: number; theory: number; skill: number; daily: number; archive: number };
  faculty: { preceptor: number; training: number; teachingAbility: number; competition: number; motivation: number };
  trainee: { attendance: number; ethics: number; psychology: number; competency: number; mentor: number; complaint: number };
  quality: { studentEval: number; peerEval: number; graduationPass: number; employment: number; remediation: number };
  metrics: { activityCompletion: number; oscePass: number; graduationExam: number; satisfaction: number };
  suggestions: string[];
}

/**
 * 构建住培教学考核 OSCE V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 住培教学考核 V5 报告
 */
export function buildResidencyEducationV5Report(timeRange: string): ResidencyEducationV5Report {
  return {
    timeRange,
    residencyBase: { specialty: 30, rotation: 50, faculty: 200, trainee: 500, recruitment: 120, graduation: 100, passRate: 95 },
    teaching: { rounds: 300, caseDiscussion: 200, lecture: 150, skillsDemo: 100, log: 95, supervision: 90 },
    osce: { stations: 8, sp: 50, checklist: 90, scoring: 85, feedback: 80, multistation: 95 },
    process: { rotationOut: 100, monthly: 95, yearly: 90, theory: 85, skill: 80, daily: 90, archive: 95 },
    faculty: { preceptor: 200, training: 85, teachingAbility: 80, competition: 30, motivation: 75 },
    trainee: { attendance: 98, ethics: 95, psychology: 85, competency: 80, mentor: 100, complaint: 2 },
    quality: { studentEval: 88, peerEval: 85, graduationPass: 95, employment: 92, remediation: 90 },
    metrics: { activityCompletion: 95, oscePass: 90, graduationExam: 95, satisfaction: 88 },
    suggestions: ["提升OSCE通过率", "加强师资培训"],
  };
}
