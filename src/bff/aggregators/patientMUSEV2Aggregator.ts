/**
 * 健澜科技 jlmedaios - Patient MUSE 患者智能体 V2 纯函数（M186-B）
 *
 * 就诊提醒/用药提醒/健康知识/满意度 + generatePatientReminder。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface VisitReminderV2 {
  appointmentTime: string;
  department: string;
  doctor: string;
  notes: string;
}

export interface MedicationReminderV2 {
  drugName: string;
  dosage: string;
  frequency: string;
  precautions: string;
}

export interface PatientMUSEV2Result {
  patientId: string;
  date: string;
  visitReminder: VisitReminderV2 | null;
  medications: MedicationReminderV2[];
  healthTips: string[];
  satisfactionSurvey: { available: boolean; deadline: string };
}

/**
 * 生成患者个性化提醒（纯函数）。
 *
 * @param patientId 患者 ID
 * @returns 提醒文案
 */
export function generatePatientReminder(patientId: string): string {
  return `患者 ${patientId}，您好：今日有就诊安排，请提前15分钟到院，携带医保卡和既往病历。`;
}

/**
 * 构建 Patient MUSE V2 患者智能体数据。
 *
 * @param patientId 患者 ID
 * @param date 日期
 * @returns 患者健康助手数据
 */
export function buildPatientMUSE(patientId: string, date: string): PatientMUSEV2Result {
  const visitReminder: VisitReminderV2 = {
    appointmentTime: '14:30',
    department: '心内科门诊',
    doctor: '张主任',
    notes: '空腹8小时，停药咨询',
  };

  const medications: MedicationReminderV2[] = [
    {
      drugName: '阿司匹林',
      dosage: '100mg',
      frequency: '每日1次，早餐后',
      precautions: '注意牙龈出血/黑便',
    },
    {
      drugName: '阿托伐他汀',
      dosage: '20mg',
      frequency: '每日1次，睡前',
      precautions: '定期复查肝功能',
    },
  ];

  const healthTips: string[] = [
    '低盐低脂饮食，每日食盐不超过5g',
    '适量有氧运动，每次30分钟，每周5次',
    '戒烟限酒，保持规律作息',
  ];

  return {
    patientId,
    date,
    visitReminder,
    medications,
    healthTips,
    satisfactionSurvey: { available: true, deadline: '出院后3天内' },
  };
}
