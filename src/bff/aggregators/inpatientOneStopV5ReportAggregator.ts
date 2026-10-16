/**
 * 健澜科技 jlmedaios - 住院一站式服务 V5 纯函数（M270-B）
 *
 * buildInpatientOneStopV5Report / prepareAdmissionV5 / settleDischargeV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 入院准备 V5（纯函数）。
 *
 * @param patient 患者
 * @param dept 科室
 * @returns 入院准备
 */
export function prepareAdmissionV5(patient: { insurance: boolean; docsReady: boolean }, dept: { bedsAvailable: number }): { ready: boolean; estimatedBed: string; waitDays: number } {
  if (!patient.docsReady) {
    return { ready: false, estimatedBed: "", waitDays: 3 };
  }
  if (dept.bedsAvailable <= 0) {
    return { ready: false, estimatedBed: "", waitDays: 5 };
  }
  return { ready: true, estimatedBed: "3病区-12床", waitDays: 0 };
}

/**
 * 出院结算 V5（纯函数）。
 *
 * @param bill 账单
 * @param insurance 保险
 * @returns 结算
 */
export function settleDischargeV5(bill: { total: number; deposit: number }, insurance: { covered: boolean; ratio: number }): { patientPay: number; insurancePay: number; refund: number; completed: boolean } {
  let insurancePay = 0;
  if (insurance.covered) {
    insurancePay = Math.round(bill.total * insurance.ratio);
  }
  const patientPay = bill.total - insurancePay;
  const refund = bill.deposit - patientPay;
  const completed = refund >= 0;
  return { patientPay, insurancePay, refund: Math.round(refund), completed };
}

/** 住院一站式服务 V5 报告输出 */
export interface InpatientOneStopV5Report {
  timeRange: string;
  admissionPre: { preAssessment: number; bedReservation: number; hospitalCert: number; education: number; supplies: number; oneStop: number };
  admissionProcess: { bedside: number; selfService: number; mobile: number; deposit: number; wristband: number; education: number; oneStop: number };
  inpatientService: { meals: number; linen: number; companion: number; visitor: number; convenience: number; feeQuery: number; dailySettlement: number };
  dischargePrep: { dischargePlan: number; meds: number; payment: number; followup: number; appointment: number; transport: number };
  dischargeSettlement: { insurance: number; commercial: number; selfPay: number; eInvoice: number; bedsideSettlement: number; selfService: number; zeroTravel: number };
  depositMgmt: { deposit: number; supplement: number; refund: number; preauth: number; feeAlert: number; creditStay: number };
  metrics: { admissionDuration: number; dischargeDuration: number; bedsideSettlementRate: number; satisfaction: number; complaint: number };
  improvement: { wait: number; breakpoint: number; painPoint: number; processReengineering: number; continuous: number };
  suggestions: string[];
}

/**
 * 构建住院一站式服务 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 住院一站式服务 V5 报告
 */
export function buildInpatientOneStopV5Report(timeRange: string): InpatientOneStopV5Report {
  return {
    timeRange,
    admissionPre: { preAssessment: 85, bedReservation: 90, hospitalCert: 95, education: 80, supplies: 75, oneStop: 88 },
    admissionProcess: { bedside: 70, selfService: 85, mobile: 60, deposit: 90, wristband: 95, education: 85, oneStop: 80 },
    inpatientService: { meals: 85, linen: 90, companion: 70, visitor: 80, convenience: 75, feeQuery: 90, dailySettlement: 85 },
    dischargePrep: { dischargePlan: 80, meds: 85, payment: 90, followup: 75, appointment: 80, transport: 70 },
    dischargeSettlement: { insurance: 90, commercial: 60, selfPay: 85, eInvoice: 95, bedsideSettlement: 75, selfService: 80, zeroTravel: 85 },
    depositMgmt: { deposit: 90, supplement: 85, refund: 90, preauth: 70, feeAlert: 80, creditStay: 60 },
    metrics: { admissionDuration: 15, dischargeDuration: 20, bedsideSettlementRate: 75, satisfaction: 88, complaint: 5 },
    improvement: { wait: 60, breakpoint: 50, painPoint: 55, processReengineering: 70, continuous: 80 },
    suggestions: ["提升床旁结算率", "缩短入院办理时长"],
  };
}
