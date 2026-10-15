/**
 * 健澜科技 jlmedaios - 药房审方智能助手聚合器（M120-D）
 *
 * 面向药师的审方智能提示：对一张处方在调配前做「人在回路」式风险扫描，
 * 输出四类结构化提示，供前端审方面板展示：
 *  - interactions ：处方内药品之间的相互作用（配伍 / CYP3A4 / 出血叠加等）；
 *  - allergies    ：处方药品与患者过敏史的匹配（青霉素 / 头孢交叉 / 磺胺等）；
 *  - historyBlocks：近期用药史时间线（透传 + 富化风险标记）；
 *  - suggestions  ：综合上述扫描后给出的处置建议（可调配 / 核对 / 暂缓）。
 *
 * 定位边界：本模块为 CDS 辅助提示，不拦截处方、不改变处方审批状态；
 * 最终审方与调配决定由药师本人作出（人在回路）。审方留痕与数据安全要求：
 * 依据宪法第七章（权力监督与数据合规精神），全程只做只读扫描、不落敏感明文。
 *
 * 纯函数约定：buildPharmacyAssistant 无 I/O、确定性、对非法输入安全降级，
 * 单测与前端可直接复用；数据装载见本文件底部 loadAssistantData（best-effort）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import * as prescriptionRepo from '../../db/repositories/prescriptionRepo.js';
import * as visitRepo from '../../db/repositories/visitRepo.js';
import * as patientRepo from '../../db/repositories/patientRepo.js';

export class PharmacyAssistantError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'PharmacyAssistantError';
  }
}

// ---------------------------------------------------------------------------
// 类型（纯数据契约，无 I/O）
// ---------------------------------------------------------------------------

export type RiskLevel = 'info' | 'warning' | 'critical';

/** 处方内药品（通用名优先） */
export interface AssistantDrug {
  id: string;
  name: string;
  dosage?: string | null;
  route?: string | null;
}

export type AllergySeverity = 'mild' | 'moderate' | 'severe';

/** 患者过敏史一条 */
export interface AssistantAllergy {
  allergen: string;
  reaction?: string;
  severity?: AllergySeverity;
}

/** 近期用药史一个时间块 */
export interface HistoryBlock {
  /** 时间窗，如 "近7天" / "2026-09-XX 处方" */
  period: string;
  summary: string;
  riskFlags?: string[];
}

/** 患者上下文（用于特殊人群风险评估） */
export interface AssistantPatient {
  age?: number | null;
  weightKg?: number | null;
  pregnancy?: boolean;
  renalImpaired?: boolean;
}

/** buildPharmacyAssistant 的输入数据 */
export interface PharmacyAssistantData {
  drugs: AssistantDrug[];
  allergies: AssistantAllergy[];
  historyBlocks: HistoryBlock[];
  patient?: AssistantPatient;
}

/** 一条药品相互作用 */
export interface Interaction {
  rule: string;
  drugA: string;
  drugB: string;
  level: RiskLevel;
  reason: string;
  suggestion: string;
}

/** 一条过敏匹配告警 */
export interface AllergyAlert {
  allergen: string;
  drug: string;
  level: RiskLevel;
  reaction: string;
  suggestion: string;
}

/** 一条综合处置建议 */
export interface Suggestion {
  level: RiskLevel;
  title: string;
  detail: string;
  /** 建议药师执行的具体动作 */
  action: string;
}

/** buildPharmacyAssistant 的输出 */
export interface PharmacyAssistantResult {
  pharmacistId: string;
  prescriptionId: string;
  interactions: Interaction[];
  allergies: AllergyAlert[];
  historyBlocks: HistoryBlock[];
  suggestions: Suggestion[];
  /** 全方最高风险级别（critical > warning > info） */
  riskLevel: RiskLevel;
  /** 一句话结论 */
  summary: string;
}

// ---------------------------------------------------------------------------
// 规则表（依据国家处方审核规范 / 药品说明书 / 临床用药须知，子串匹配）
// ---------------------------------------------------------------------------

interface InteractionRule {
  a: string;
  b: string;
  level: RiskLevel;
  reason: string;
  suggestion: string;
}

