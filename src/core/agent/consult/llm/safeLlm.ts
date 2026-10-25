/**
 * 安全降级 LLM 端口（契约 §9，红线 §15-7）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 凭证仅从 process.env 读取（ANTHROPIC_API_KEY / OPENAI_API_KEY / DEEPSEEK_API_KEY）；
 * 当前实现不发起任何网络请求，直接产出角色确定性模板文案，degraded 恒为 true；
 * 无凭证时同样走确定性引导，不联网、不产生临床结论。所有文案附带免责声明。
 */

import type { RoleKind } from '../types';

/** 安全 LLM 端口契约 */
export interface SafeLlmPort {
  /** 是否检测到任一在线模型凭证（当前仅用于能力探测，不触发联网） */
  isAvailable(): boolean;
  /** 确定性模板补全；degraded 恒为 true，文案不构成临床结论 */
  complete(prompt: string, role: RoleKind): Promise<{ text: string; degraded: boolean }>;
}

/** 在线模型凭证环境变量名清单（仅此三项，不读取其他配置源） */
const CREDENTIAL_ENV_KEYS = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY'] as const;

/** 按角色返回确定性模板引导文案（不含确诊 / 处方结论） */
function roleTemplate(role: RoleKind, prompt: string): string {
  const topic = prompt.trim().slice(0, 40);
  switch (role) {
    case 'supervisor':
      return topic
        ? `已接收您关于“${topic}”的咨询，正在为您分诊，将按问题类型安排相应角色协助处理。`
        : '已接收您的咨询，正在为您分诊，将按问题类型安排相应角色协助处理。';
    case 'examiner':
      return '为了更准确地了解您的情况，需要向您补充确认若干关键信息，待信息收集完整后再进入下一步。';
    case 'doctor':
      return '基于您描述的症状整理如下诊断建议草稿，仅作就诊方向参考，需经执业医师面诊复核，AI 不构成确诊结论。';
    case 'pharmacist':
      return '基于您咨询的用药问题整理如下用药建议草稿，需经执业医师 / 药师复核后方可使用，AI 不直接开具处方或在院医嘱。';
  }
}

/** 确定性降级 LLM 实现（不联网） */
class DeterministicSafeLlm implements SafeLlmPort {
  isAvailable(): boolean {
    return CREDENTIAL_ENV_KEYS.some((key) => Boolean(process.env[key]?.trim()));
  }

  async complete(prompt: string, role: RoleKind): Promise<{ text: string; degraded: boolean }> {
    const body = roleTemplate(role, prompt);
    // 当前阶段不发起网络请求：即使检测到凭证，也先返回离线确定性模板，避免未评审的临床输出。
    // 免责声明由角色 / 编排器在最终回复与草稿中统一附着，保证每条输出恰好常驻一次。
    return {
      text: `${body}（当前为离线确定性引导，未调用在线模型，仅供参考）`,
      degraded: true,
    };
  }
}

/** 创建安全 LLM 端口实例 */
export function createSafeLlm(): SafeLlmPort {
  return new DeterministicSafeLlm();
}
