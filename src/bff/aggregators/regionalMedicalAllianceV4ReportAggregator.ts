/**
 * 健澜科技 jlmedaios - 区域医联体 V4 纯函数（M253-C）
 *
 * buildRegionalMedicalAllianceV4Report / coordinateReferralV4 / assessRegionalSharingV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 协调转诊 V4（纯函数）。
 *
 * @param patient 患者
 * @param from 转出
 * @param to 转入
 * @returns 转诊
 */
export function coordinateReferralV4(patient: { name: string; diagnosis: string }, from: string, to: string): { patient: string; from: string; to: string; greenChannel: boolean; time: string } {
  const greenChannel = patient.diagnosis.includes("卒中") || patient.diagnosis.includes("胸痛");
  return { patient: patient.name, from, to, greenChannel, time: greenChannel ? "30分钟内" : "24小时内" };
}

/**
 * 评估区域共享 V4（纯函数）。
 *
 * @param data 数据
 * @returns 共享
 */
export function assessRegionalSharingV4(data: { image: number; lab: number; pathology: number; cardiac: number }): { total: number; rate: number; adequate: boolean } {
  const total = data.image + data.lab + data.pathology + data.cardiac;
  const rate = Math.round((total / 10000) * 100) / 10;
  return { total, rate, adequate: rate >= 50 };
}

/** 区域医联体 V4 报告输出 */
export interface RegionalMedicalAllianceV4Report {
  timeRange: string;
  organization: { cityGroup: number; countyConsortium: number; specialtyNetwork: number; teleCollab: number };
  referral: { up: number; down: number; greenChannel: number; standard: number };
  telemedicine: { consultation: number; image: number; pathology: number; cardiac: number };
  outreach: { expertClinic: number; surgery: number; mentor: number; talent: number };
  empowerment: { training: number; remoteMentor: number; prescriptionExtension: number; testRecognition: number };
  sharing: { imageCenter: number; labCenter: number; pathologyCenter: number; cssd: number };
  governance: { quality: number; monitoring: number; publicHealth: number; performance: number };
  service: { internetHospital: number; chronic: number; familyDoctor: number; tieredCare: number };
  suggestions: string[];
}

/**
 * 构建区域医联体 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 区域医联体 V4 报告
 */
export function buildRegionalMedicalAllianceV4Report(timeRange: string): RegionalMedicalAllianceV4Report {
  return {
    timeRange,
    organization: { cityGroup: 1, countyConsortium: 5, specialtyNetwork: 10, teleCollab: 20 },
    referral: { up: 500, down: 200, greenChannel: 100, standard: 95 },
    telemedicine: { consultation: 1000, image: 5000, pathology: 500, cardiac: 2000 },
    outreach: { expertClinic: 300, surgery: 100, mentor: 50, talent: 200 },
    empowerment: { training: 50, remoteMentor: 100, prescriptionExtension: 500, testRecognition: 80 },
    sharing: { imageCenter: 10, labCenter: 5, pathologyCenter: 3, cssd: 8 },
    governance: { quality: 90, monitoring: 100, publicHealth: 200, performance: 85 },
    service: { internetHospital: 5000, chronic: 3000, familyDoctor: 1000, tieredCare: 60 },
    suggestions: ["提升转诊率", "扩大远程医疗覆盖"],
  };
}
