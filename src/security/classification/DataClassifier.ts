/**
 * 健澜科技数智医院智能体 - security/classification/DataClassifier.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 数据分级分类器
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件实现医疗数据自动分级分类：根据字段名、字段内容和上下文，
 * 将数据判定为 L1公开 / L2内部 / L3敏感 / L4机密 四级。
 * 支持分类结果缓存、分类变更审计与批量分级。
 *
 * @module security/classification/DataClassifier
 */

import { DataLevel, SecurityError } from '../types';
import {
  type ClassificationRule,
  DATA_CLASSIFICATION_RULES,
  DATA_LEVEL_META,
} from './DataClassificationRules';

/**
 * 单字段分类结果
 */
export interface ClassificationResult {
  /** 字段名 */
  fieldName: string;
  /** 判定的数据级别 */
  level: DataLevel;
  /** 命中的规则 */
  matchedRuleId?: string;
  /** 分类依据 */
  reason: string;
  /** 分类来源：field_name / content / default */
  source: 'field_name' | 'content' | 'default';
}

/**
 * 分类变更审计记录
 */
export interface ClassificationAuditRecord {
  timestamp: string;
  fieldName: string;
  previousLevel?: DataLevel;
  newLevel: DataLevel;
  operator: string;
}

/**
 * 数据分类器配置
 */
export interface DataClassifierConfig {
  /** 自定义分类规则（追加到默认规则之后） */
  extraRules?: ClassificationRule[];
  /** 未命中任何规则时的默认级别 */
  defaultLevel?: DataLevel;
  /** 是否启用结果缓存 */
  enableCache?: boolean;
  /** 缓存TTL（毫秒），默认10分钟 */
  cacheTtl?: number;
}

/**
 * 缓存条目
 */
interface CacheEntry {
  level: DataLevel;
  matchedRuleId?: string;
  reason: string;
  source: ClassificationResult['source'];
  timestamp: number;
}

/**
 * 数据分级分类器
 *
 * 按"字段名优先、内容识别补充、默认兜底"的顺序判定数据级别。
 * 级别越高越敏感，命中多个规则时取最高级别。
 *
 * @example
 * const classifier = new DataClassifier();
 * const result = classifier.classify('patientId', 'P001');
 * // { level: 'L3', ... }
 */
export class DataClassifier {
  private readonly rules: ClassificationRule[];
  private readonly defaultLevel: DataLevel;
  private readonly enableCache: boolean;
  private readonly cacheTtl: number;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly auditTrail: ClassificationAuditRecord[] = [];

  /**
   * 构造数据分类器
   *
   * @param config - 分类器配置
   */
  constructor(config?: DataClassifierConfig) {
    this.rules = [...DATA_CLASSIFICATION_RULES, ...(config?.extraRules ?? [])];
    this.defaultLevel = config?.defaultLevel ?? DataLevel.L2_INTERNAL;
    this.enableCache = config?.enableCache ?? true;
    this.cacheTtl = config?.cacheTtl ?? 10 * 60 * 1000;
  }

  /**
   * 对单个字段进行分级分类
   *
   * @param fieldName - 字段名
   * @param value - 字段值（用于内容识别，可选）
   * @returns 分类结果
   */
  public classify(fieldName: string, value?: string): ClassificationResult {
    const cacheKey = `${fieldName}::${value ?? ''}`;
    if (this.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
        return {
          fieldName,
          level: cached.level,
          matchedRuleId: cached.matchedRuleId,
          reason: cached.reason,
          source: cached.source,
        };
      }
    }

    const result = this.doClassify(fieldName, value);

