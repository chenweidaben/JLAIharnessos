/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 意图分类器（IntentClassifier）
 * 基于规则 + 关键词的快速意图识别，不依赖 LLM，毫秒级响应。
 * 对应设计文档：02-Agent能力与医疗工具设计 §1.8.1 第1层意图分类。
 */

import type { IntentClassification } from '@/types/agent';

// ============================================================
// 意图类型
// ============================================================

/**
 * 业务意图类型
 *
 * 覆盖门诊/住院/医技/管理/教学/科研等主要场景。
 */
export type IntentType =
  | '问诊'
  | '病历书写'
  | '病历查询'
  | '医嘱开具'
  | '医嘱查询'
  | '检验开具'
  | '检验查询'
  | '影像查询'
  | '诊断建议'
  | '治疗方案'
  | '用药咨询'
  | '质控检查'
  | '教学培训'
  | '科研分析'
  | '运营管理'
  | '系统设置';

/**
 * 意图识别结果（含匹配的关键词与权重）
 */
export interface IntentScore extends IntentClassification {
  /** 命中的关键词列表 */
  readonly matchedKeywords: readonly string[];
  /** 意图类型 */
  readonly intentType: IntentType;
}

/** 单条规则：意图 → 关键词列表 */
interface IntentRule {
  readonly intent: IntentType;
  readonly keywords: readonly string[];
}

// ============================================================
// 关键词规则表
// ============================================================

/**
 * 意图关键词规则表
 *
 * 关键词按"强信号"优先排序，命中越多置信度越高。
 * 中文医疗术语为主，兼顾常见缩写。
 */
const INTENT_RULES: readonly IntentRule[] = [
  {
    intent: '问诊',
    keywords: ['接诊', '问诊', '主诉', '现病史', '追问', '病史采集', '开始看病', '接诊这位患者'],
  },
  {
    intent: '病历书写',
    keywords: [
      '写病历',
      '病程记录',
      '出院小结',
      '入院记录',
      '首次病程',
      '生成病历',
      '写个病程',
      '病历草稿',
      '大病历',
    ],
  },
  {
    intent: '病历查询',
    keywords: ['查病历', '查看病历', '既往病历', '历史病历', '病历内容', '找一下病历', '这份病历'],
  },
  {
    intent: '医嘱开具',
    keywords: ['开医嘱', '下医嘱', '开处方', '开药', '开具医嘱', '下处方', '开立医嘱'],
  },
  {
    intent: '医嘱查询',
    keywords: ['医嘱列表', '查医嘱', '当前医嘱', '医嘱情况', '已开医嘱', '今天的医嘱'],
  },
  {
    intent: '检验开具',
    keywords: ['开化验', '开检查', '开检验', '化验单', '申请单', '开个血检', '开具化验'],
  },
  {
    intent: '检验查询',
    keywords: [
      '化验结果',
      '检验报告',
      '化验单解读',
      '血检结果',
      '指标异常',
      '这个指标',
      '肝功能',
      '血常规',
    ],
  },
  {
    intent: '影像查询',
    keywords: ['影像报告', 'CT报告', '胸片', 'B超', '超声报告', '核磁', 'MRI', 'DICOM', '片子'],
  },
  {
    intent: '诊断建议',
    keywords: [
      '诊断',
      '鉴别诊断',
      '可能是什么病',
      '考虑什么病',
      '病例分析',
      '分析这个病例',
      '帮我看看是什么',
    ],
  },
  {
    intent: '治疗方案',
    keywords: ['治疗方案', '怎么治', '下一步治疗', '治疗建议', '处置方案', '诊疗方案'],
  },
  {
    intent: '用药咨询',
    keywords: [
      '用药',
      '这个药',
      '剂量',
      '怎么吃',
      '副作用',
      '药物相互作用',
      '能一起吃吗',
      '禁忌症',
    ],
  },
  {
    intent: '质控检查',
    keywords: ['质控', '病历质量', '扣分', '缺陷', '医保审核', '编码', 'DRG', '合规检查'],
  },
  {
    intent: '教学培训',
    keywords: ['教学', '带教', '虚拟患者', '模拟病例', '培训', '讲课', '这个知识点', '查房带教'],
  },
  {
    intent: '科研分析',
    keywords: ['科研', '回顾性分析', '队列', '统计分析', '论文', '课题', '数据挖掘', '病例系列'],
  },
  {
    intent: '运营管理',
    keywords: ['运营', '科室报表', '床位', '门诊量', '绩效', '排班', '手术室排程', '管理看板'],
  },
  {
    intent: '系统设置',
    keywords: ['系统设置', '配置', '权限设置', '偏好', '通知设置', '模型切换', '参数调整'],
  },
];

