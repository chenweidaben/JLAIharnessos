/**
 * 健澜科技 jlmedaios - VTE 危险因素 LLM 抽取（M13-A，可选/可插拔/默认关闭）
 *
 * 从病历文本中辅助抽取 Caprini/Padua/出血危险因素。
 * 医疗安全红线：
 *  - 未配置 LLM_API_KEY -> 抛 LlmNotConfiguredError，绝不返回写死结果冒充闭环；
 *  - 抽取结果永远是"待确认"，评估人必须逐项人工确认后才计分；
 *  - 本模块不在核心闭环必需路径上，失败/未配置均不影响评分引擎与预防流程。
 *
 * 单测用注入的 fetch stub，不依赖真实网络。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  chatCompletionJson,
  LlmNotConfiguredError,
  LlmTransportError,
} from '../interpret/llmClient.js';
import {
  CAPRINI_FACTORS,
  PADUA_FACTORS,
  BLEEDING_FACTORS,
  type VteScale,
} from './vteRisk.js';

export { LlmNotConfiguredError, LlmTransportError };

export interface ExtractedVteFactors {
  /** 抽取到的 VTE 量表因素 key（须人工逐项确认） */
  vteFactorKeys: string[];
  /** 抽取到的出血因素 key（须人工逐项确认） */
  bleedingFactorKeys: string[];
  /** 恒为 true：抽取结果一律待确认 */
  pendingConfirmation: true;
  /** 模型原文（审计/复核用） */
  raw: string;
}

function factorCatalog(scale: VteScale): string {
  const vte = scale === 'caprini' ? CAPRINI_FACTORS : PADUA_FACTORS;
  const vteLines = Object.values(vte).map((f) => `${f.key}=${f.label}(${f.points}分)`);
  const bleedLines = Object.values(BLEEDING_FACTORS).map((f) => `${f.key}=${f.label}`);
  return [
    `【${scale === 'caprini' ? 'Caprini 外科' : 'Padua 内科'} VTE 因素 key】`,
    vteLines.join('\n'),
    '【出血风险因素 key】',
    bleedLines.join('\n'),
  ].join('\n');
}

/**
 * 从病历文本抽取 VTE/出血危险因素 key。
 * @throws {LlmNotConfiguredError} 未配置 API Key
 * @throws {LlmTransportError}     调用失败
 */
export async function extractVteFactors(
  scale: VteScale,
  text: string,
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<ExtractedVteFactors> {
  const system = [
    '你是医院 VTE 防治中心的临床信息抽取助手。仅根据提供的病历文本，',
    '从给定 key 字典中抽取命中的 VTE 危险因素与出血风险因素。',
    '只输出 JSON，不要解释。格式：',
    '{"vteFactorKeys":["key1"],"bleedingFactorKeys":["key2"]}',
    '未命中则对应数组为空。禁止使用字典外的 key。',
  ].join('');
  const user = `${factorCatalog(scale)}\n\n病历文本：\n${text}`;

  const raw = await chatCompletionJson(system, user, opts);

  // 防御性 JSON 解析
  let parsed: { vteFactorKeys?: unknown; bleedingFactorKeys?: unknown } = {};
  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      parsed = JSON.parse(raw.slice(start, end + 1)) as typeof parsed;
    }
  } catch {
    parsed = {};
  }

  const validVte = new Set(Object.keys(scale === 'caprini' ? CAPRINI_FACTORS : PADUA_FACTORS));
  const validBleed = new Set(Object.keys(BLEEDING_FACTORS));
  const vteKeys = (Array.isArray(parsed.vteFactorKeys) ? parsed.vteFactorKeys : [])
    .map((k) => String(k))
    .filter((k) => validVte.has(k));
  const bleedKeys = (Array.isArray(parsed.bleedingFactorKeys) ? parsed.bleedingFactorKeys : [])
    .map((k) => String(k))
    .filter((k) => validBleed.has(k));

  return {
    vteFactorKeys: vteKeys,
    bleedingFactorKeys: bleedKeys,
    pendingConfirmation: true,
    raw,
  };
}
