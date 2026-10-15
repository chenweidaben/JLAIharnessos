/**
 * 健澜科技 jlmedaios - 院感监测预警聚合器（M130-B）
 *
 * 【核心业务深化】院感实时风险识别纯函数：detectInfectionRisk(patientData, wardData)。
 * 覆盖四类院感监测信号——
 *   1. 发热患者聚集：同病区 72h 内体温 ≥38.0℃ 病例数；
 *   2. 手术部位感染 SSI：术后 30 天窗内切口感染征象；
 *   3. 耐药菌检出 MDRO：MRSA / CRE / CRAB / VRE / ESBL；
 *   4. 呼吸机相关肺炎 VAP：有创通气 ≥48h 后新发肺部感染。
 *
 * 本模块全部为纯函数：不读库、不发请求、不触碰 WebSocket，便于单测与跨端复用。
 * 预警分级 low/medium/high/critical；high 及以上立即标红（redAlert=true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 院感事件类型 */
export type InfectionEventType = 'fever_cluster' | 'ssi' | 'mdro' | 'vap';

/** 预警分级：low 散发 / medium 聚集预警 / high 暴发风险 / critical 暴发确认 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** 单患者院感监测信号（来自生命体征 / 手术记录 / 微生物 / 监护） */
export interface InfectionPatientSignal {
  patientId: string;
  /** 体温 ℃，≥38.0 记为发热 */
  temperature?: number;
  /** 发热检出时刻（ISO8601），用于 72h 聚集窗 */
  feverAt?: string | null;
  /** 术后天数（SSI 监测窗 0-30 天） */
  postOpDays?: number | null;
  /** 术后切口感染征象：红肿渗液 / 分泌物培养阳性 */
  ssiSuspected?: boolean;
  /** 检出耐药菌代号：MRSA / CRE / CRAB / VRE / ESBL */
  mdro?: string | null;
  /** 是否有创机械通气 */
  ventilated?: boolean;
  /** 机械通气累计小时 */
  ventHours?: number;
  /** 新发肺部浸润 + 脓性痰 / 痰培养阳性（VAP 判定） */
  vapSuspected?: boolean;
}

/** 病区上下文 */
export interface WardContext {
  wardCode: string;
  wardName: string;
  /** 在院患者数（分母，供前端展示率值，不参与分级） */
  census: number;
}

/** 单条风险信号 */
export interface RiskSignal {
  type: InfectionEventType;
  level: RiskLevel;
  /** 涉及患者数 */
  patientCount: number;
  /** 涉及患者 ID */
  patientIds: string[];
  /** 是否构成聚集 / 暴发 */
  clustered: boolean;
  /** 人话预警文案 */
  message: string;
}

/** detectInfectionRisk 返回的病区风险结论 */
export interface RiskResult {
  wardCode: string;
  wardName: string;
  census: number;
  /** 该病区最高风险等级 */
  overallLevel: RiskLevel;
  /** 【核心业务深化】发现风险立即标红：high / critical 即 true */
  redAlert: boolean;
  /** 命中的风险信号明细 */
  signals: RiskSignal[];
  /** 各分级计数 */
  counts: Record<RiskLevel, number>;
  /** 评估时刻（调用侧注入，便于纯函数可复现） */
  evaluatedAt: string;
}

/** ------- 监测阈值（院感常用标准，导出便于单测与评审追溯） ------- */
/** 发热体温阈值 ℃ */
export const FEVER_TEMPERATURE = 38.0;
/** 发热聚集观察窗（小时） */
export const FEVER_WINDOW_HOURS = 72;
/** 发热聚集分级例数：3-4 medium / 5-6 high / ≥7 critical */
export const FEVER_CLUSTER_MEDIUM = 3;
export const FEVER_CLUSTER_HIGH = 5;
export const FEVER_CLUSTER_CRITICAL = 7;
/** SSI 术后监测窗（天） */
export const SSI_WINDOW_DAYS = 30;
/** VAP 机械通气最短小时 */
export const VAP_VENT_HOURS = 48;

/** 分级权重（越大越严重） */
const LEVEL_WEIGHT: Record<RiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function maxLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
  return LEVEL_WEIGHT[a] >= LEVEL_WEIGHT[b] ? a : b;
}

/**
 * 【核心业务深化】院感风险检测纯函数。
 * @param patientData 某病区当前在院患者监测信号列表
 * @param wardData   病区上下文
 * @returns RiskResult  含风险信号、最高分级与 redAlert 标红结论
 */
