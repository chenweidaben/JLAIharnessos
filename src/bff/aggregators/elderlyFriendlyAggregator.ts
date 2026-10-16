/**
 * 健澜科技 jlmedaios - 适老化改造纯函数（M199-C）
 *
 * buildElderlyFriendlyReport / assessElderlyFriendly / generateElderlyReminder
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 界面数据 */
export interface InterfaceData {
  fontScale: number;
  contrastMode: boolean;
  simplifiedLayout: boolean;
  voiceInteraction: boolean;
}

/**
 * 适老化评估（纯函数）。
 *
 * @param data 界面数据
 * @returns 适老化评分
 */
export function assessElderlyFriendly(data: InterfaceData): { score: number; level: string; issues: string[] } {
  let score = 0;
  const issues: string[] = [];
  if (data.fontScale >= 1.5) score += 30;
  else issues.push('字体过小');
  if (data.contrastMode) score += 25;
  else issues.push('无高对比模式');
  if (data.simplifiedLayout) score += 25;
  else issues.push('布局复杂');
  if (data.voiceInteraction) score += 20;
  else issues.push('无语音交互');
  const level = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';
  return { score, level, issues };
}

/** 患者数据 */
export interface PatientData {
  name: string;
  nextAppointment: string;
  medications: string[];
}

/**
 * 生成适老提醒（纯函数）。
 *
 * @param patient 患者数据
 * @returns 提醒列表
 */
export function generateElderlyReminder(patient: PatientData): { reminders: string[] } {
  const reminders: string[] = [];
  reminders.push(`${patient.name}，您下次就诊时间是 ${patient.nextAppointment}，请提前准备好病历和医保卡`);
  for (const med of patient.medications) {
    reminders.push(`${patient.name}，请按时服用 ${med}`);
  }
  return { reminders };
}

/** 适老化报告输出 */
export interface ElderlyFriendlyReport {
  timeRange: string;
  interface: { largeFont: boolean; highContrast: boolean; simplifiedLayout: boolean };
  voice: { query: boolean; input: boolean; navigation: boolean; dialect: number };
  assistant: { triage: boolean; companion: boolean; reminder: boolean; qa: boolean };
  process: { optimized: number };
  monitoring: { devices: number };
  medication: { reminders: number };
  remote: { familyView: boolean; emergencyCall: boolean; videoConsult: number };
  training: { sessions: number };
  suggestions: string[];
}

/**
 * 构建适老化报告。
 *
 * @param timeRange 时间范围
 * @returns 适老化报告
 */
export function buildElderlyFriendlyReport(timeRange: string): ElderlyFriendlyReport {
  return {
    timeRange,
    interface: { largeFont: true, highContrast: true, simplifiedLayout: true },
    voice: { query: true, input: true, navigation: true, dialect: 3 },
    assistant: { triage: true, companion: true, reminder: true, qa: true },
    process: { optimized: 8 },
    monitoring: { devices: 500 },
    medication: { reminders: 2000 },
    remote: { familyView: true, emergencyCall: true, videoConsult: 100 },
    training: { sessions: 10 },
    suggestions: ['增加方言语音识别', '扩大远程关爱覆盖'],
  };
}
