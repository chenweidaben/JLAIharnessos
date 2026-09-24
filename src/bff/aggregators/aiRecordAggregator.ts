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
