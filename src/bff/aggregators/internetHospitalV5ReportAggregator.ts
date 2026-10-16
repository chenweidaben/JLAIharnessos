/**
 * 健澜科技 jlmedaios - 互联网医院与处方流转 V5 纯函数（M262-A）
 *
 * buildInternetHospitalV5Report / eligibleForOnlineV5 / routePrescriptionV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估在线复诊资格 V5（纯函数）。
 *
 * @param patient 患者
 * @param condition 病情
 * @returns 资格
 */
export function eligibleForOnlineV5(patient: { age: number; history: string[] }, condition: { diagnosis: string; acute: boolean }): { eligible: boolean; reason: string; channel: string } {
  let eligible = true;
  let reason = "符合复诊条件";
  let channel = "图文";
  if (condition.acute) {
    eligible = false;
    reason = "急性发病需面诊";
    channel = "线下";
  } else if (!patient.history.includes(condition.diagnosis)) {
    eligible = false;
    reason = "初诊必须面诊";
    channel = "线下";
  } else if (patient.age >= 75) {
    channel = "视频";
  }
  return { eligible, reason, channel };
}

/**
 * 流转处方 V5（纯函数）。
 *
 * @param rx 处方
 * @param pharmacies 药店
 * @returns 流转
 */
export function routePrescriptionV5(rx: { drug: string; urgent: boolean }, pharmacies: { name: string; stock: number; distance: number }[]): { pharmacy: string; delivery: string; trace: boolean } {
  const available = pharmacies.filter((p) => p.stock > 0).sort((a, b) => a.distance - b.distance);
  const pharmacy = available[0]?.name ?? "本院药房";
  const delivery = rx.urgent ? "送药上门2小时" : "到店自取";
  return { pharmacy, delivery, trace: true };
}

/** 互联网医院与处方流转 V5 报告输出 */
export interface InternetHospitalV5Report {
  timeRange: string;
  onlineVisit: { realname: number; followup: number; aiPreVisit: number; video: number; text: number; ePrescription: number };
  prescriptionFlow: { review: number; transfer: number; pharmacy: number; delivery: number; trace: number };
  payment: { onlineInsurance: number; commercial: number; selfPay: number; eInvoice: number; settlement: number };
  pharmacy: { onlineConsult: number; review: number; chronicRefill: number };
  homeService: { nurseOrder: number; servicePackage: number; price: number; insurance: number };
  quality: { rxCompliance: number; treatment: number; followup: number; privacy: number; complaint: number };
  patient: { miniApp: number; flow: number; wait: number; satisfaction: number; repurchase: number };
  metrics: { onlineVolume: number; followupRate: number; transferRate: number; deliveryTime: number; revenue: number };
  suggestions: string[];
}

/**
 * 构建互联网医院与处方流转 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 互联网医院与处方流转 V5 报告
 */
export function buildInternetHospitalV5Report(timeRange: string): InternetHospitalV5Report {
  return {
    timeRange,
    onlineVisit: { realname: 100, followup: 80, aiPreVisit: 90, video: 30, text: 70, ePrescription: 95 },
    prescriptionFlow: { review: 98, transfer: 85, pharmacy: 200, delivery: 90, trace: 100 },
    payment: { onlineInsurance: 70, commercial: 10, selfPay: 20, eInvoice: 95, settlement: 98 },
    pharmacy: { onlineConsult: 5000, review: 98, chronicRefill: 3000 },
    homeService: { nurseOrder: 500, servicePackage: 10, price: 80, insurance: 5 },
    quality: { rxCompliance: 99, treatment: 95, followup: 85, privacy: 100, complaint: 0.3 },
    patient: { miniApp: 100000, flow: 90, wait: 10, satisfaction: 92, repurchase: 60 },
    metrics: { onlineVolume: 50000, followupRate: 80, transferRate: 85, deliveryTime: 2, revenue: 1000 },
    suggestions: ["提升视频复诊率", "扩大处方流转药店"],
  };
}
