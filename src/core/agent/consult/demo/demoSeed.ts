/**
 * 演示种子数据（契约 §0 demo/demoSeed.ts）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * DEMO_MODE 下提供引导文案、确定性示例工具返回与规则快照基线；
 * 全部内容为健康科普与流程演示，不构成诊断、处方或在院医嘱。
 */

import { ACUTE_KEYWORDS } from '../safety/acuteVocabulary';
import type { RoleKind } from '../types';
import { ACUTE_GUIDANCE, DISCLAIMER } from '../types';

/** DEMO 欢迎引导文案（首条会话消息使用） */
export const DEMO_GREETING =
  '您好，这里是健澜AI原生医院操作系统OS在线咨询助手。我可以为您提供健康科普、症状分诊、用药咨询等辅助参考；AI 回复不能替代执业医师 / 药师的面诊与处方决策。如出现急症信号请立即拨打 120 或前往最近急诊。请描述您想咨询的问题。';

/** 各角色确定性引导文案（离线降级模板使用） */
export const ROLE_GUIDANCE: Record<RoleKind, string> = {
  supervisor: '我是分诊主管，将根据您的问题类型安排相应角色协助。',
  examiner: '我需要向您补充确认若干关键信息，以便更准确地理解您的情况。',
  doctor: '我将基于您描述的症状整理诊断建议草稿，供执业医师复核参考。',
  pharmacist: '我将基于您咨询的用药问题整理用药建议草稿，供执业药师 / 医师复核。',
};

/** 知识库 DEMO 条目：按关键词命中返回健康科普摘要（非诊断结论） */
export const SAMPLE_KNOWLEDGE: readonly { keywords: string[]; label: string; snippet: string }[] = [
  {
    keywords: ['咳嗽', '感冒'],
    label: '普通感冒与咳嗽科普',
    snippet:
      '普通感冒多由病毒引起，常见表现为鼻塞、流涕、咳嗽、低热等，多数可在一周左右缓解；若出现高热不退、呼吸困难、胸痛等表现应及时就医。',
  },
  {
    keywords: ['头晕', '眩晕'],
    label: '头晕常见诱因科普',
    snippet:
      '头晕可能与睡眠不足、体位变化、血压波动、内耳问题等多种因素有关；反复或持续头晕、伴肢体麻木无力时应及时线下就诊排查。',
  },
  {
    keywords: ['乏力', '疲劳'],
    label: '乏力常见诱因科普',
    snippet:
      '乏力可能与休息不足、营养状态、贫血、甲状腺功能异常等有关；持续不缓解的乏力建议结合线下检查明确原因。',
  },
  {
    keywords: ['血压', '高血压'],
    label: '高血压日常管理科普',
    snippet:
      '高血压患者应遵医嘱规律监测血压、按时服药，低盐饮食、适度运动；血压明显波动或伴头痛、胸闷等不适时应及时就医。',
  },
];

/** 药品 DEMO 说明书摘要（演示用途，不替代真实药品说明书） */
export const SAMPLE_DRUG_FACTS: readonly { keywords: string[]; label: string; snippet: string }[] =
  [
    {
      keywords: ['布洛芬'],
      label: '布洛芬说明书摘要（DEMO）',
      snippet:
        '布洛芬为非甾体抗炎药，用于缓解轻中度疼痛与发热；消化道溃疡活动期、对非甾体抗炎药过敏者禁用；服药期间避免饮酒，具体用法用量遵说明书与医嘱。',
    },
    {
      keywords: ['阿莫西林'],
      label: '阿莫西林说明书摘要（DEMO）',
      snippet:
        '阿莫西林为青霉素类抗菌药，须凭处方使用；青霉素过敏者禁用；抗菌药不可自行服用或随意停药，疗程与剂量应由医师决定。',
    },
  ];

/** 规则快照基线（GET /rules/snapshot 演示返回） */
export interface RulesSnapshot {
  version: string;
  disclaimer: string;
  acuteGuidance: string;
  acuteKeywords: readonly string[];
  tools: readonly { name: string; description: string; aliases: string[] }[];
  permissions: { readonly READ: string; readonly WRITE: string; readonly AUDIT: string };
}

/** 咨询智能体权限码（与 BFF 权限登记保持一致，演示快照使用） */
export const CONSULT_PERMISSIONS = {
  READ: 'consult-agent:read',
  WRITE: 'consult-agent:write',
  AUDIT: 'consult-agent:audit',
} as const;

/** 内置工具元数据快照（与 tools/toolRegistry.ts 注册项保持一致） */
export const BUILTIN_TOOL_META: readonly {
  name: string;
  description: string;
  aliases: string[];
}[] = [
  {
    name: 'searchKnowledgeBase',
    description: '知识库检索（健康科普条目 DEMO）',
    aliases: ['search_knowledge_base'],
  },
  {
    name: 'lookupDrug',
    description: '药品说明书 / 适应证 / 禁忌 DEMO 摘要',
    aliases: ['lookup_drug'],
  },
  { name: 'checkAllergy', description: '过敏史核对（读取画像事实）', aliases: ['check_allergy'] },
  {
    name: 'checkInteraction',
    description: '药物相互作用提示 DEMO 规则',
    aliases: ['check_interaction'],
  },
  {
    name: 'retrievePatientHistory',
    description: '既往病史 DEMO 读取（画像事实）',
    aliases: ['retrieve_patient_history'],
  },
];

/** 构造规则快照基线对象 */
export function buildRulesSnapshot(): RulesSnapshot {
  return {
    version: 'm86-demo',
    disclaimer: DISCLAIMER,
    acuteGuidance: ACUTE_GUIDANCE,
    acuteKeywords: ACUTE_KEYWORDS,
    tools: BUILTIN_TOOL_META,
    permissions: CONSULT_PERMISSIONS,
  };
}