/** 处方内常见相互作用组合（双方均在处方药品中出现即命中） */
const INTERACTION_RULES: InteractionRule[] = [
  {
    a: '华法林', b: '阿司匹林', level: 'critical',
    reason: '抗凝药 + 抗血小板药联用显著增加消化道及颅内出血风险',
    suggestion: '避免常规联用；如确需联用须评估出血风险并加强凝血监测',
  },
  {
    a: '华法林', b: '布洛芬', level: 'warning',
    reason: 'NSAID 抑制血小板并损伤胃黏膜，增强华法林出血效应',
    suggestion: '镇痛优先选用对乙酰氨基酚；必要时监测 INR',
  },
  {
    a: '辛伐他汀', b: '克拉霉素', level: 'critical',
    reason: 'CYP3A4 强抑制剂显著升高辛伐他汀血药浓度，增加横纹肌溶解风险',
    suggestion: '暂停辛伐他汀或换用普伐他汀，克拉霉素疗程结束后恢复',
  },
  {
    a: '阿托伐他汀', b: '克拉霉素', level: 'warning',
    reason: 'CYP3A4 相互作用升高他汀血药浓度',
    suggestion: '他汀减量或短期暂停，关注肌痛并监测肌酸激酶',
  },
  {
    a: '左氧氟沙星', b: '硫酸亚铁', level: 'warning',
    reason: '喹诺酮与二价金属离子螯合，显著降低口服吸收',
    suggestion: '两者给药间隔至少 2 小时',
  },
  {
    a: '头孢哌酮', b: '酒精', level: 'warning',
    reason: '含 NMTT 侧链的头孢可引起双硫仑样反应',
    suggestion: '用药期间及停药后 7 天禁止饮酒及含酒精制品',
  },
];

interface AllergyFamily {
  /** 过敏史文本中需匹配的关键词 */
  allergenKeyword: string;
  /** 命中该过敏家族的药品名模式 */
  drugPatterns: RegExp[];
}

/** 过敏家族映射：过敏史命中关键词 → 处方药品命中模式即告警 */
const ALLERGY_FAMILIES: AllergyFamily[] = [
  { allergenKeyword: '青霉素', drugPatterns: [/青霉素/, /阿莫西林/, /氨苄西林/, /哌拉西林/, /阿莫西林克拉维酸/] },
  { allergenKeyword: '头孢', drugPatterns: [/头孢/] },
  { allergenKeyword: '磺胺', drugPatterns: [/磺胺/, /复方磺胺甲[噁恶]唑/, /柳氮磺吡啶/] },
  { allergenKeyword: '喹诺酮', drugPatterns: [/左氧/, /莫西/, /环丙/, /诺氟沙星/, /喹诺酮/] },
  { allergenKeyword: '阿司匹林', drugPatterns: [/阿司匹林/] },
  { allergenKeyword: 'NSAID', drugPatterns: [/布洛芬/, /双氯芬酸/, /萘普生/, /塞来昔布/] },
];

/** 特殊人群风险：妊娠禁用/慎用药物 */
const PREGNANCY_RISK_PATTERNS: RegExp[] = [/左氧/, /莫西/, /异维A酸/, /四环素/, /甲硝唑/];
/** 特殊人群风险：肾功能不全需调整剂量药物 */
const RENAL_RISK_PATTERNS: RegExp[] = [/万古霉素/, /氨基糖苷/, /庆大霉素/, /头孢他啶/, /甲氨蝶呤/];

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

/** 风险级别权重，取最高 */
const LEVEL_WEIGHT: Record<RiskLevel, number> = { info: 1, warning: 2, critical: 3 };

function maxLevel(levels: RiskLevel[]): RiskLevel {
  let best: RiskLevel = 'info';
  for (const l of levels) if (LEVEL_WEIGHT[l] > LEVEL_WEIGHT[best]) best = l;
  return best;
}

function normalizeDrugs(input: unknown): AssistantDrug[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((d): d is AssistantDrug => !!d && typeof d === 'object' && typeof (d as AssistantDrug).name === 'string' && (d as AssistantDrug).name.trim().length > 0)
    .map((d) => ({ id: String(d.id ?? ''), name: d.name.trim(), dosage: d.dosage ?? null, route: d.route ?? null }));
}

function normalizeAllergies(input: unknown): AssistantAllergy[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((a): a is AssistantAllergy => !!a && typeof a === 'object' && typeof (a as AssistantAllergy).allergen === 'string')
    .map((a) => ({ allergen: a.allergen.trim(), reaction: a.reaction ?? '', severity: a.severity ?? 'mild' }));
}

function normalizeHistory(input: unknown): HistoryBlock[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((h): h is HistoryBlock => !!h && typeof h === 'object' && typeof (h as HistoryBlock).summary === 'string')
    .map((h) => ({ period: String(h.period ?? ''), summary: h.summary, riskFlags: Array.isArray(h.riskFlags) ? h.riskFlags : [] }));
}

// ---------------------------------------------------------------------------
// 纯函数：buildPharmacyAssistant（无 I/O，单测覆盖）
// ---------------------------------------------------------------------------

