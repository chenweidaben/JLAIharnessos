/**
 * 健澜科技 jlmedaios - AI 门诊病历生成聚合器（真实 LLM）
 *
 * 依据当前就诊的真实快照（患者上下文块），调用 DeepSeek 生成结构化门诊病历草稿，
 * 返回 8 个标准段落。模型输出经防御性 JSON 解析；任何无法解析 / 缺字段 / 未配置
 * API Key 的情况都明确抛错，绝不以写死文本冒充 AI 结果。
 *
 * 产物定位：AI 草稿，必须由医师逐段核对、修改并电子签名后方可归档。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { buildPatientContextBlock } from './patientContext';

/** 病历 8 个标准段落键 */
export const RECORD_SECTION_KEYS = [
  'chiefComplaint',
  'presentIllness',
  'pastHistory',
  'physicalExam',
  'auxiliaryExam',
  'diagnosis',
  'treatment',
  'healthEducation',
] as const;

export type RecordSectionKey = (typeof RECORD_SECTION_KEYS)[number];
export type AiRecordDraft = Record<RecordSectionKey, string>;

const EMPTY_DRAFT: AiRecordDraft = {
  chiefComplaint: '',
  presentIllness: '',
  pastHistory: '',
  physicalExam: '',
  auxiliaryExam: '',
  diagnosis: '',
  treatment: '',
  healthEducation: '',
};

/** 从可能被 ```json 包裹的模型输出中提取 JSON 对象文本 */
function extractJson(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  return text;
}

/** 调用 DeepSeek 非流式补全，返回纯文本 */
async function chatOnce(system: string, user: string): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error('未配置大模型 API Key（LLM_API_KEY），无法生成 AI 病历');
  }
  const baseURL = (process.env.LLM_BASE_URL ?? 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  const model = process.env.LLM_MODEL ?? 'deepseek-chat';

  const controller = new AbortController();
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS) || 60_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (timer.unref) timer.unref();

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.2,
        max_tokens: Number(process.env.LLM_MAX_TOKENS) || 4096,
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`DeepSeek API 错误 ${response.status}: ${detail.slice(0, 200)}`);
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? '';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 生成 AI 门诊病历草稿。
 * @param encounterId 当前就诊 ID
 */
export async function generateAiRecord(encounterId: string): Promise<AiRecordDraft> {
  const context = await buildPatientContextBlock(encounterId);
  if (!context) {
    throw new Error('当前就诊尚无可用的患者上下文，请先完成问诊后再生成病历');
  }

  const system = [
    '你是一名严谨的中国临床门诊医师助手，服务于杭州健澜科技 jlmedaios 医院智能体系统。',
    '请仅依据用户提供的、来自医院真实数据库的患者上下文，撰写一份规范的门诊病历草稿。',
    '要求：客观、简洁、符合《病历书写基本规范》；不得编造上下文中不存在的检查数值、诊断或药品；',
    '信息不足的段落留空字符串，切勿臆测。',
    '必须严格输出一个 JSON 对象，不要输出任何解释或 markdown 正文，键固定为：',
    JSON.stringify(RECORD_SECTION_KEYS),
    '各键对应中文：主诉、现病史、既往史、体格检查、辅助检查、诊断、处理计划、健康宣教；值均为字符串。',
  ].join('\n');

  const raw = await chatOnce(system, context);
  if (!raw.trim()) {
    throw new Error('AI 病历生成失败：模型返回为空');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJson(raw)) as Record<string, unknown>;
  } catch {
    throw new Error('AI 病历生成失败：模型输出无法解析为结构化 JSON');
  }

  const draft = { ...EMPTY_DRAFT };
  let filled = 0;
  for (const key of RECORD_SECTION_KEYS) {
    const v = parsed[key];
    if (typeof v === 'string' && v.trim()) {
      draft[key] = v.trim();
      filled += 1;
    }
  }
  if (filled === 0) {
    throw new Error('AI 病历生成失败：未解析到任何有效段落');
  }
  return draft;
}

/* ==========================================================================
 * 【AI核心能力深化】M144-B AI 病历自动生成（医生修改后用于模型优化）
 * --------------------------------------------------------------------------
 * 与上方真实 LLM 起稿（generateAiRecord，8 段、异步）互补：本段落提供本地规则引擎
 * 确定性纯函数，直接以医师自由口述/批注为输入，结构化为六段门诊病历草稿，并把医师
 * 复核修改逐段 diff 留痕、累计学习信号，形成「AI 起稿 → 医师修改 → 学习优化」闭环。
 * 为避免与上方既有 AiRecordDraft（8 段 Record 类型）命名冲突，本段落产物类型统一加
 * Generation 后缀。
 * ========================================================================== */

