/**
 * 健澜AI原生医院操作系统OS - security/ai/outputGuard.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * AI 输出侧校验器（五道防线第四道）：在模型输出进入人工确认/回写之前，
 * 执行确定性规则集检查：虚构身份、事实矛盾、确定性诊断红线、敏感承诺表述、
 * Schema 结构、无依据结论、要素完整性。
 *
 * 本模块为纯函数规则集，不依赖数据库、网络与前端资源；
 * 语义级一致性比对（幻觉识别、上下文矛盾语义判定）列入后续切片，
 * 本版仅提供可解释、可单测的确定性规则骨架。
 *
 * @module security/ai/outputGuard
 */

import {
  type AgentRole,
  type CitationRef,
  type FactSnapshot,
  type GuardFinding,
  type GuardRuleId,
  type OutboundContext,
  type OutboundVerdict,
} from './types';

/** 确定性诊断红线词（非医师确认场景命中即阻断） */
const CERTAINTY_REDLINE_PATTERNS: RegExp[] = [
  /确诊为?[^，。；\n]{0,12}(?!依据|根据)/,
  /(一定是|肯定是|必然是|百分之百|百分百|绝对是|毫无疑问|铁定|肯定排除)/,
  /必须(立即)?(手术|住院|切除|输血)/,
  /(确诊|断定|判定)为?(良性|恶性|癌|肿瘤)/,
];

/** 敏感承诺与商业引导红线词 */
const SENSITIVE_REDLINE_PATTERNS: RegExp[] = [
  /(包治|根治|药到病除|无效退款|无毒副作用|神效|特效)/,
  /(推荐购买|指定品牌|指定药品|认准品牌)/,
  /(转院至|最好的医院|排名第一的医院|百分之百疗效)/,
];

/** 诊断/建议/治疗类结论句关键词（无引用检测使用） */
const CLAIM_SENTENCE_KEYWORDS: RegExp =
  /(诊断|拟诊|鉴别诊断|建议|考虑|治疗方案|用药|处方|手术|检查建议|处置|转诊)/;

/** 引用编号格式：[1]、[12] */
const CITATION_REF_PATTERN: RegExp = /\[\d+\]/;

/** 中文句子切分 */
const SENTENCE_SPLITTER: RegExp = /[。！？；\n]/;

export interface OutboundGuardConfig {
  /** 追加覆盖的确定性红线词（与内置词表合并） */
  certaintyOverrides?: RegExp[];
  /** 追加覆盖的敏感承诺词（与内置词表合并） */
  sensitiveOverrides?: RegExp[];
  /** 显式禁用的规则编号（默认全部启用） */
  disabledRules?: GuardRuleId[];
}

interface InternalContext {
  ctx: OutboundContext;
  findings: GuardFinding[];
  enabled: Set<GuardRuleId>;
  config: Required<OutboundGuardConfig>;
}

/** 提取输出文本中的年龄（岁） */
function extractAges(text: string): number[] {
  const out: number[] = [];
  const re = /(\d{1,3})\s*岁/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(Number(m[1]));
  return out;
}

/** 提取输出文本中的性别词 */
function extractGender(text: string): string | undefined {
  if (/性别[:：]?\s*(男)|男性/.test(text)) return '男';
  if (/性别[:：]?\s*(女)|女性/.test(text)) return '女';
  return undefined;
}

/** 非姓名引导词/通用词：医学叙述中"患者"后紧跟的这类词不视为患者姓名 */
const NON_NAME_AFTER_PATIENT = /^(男性|女性|男|女|目前|一般|确诊|断定|否认|排除|不考虑|未见|主诉|现病史|既往史|既往|自述|本人|家属|朋友|子女|丈夫|妻子|儿子|女儿|症状|病情|血压|体温|年龄|姓名|情况|不适|该|其|未|不|已|在|无|有|曾|现|今|昨|本|述|诉|因|查|见)/;

