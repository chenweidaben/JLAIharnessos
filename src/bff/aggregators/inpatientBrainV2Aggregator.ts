/**
 * 健澜科技 jlmedaios - AI 大脑 2.0 住院试点纯函数（M185-A）
 *
 * buildInpatientBrainV2：
 *   - 床位实时使用率
 *   - 医生工作量负荷（管床数/医嘱数/手术量）
 *   - 护理负荷（管床数/护理操作数）
 *   - 未来4小时床位紧张度预测
 *   - 优化建议（跨科协调/加床/转康复）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 输入：科室当日住院数据 */
export interface InpatientInput {
  dept: string;
  date: string;
  totalBeds: number;
  occupiedBeds: number;
  /** 在院患者数 */
  inPatients: number;
  /** 今日出院数 */
  dischargedToday: number;
  /** 今日新入院数 */
  admittedToday: number;
  /** 医生列表（管床数+医嘱数+手术量） */
  doctors: Array<{
    doctorId: string;
    name: string;
    bedsManaged: number;
    ordersToday: number;
    surgeriesToday: number;
  }>;
  /** 护士列表（管床数+护理操作数） */
  nurses: Array<{
    nurseId: string;
    name: string;
    bedsManaged: number;
    nursingActionsToday: number;
  }>;
}

/** 床位预测 */
export interface BedForecast {
  hoursAhead: number;
  predictedOccupied: number;
  predictedRate: number;
  tension: 'low' | 'medium' | 'high';
}

/** 优化建议 */
export interface OptimizationSuggestion {
  type: 'cross_dept_transfer' | 'add_beds' | 'transfer_to_rehab' | 'no_action';
  message: string;
  priority: 'low' | 'medium' | 'high';
}

/** 输出 */
export interface InpatientBrainV2Result {
  dept: string;
  date: string;
  bedOccupancyRate: number;
  doctorLoad: Array<{ doctorId: string; name: string; loadIndex: number; level: 'low' | 'medium' | 'high' }>;
  nurseLoad: Array<{ nurseId: string; name: string; loadIndex: number; level: 'low' | 'medium' | 'high' }>;
  forecast: BedForecast[];
  suggestions: OptimizationSuggestion[];
}

/** 医生负荷阈值 */
const DOCTOR_BED_THRESHOLD = 15;
const DOCTOR_ORDER_THRESHOLD = 30;
const DOCTOR_SURGERY_THRESHOLD = 3;
/** 护士管床阈值 */
const NURSE_BED_THRESHOLD = 8;
const NURSE_ACTION_THRESHOLD = 40;

/**
 * 构建 AI 大脑 2.0 住院看板数据。
 *
 * @param input 科室住院数据
 * @returns 看板结果（含床位使用率/医生护士负荷/4小时预测/优化建议）
 */
export function buildInpatientBrainV2(input: InpatientInput): InpatientBrainV2Result {
  const bedOccupancyRate = input.totalBeds > 0 ? input.occupiedBeds / input.totalBeds : 0;

  // 医生负荷：管床数/15 + 医嘱数/30 + 手术量/3，加权求和
  const doctorLoad = input.doctors.map((d) => {
    const loadIndex =
      d.bedsManaged / DOCTOR_BED_THRESHOLD +
      d.ordersToday / DOCTOR_ORDER_THRESHOLD +
      d.surgeriesToday / DOCTOR_SURGERY_THRESHOLD;
    const level: 'low' | 'medium' | 'high' =
      loadIndex >= 1.5 ? 'high' : loadIndex >= 0.8 ? 'medium' : 'low';
    return { doctorId: d.doctorId, name: d.name, loadIndex: Math.round(loadIndex * 100) / 100, level };
  });

  // 护士负荷：管床数/8 + 护理操作/40
  const nurseLoad = input.nurses.map((n) => {
    const loadIndex =
      n.bedsManaged / NURSE_BED_THRESHOLD + n.nursingActionsToday / NURSE_ACTION_THRESHOLD;
    const level: 'low' | 'medium' | 'high' =
      loadIndex >= 1.5 ? 'high' : loadIndex >= 0.8 ? 'medium' : 'low';
    return { nurseId: n.nurseId, name: n.name, loadIndex: Math.round(loadIndex * 100) / 100, level };
  });

  // 未来4小时预测：假设出院率均匀分布（今日出院数的 1/8 在未来4小时完成）
  const forecast: BedForecast[] = [];
  const dischargeRatePerHour = input.dischargedToday / 24;
  const admissionRatePerHour = input.admittedToday / 24;
  for (const h of [1, 2, 4]) {
    const delta = (admissionRatePerHour - dischargeRatePerHour) * h;
    const predictedOccupied = Math.max(0, Math.round(input.occupiedBeds + delta));
    const predictedRate = input.totalBeds > 0 ? predictedOccupied / input.totalBeds : 0;
    const tension: 'low' | 'medium' | 'high' =
      predictedRate >= 0.95 ? 'high' : predictedRate >= 0.85 ? 'medium' : 'low';
    forecast.push({ hoursAhead: h, predictedOccupied, predictedRate, tension });
  }

  // 优化建议
  const suggestions: OptimizationSuggestion[] = [];
  if (bedOccupancyRate >= 0.95) {
    suggestions.push({
      type: 'cross_dept_transfer',
      message: '床位使用率 ≥95%，建议协调轻症患者转康复科或跨科收治',
      priority: 'high',
    });
  }
  if (forecast.some((f) => f.tension === 'high')) {
    suggestions.push({
      type: 'add_beds',
      message: '未来4小时床位将达95%以上，建议准备加床',
      priority: 'medium',
    });
  }
  const highLoadDoctors = doctorLoad.filter((d) => d.level === 'high');
  if (highLoadDoctors.length > 0) {
    suggestions.push({
      type: 'no_action',
      message: `医生 ${highLoadDoctors.map((d) => d.name).join('、')} 负荷过高，建议分流患者`,
      priority: 'medium',
    });
  }
  if (suggestions.length === 0) {
    suggestions.push({
      type: 'no_action',
      message: '床位与人力负荷正常，无需干预',
      priority: 'low',
    });
  }

  return {
    dept: input.dept,
    date: input.date,
    bedOccupancyRate,
    doctorLoad,
    nurseLoad,
    forecast,
    suggestions,
  };
}