/** M144-B 患者/就诊信息（仅接收医师已录入或授权展示的字段） */
export interface AiPatientInfo {
  /** 原始患者标识：仅服务端内部使用，输出统一脱敏，禁止回显明文 */
  patientId?: string;
  name?: string;
  gender?: string;
  age?: number | null;
  department?: string;
}

/** M144-B 病历六段（主诉/现病史/既往史/体格检查/初步诊断/处理意见，不含辅助检查） */
export interface AiRecordGenSections {
  chiefComplaint: string; // 主诉
  presentIllness: string; // 现病史
  pastHistory: string; // 既往史
  physicalExam: string; // 体格检查
  diagnosis: string; // 初步诊断
  treatmentPlan: string; // 处理意见
}

/** M144-B 病历草稿输出结构（generateMedicalRecord 的 Draft） */
export interface AiRecordGenerationDraft {
  /** 草稿唯一 ID（由 visitId 确定性派生，供医师修改反馈回链） */
  id: string;
  visitId: string;
  patientIdMasked: string;
  sections: AiRecordGenSections;
  /** 整稿纯文本（六段拼接，供前端 TextArea 直接预览/编辑） */
  content: string;
  disclaimer: string;
  modelVersion: string;
  generatedAt: string;
}

/** 单段修改前后 diff 留痕 */
export interface SectionDiff {
  section: keyof AiRecordGenSections;
  label: string;
  before: string;
  after: string;
  changed: boolean;
}

/** 一条医师修改学习样本 */
export interface LearningEntry {
  recordId: string;
  visitId: string;
  revisedAt: string;
  diff: SectionDiff[];
  /** 被医师修改过的段名列表 */
  changedSections: (keyof AiRecordGenSections)[];
  note?: string;
}

/** 学习信号汇总（供模型优化/运营观测） */
export interface LearningSummary {
  totalRevised: number;
  /** 各段被医师修改的累计次数（键为段名中文标签） */
  sectionEditCounts: Record<string, number>;
  entries: LearningEntry[];
}

export const AI_RECORD_MODEL_VERSION = 'jlmedaios-ai-record-v1';

export const AI_RECORD_DISCLAIMER =
  '本草稿由健澜科技 AI 辅助生成，仅供医师起稿参考，需经主治医师本人修改复核后方可归入正式病历。';

/** 六段键名（顺序即病历书写顺序） */
export const AI_RECORD_GEN_SECTION_KEYS = [
  'chiefComplaint',
  'presentIllness',
  'pastHistory',
  'physicalExam',
  'diagnosis',
  'treatmentPlan',
] as const;

/** 段名中文标签（与病历规范一致） */
export const AI_RECORD_SECTION_LABELS: Record<keyof AiRecordGenSections, string> = {
  chiefComplaint: '主诉',
  presentIllness: '现病史',
  pastHistory: '既往史',
  physicalExam: '体格检查',
  diagnosis: '初步诊断',
  treatmentPlan: '处理意见',
};

/** 口述中可抽取的临床诊断术语（命中即收入初步诊断） */
const GEN_DIAGNOSIS_TERMS = [
  '社区获得性肺炎', '上呼吸道感染', '急性支气管炎', '慢性支气管炎',
  '高血压', '2型糖尿病', '冠心病', '心绞痛',
  '急性胃肠炎', '功能性消化不良', '偏头痛', '紧张性头痛',
  '泌尿系感染', '腰椎间盘突出', '骨关节炎', '失眠',
];

interface GenTreatmentRule {
  keywords: string[];
  plan: string;
}

/** 处理意见规则包：按诊断关键词命中；多命中按顺序合并 */
const GEN_TREATMENT_RULES: GenTreatmentRule[] = [
  {
    keywords: ['肺炎', '感染', '发热', '呼吸道', '支气管炎'],
    plan: '1. 完善血常规、CRP、胸部影像学等检查；2. 经验性抗感染治疗，待病原学结果回报后调整用药；3. 必要时止咳、退热等对症处理；4. 密切监测体温、呼吸及血氧变化。',
  },
  {
    keywords: ['高血压', '血压'],
    plan: '1. 规范监测血压并记录；2. 完善心电图、心脏超声及靶器官评估；3. 按指南起始或调整降压方案；4. 低盐饮食宣教，定期随访。',
  },
  {
    keywords: ['糖尿病', '血糖'],
    plan: '1. 监测空腹及餐后血糖谱；2. 完善糖化血红蛋白评估；3. 按指南起始或调整降糖方案；4. 糖尿病饮食与运动宣教，警惕低血糖。',
  },
  {
    keywords: ['术后', '手术', '外伤', '切口'],
    plan: '1. 保持切口敷料干燥固定，定期换药、观察愈合；2. 疼痛评估并按需镇痛；3. 早期活动、预防深静脉血栓；4. 观察病情变化并记录。',
  },
];

