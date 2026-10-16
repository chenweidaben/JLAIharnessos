/**
 * 健澜科技 jlmedaios - 信用就医先诊后付 V5 纯函数（M271-B）
 *
 * assessCreditV5 / settlePostPayV5 / buildCreditTreatmentV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 信用评估 V5（纯函数）。
 *
 * @param payer 付款方
 * @param history 履约次数
 * @returns 信用评估
 */
export function assessCreditV5(payer: string, history: number): { score: number; tier: string; limit: number } {
  let score = 60;
  if (history >= 20) {
    score = 90;
  } else if (history >= 10) {
    score = 80;
  } else if (history >= 5) {
    score = 70;
  }
  let tier = "C";
  if (score >= 85) {
    tier = "A";
  } else if (score >= 75) {
    tier = "B";
  }
  const limit = score * 100;
  return { score, tier, limit };
}

/**
 * 后付费结算 V5（纯函数）。
 *
 * @param bill 账单金额
 * @param credit 信用额度
 * @returns 结算结果
 */
export function settlePostPayV5(bill: number, credit: number): { paid: number; remaining: number; status: string } {
  let paid = 0;
  let status = "通过";
  if (bill <= credit) {
    paid = bill;
  } else if (bill <= credit * 1.2) {
    paid = credit;
    status = "部分通过";
  } else {
    status = "拒绝";
  }
  const remaining = Math.max(credit - paid, 0);
  return { paid, remaining, status };
}

/** 信用就医先诊后付 V5 报告输出 */
export interface CreditTreatmentV5Report {
  timeRange: string;
  creditTreatment: { firstVisitLaterPay: number; creditTier: number; noDeposit: number; postPay: number; creditMedical: number };
  assessment: { insuranceCredit: number; financialCredit: number; hospitalCredit: number; complianceHistory: number; dynamicScore: number };
  limit: { calculation: number; adjustment: number; freeze: number; restore: number; overdraftAlert: number; differentiated: number };
  postPaySettlement: { dischargeUnified: number; automaticDeduction: number; overdue: number; collection: number; creditRecord: number };
  model: { defaultRate: number; complianceRate: number; limitStrategy: number; riskControl: number; blackWhiteList: number };
  management: { dishonestyList: number; restriction: number; repair: number; publicity: number; education: number; jointPenalty: number };
  patientService: { creditSigning: number; limitQuery: number; bill: number; repaymentReminder: number; support: number; dispute: number };
  metrics: { signupRate: number; postPayRatio: number; defaultRate: number; collectionTime: number; satisfaction: number };
  suggestions: string[];
}

/**
 * 构建信用就医先诊后付 V5 报告（纯函数）。
 *
 * @param timeRange 时间范围
 * @returns 报告
 */
export function buildCreditTreatmentV5Report(timeRange: string): CreditTreatmentV5Report {
  return {
    timeRange,
    creditTreatment: { firstVisitLaterPay: 800, creditTier: 3, noDeposit: 600, postPay: 750, creditMedical: 700 },
    assessment: { insuranceCredit: 720, financialCredit: 680, hospitalCredit: 750, complianceHistory: 700, dynamicScore: 730 },
    limit: { calculation: 700, adjustment: 50, freeze: 10, restore: 8, overdraftAlert: 15, differentiated: 3 },
    postPaySettlement: { dischargeUnified: 700, automaticDeduction: 650, overdue: 20, collection: 15, creditRecord: 700 },
    model: { defaultRate: 2.5, complianceRate: 97.5, limitStrategy: 1, riskControl: 1, blackWhiteList: 10 },
    management: { dishonestyList: 20, restriction: 18, repair: 5, publicity: 1, education: 1, jointPenalty: 2 },
    patientService: { creditSigning: 800, limitQuery: 500, bill: 700, repaymentReminder: 600, support: 30, dispute: 5 },
    metrics: { signupRate: 65, postPayRatio: 58, defaultRate: 2.5, collectionTime: 12, satisfaction: 88 },
    suggestions: [
      "提升信用签约率，扩大先诊后付覆盖",
      "优化信用评分模型，降低违约率",
      "加强逾期催收，缩短回收时长",
    ],
  };
}
