/**
 * 健澜科技 jlmedaios - MEDMUSE agent 学习上下文聚合器（依据宪法第三章）
 *
 * 依据宪法第三章（医疗数据安全与患者权益）：把三路「自学习」数据——
 *   患者画像（patientProfileAggregator）、医生偏好（doctorPreferenceAggregator）、
 *   科室知识（deptKnowledgeAggregator）——聚合为一段可直接注入 agent system prompt
 *   的上下文文本，让 MedMuse 回答时「越用越懂这位患者、这位医生、这个科室」。
 *
 * 设计要点：
 *  - buildAgentContext / priorityOrder 为纯函数，不修改入参、不打库、不读环境，
 *    给定三路输入恒定输出，便于单测与回放；
 *  - 优先级：患者画像 > 医生偏好 > 科室知识（priorityOrder 排序口径），
 *    空数据段自动剔除，全部为空时返回固定兜底文案，绝不拼出空 prompt；
 *  - 隐私红线（依据宪法第三章）：输出文本只含院内脱敏临床标签——
 *    不渲染 patientId / 患者姓名 / 身份证号等直接标识符，长清单截断，
 *    避免上下文窗口爆炸与敏感字段进入模型日志。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type {
  DoctorPreference,
  PreferenceItem,
} from './doctorPreferenceAggregator';
import type { PatientProfile } from './patientProfileAggregator';
import type {
  DeptKnowledgeEntry,
  KnowledgeType,
} from './deptKnowledgeAggregator';

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 上下文段的三路来源标识 */
export type AgentContextKind = 'patientProfile' | 'doctorPreference' | 'deptKnowledge';

/**
 * 优先级权重：患者画像(30) > 医生偏好(20) > 科室知识(10)。
 * 数字越大越靠前；取间隔值便于日后插入新来源而不重排既有相对顺序。
 */
export const CONTEXT_PRIORITY: Readonly<Record<AgentContextKind, number>> = {
  patientProfile: 30,
  doctorPreference: 20,
  deptKnowledge: 10,
};

/** 单个上下文段（priorityOrder 的输入 / 输出单元） */
export interface AgentContextSection {
  /** 来源标识 */
  kind: AgentContextKind;
  /** 优先级权重（取自 CONTEXT_PRIORITY） */
  priority: number;
  /** 渲染后的段文本；空字符串表示该路无数据（priorityOrder 中沉底） */
  text: string;
}

/* ------------------------------------------------------------------ */
/* 渲染辅助（纯函数）                                                   */
/* ------------------------------------------------------------------ */

/** 渲染上限：每类清单最多列出几条，防 prompt 爆炸 */
const MAX_ITEMS_PER_LINE = 5;
/** 科室知识正文截断长度 */
const MAX_KNOWLEDGE_CONTENT_LEN = 80;

/** 知识类型中文标签 */
const KNOWLEDGE_TYPE_LABEL: Readonly<Record<KnowledgeType, string>> = {
  pathway: '临床路径',
  drug: '用药知识',
  diagnosis: '诊断要点',
};

/** 占位文案（空画像学习引擎的默认产出），命中即视为「无实质内容」 */
const PLACEHOLDER_TREATMENT = '暂无足够就诊数据，偏好治疗方式待积累。';
const PLACEHOLDER_VISITS = '暂无就诊记录。';

/**
 * 把权重条目列表渲染为「名称×次数」一行文本；空列表返回空串。
 * @param items 偏好条目
 * @param max   最多列出条数
 */
function renderWeightedLine(items: readonly PreferenceItem[] | null | undefined, max = MAX_ITEMS_PER_LINE): string {
  const list = (items ?? []).filter((i) => i && i.name.trim());
  if (list.length === 0) return '';
  return list
    .slice(0, max)
    .map((i) => (i.count > 1 ? `${i.name}×${i.count}` : i.name))
    .join('、');
}

/**
 * 把字符串标签列表渲染为顿号分隔文本；空列表返回空串。
 * @param labels 标签清单
 * @param max    最多列出条数
 */