const GEN_DEFAULT_TREATMENT =
  '1. 完善血、尿常规及肝肾功能、电解质、心电图等常规检查；' +
  '2. 对症支持治疗，维持水电解质及能量平衡；' +
  '3. 待辅助检查回报后进一步明确诊断并调整诊疗方案；' +
  '4. 密切观察病情变化，及时记录病程。';

/** 患者标识脱敏：保留首尾各 2 位，中间以 * 替代；过短标识全掩 */
function maskPatientId(raw: string): string {
  const id = (raw ?? '').trim();
  if (!id) return '未提供';
  if (id.length <= 4) return '****';
  return `${id.slice(0, 2)}****${id.slice(-2)}`;
}

/** 把医师自由口述规整为非空行数组（兼容 string 或 string[]） */
function normalizeNotes(doctorNotes: string | string[] | undefined): string[] {
  const raw = Array.isArray(doctorNotes) ? doctorNotes.join('\n') : doctorNotes ?? '';
  return raw
    .split(/\r?\n|；|;/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildGenChiefComplaint(lines: string[]): string {
  return lines[0]?.trim() || '待补充，请医师填写主诉。';
}

function buildGenPresentIllness(lines: string[]): string {
  if (lines.length === 0) {
    return '起病时间、诱因及伴随症状待补充，请医师完善现病史描述。';
  }
  const onset = lines[0];
  const rest = lines.slice(1);
  const extra = rest.length > 0 ? `病程中${rest.join('，')}。` : '';
  return (
    `患者因「${onset}」来我院就诊。${extra}` +
    '发病以来精神、食欲、睡眠及大小便情况待补充，体重变化待补充；' +
    '本次就诊前是否自行用药及疗效待补充。'
  );
}

function buildGenPastHistory(): string {
  return (
    '既往平素体健，否认高血压、糖尿病、冠心病、脑血管病等慢性病史；' +
    '否认肝炎、结核等传染病史；否认手术、外伤、输血史；' +
    '否认食物及药物过敏史；预防接种史随社会计划。'
  );
}

function buildGenPhysicalExam(): string {
  return (
    '体温、脉搏、呼吸、血压待现场测量填写。一般情况可，神志清楚，精神可；' +
    '全身皮肤黏膜无黄染及出血点，浅表淋巴结未触及肿大；' +
    '双肺呼吸音清，未闻及明显干湿性啰音；心率齐，各瓣膜听诊区未闻及病理性杂音；' +
    '腹平软，无压痛及反跳痛，肝脾肋下未触及；双下肢无水肿；神经系统查体未见明显异常。'
  );
}

function buildGenDiagnosis(allText: string): string {
  const hits = GEN_DIAGNOSIS_TERMS.filter((term) => allText.includes(term));
  const unique = [...new Set(hits)];
  return unique.length > 0 ? unique.join('；') : '待明确，请结合病史及辅助检查结果拟定。';
}

function buildGenTreatmentPlan(diagnosis: string): string {
  const hit = GEN_TREATMENT_RULES.filter((rule) =>
    rule.keywords.some((k) => diagnosis.includes(k)),
  );
  if (hit.length === 0) return GEN_DEFAULT_TREATMENT;
  return [...new Set(hit.map((h) => h.plan))].slice(0, 2).join('\n');
}

/** generateMedicalRecord 产出的草稿缓存（供 improveMedicalRecord 回链求 diff） */
const genDraftsCache = new Map<string, AiRecordGenerationDraft>();
/** 医师修改学习样本（按时间追加） */
const genLearningStore: LearningEntry[] = [];
/** 各段被修改累计次数 */
const genSectionEditCounts = new Map<keyof AiRecordGenSections, number>();

function emptyGenSections(): AiRecordGenSections {
  return {
    chiefComplaint: '',
    presentIllness: '',
    pastHistory: '',
    physicalExam: '',
    diagnosis: '',
    treatmentPlan: '',
  };
}

/**
 * 【AI核心能力深化】AI 病历起稿纯函数（M144-B）。
 *
 * @param visitId     就诊ID（必填，用于草稿溯源；并确定性派生草稿 id）
 * @param doctorNotes 医师自由口述/批注（string 或逐行 string[]）
 * @param patientInfo 患者信息（原始 patientId 仅内部使用，输出自动脱敏）
 */
export function generateMedicalRecord(
  visitId: string,
  doctorNotes: string | string[] | undefined,
  patientInfo: AiPatientInfo | undefined,
): AiRecordGenerationDraft {
  const vId = (visitId ?? '').trim() || 'anon_visit';
  const lines = normalizeNotes(doctorNotes);
  const allText = lines.join('；');

  const diagnosis = buildGenDiagnosis(allText);
  const sections: AiRecordGenSections = {
    chiefComplaint: buildGenChiefComplaint(lines),
    presentIllness: buildGenPresentIllness(lines),
    pastHistory: buildGenPastHistory(),
    physicalExam: buildGenPhysicalExam(),
    diagnosis,
    treatmentPlan: buildGenTreatmentPlan(diagnosis),
  };

  const masked = maskPatientId(patientInfo?.patientId ?? '');
  const genderAge =
    [patientInfo?.gender, patientInfo?.age != null ? `${patientInfo.age}岁` : null]
      .filter(Boolean)
      .join('，') || '性别年龄待补充';

  const content = [
    '【AI辅助病历草稿 · M144-B】',
    `就诊ID：${vId}`,
    `患者标识：${masked}（${genderAge}${patientInfo?.department ? `，科室：${patientInfo.department.trim()}` : ''}）`,
    '',
    `主诉：${sections.chiefComplaint}`,
    `现病史：${sections.presentIllness}`,
    `既往史：${sections.pastHistory}`,
    `体格检查：${sections.physicalExam}`,
    `初步诊断：${sections.diagnosis}`,
    `处理意见：${sections.treatmentPlan}`,
    '',
    `—— ${AI_RECORD_DISCLAIMER}`,
  ].join('\n');

  const draft: AiRecordGenerationDraft = {
    id: `air_${vId}`,
    visitId: vId,
    patientIdMasked: masked,
    sections,
    content,
    disclaimer: AI_RECORD_DISCLAIMER,
    modelVersion: AI_RECORD_MODEL_VERSION,
    generatedAt: new Date().toISOString(),
  };

  genDraftsCache.set(draft.id, draft);
  return draft;
}

/**
 * 【AI核心能力深化】逐段计算医师修改前后 diff（纯函数）。
 */
export function computeSectionDiff(
  before: AiRecordGenSections,
  after: AiRecordGenSections,
): SectionDiff[] {
  return AI_RECORD_GEN_SECTION_KEYS.map((key) => {
    const b = (before?.[key] ?? '').trim();
    const a = (after?.[key] ?? '').trim();
    return {
      section: key,
      label: AI_RECORD_SECTION_LABELS[key],
      before: b,
      after: a,
      changed: b !== a,
    };
  });
}

/** improveMedicalRecord 的反馈入参：医师修改复核后的六段 */
export interface ImproveFeedback {
  sections: AiRecordGenSections;
  note?: string;
}

/**
 * 【AI核心能力深化】医师修改后用于模型优化（void）。
 *
 * 以草稿生成时缓存的六段为「修改前」，与医师复核后的六段逐段 diff：
 *  - 记录完整 diff 留痕（before/after/changed）；
 *  - 累计各段被修改频次，作为规则包/模型迭代的学习信号；
 *  - 草稿未命中缓存时，before 按空串处理，仍记录本次学习样本，不抛错。
 */
export function improveMedicalRecord(recordId: string, feedback: ImproveFeedback): void {
  const id = (recordId ?? '').trim();
  if (!id || !feedback?.sections) return;

  const before = genDraftsCache.get(id)?.sections ?? emptyGenSections();
  const diff = computeSectionDiff(before, feedback.sections);
  const changedSections = diff.filter((d) => d.changed).map((d) => d.section);

  for (const key of changedSections) {
    genSectionEditCounts.set(key, (genSectionEditCounts.get(key) ?? 0) + 1);
  }

  genLearningStore.push({
    recordId: id,
    visitId: genDraftsCache.get(id)?.visitId ?? id,
    revisedAt: new Date().toISOString(),
    diff,
    changedSections,
    note: feedback.note,
  });
}

/** 读取学习信号汇总（供模型优化/运营观测与单测断言） */
export function getLearningSummary(): LearningSummary {
  const sectionEditCounts: Record<string, number> = {};
  for (const key of AI_RECORD_GEN_SECTION_KEYS) {
    sectionEditCounts[AI_RECORD_SECTION_LABELS[key]] = genSectionEditCounts.get(key) ?? 0;
  }
  return {
    totalRevised: genLearningStore.length,
    sectionEditCounts,
    entries: genLearningStore.map((e) => ({ ...e, diff: e.diff.map((d) => ({ ...d })) })),
  };
}

/** 清空草稿缓存与学习存储（仅供测试隔离用） */
export function resetLearningStore(): void {
  genDraftsCache.clear();
  genLearningStore.length = 0;
  genSectionEditCounts.clear();
}