/** 急诊/急症强信号关键词（命中后显著提升路由紧急度） */
const EMERGENCY_KEYWORDS: readonly string[] = [
  '急诊',
  '抢救',
  '胸痛',
  '卒中',
  '昏迷',
  '休克',
  '呼吸困难',
  '大出血',
  '抽搐',
  '急',
  '危急值',
];

/** 置信度校准常数 */
const CONFIDENCE = {
  /** 命中首个关键词的基础分 */
  BASE: 0.6,
  /** 每多命中一个关键词的加分 */
  PER_HIT: 0.12,
  /** 急诊强信号加成 */
  EMERGENCY_BONUS: 0.1,
  /** 置信度上限 */
  MAX: 0.98,
  /** 多意图保留阈值 */
  MULTI_THRESHOLD: 0.45,
} as const;

// ============================================================
// 意图分类器
// ============================================================

/**
 * 意图分类器
 *
 * 纯函数式规则引擎，线程安全、无外部依赖。
 * 支持单意图与多意图识别，输出带置信度与命中关键词。
 *
 * @example
 * ```typescript
 * const classifier = new IntentClassifier();
 * const intents = classifier.classify('帮我看一下这份血常规报告有没有异常');
 * // => [ { primaryIntent: '检验查询', confidence: 0.84, ... } ]
 * ```
 */
export class IntentClassifier {
  /** 规则表（不可变） */
  private readonly rules: readonly IntentRule[] = INTENT_RULES;

  /**
   * 对用户输入进行意图分类
   *
   * @param input - 用户原始输入文本
   * @returns 按置信度降序排列的意图列表（通常 1 个，可能多个）
   */
  classify(input: string): IntentScore[] {
    if (!input || input.trim().length === 0) {
      return [];
    }
    const text = input.trim();
    const isEmergency = EMERGENCY_KEYWORDS.some((kw) => text.includes(kw));

    const scored: IntentScore[] = [];
    for (const rule of this.rules) {
      const hits = rule.keywords.filter((kw) => text.includes(kw));
      if (hits.length === 0) continue;

      let confidence = CONFIDENCE.BASE + (hits.length - 1) * CONFIDENCE.PER_HIT;
      if (isEmergency) confidence += CONFIDENCE.EMERGENCY_BONUS;
      confidence = Math.min(confidence, CONFIDENCE.MAX);

      scored.push({
        primaryIntent: rule.intent,
        intentType: rule.intent,
        confidence: Number(confidence.toFixed(2)),
        matchedKeywords: hits,
        entities: isEmergency ? { isEmergency: true } : undefined,
      });
    }

    // 无任何命中时，返回兜底"问诊"低置信度
    if (scored.length === 0) {
      return [
        {
          primaryIntent: '问诊',
          intentType: '问诊',
          confidence: 0.3,
          matchedKeywords: [],
          entities: { fallback: true },
        },
      ];
    }

    scored.sort((a, b) => b.confidence - a.confidence);

    // 仅保留主意图 + 置信度高于多意图阈值的次意图
    const [primary, ...rest] = scored;
    const others = rest.filter((s) => s.confidence >= CONFIDENCE.MULTI_THRESHOLD);
    return [primary, ...others];
  }

  /**
   * 判断输入是否包含急诊强信号
   *
   * @param input - 用户输入
   * @returns 是否为急诊类请求
   */
  isEmergency(input: string): boolean {
    return EMERGENCY_KEYWORDS.some((kw) => input.includes(kw));
  }

  /**
   * 获取已注册的意图类型列表（供测试与调试）
   */
  get supportedIntents(): readonly IntentType[] {
    return this.rules.map((r) => r.intent);
  }
}