function renderLabelLine(labels: readonly string[] | null | undefined, max = MAX_ITEMS_PER_LINE): string {
  const list = (labels ?? []).map((s) => (s ?? '').trim()).filter(Boolean);
  if (list.length === 0) return '';
  return list.slice(0, max).join('、');
}

/* ------------------------------------------------------------------ */
/* 单段渲染（纯函数）                                                   */
/* ------------------------------------------------------------------ */

/**
 * 渲染患者画像段。
 *
 * 脱敏口径（依据宪法第三章）：入参 PatientProfile 本身即「只含院内脱敏主键与
 * 临床标签」的结构，本渲染层进一步**不落 patientId 到文本**——模型只拿到
 * 慢病 / 药物反应 / 风险标志 / 偏好治疗 / 近期就诊摘要等标签，无任何直接标识符。
 *
 * @param profile 患者学习画像
 * @returns 段文本；无任何实质数据时返回空串
 */
export function renderPatientSection(
  profile: PatientProfile | null | undefined,
): string {
  if (!profile) return '';
  const lines: string[] = [];

  const chronic = renderLabelLine(profile.chronicConditions);
  if (chronic) lines.push(`- 慢病：${chronic}`);

  const reactions = renderLabelLine(profile.drugReactions);
  if (reactions) lines.push(`- 药物反应：${reactions}`);

  const risks = renderLabelLine(profile.riskFlags);
  if (risks) lines.push(`- 风险标志：${risks}`);

  const treatment = (profile.preferredTreatment ?? '').trim();
  if (treatment && treatment !== PLACEHOLDER_TREATMENT) {
    lines.push(`- 偏好治疗：${treatment}`);
  }

  const visits = (profile.recentVisitsSummary ?? '').trim();
  if (visits && visits !== PLACEHOLDER_VISITS) {
    lines.push(`- 近期就诊：${visits}`);
  }

  if (lines.length === 0) return '';
  return [`■ 患者画像（最高优先级｜已脱敏）`, ...lines].join('\n');
}

/**
 * 渲染医生偏好段（常用药品 / 检查检验 / 临床路径 TOP5）。
 * @param pref 医生偏好聚合结果
 * @returns 段文本；三类偏好全空时返回空串
 */
export function renderDoctorSection(
  pref: DoctorPreference | null | undefined,
): string {
  if (!pref) return '';
  const lines: string[] = [];

  const drugs = renderWeightedLine(pref.preferredDrugs);
  if (drugs) lines.push(`- 常用药品：${drugs}`);

  const exams = renderWeightedLine(pref.preferredExams);
  if (exams) lines.push(`- 常用检查检验：${exams}`);

  const pathways = renderWeightedLine(pref.commonPathways);
  if (pathways) lines.push(`- 常用临床路径：${pathways}`);

  if (lines.length === 0) return '';
  return [`■ 医生偏好（开方习惯）`, ...lines].join('\n');
}

/**
 * 渲染科室知识段。正文按 MAX_KNOWLEDGE_CONTENT_LEN 截断，
 * 类型以中文标签前缀（临床路径 / 用药知识 / 诊断要点）。
 * @param entries 已按成功率排序的科室知识条目
 * @returns 段文本；无条目时返回空串
 */
export function renderDeptSection(
  entries: DeptKnowledgeEntry[] | null | undefined,
): string {
  const list = (entries ?? []).filter((e) => e && (e.title ?? '').trim());
  if (list.length === 0) return '';

  const lines = list.slice(0, MAX_ITEMS_PER_LINE).map((e) => {
    const typeLabel = KNOWLEDGE_TYPE_LABEL[e.knowledgeType] ?? e.knowledgeType;
    const title = e.title.trim();
    const content = (e.content ?? '').trim().slice(0, MAX_KNOWLEDGE_CONTENT_LEN);
    return content ? `- [${typeLabel}] ${title}：${content}` : `- [${typeLabel}] ${title}`;
  });

  return [`■ 科室知识沉淀`, ...lines].join('\n');
}