/** 提取输出文本中出现的患者姓名候选；性别词（男性/女性）不算姓名，正则须带 g 标志避免 exec 死循环 */
function extractNames(text: string): string[] {
  const out: string[] = [];
  const patterns = [/患者[:：]?(?!男性|女性)([一-龥]{2,4})/g, /姓名[:：]([一-龥]{2,4})/g];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const name = m[1];
      if (!name || NON_NAME_AFTER_PATIENT.test(name)) continue;
      if (!out.includes(name)) out.push(name);
    }
  }
  return out;
}

/** 按句子切分并保留非空片段 */
function splitSentences(text: string): string[] {
  return text
    .split(SENTENCE_SPLITTER)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 规则 1：虚构身份检测。
 * 输出中的姓名/年龄/性别必须与事实快照一致；快照缺失时不得断言具体身份。
 */
function checkFictionalIdentity(ic: InternalContext): void {
  const { ctx, findings, enabled } = ic;
  if (!enabled.has('fictional-identity')) return;
  const facts: FactSnapshot = ctx.facts;
  const text = ctx.output;

  // 年龄比对
  if (facts.age !== undefined) {
    const ages = extractAges(text);
    const mismatch = ages.find((a) => a !== facts.age);
    if (mismatch !== undefined) {
      findings.push({
        rule: 'fictional-identity',
        severity: 'block',
        excerpt: `年龄 ${mismatch} 岁`,
        message: `输出年龄与事实快照（${facts.age} 岁）不一致，存在虚构身份信息风险`,
        suggestion: '以患者登记信息为准；无法确认时留空并标注待补充',
      });
    }
  }

  // 性别比对
  if (facts.gender) {
    const outputGender = extractGender(text);
    if (outputGender && outputGender !== facts.gender) {
      findings.push({
        rule: 'fictional-identity',
        severity: 'block',
        excerpt: `性别 ${outputGender}`,
        message: `输出性别与事实快照（${facts.gender}）不一致，存在虚构身份信息风险`,
        suggestion: '核对患者登记性别后再生成',
      });
    }
  }

  // 姓名比对
  const names = extractNames(text);
  if (names.length > 0) {
    if (facts.patientName && !names.includes(facts.patientName)) {
      findings.push({
        rule: 'fictional-identity',
        severity: 'block',
        excerpt: `患者 ${names.join('、')}`,
        message: `输出姓名不在事实快照（${facts.patientName}）范围内，存在虚构患者身份风险`,
        suggestion: '仅使用事实快照中的患者姓名；不得推测或补写姓名',
      });
    } else if (!facts.patientName && (facts.age !== undefined || extractGender(text))) {
      findings.push({
        rule: 'fictional-identity',
        severity: 'block',
        excerpt: `患者 ${names.join('、')}`,
        message: '事实快照缺少姓名来源，输出断言了具体身份，属于无来源身份信息',
        suggestion: '身份信息必须由实时取数提供；缺失时留空并提示医师补充',
      });
    }
  }
}

/** 规则 2：事实矛盾检测（v1 确定性关键词比对，语义矛盾列入后续切片） */
function checkContradiction(ic: InternalContext): void {
  const { ctx, findings, enabled } = ic;
  if (!enabled.has('contradiction')) return;
  const facts = ctx.facts;
  const text = ctx.output;

  for (const diagnosis of facts.diagnoses ?? []) {
    if (!diagnosis) continue;
    const negated = new RegExp(`(排除|否认|不考虑|未见患?)${escapeRegExp(diagnosis)}`);
    if (negated.test(text)) {
      findings.push({
        rule: 'contradiction',
        severity: 'caution',
        excerpt: diagnosis,
        message: `输出否认/排除事实快照中已记录的诊断「${diagnosis}」，需人工核对是否为病情演变或笔误`,
        suggestion: '核对病情时间线；如诊断确有调整，应在病程中说明调整依据',
        evidenceRef: diagnosis,
      });
    }
  }

  for (const medication of facts.medications ?? []) {
    if (!medication) continue;
    const stopped = new RegExp(`(未使用|停用|未服用)${escapeRegExp(medication)}`);
    if (stopped.test(text)) {
      findings.push({
        rule: 'contradiction',
        severity: 'caution',
        excerpt: medication,
        message: `输出称未使用/停用事实快照中在用药物「${medication}」，需人工核对医嘱状态`,
        suggestion: '核对最新医嘱与给药记录后再表述用药情况',
        evidenceRef: medication,
      });
    }
  }
}

/** 规则 3：确定性诊断红线（质控/审核角色豁免，由专家复核场景使用） */
function checkCertaintyRedline(ic: InternalContext): void {
  const { ctx, findings, enabled, config } = ic;
  if (!enabled.has('certainty-redline')) return;
  if (ctx.role === 'qc') return;
  const patterns = [...CERTAINTY_REDLINE_PATTERNS, ...(config.certaintyOverrides ?? [])];
  for (const pattern of patterns) {
    const m = pattern.exec(ctx.output);
    if (m) {
      findings.push({
        rule: 'certainty-redline',
        severity: 'block',
        excerpt: m[0],
        message: 'AI 初稿不得出具确定性诊断或强制性治疗结论，越出辅助生成边界',
        suggestion: '改为"初步考虑""建议结合检查进一步明确"等不确定性表述，由医师确认后定稿',
      });
      break;
    }
  }
}

/** 规则 4：敏感承诺与商业引导红线 */
function checkSensitiveRedline(ic: InternalContext): void {
  const { ctx, findings, enabled, config } = ic;
  if (!enabled.has('sensitive-redline')) return;
  const patterns = [...SENSITIVE_REDLINE_PATTERNS, ...(config.sensitiveOverrides ?? [])];
  for (const pattern of patterns) {
    const m = pattern.exec(ctx.output);
    if (m) {
      findings.push({
        rule: 'sensitive-redline',
        severity: 'block',
        excerpt: m[0],
        message: '输出包含疗效承诺、商业推荐或指定机构等违规表述',
        suggestion: '删除承诺性与商业引导内容；药品与机构建议须基于院内规范与诊疗需要',
      });
      break;
    }
  }
}

/** 规则 5：Schema 结构校验（必填字段完整性；重试耗尽升级阻断） */
function checkSchemaShape(ic: InternalContext): void {
  const { ctx, findings, enabled } = ic;
  if (!enabled.has('schema-shape')) return;
  if (!ctx.requiredFields || ctx.requiredFields.length === 0) return;
  const payload = ctx.structuredPayload ?? {};
  const missing: string[] = [];
  for (const field of ctx.requiredFields) {
    const value = payload[field];
    if (value === undefined || value === null || value === '') missing.push(field);
  }
  if (missing.length === 0) return;

  const exhausted = (ctx.schemaFailures ?? 0) >= 2;
  findings.push({
    rule: 'schema-shape',
    severity: exhausted ? 'block' : 'caution',
    excerpt: missing.join(', '),
    message: exhausted
      ? `结构化输出重试两次后仍缺失必填字段：${missing.join('、')}`
      : `结构化输出缺失必填字段：${missing.join('、')}，触发格式重试`,
    suggestion: '补充缺失字段后重新生成；连续失败转人工确认队列',
  });
}

/** 规则 6：无依据结论检测（结论句必须携带引用编号；证据级别为 none 时优先阻断） */
function checkUnsupportedClaim(ic: InternalContext): void {
  const { ctx, findings, enabled } = ic;
  if (!enabled.has('unsupported-claim')) return;
  const citations: CitationRef[] = ctx.citations ?? [];
  const noEvidence = ctx.evidenceLevel === 'none' || citations.length === 0;
  const sentences = splitSentences(ctx.output);

  for (const sentence of sentences) {
    if (!CLAIM_SENTENCE_KEYWORDS.test(sentence)) continue;
    const hasRef = CITATION_REF_PATTERN.test(sentence);
    if (!hasRef && noEvidence) {
      findings.push({
        rule: 'unsupported-claim',
        severity: 'block',
        excerpt: truncate(sentence, 80),
        message: '诊断/建议/治疗类结论未引用知识依据，且当前检索无有效证据',
        suggestion: '补充检索依据并标注引用编号；无依据时标注"（待核实）"或留空，不得下结论',
      });
    } else if (!hasRef && citations.length > 0) {
      findings.push({
        rule: 'unsupported-claim',
        severity: 'caution',
        excerpt: truncate(sentence, 80),
        message: '结论句未标注对应引用编号，溯源链不完整',
        suggestion: '在结论句末尾标注引用编号，确保可点击查看原文',
      });
    }
  }
}

/** 规则 7：文书要素完整性（必备章节关键词缺失提示补充） */
function checkFormatCompleteness(ic: InternalContext): void {
  const { ctx, findings, enabled } = ic;
  if (!enabled.has('format-completeness')) return;
  const expected = ctx.expectedSections ?? [];
  if (expected.length === 0) return;
  const missing = expected.filter((section) => !ctx.output.includes(section));
  if (missing.length > 0) {
    findings.push({
      rule: 'format-completeness',
      severity: 'caution',
      excerpt: missing.join('、'),
      message: `文书缺少必备要素：${missing.join('、')}`,
      suggestion: '按文书模板补齐缺失要素；无法确认的信息列入待补充清单',
    });
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** 规则执行顺序（与技术文档 3.6.4 规则集编号一致） */
const RULE_CHAIN: Array<(ic: InternalContext) => void> = [
  checkFictionalIdentity,
  checkContradiction,
  checkCertaintyRedline,
  checkSensitiveRedline,
  checkSchemaShape,
  checkUnsupportedClaim,
  checkFormatCompleteness,
];

/**
 * AI 输出侧校验器。
 * 纯函数规则集；可通过配置禁用规则或追加词表。
 */
export class OutboundGuard {
  private readonly config: Required<OutboundGuardConfig>;

  constructor(config: OutboundGuardConfig = {}) {
    this.config = {
      certaintyOverrides: config.certaintyOverrides ?? [],
      sensitiveOverrides: config.sensitiveOverrides ?? [],
      disabledRules: config.disabledRules ?? [],
    };
  }

  /** 执行校验，返回处置结论 */
  guard(ctx: OutboundContext): OutboundVerdict {
    const findings: GuardFinding[] = [];
    const enabled = new Set<GuardRuleId>([
      'fictional-identity',
      'contradiction',
      'certainty-redline',
      'sensitive-redline',
      'schema-shape',
      'unsupported-claim',
      'format-completeness',
    ]);
    for (const rule of this.config.disabledRules) enabled.delete(rule);

    const ic: InternalContext = { ctx, findings, enabled, config: this.config };
    for (const rule of RULE_CHAIN) rule(ic);

    const blockFindings = findings.filter((f) => f.severity === 'block');
    const cautionFindings = findings.filter((f) => f.severity === 'caution');

    let level: OutboundVerdict['level'] = 'PASS';
    let sanitizedOutput = ctx.output;
    let blockedReason: string | undefined;
    let retryable = false;

    if (blockFindings.length > 0) {
      level = 'BLOCK';
      sanitizedOutput = '';
      blockedReason = blockFindings.map((f) => f.message).join('；');
      retryable = blockFindings.some(
        (f) => f.rule === 'schema-shape' && (ctx.schemaFailures ?? 0) < 2,
      );
    } else if (cautionFindings.length > 0) {
      level = 'CAUTION';
      const notes = cautionFindings.map((f) => f.message).join('；');
      sanitizedOutput = `${ctx.output}\n\n（待核实：${notes}）`;
      retryable = cautionFindings.some((f) => f.rule === 'schema-shape');
    }

    return { level, findings, sanitizedOutput, blockedReason, retryable };
  }
}

/** 便捷函数：使用默认配置执行一次校验 */
export function guardOutbound(ctx: OutboundContext): OutboundVerdict {
  return new OutboundGuard().guard(ctx);
}

/** 智能体角色导出类型别名，便于调用方按角色选择规则口径 */
export type { AgentRole };