/**
 * 审方智能提示主入口（纯函数）。
 *
 * @param pharmacistId  当前审方药师 ID（回显留痕）
 * @param prescriptionId 处方 ID（回显留痕）
 * @param data          处方药品 + 过敏史 + 用药史 + 患者上下文
 *
 * 非法输入一律安全降级为空数组，绝不抛错。
 */
export function buildPharmacyAssistant(
  pharmacistId: string,
  prescriptionId: string,
  data: PharmacyAssistantData,
): PharmacyAssistantResult {
  const drugs = normalizeDrugs(data?.drugs);
  const allergies = normalizeAllergies(data?.allergies);
  const historyBlocks = normalizeHistory(data?.historyBlocks);
  const patient = (data?.patient ?? {}) as AssistantPatient;

  // 1. 相互作用：规则双方均在处方药品中出现即命中
  const interactions: Interaction[] = [];
  for (const rule of INTERACTION_RULES) {
    const hitA = drugs.filter((d) => d.name.includes(rule.a));
    const hitB = drugs.filter((d) => d.name.includes(rule.b));
    if (hitA.length > 0 && hitB.length > 0) {
      interactions.push({
        rule: `interaction.${rule.a}_${rule.b}`,
        drugA: hitA[0].name,
        drugB: hitB[0].name,
        level: rule.level,
        reason: rule.reason,
        suggestion: rule.suggestion,
      });
    }
  }

  // 2. 过敏匹配：过敏史命中家族关键词 + 处方药品命中家族模式
  const allergyAlerts: AllergyAlert[] = [];
  for (const ag of allergies) {
    for (const family of ALLERGY_FAMILIES) {
      if (!ag.allergen.includes(family.allergenKeyword)) continue;
      for (const drug of drugs) {
        if (family.drugPatterns.some((p) => p.test(drug.name))) {
          const level: RiskLevel = ag.severity === 'severe' ? 'critical' : 'warning';
          allergyAlerts.push({
            allergen: ag.allergen,
            drug: drug.name,
            level,
            reaction: ag.reaction || '过敏史阳性',
            suggestion: level === 'critical'
              ? `患者对${family.allergenKeyword}严重过敏，禁止调配${drug.name}，请联系开方医师更换药品`
              : `患者有${family.allergenKeyword}过敏史，调配${drug.name}前须核对并告知过敏反应风险`,
          });
        }
      }
    }
  }

  // 3. 特殊人群风险
  const specialFlags: string[] = [];
  if (patient.renalImpaired) {
    const hits = drugs.filter((d) => RENAL_RISK_PATTERNS.some((p) => p.test(d.name)));
    if (hits.length > 0) {
      specialFlags.push(`肾功能不全患者使用${hits.map((h) => h.name).join('、')}，需按肾功能调整剂量`);
    }
  }
  if (patient.pregnancy) {
    const hits = drugs.filter((d) => PREGNANCY_RISK_PATTERNS.some((p) => p.test(d.name)));
    if (hits.length > 0) {
      specialFlags.push(`妊娠期患者使用${hits.map((h) => h.name).join('、')}，存在妊娠用药风险，须复核`);
    }
  }

  // 4. 综合建议
  const suggestions: Suggestion[] = [];
  const criticalCount =
    interactions.filter((i) => i.level === 'critical').length +
    allergyAlerts.filter((a) => a.level === 'critical').length;
  const warningCount =
    interactions.filter((i) => i.level === 'warning').length +
    allergyAlerts.filter((a) => a.level === 'warning').length +
    specialFlags.length;

  if (criticalCount > 0) {
    suggestions.push({
      level: 'critical',
      title: '建议暂缓调配',
      detail: `发现 ${criticalCount} 项 critical 级用药风险（相互作用 / 严重过敏）`,
      action: '请临床药师复核，并与开方医师沟通调整方案后再行调配',
    });
  }
  if (warningCount > 0) {
    suggestions.push({
      level: 'warning',
      title: '调配前需核对',
      detail: `发现 ${warningCount} 项 warning 级提示（相互作用 / 过敏 / 特殊人群）`,
      action: '逐项核对药品与用法，必要时告知患者注意事项并记录',
    });
  }
  for (const flag of specialFlags) {
    suggestions.push({ level: 'warning', title: '特殊人群剂量复核', detail: flag, action: '请结合肝肾功能 / 妊娠周数复核用法用量' });
  }
  if (interactions.length === 0 && allergyAlerts.length === 0 && specialFlags.length === 0) {
    suggestions.push({
      level: 'info',
      title: '未发现明显用药风险',
      detail: '处方内未检出相互作用、过敏匹配或特殊人群风险',
      action: '可按正常流程审方调配，常规留痕即可',
    });
  }

  const riskLevel = maxLevel([
    ...interactions.map((i) => i.level),
    ...allergyAlerts.map((a) => a.level),
    ...suggestions.map((s) => s.level),
  ]);

  const summary =
    riskLevel === 'critical'
      ? '本处方存在 critical 级风险，建议暂缓调配并联系开方医师'
      : riskLevel === 'warning'
        ? '本处方存在需关注的用药提示，请药师核对后调配'
        : '本处方未见明显用药风险，可按流程调配';

  return {
    pharmacistId: String(pharmacistId ?? ''),
    prescriptionId: String(prescriptionId ?? ''),
    interactions,
    allergies: allergyAlerts,
    historyBlocks,
    suggestions,
    riskLevel,
    summary,
  };
}