/* ------------------------------------------------------------------ */
/* priorityOrder（纯函数）                                              */
/* ------------------------------------------------------------------ */

/**
 * priorityOrder：按优先级对上下文段排序——患者画像 > 医生偏好 > 科室知识。
 *
 * 排序口径：
 *  - 主排序键 priority 降序（患者画像 30 → 医生偏好 20 → 科室知识 10）；
 *  - 空文本段（该路无数据）一律沉底，避免空段排在高优先级位置占位；
 *  - priority 与「是否为空」都相同时按 kind 字典序升序，保证输出确定、可快照。
 *
 * 纯函数：返回排序后的新数组，不修改入参。
 *
 * @param sections 待排序上下文段
 * @returns 排序后的新段数组（空段不剔除，仅沉底；剔除由 buildAgentContext 负责）
 */
export function priorityOrder(
  sections: readonly AgentContextSection[],
): AgentContextSection[] {
  return [...sections].sort((a, b) => {
    const aEmpty = a.text === '';
    const bEmpty = b.text === '';
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
    if (!aEmpty && b.priority !== a.priority) return b.priority - a.priority;
    return a.kind.localeCompare(b.kind);
  });
}

/* ------------------------------------------------------------------ */
/* buildAgentContext（纯函数主入口）                                    */
/* ------------------------------------------------------------------ */

/** system prompt 上下文块的统一抬头 */
const CONTEXT_HEADER =
  '【学习上下文｜以下为系统自学习沉淀，仅供参考，最终诊疗决策由执业医师做出】';

/** 三路数据全空时的兜底文案（明确告知模型「冷启动」，而非静默） */
const EMPTY_FALLBACK =
  '【学习上下文】暂无可复用的学习数据（患者画像 / 医生偏好 / 科室知识均为空），本次属冷启动场景，请优先采集现病史、过敏史与用药史。';

/**
 * buildAgentContext：聚合三路学习数据为一段 system prompt 上下文文本。
 *
 * 流程：
 *  1. 三路数据分别渲染为独立段（空数据段文本为空串）；
 *  2. priorityOrder 按 患者画像 > 医生偏好 > 科室知识 排序，空段沉底；
 *  3. 剔除空段后用抬头 + 段文本拼装；三路全空时返回冷启动兜底文案。
 *
 * 纯函数：不修改入参；任一参数为 null / undefined / 空结构时对应段被剔除，
 *   绝不抛错。
 *
 * 脱敏（依据宪法第三章）：输出仅含临床标签，不携带 patientId / 患者姓名等
 *   直接标识符；清单截断防 prompt 膨胀。
 *
 * @param doctorPref     医生偏好聚合结果（可空）
 * @param patientProfile 患者学习画像（可空）
 * @param deptKnowledge 科室知识条目列表（可空，建议已按成功率排序）
 * @returns 可直接拼入 system prompt 的上下文文本
 */
export function buildAgentContext(
  doctorPref: DoctorPreference | null | undefined,
  patientProfile: PatientProfile | null | undefined,
  deptKnowledge: DeptKnowledgeEntry[] | null | undefined,
): string {
  const sections: AgentContextSection[] = [
    {
      kind: 'patientProfile',
      priority: CONTEXT_PRIORITY.patientProfile,
      text: renderPatientSection(patientProfile),
    },
    {
      kind: 'doctorPreference',
      priority: CONTEXT_PRIORITY.doctorPreference,
      text: renderDoctorSection(doctorPref),
    },
    {
      kind: 'deptKnowledge',
      priority: CONTEXT_PRIORITY.deptKnowledge,
      text: renderDeptSection(deptKnowledge),
    },
  ];

  const ordered = priorityOrder(sections).filter((s) => s.text.length > 0);
  if (ordered.length === 0) return EMPTY_FALLBACK;

  return [CONTEXT_HEADER, ...ordered.map((s) => s.text)].join('\n');
}
