/**
 * 健澜科技 jlmedaios - 适老化与无障碍服务 V5 纯函数（M261-C）
 *
 * buildElderlyAccessibleV5Report / assessElderlyFriendlinessV5 / designAccessibleUIV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估适老友好度 V5（纯函数）。
 *
 * @param facility 设施
 * @returns 评估
 */
export function assessElderlyFriendlinessV5(facility: { wheelchair: boolean; elevator: boolean; rest: boolean; lowWindow: boolean }): { score: number; grade: string; improvement: string[] } {
  let score = 60;
  const improvement: string[] = [];
  if (facility.wheelchair) score += 10; else improvement.push("无障碍通道");
  if (facility.elevator) score += 10; else improvement.push("无障碍电梯");
  if (facility.rest) score += 10; else improvement.push("无障碍卫生间");
  if (facility.lowWindow) score += 10; else improvement.push("低位窗口");
  let grade = "良好";
  if (score >= 90) grade = "优秀";
  else if (score < 70) grade = "待改进";
  return { score, grade, improvement };
}

/**
 * 设计无障碍 UI V5（纯函数）。
 *
 * @param user 用户
 * @returns UI
 */
export function designAccessibleUIV5(user: { age: number; vision: string; mobile: boolean }): { fontSize: string; contrast: string; voice: boolean; simplified: boolean } {
  let fontSize = "中";
  let contrast = "标准";
  let voice = false;
  let simplified = false;
  if (user.age >= 65) {
    fontSize = "大";
    simplified = true;
  }
  if (user.vision === "低视力") {
    contrast = "高对比";
    voice = true;
  }
  if (user.mobile) {
    voice = true;
    simplified = true;
  }
  return { fontSize, contrast, voice, simplified };
}

/** 适老化与无障碍服务 V5 报告输出 */
export interface ElderlyAccessibleV5Report {
  timeRange: string;
  elderlyService: { largeFont: number; voiceGuide: number; volunteer: number; greenChannel: number; familyProxy: number };
  barrierFree: { route: number; toilet: number; lowWindow: number; braille: number; signLanguage: number };
  digitalAccess: { screenReader: number; highContrast: number; voiceInteraction: number; subtitle: number; simpleUI: number };
  homeCare: { homebed: number; homeVisit: number; remoteMonitoring: number; familySync: number; medReminder: number };
  polypharmacy: { polypharmacy: number; dose: number; cognitive: number; adherence: number; familyMonitoring: number };
  offline: { window: number; human: number; cash: number; paperReport: number; familyAccount: number };
  national: { demo: number; assessment: number; training: number; renovation: number; continuous: number };
  metrics: { seniorSatisfaction: number; accessibilityFacility: number; digitalUsage: number; complaint: number };
  suggestions: string[];
}

/**
 * 构建适老化与无障碍服务 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 适老化与无障碍服务 V5 报告
 */
export function buildElderlyAccessibleV5Report(timeRange: string): ElderlyAccessibleV5Report {
  return {
    timeRange,
    elderlyService: { largeFont: 90, voiceGuide: 80, volunteer: 70, greenChannel: 95, familyProxy: 85 },
    barrierFree: { route: 95, toilet: 90, lowWindow: 85, braille: 60, signLanguage: 30 },
    digitalAccess: { screenReader: 70, highContrast: 80, voiceInteraction: 75, subtitle: 65, simpleUI: 85 },
    homeCare: { homebed: 500, homeVisit: 1000, remoteMonitoring: 200, familySync: 80, medReminder: 90 },
    polypharmacy: { polypharmacy: 30, dose: 80, cognitive: 50, adherence: 75, familyMonitoring: 70 },
    offline: { window: 100, human: 100, cash: 100, paperReport: 100, familyAccount: 80 },
    national: { demo: 1, assessment: 90, training: 100, renovation: 80, continuous: 85 },
    metrics: { seniorSatisfaction: 92, accessibilityFacility: 90, digitalUsage: 60, complaint: 0.5 },
    suggestions: ["提升手语翻译覆盖", "加强数字反哺"],
  };
}
