/**
 * 健澜科技 jlmedaios - 患者画像学习引擎聚合器
 *
 * 从三类原始临床数据中"学习"出一位患者的长期结构化画像：
 *  - 历史就诊（含诊断）  → 慢病清单 chronicConditions、近期就诊摘要 recentVisitsSummary；
 *  - 历史医嘱           → 药物反应 drugReactions、偏好治疗 preferredTreatment；
 *  - 历史检验           → 风险标志 riskFlags（危急值 / 显著异常）。
 *
 * 核心函数均为纯函数（给定输入恒定输出），便于单元测试与回放：
 *  - summarizeVisits(visits)：把就诊序列压缩成一段可读摘要；
 *  - buildPatientProfile(visits, orders, labs)：聚合为 PatientProfile。
 *
 * 落库函数 getPatientProfile(patientId) 负责装配数据、调用纯函数、UPSERT 覆盖写
 * medmuse.patient_learning_profile；DEMO_MODE 下不写库。
 *
 * 隐私红线：输出只含院内脱敏主键 patientId 与临床标签，绝不携带患者姓名 / 身份证号。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '@/db/pool.js';
import { getEnv } from '../config/env.js';
import { getVisitsByPatient } from '../../db/repositories/visitRepo.js';
import { getOrdersByPatient } from '../../db/repositories/orderRepo.js';
import { getLabResultsByPatient } from '../../db/repositories/labResultRepo.js';
import { getDiagnosesByVisit } from '../../db/repositories/diagnosisRepo.js';

/* -------------------------------------------------------------------------- */
/* 错误类型                                                                    */
/* -------------------------------------------------------------------------- */

/** 患者画像业务错误（status 为 HTTP 状态码） */
export class PatientProfileError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'PatientProfileError';
  }
}

/* -------------------------------------------------------------------------- */
/* 输入 / 输出类型                                                             */
/* -------------------------------------------------------------------------- */

/** 画像引擎的一次就诊输入（诊断由调用方按 visitId 预先装配进来） */
export interface ProfileVisit {
  /** 就诊 ID */
  id: string;
  /** 就诊类型：outpatient / emergency / inpatient / checkup */
  visitType: string;
  /** 就诊科室名称 */
  department: string;
  /** 主诉（可空） */
  chiefComplaint: string | null;
  /** 入院 / 就诊时间 ISO 字符串（可空） */
  admitAt: string | null;
  /** 出院时间 ISO 字符串（可空） */
  dischargeAt: string | null;
  /** 本次就诊诊断列表 */
  diagnoses: ProfileDiagnosis[];
}

/** 画像引擎的单条诊断输入 */
export interface ProfileDiagnosis {
  /** 诊断名称（中文） */
  name: string;
  /** 诊断编码（ICD 等，可空） */
  code: string | null;
  /** 诊断类别：admission / discharge / outpatient 等 */
  kind: string;
  /** 是否确诊（仅确诊诊断计入慢病清单） */
  confirmed: boolean;
}

/** 画像引擎的单条医嘱输入 */
export interface ProfileOrder {
  /** 医嘱内容（药品 / 处置名称） */
  content: string;
  /** 医嘱类型：长期医嘱 / 临时医嘱 / 检查 / 治疗 等 */
  orderType: string;
  /** 医嘱状态 */
  status: string;
  /** 备注 / 取消原因（药物反应线索，可空） */
  note: string | null;
  /** 结构化扩展字段（可能含 reaction 等键，可空） */
  detail: Record<string, unknown> | null;
}

/** 画像引擎的单条检验输入 */
export interface ProfileLab {
  /** 项目名称 */
  itemName: string;
  /** 项目编码（可空） */
  itemCode: string | null;
  /** 数值结果（可空） */
  numericValue: number | null;
  /** 参考下限（可空） */
  refLow: number | null;
  /** 参考上限（可空） */
  refHigh: number | null;
  /** 异常标志：H / L / HH / LL / N（可空） */
  abnormalFlag: string | null;
  /** 是否危急值 */
  isCritical: boolean;
  /** 结果时间 ISO 字符串（可空） */
  resultTime: string | null;
  /** 结果单位（可空） */
  unit: string | null;
}

