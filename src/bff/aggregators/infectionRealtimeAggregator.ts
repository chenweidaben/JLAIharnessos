/**
 * 健澜科技 jlmedaios - 医院感染实时监测聚合器（M153-C，临床决策支持）
 *
 * 【临床决策支持】院感四大指标实时计算与暴发预警纯函数：
 *   1. monitorInfectionRates(dept, period)：实时手术部位感染率 SSI / 导管相关血流感染率 CLABSI
 *      / 呼吸机相关肺炎率 VAP / 多重耐药菌检出率 MDRO；
 *   2. detectOutbreak(dept, infectionType, cases, threshold)：超阈值即判定暴发，不等月报；
 *   3. generateInfectionAlert(input)：把暴发结论结构化为可落库 / 可推送的红色预警 Alert。
 *
 * 指标口径（医院感染监测常用标准，导出便于单测与审计追溯）：
 *   SSI   = 手术部位感染例数 / 同期手术台数           ×100%
 *   CLABSI= 中心静脉导管相关血流感染例数 / 中心静脉导管留置日 ×1000‰
 *   VAP   = 呼吸机相关肺炎例数 / 机械通气使用日        ×1000‰
 *   MDRO  = 多重耐药菌检出株数 / 同期微生物培养总标本数  ×100%
 *
 * 本模块全部为纯函数：不读库、不发请求、不触碰 WebSocket，便于单测与跨端复用。
 * 【核心业务深化】cases > threshold 即 outbreak=true 且 redAlert=true，
 *   超阈值立即在院感科大屏标红，不等月报、不等季度汇总。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 院感监测指标类型 */
export type InfectionType = 'ssi' | 'clabsi' | 'vap' | 'mdro';

/** 预警等级：red 暴发红色预警 / orange 逼近阈值 / yellow 关注 */
export type AlertLevel = 'red' | 'orange' | 'yellow';

/** monitorInfectionRates 的输入：某科室某周期的分子/分母原始计数 */
export interface DeptInfectionInput {
  deptCode: string;
  deptName: string;
  /** 同期手术台数（SSI 分母） */
  surgeryCount: number;
  /** 手术部位感染例数（SSI 分子） */
  ssiCases: number;
  /** 中心静脉导管留置日（CLABSI 分母） */
  centralLineDays: number;
  /** 导管相关血流感染例数（CLABSI 分子） */
  clabsiCases: number;
  /** 机械通气使用日（VAP 分母） */
  ventDays: number;
  /** 呼吸机相关肺炎例数（VAP 分子） */
  vapCases: number;
  /** 微生物培养总标本数（MDRO 分母） */
  totalCultures: number;
  /** 多重耐药菌检出株数（MDRO 分子） */
  mdroDetections: number;
}

/** monitorInfectionRates 返回的实时指标看板 */
export interface InfectionRate {
  deptCode: string;
  deptName: string;
  period: string;
  /** 手术部位感染率（%），分母为 0 时记 0 */
  ssiRate: number;
  /** 导管相关血流感染率（‰），分母为 0 时记 0 */
  clabsiRate: number;
  /** 呼吸机相关肺炎率（‰），分母为 0 时记 0 */
  vapRate: number;
  /** 多重耐药菌检出率（%），分母为 0 时记 0 */
  mdroRate: number;
  /** 分子/分母原始值（可追溯） */
  denominators: {
    surgeryCount: number;
    centralLineDays: number;
    ventDays: number;
    totalCultures: number;
  };
  /** 评估时刻（调用方注入，保证纯函数可复现） */
  evaluatedAt: string;
}

/** detectOutbreak 返回的暴发判定结果 */
export interface OutbreakResult {
  deptCode: string;
  deptName: string;
  infectionType: InfectionType;
  /** 本期实测例数 */
  cases: number;
  /** 暴发阈值例数 */
  threshold: number;
  /** 【核心业务深化】cases > threshold 即判定暴发 */
  outbreak: boolean;
  /** 暴发即红色预警：不等月报 */
  redAlert: boolean;
  /** 超出阈值比例 = cases / threshold（threshold=0 时记 0） */
  exceedRatio: number;
  /** 等级：red 暴发 / orange 达到阈值（cases===threshold）/ yellow 未达 */
  level: AlertLevel;
  /** 人话预警文案 */
  message: string;
  detectedAt: string;
}