export function detectInfectionRisk(
  patientData: InfectionPatientSignal[],
  wardData: WardContext,
): RiskResult {
  const patients = Array.isArray(patientData) ? patientData : [];
  const signals: RiskSignal[] = [];

  signals.push(...detectFeverCluster(patients));
  signals.push(...detectSsi(patients));
  signals.push(...detectMdro(patients));
  signals.push(...detectVap(patients));

  const counts: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  let overall: RiskLevel = 'low';
  for (const s of signals) {
    counts[s.level] += 1;
    overall = maxLevel(overall, s.level);
  }

  return {
    wardCode: wardData.wardCode,
    wardName: wardData.wardName,
    census: wardData.census,
    overallLevel: overall,
    // 【核心业务深化】发现 high/critical 立即标红
    redAlert: overall === 'high' || overall === 'critical',
    signals,
    counts,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * 发热聚集检测：以列表中最新 feverAt 为锚点，回看 72h 窗。
 * 无 feverAt 时间戳时退化为对全部体温达标的计数（演示/灰度数据场景）。
 */
function detectFeverCluster(patients: InfectionPatientSignal[]): RiskSignal[] {
  const febric = patients.filter(
    (p) => typeof p.temperature === 'number' && p.temperature >= FEVER_TEMPERATURE,
  );
  if (febric.length === 0) return [];

  const times = febric
    .map((p) => (p.feverAt ? Date.parse(p.feverAt) : NaN))
    .filter((t) => Number.isFinite(t));
  const hasTime = times.length === febric.length && times.length > 0;

  let inWindow = febric;
  if (hasTime) {
    const anchor = Math.max(...times);
    const windowMs = FEVER_WINDOW_HOURS * 3600 * 1000;
    inWindow = febric.filter((p) => {
      const t = Date.parse(p.feverAt!);
      return Number.isFinite(t) && t >= anchor - windowMs && t <= anchor + 1;
    });
  }

  const n = inWindow.length;
  let level: RiskLevel;
  if (n >= FEVER_CLUSTER_CRITICAL) level = 'critical';
  else if (n >= FEVER_CLUSTER_HIGH) level = 'high';
  else if (n >= FEVER_CLUSTER_MEDIUM) level = 'medium';
  else level = 'low';

  const clustered = n >= FEVER_CLUSTER_MEDIUM;
  return [
    {
      type: 'fever_cluster',
      level,
      patientCount: n,
      patientIds: inWindow.map((p) => p.patientId),
      clustered,
      message: clustered
        ? `72h 内 ${n} 例发热（≥${FEVER_TEMPERATURE}℃），${level === 'critical' ? '疑似暴发，立即流调' : '聚集预警'}，请院感科介入`
        : `散发发热 ${n} 例，持续观察`,
    },
  ];
}

/** 手术部位感染 SSI：术后 30 天窗内切口感染征象 */
function detectSsi(patients: InfectionPatientSignal[]): RiskSignal[] {
  const cases = patients.filter(
    (p) =>
      p.ssiSuspected &&
      typeof p.postOpDays === 'number' &&
      p.postOpDays >= 0 &&
      p.postOpDays <= SSI_WINDOW_DAYS,
  );
  if (cases.length === 0) return [];
  const level: RiskLevel = cases.length >= 2 ? 'high' : 'medium';
  return [
    {
      type: 'ssi',
      level,
      patientCount: cases.length,
      patientIds: cases.map((p) => p.patientId),
      clustered: cases.length >= 2,
      message: `术后 ${SSI_WINDOW_DAYS} 天窗内手术部位感染 ${cases.length} 例` +
        (cases.length >= 2 ? '，同病区聚集，须排查手术环节' : ''),
    },
  ];
}

/** 耐药菌 MDRO：按菌株分组，同菌株 ≥2 例即暴发聚集 */
function detectMdro(patients: InfectionPatientSignal[]): RiskSignal[] {
  const carriers = patients.filter((p) => typeof p.mdro === 'string' && p.mdro.trim().length > 0);
  if (carriers.length === 0) return [];

  const byStrain = new Map<string, InfectionPatientSignal[]>();
  for (const p of carriers) {
    const strain = p.mdro!.trim().toUpperCase();
    const list = byStrain.get(strain) ?? [];
    list.push(p);
    byStrain.set(strain, list);
  }

  const out: RiskSignal[] = [];
  for (const [strain, list] of byStrain) {
    // 耐药菌检出本身至少 high；同病区同菌株 ≥2 例升级 critical（暴发）
    const level: RiskLevel = list.length >= 2 ? 'critical' : 'high';
    out.push({
      type: 'mdro',
      level,
      patientCount: list.length,
      patientIds: list.map((p) => p.patientId),
      clustered: list.length >= 2,
      message: `${strain} 耐药菌检出 ${list.length} 例` +
        (list.length >= 2 ? '，同病区同种同源，疑似接触传播暴发' : '，落实接触隔离'),
    });
  }
  return out;
}

/** 呼吸机相关肺炎 VAP：有创通气 ≥48h 后新发肺部感染 */
function detectVap(patients: InfectionPatientSignal[]): RiskSignal[] {
  const cases = patients.filter(
    (p) => p.ventilated && p.vapSuspected && (p.ventHours ?? 0) >= VAP_VENT_HOURS,
  );
  if (cases.length === 0) return [];
  const level: RiskLevel = cases.length >= 2 ? 'high' : 'medium';
  return [
    {
      type: 'vap',
      level,
      patientCount: cases.length,
      patientIds: cases.map((p) => p.patientId),
      clustered: cases.length >= 2,
      message: `机械通气 ≥${VAP_VENT_HOURS}h 后呼吸机相关肺炎 ${cases.length} 例` +
        (cases.length >= 2 ? '，聚集发生，须排查呼吸机管路与手卫生' : ''),
    },
  ];
}