// ---------------------------------------------------------------------------
// 数据装载（best-effort，任一失败安全降级为空）
// ---------------------------------------------------------------------------

/** 从患者 allergies / pastHistory 原始 JSON 提取过敏史文本 */
function extractAllergies(raw: unknown): AssistantAllergy[] {
  if (!Array.isArray(raw)) return [];
  const out: AssistantAllergy[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const allergen = String(rec.allergen ?? rec.name ?? rec.substance ?? '').trim();
    if (!allergen) continue;
    out.push({
      allergen,
      reaction: rec.reaction ? String(rec.reaction) : '',
      severity: (rec.severity as AllergySeverity) ?? 'mild',
    });
  }
  return out;
}

/**
 * 装载一张处方的审方数据：处方明细 + 患者过敏史 + 同就诊近期用药史。
 * 处方不存在抛 404；其余（就诊 / 患者 / 既往处方）查不到均安全降级为空。
 */
export async function loadAssistantData(prescriptionId: string): Promise<{ data: PharmacyAssistantData; rxNo: string }> {
  const rx = await prescriptionRepo.getPrescriptionById(prescriptionId);
  if (!rx) throw new PharmacyAssistantError(404, `处方不存在：${prescriptionId}`);

  const drugs: AssistantDrug[] = rx.items.map((it) => ({
    id: String(it.id ?? ''),
    name: it.drugName,
    dosage: it.dosage != null && it.dosageUnit ? `${it.dosage}${it.dosageUnit}` : (it.dosage != null ? String(it.dosage) : null),
    route: it.route ?? null,
  }));

  let allergies: AssistantAllergy[] = [];
  let patientCtx: AssistantPatient = {};
  try {
    const visit = await visitRepo.getVisitById(rx.visitId);
    if (visit) {
      const patient = await patientRepo.getPatientById(visit.patientId);
      if (patient) {
        allergies = extractAllergies(patient.allergies);
        if (patient.birthDate) {
          const age = new Date().getFullYear() - new Date(patient.birthDate).getFullYear();
          patientCtx.age = Number.isFinite(age) ? age : null;
        }
      }
    }
  } catch { /* 就诊/患者查询失败：过敏史按空降级 */ }

  const historyBlocks: HistoryBlock[] = [];
  try {
    const prior = await prescriptionRepo.getPrescriptionsByVisit(rx.visitId, { limit: 10 });
    for (const p of prior) {
      if (p.id === rx.id) continue;
      historyBlocks.push({
        period: p.createdAt.slice(0, 10),
        summary: p.items.map((it) => it.drugName).join('、') || '(空处方)',
        riskFlags: p.status === 'pending_review' ? ['待审方'] : [],
      });
    }
  } catch { /* 既往处方查询失败：用药史按空降级 */ }

  return { data: { drugs, allergies, historyBlocks, patient: patientCtx }, rxNo: rx.rxNo };
}

// ---------------------------------------------------------------------------
// 视图入口（仅要求登录态，不单独设权限码）
// ---------------------------------------------------------------------------

/** GET /api/v1/assistant/pharmacy?prescriptionId=xxx */
export async function viewPharmacyAssistant(view: AuthView, prescriptionId: string): Promise<PharmacyAssistantResult & { rxNo: string }> {
  if (!view?.id) throw new PharmacyAssistantError(401, '未登录');
  const pid = String(prescriptionId ?? '').trim();
  if (!pid) throw new PharmacyAssistantError(400, 'prescriptionId 必填');

  const { data, rxNo } = await loadAssistantData(pid);
  const result = buildPharmacyAssistant(view.id, pid, data);
  return { ...result, rxNo };
}