/** generateInfectionAlert 的入参 */
export interface AlertInput {
  deptCode: string;
  deptName: string;
  infectionType: InfectionType;
  period: string;
  /** 实测例数 */
  cases: number;
  /** 暴发阈值 */
  threshold: number;
  /** 实测率值（% 或 ‰，由调用方按指标口径传入） */
  rateValue: number;
  /** 率值单位 */
  rateUnit: '%' | '‰';
}

/** generateInfectionAlert 返回的结构化预警（可直接落 clinical.infection_realtime_alert） */
export interface InfectionAlert {
  alertId: string;
  alertNo: string;
  deptCode: string;
  deptName: string;
  infectionType: InfectionType;
  level: AlertLevel;
  cases: number;
  threshold: number;
  rateValue: number;
  rateUnit: '%' | '‰';
  period: string;
  title: string;
  message: string;
  /** 【核心业务深化】暴发红色预警 */
  redAlert: boolean;
  /** 建议处置动作（辅助决策，最终由院感科本人执行） */
  actions: string[];
  generatedAt: string;
}

/** ------- 指标口径常量（导出便于单测与审计追溯） ------- */
/** SSI 率单位 */
export const SSI_UNIT = '%';
/** CLABSI 率单位 */
export const CLABSI_UNIT = '‰';
/** VAP 率单位 */
export const VAP_UNIT = '‰';
/** MDRO 检出率单位 */
export const MDRO_UNIT = '%';

/** 指标类型中文名（文案用） */
export const INFECTION_TYPE_LABEL: Record<InfectionType, string> = {
  ssi: '手术部位感染',
  clabsi: '导管相关血流感染',
  vap: '呼吸机相关肺炎',
  mdro: '多重耐药菌',
};

/**
 * 【临床决策支持】monitorInfectionRates —— 实时计算某科室某周期四大院感指标率。
 * 纯函数：不读库、不发请求。分母为 0 时该指标率记 0（避免除零）。
 *
 * @param dept   科室本期分子/分母原始计数
 * @param period 统计周期（实时滚动窗口标签，如 '2026-10-16'）
 * @returns      四项率值 + 原始分母 + 评估时刻
 */