/** 患者学习画像输出（与 medmuse.patient_learning_profile 表结构对齐） */
export interface PatientProfile {
  /** 院内脱敏患者主键 */
  patientId: string;
  /** 慢病清单（去重） */
  chronicConditions: string[];
  /** 药物反应清单（药品 + 反应描述，去重） */
  drugReactions: string[];
  /** 偏好治疗方式（一句话） */
  preferredTreatment: string;
  /** 近期就诊摘要（一句话） */
  recentVisitsSummary: string;
  /** 风险标志清单 */
  riskFlags: string[];
  /** 最近一次学习时间 ISO 字符串 */
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* 领域词典                                                                    */
/* -------------------------------------------------------------------------- */

/** 慢病关键词词典：诊断名称命中其一即纳入慢病清单 */
const CHRONIC_KEYWORDS: readonly string[] = [
  '高血压', '糖尿病', '冠心病', '心力衰竭', '房颤',
  '慢性肾病', '尿毒症', '慢阻肺', '慢性阻塞性肺疾病', '哮喘',
  '肝硬化', '慢性乙型肝炎', '脑卒中', '帕金森', '类风湿',
  '恶性肿瘤', '痛风', '骨质疏松',
];

/** 药物反应关键词：医嘱备注 / 扩展字段命中其一即提取为药物反应 */
const REACTION_KEYWORDS: readonly string[] = [
  '过敏', '皮疹', '瘙痒', '不良反应', '恶心', '呕吐',
  '腹泻', '头晕', '肝损伤', '肾损伤', '出血', '休克',
];

/** 就诊类型中文映射（摘要用） */
const VISIT_TYPE_LABEL: Readonly<Record<string, string>> = {
  outpatient: '门诊',
  emergency: '急诊',
  inpatient: '住院',
  checkup: '体检',
};

/** 近 12 个月窗口（毫秒） */
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
/** 近 6 个月窗口（毫秒） */
const HALF_YEAR_MS = 182 * 24 * 60 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/* 工具函数                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 提取文本中命中的首个反应关键词。
 * @param text 待扫描文本
 * @returns 命中的关键词；未命中返回 null
 */
function matchReaction(text: string): string | null {
  for (const kw of REACTION_KEYWORDS) {
    if (text.includes(kw)) return kw;
  }
  return null;
}

/**
 * 判断诊断名称是否命中慢病词典。
 * @param name 诊断名称
 * @returns 是否慢病
 */
function isChronicDiagnosis(name: string): boolean {
  return CHRONIC_KEYWORDS.some((kw) => name.includes(kw));
}

/**
 * 规范化医嘱药品名：去掉剂量频次等尾部说明，取主句。
 * @param content 医嘱原文
 * @returns 药品名（截断至 24 字符）
 */
function drugNameOf(content: string): string {
  const head = content.split(/[，,。；;\n]/)[0] ?? content;
  return head.trim().slice(0, 24);
}

/* -------------------------------------------------------------------------- */
/* 纯函数：summarizeVisits                                                     */
/* -------------------------------------------------------------------------- */

/**
 * 把就诊序列压缩为一段可读的近期就诊摘要（纯函数）。
 *
 * 统计口径：
 *  - 以 admitAt 倒序；
 *  - 近 12 个月内按科室聚合次数；
 *  - 末尾点出最近一次就诊的时间 / 科室 / 主诉。
 *
 * @param visits 历史就诊列表
 * @returns 摘要字符串；空列表返回"暂无就诊记录"
 *
 * @example
 * summarizeVisits(visits)
 * // 近12个月共就诊5次：心内科3次、内分泌科1次、急诊1次；最近一次为2026-10-08心内科门诊，主诉胸闷3天。
 */
export function summarizeVisits(visits: readonly ProfileVisit[]): string {
  if (!visits || visits.length === 0) return '暂无就诊记录。';

  const now = Date.now();
  const recent = visits
    .filter((v) => v.admitAt !== null)
    .filter((v) => now - new Date(v.admitAt as string).getTime() <= ONE_YEAR_MS)
    .sort((a, b) => (b.admitAt ?? '').localeCompare(a.admitAt ?? ''));

  if (recent.length === 0) return `共累计就诊${visits.length}次，近12个月无就诊记录。`;

  // 按科室聚合计数
  const deptCount = new Map<string, number>();
  for (const v of recent) {
    deptCount.set(v.department, (deptCount.get(v.department) ?? 0) + 1);
  }
  const deptPart = [...deptCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([dept, n]) => `${dept}${n}次`)
    .join('、');

  const latest = recent[0];
  const date = latest.admitAt ? latest.admitAt.slice(0, 10) : '时间不详';
  const typeLabel = VISIT_TYPE_LABEL[latest.visitType] ?? latest.visitType;
  const cc = latest.chiefComplaint ? `，主诉${latest.chiefComplaint}` : '';

  return `近12个月共就诊${recent.length}次：${deptPart}；最近一次为${date}${latest.department}${typeLabel}${cc}。`;
}

/* -------------------------------------------------------------------------- */
/* 纯函数：buildPatientProfile                                                 */
/* -------------------------------------------------------------------------- */

/**
 * 聚合历史就诊 / 医嘱 / 检验，生成患者学习画像（纯函数）。
 *
 * 学习规则：
 *  - 慢病清单：所有确诊诊断中命中慢病词典者，按首次出现去重；
 *  - 药物反应：医嘱备注 / 扩展 detail 中命中反应关键词者，记录"药品（反应）"；
 *  - 偏好治疗：近 6 个月就诊的主导科室 + 医嘱类型分布，归纳一句话偏好；
 *  - 风险标志：危急值、显著异常（HH/LL）、多病共存、近期就诊频繁。
 *
 * @param patientId 院内脱敏患者主键
 * @param visits 历史就诊列表（含诊断）
 * @param orders 历史医嘱列表
 * @param labs 历史检验列表
 * @param now ISO 时间戳（测试可注入；默认当前时间）
 * @returns 结构化患者画像
 */
export function buildPatientProfile(
  patientId: string,
  visits: readonly ProfileVisit[],
  orders: readonly ProfileOrder[],
  labs: readonly ProfileLab[],
  now: string = new Date().toISOString(),
): PatientProfile {
  /* ---- 慢病清单：确诊诊断 ∩ 慢病词典，去重 ---- */
  const chronic = new Set<string>();
  for (const v of visits) {
    for (const d of v.diagnoses) {
      if (d.confirmed && isChronicDiagnosis(d.name)) chronic.add(d.name);
    }
  }

  /* ---- 药物反应：医嘱备注 / detail.reaction 命中关键词 ---- */
  const reactions = new Set<string>();
  for (const o of orders) {
    const detailText = o.detail && typeof o.detail.reaction === 'string'
      ? (o.detail.reaction as string)
      : '';
    const haystack = `${o.note ?? ''} ${detailText}`;
    const hit = matchReaction(haystack);
    if (hit) reactions.add(`${drugNameOf(o.content)}（${hit}）`);
  }

  /* ---- 偏好治疗：近 6 个月主导科室 + 医嘱类型 ---- */
  const nowMs = new Date(now).getTime();
  const recent = visits.filter(
    (v) => v.admitAt !== null && nowMs - new Date(v.admitAt as string).getTime() <= HALF_YEAR_MS,
  );
  let preferredTreatment = '暂无足够就诊数据，偏好治疗方式待积累。';
  if (recent.length > 0) {
    const deptCount = new Map<string, number>();
    for (const v of recent) deptCount.set(v.department, (deptCount.get(v.department) ?? 0) + 1);
    const [topDept, topN] = [...deptCount.entries()].sort((a, b) => b[1] - a[1])[0];
    // 医嘱类型分布
    const typeCount = new Map<string, number>();
    for (const o of orders) typeCount.set(o.orderType, (typeCount.get(o.orderType) ?? 0) + 1);
    const topOrderType = typeCount.size > 0
      ? [...typeCount.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : '';
    preferredTreatment = `近6个月就诊${recent.length}次，以${topDept}为主（${topN}次）；医嘱以${topOrderType || '综合治疗'}为主。`;
  }

  /* ---- 风险标志 ---- */
  const flags: string[] = [];
  for (const l of labs) {
    if (l.isCritical) {
      flags.push(`危急值：${l.itemName} ${l.numericValue ?? l.refLow ?? ''}${l.unit ?? ''}`.trim());
    } else if (l.abnormalFlag === 'HH' || l.abnormalFlag === 'LL') {
      flags.push(`显著异常：${l.itemName}（${l.abnormalFlag}）`);
    }
  }
  if (chronic.size >= 2) flags.push(`多病共存（${chronic.size}种慢病）`);
  else if (chronic.size === 1) flags.push('单慢病随访管理');
  if (recent.length >= 3) flags.push('近6个月就诊频繁（≥3次），需关注病情波动');

  return {
    patientId,
    chronicConditions: [...chronic],
    drugReactions: [...reactions],
    preferredTreatment,
    recentVisitsSummary: summarizeVisits(visits),
    riskFlags: flags,
    updatedAt: now,
  };
}

/* -------------------------------------------------------------------------- */
/* 落库：装配 → 纯函数 → UPSERT                                                */
/* -------------------------------------------------------------------------- */

/**
 * 拉取患者历史数据、装配为纯函数输入、生成画像并 UPSERT 覆盖写。
 *
 * 数据来源：
 *  - getVisitsByPatient（近 20 次就诊）
 *  - 逐次 getDiagnosesByVisit 装配诊断
 *  - getOrdersByPatient（近 100 条医嘱）
 *  - getLabResultsByPatient（近 100 条检验）
 *
 * @param patientId 院内脱敏患者主键
 * @returns 生成的患者画像
 */
export async function getPatientProfile(patientId: string): Promise<PatientProfile> {
  if (!patientId) throw new PatientProfileError(400, 'patientId 不能为空');

  const [visits, orders, labs] = await Promise.all([
    getVisitsByPatient(patientId, { limit: 20 }),
    getOrdersByPatient(patientId, { limit: 100 }),
    getLabResultsByPatient(patientId, { limit: 100 }),
  ]);

  // 逐次就诊装配诊断（历史就诊量受限在 20 次内，N+1 可控）
  const profileVisits: ProfileVisit[] = await Promise.all(
    visits.map(async (v) => {
      const diagnoses = await getDiagnosesByVisit(v.id);
      return {
        id: v.id,
        visitType: v.visitType,
        department: v.department,
        chiefComplaint: v.chiefComplaint,
        admitAt: v.admitAt,
        dischargeAt: v.dischargeAt,
        diagnoses: diagnoses.map((d) => ({
          name: d.name,
          code: d.code,
          kind: d.kind,
          confirmed: d.confirmed,
        })),
      };
    }),
  );

  const profileOrders: ProfileOrder[] = orders.map((o) => ({
    content: o.content,
    orderType: o.orderType,
    status: o.status,
    note: o.cancelReason ?? null,
    detail: o.detail ?? null,
  }));

  const profileLabs: ProfileLab[] = labs.map((l) => ({
    itemName: l.itemName,
    itemCode: l.itemCode,
    numericValue: l.numericValue,
    refLow: l.refLow,
    refHigh: l.refHigh,
    abnormalFlag: l.abnormalFlag,
    isCritical: l.isCritical,
    resultTime: l.resultTime,
    unit: l.unit,
  }));

  const profile = buildPatientProfile(patientId, profileVisits, profileOrders, profileLabs);

  // DEMO_MODE：短路不写库
  if (getEnv().demoMode) return profile;

  try {
    const db = getDb();
    await db`
      INSERT INTO medmuse.patient_learning_profile
        (patient_id, chronic_conditions, drug_reactions, preferred_treatment,
         recent_visits_summary, risk_flags, updated_at)
      VALUES
        (${profile.patientId}, ${profile.chronicConditions}, ${profile.drugReactions},
         ${profile.preferredTreatment}, ${profile.recentVisitsSummary},
         ${profile.riskFlags}, now())
      ON CONFLICT (patient_id) DO UPDATE SET
        chronic_conditions    = EXCLUDED.chronic_conditions,
        drug_reactions        = EXCLUDED.drug_reactions,
        preferred_treatment   = EXCLUDED.preferred_treatment,
        recent_visits_summary = EXCLUDED.recent_visits_summary,
        risk_flags            = EXCLUDED.risk_flags,
        updated_at            = now()
    `;
  } catch (e) {
    throw new PatientProfileError(500, `患者画像写入失败：${e instanceof Error ? e.message : '未知错误'}`);
  }

  return profile;
}