    if (this.enableCache) {
      this.cache.set(cacheKey, {
        level: result.level,
        matchedRuleId: result.matchedRuleId,
        reason: result.reason,
        source: result.source,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  /**
   * 批量对字段集合进行分级分类
   *
   * @param fields - 字段名到字段值的映射
   * @returns 字段名到分类结果的映射
   */
  public classifyFields(fields: Record<string, unknown>): Record<string, ClassificationResult> {
    const results: Record<string, ClassificationResult> = {};
    for (const [key, value] of Object.entries(fields)) {
      results[key] = this.classify(key, typeof value === 'string' ? value : undefined);
    }
    return results;
  }

  /**
   * 获取对象中最高敏感级别
   *
   * @param fields - 字段名到字段值的映射
   * @returns 最高数据级别
   */
  public getHighestLevel(fields: Record<string, unknown>): DataLevel {
    const results = this.classifyFields(fields);
    let highest = this.defaultLevel;
    for (const r of Object.values(results)) {
      if (this.levelValue(r.level) > this.levelValue(highest)) {
        highest = r.level;
      }
    }
    return highest;
  }

  /**
   * 人工修正分级结果（需审计）
   *
   * @param fieldName - 字段名
   * @param newLevel - 修正后的级别
   * @param operator - 操作人
   */
  public overrideLevel(fieldName: string, newLevel: DataLevel, operator: string): void {
    const existing = this.cache.get(`${fieldName}::`);
    this.auditTrail.push({
      timestamp: new Date().toISOString(),
      fieldName,
      previousLevel: existing?.level,
      newLevel,
      operator,
    });
    // 使缓存失效
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(`${fieldName}::`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取分类变更审计记录
   *
   * @returns 审计记录列表
   */
  public getAuditTrail(): ClassificationAuditRecord[] {
    return [...this.auditTrail];
  }

  /**
   * 获取数据级别元信息
   *
   * @param level - 数据级别
   * @returns 元信息
   */
  public getLevelMeta(level: DataLevel) {
    return DATA_LEVEL_META[level];
  }

  /**
   * 清除分类缓存
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * 执行分类判定
   */
  private doClassify(fieldName: string, value?: string): ClassificationResult {
    const lowerName = fieldName.toLowerCase();

    // 1. 字段名匹配
    let bestByName: ClassificationRule | null = null;
    for (const rule of this.rules) {
      if (rule.fieldNamePatterns.some((p) => lowerName.includes(p.toLowerCase()))) {
        if (!bestByName || this.levelValue(rule.level) > this.levelValue(bestByName.level)) {
          bestByName = rule;
        }
      }
    }

    // 2. 内容识别补充（仅当字段名未命中时，或内容命中更高敏感级别时）
    let bestByContent: ClassificationRule | null = null;
    if (value) {
      for (const rule of this.rules) {
        if (!rule.contentPatterns) continue;
        for (const pattern of rule.contentPatterns) {
          pattern.lastIndex = 0;
          if (pattern.test(value)) {
            if (
              !bestByContent ||
              this.levelValue(rule.level) > this.levelValue(bestByContent.level)
            ) {
              bestByContent = rule;
            }
            break;
          }
        }
      }
    }

    // 取字段名与内容识别中更敏感的级别
    const candidates = [bestByName, bestByContent].filter(
      (r): r is ClassificationRule => r !== null,
    );
    if (candidates.length > 0) {
      const winner = candidates.reduce((a, b) =>
        this.levelValue(a.level) >= this.levelValue(b.level) ? a : b,
      );
      return {
        fieldName,
        level: winner.level,
        matchedRuleId: winner.id,
        reason: `${winner.category}：${winner.description}`,
        source: bestByName && winner === bestByName ? 'field_name' : 'content',
      };
    }

    // 3. 默认兜底
    return {
      fieldName,
      level: this.defaultLevel,
      reason: `未命中分类规则，按默认级别处理`,
      source: 'default',
    };
  }

  /**
   * 级别数值（越高越敏感）
   */
  private levelValue(level: DataLevel): number {
    switch (level) {
      case DataLevel.L1_PUBLIC:
        return 1;
      case DataLevel.L2_INTERNAL:
        return 2;
      case DataLevel.L3_SENSITIVE:
        return 3;
      case DataLevel.L4_CONFIDENTIAL:
        return 4;
      default:
        throw new SecurityError('UNKNOWN_DATA_LEVEL', `未知数据级别: ${String(level)}`);
    }
  }
}
