/**
 * 健澜科技 jlmedaios - 床位需求与周转预测 V3 纯函数（M277-B）
 *
 * forecastBedDemandV3 / estimateLOSV3 / optimizeDischargeV3 / buildBedForecastV3Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 床位历史 */
export interface BedHistory {
  ward: string;
  occupied: number;
  admitted: number;
  discharged: number;
  totalBeds: number;
}

/** LOS 估算输入 */
export interface LosPatient {
  age: number;
  diagnosis: string;
  comorbidities: number;
}

/**
 * 床位需求预测 V3（纯函数）：占用+预计入院-预计出院。
 *
 * @param history 病区历史
 * @param admissions 预计入院数
 * @returns 预测占用与周转率
 */
export function forecastBedDemandV3(history: BedHistory, admissions: number): {
  forecastOccupied: number;
  expectedDischarge: number;
  turnover: number;
  occupancyRate: number;
} {
  const expectedDischarge = Math.round(history.discharged * 1.1);
  const forecastOccupied = Math.max(0, history.occupied + admissions - expectedDischarge);
  const turnover = history.totalBeds > 0 ? Math.round((admissions / history.totalBeds) * 100) / 100 : 0;
  const occupancyRate = history.totalBeds > 0 ? Math.round((forecastOccupied / history.totalBeds) * 1000) / 10 : 0;
  return { forecastOccupied, expectedDischarge, turnover, occupancyRate };
}

/**
 * 住院天数估算 V3（纯函数）。
 *
 * @param patient 患者
 * @returns 预计LOS天数
 */
export function estimateLOSV3(patient: LosPatient): number {
  let los = 5;
  if (patient.diagnosis === "肺炎") los = 7;
  else if (patient.diagnosis === "心梗") los = 10;
  else if (patient.diagnosis === "择期手术") los = 4;
  if (patient.age >= 70) los += 3;
  los += patient.comorbidities;
  return los;
}

/**
 * 出院协调优化 V3（纯函数）：高占用病区优先安排可出院患者。
 *
 * @param wards 各病区
 * @returns 出院协调建议
 */
export function optimizeDischargeV3(wards: { ward: string; occupancyRate: number; readyForDischarge: number }[]): {
  expedite: { ward: string; count: number }[];
  totalExpedite: number;
} {
  const expedite = wards
    .filter((w) => w.occupancyRate >= 90)
    .map((w) => ({ ward: w.ward, count: w.readyForDischarge }))
    .sort((a, b) => b.count - a.count);
  const totalExpedite = expedite.reduce((s, e) => s + e.count, 0);
  return { expedite, totalExpedite };
}

/** 床位预测报告输出 */
export interface BedForecastV3Report {
  ward: string;
  forecastOccupied: number;
  occupancyRate: number;
  turnover: number;
  bedPressure: string;
  suggestions: string[];
}

/**
 * 构建床位预测报告（纯函数）。
 *
 * @param ward 病区
 * @param history 历史
 * @param admissions 预计入院
 * @returns 报告
 */
export function buildBedForecastV3Report(ward: string, history: BedHistory, admissions: number): BedForecastV3Report {
  const f = forecastBedDemandV3(history, admissions);
  let bedPressure = "正常";
  if (f.occupancyRate >= 95) bedPressure = "紧张";
  else if (f.occupancyRate >= 85) bedPressure = "偏紧";
  return {
    ward,
    forecastOccupied: f.forecastOccupied,
    occupancyRate: f.occupancyRate,
    turnover: f.turnover,
    bedPressure,
    suggestions: bedPressure === "紧张"
      ? ["启动出院协调，预留急诊转入床位"]
      : ["床位平稳，按常规收治"],
  };
}