export function monitorInfectionRates(
  dept: DeptInfectionInput,
  period: string,
): InfectionRate {
  const safeRate = (numerator: number, denominator: number, scale: number): number => {
    if (!denominator || denominator <= 0) return 0;
    // 保留两位小数，避免浮点尾差
    return Math.round((numerator / denominator) * scale * 100) / 100;
  };

  return {
    deptCode: dept.deptCode,
    deptName: dept.deptName,
    period,
    // SSI：例数 / 手术台数 ×100%
    ssiRate: safeRate(dept.ssiCases, dept.surgeryCount, 100),
    // CLABSI：例数 / 导管留置日 ×1000‰
    clabsiRate: safeRate(dept.clabsiCases, dept.centralLineDays, 1000),
    // VAP：例数 / 通气日 ×1000‰
    vapRate: safeRate(dept.vapCases, dept.ventDays, 1000),
    // MDRO：检出株数 / 培养标本数 ×100%
    mdroRate: safeRate(dept.mdroDetections, dept.totalCultures, 100),
    denominators: {
      surgeryCount: dept.surgeryCount,
      centralLineDays: dept.centralLineDays,
      ventDays: dept.ventDays,
      totalCultures: dept.totalCultures,
    },
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * 【临床决策支持】detectOutbreak —— 超阈值即判定暴发，立即红色预警，不等月报。
 * 纯函数：cases > threshold → outbreak/redAlert；cases === threshold → orange（达到阈值）；否则 yellow。
 *
 * @param dept          科室（取 deptCode/deptName）
 * @param infectionType 指标类型
 * @param cases         本期实测例数
 * @param threshold     暴发阈值例数
 */
export function detectOutbreak(
  dept: Pick<DeptInfectionInput, 'deptCode' | 'deptName'>,
  infectionType: InfectionType,
  cases: number,
  threshold: number,
): OutbreakResult {
  const label = INFECTION_TYPE_LABEL[infectionType];
  const outbreak = cases > threshold;
  const reached = cases === threshold;
  const level: AlertLevel = outbreak ? 'red' : reached ? 'orange' : 'yellow';
  const exceedRatio = threshold > 0 ? Math.round((cases / threshold) * 100) / 100 : 0;

  let message: string;
  if (outbreak) {
    message = `${dept.deptName} 本期 ${label} ${cases} 例，已超过暴发阈值 ${threshold} 例（${Math.round(
      (cases / Math.max(threshold, 1)) * 100,
    )}%），触发红色暴发预警，请院感科立即介入流调与隔离处置。`;
  } else if (reached) {
    message = `${dept.deptName} 本期 ${label} ${cases} 例，恰好达到暴发阈值 ${threshold} 例，请院感科密切关注。`;
  } else {
    message = `${dept.deptName} 本期 ${label} ${cases} 例，低于暴发阈值 ${threshold} 例，持续监测中。`;
  }

  return {
    deptCode: dept.deptCode,
    deptName: dept.deptName,
    infectionType,
    cases,
    threshold,
    outbreak,
    redAlert: outbreak,
    exceedRatio,
    level,
    message,
    detectedAt: new Date().toISOString(),
  };
}

/**
 * 【临床决策支持】generateInfectionAlert —— 把暴发判定结构化为可落库 / 可推送的红色预警。
 * 纯函数：alertNo 用 dept+type+period+时间戳哈希生成，不含随机副作用以便单测。
 *
 * @param input 科室 / 指标 / 例数 / 阈值 / 率值
 * @returns     结构化 Alert（redAlert=true 即暴发红色预警）
 */
export function generateInfectionAlert(input: AlertInput): InfectionAlert {
  const label = INFECTION_TYPE_LABEL[input.infectionType];
  const outbreak = input.cases > input.threshold;
  const level: AlertLevel = outbreak ? 'red' : input.cases === input.threshold ? 'orange' : 'yellow';
  const ts = Date.now().toString(36);
  const alertNo = `IR-${input.deptCode}-${input.infectionType}-${input.period}-${ts}`;

  const title = outbreak
    ? `【红色暴发预警】${input.deptName} ${label}超阈值`
    : `${input.deptName} ${label}预警关注`;

  const message = outbreak
    ? `${input.deptName} 本期（${input.period}）${label} ${input.cases} 例，超过暴发阈值 ${input.threshold} 例，实测率 ${input.rateValue}${input.rateUnit}，请立即流调隔离。`
    : `${input.deptName} 本期（${input.period}）${label} ${input.cases} 例（阈值 ${input.threshold}），实测率 ${input.rateValue}${input.rateUnit}，请持续监测。`;

  // 建议处置动作（辅助决策，最终由院感科本人执行并签名）
  const actions = outbreak
    ? [
        '院感科 30 分钟内到现场核实流调',
        '同病区密切接触者排查与隔离医嘱建议',
        '微生物室复核同源菌株基因型',
        '24 小时内上报院感委员会并启动暴发应急预案',
      ]
    : ['持续监测本期趋势', '做好手卫生与环境消毒督导'];

  return {
    alertId: alertNo,
    alertNo,
    deptCode: input.deptCode,
    deptName: input.deptName,
    infectionType: input.infectionType,
    level,
    cases: input.cases,
    threshold: input.threshold,
    rateValue: input.rateValue,
    rateUnit: input.rateUnit,
    period: input.period,
    title,
    message,
    redAlert: outbreak,
    actions,
    generatedAt: new Date().toISOString(),
  };
}
