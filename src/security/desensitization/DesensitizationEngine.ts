/**
 * 健澜科技数智医院智能体 - security/desensitization/DesensitizationEngine.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 数据脱敏引擎
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件实现数据脱敏引擎，支持多种脱敏算法（掩码、替换、哈希、泛化），
 * 按字段类型自动脱敏，支持自定义规则和授权场景下的还原。
 * 符合《个人信息保护法》对敏感个人信息的保护要求。
 *
 * @module security/desensitization/DesensitizationEngine
 */

import {
  DataLevel,
  DesensitizationAlgorithm,
  type DesensitizationConfig,
  type DesensitizationRule,
  DesensitizationScenario,
  SecurityError,
  type SensitiveFieldType,
} from '../types';
import {
  applyRuleToValue,
  desensitizeObject,
  detectSensitiveData,
  hashDesensitize,
  maskString,
} from './DesensitizationUtils';
import { DEFAULT_DESENSITIZATION_RULES } from './rules';

/**
 * 脱敏引擎
 *
 * 负责管理脱敏规则、执行脱敏操作、支持授权还原。
 * 采用策略模式，不同字段类型使用不同的脱敏算法。
 *
 * @example
 * const engine = new DesensitizationEngine();
 * const masked = engine.desensitize('13812345678', SensitiveFieldType.PHONE);
 * // '138****5678'
 */
export class DesensitizationEngine {
  private readonly rules: Map<SensitiveFieldType, DesensitizationRule>;
  private readonly customFieldRules: Map<string, DesensitizationRule>;
  private readonly scenario: DesensitizationScenario;
  private readonly autoDetect: boolean;
  /** 还原映射表（仅授权场景使用，内存存储） */
  private readonly restoreMap = new Map<string, string>();

  /**
   * 构造脱敏引擎
   *
   * @param config - 脱敏引擎配置
   */
  constructor(config?: Partial<DesensitizationConfig>) {
    this.rules = new Map(config?.defaultRules ?? DEFAULT_DESENSITIZATION_RULES);
    this.customFieldRules = new Map(config?.customRules ?? []);
    this.scenario = config?.scenario ?? DesensitizationScenario.DISPLAY;
    this.autoDetect = config?.autoDetect ?? true;
  }

  /**
   * 对单个值按字段类型脱敏
   *
   * @param value - 原始值
   * @param fieldType - 敏感字段类型
   * @param enableRestore - 是否启用还原（记录映射），默认false
   * @returns 脱敏后的值
   * @throws {SecurityError} 当值为空或字段类型不支持时
   */
  public desensitize(value: string, fieldType: SensitiveFieldType, enableRestore = false): string {
    if (!value) {
      return value;
    }
    const rule = this.rules.get(fieldType);
    if (!rule) {
      throw new SecurityError(
        'DESENSITIZATION_RULE_NOT_FOUND',
        `未找到字段类型 ${fieldType} 的脱敏规则`,
        { fieldType },
      );
    }

    const result = this.applyRule(value, rule, fieldType);

    // 授权场景：显式启用还原时记录原始值映射（需审计）
    // 调用方显式传入 enableRestore=true 视为已获授权，记录映射供授权还原
    if (enableRestore) {
      // 使用脱敏结果+字段类型作为key，存储原始值
      const key = `${fieldType}:${result}`;
      this.restoreMap.set(key, value);
    }

    return result;
  }

  /**
   * 脱敏文本（自动检测敏感数据）
   *
   * @param text - 原始文本
   * @param enableRestore - 是否启用还原
   * @returns 脱敏后的文本
   */
  public desensitizeText(text: string, enableRestore = false): string {
    if (!text || !this.autoDetect) {
      return text;
    }
    const detected = detectSensitiveData(text);
    if (detected.length === 0) return text;

    let result = '';
    let lastIndex = 0;

    for (const item of detected) {
      result += text.slice(lastIndex, item.startIndex);
      const desensitized = this.desensitize(item.value, item.type, enableRestore);
      result += desensitized;
      lastIndex = item.endIndex;
    }
    result += text.slice(lastIndex);
    return result;
  }

  /**
   * 递归脱敏对象
   *
   * @param obj - 待脱敏对象
   * @param enableRestore - 是否启用还原
   * @returns 脱敏后的对象（深拷贝）
   */
  public desensitizeObject<T>(obj: T, enableRestore = false): T {
    return desensitizeObject(obj, this.customFieldRules, this.rules);
  }

  /**
   * 还原脱敏数据（授权场景）
   * 仅对启用了enableRestore的脱敏操作有效
   *
   * @param desensitizedValue - 脱敏后的值
   * @param fieldType - 字段类型
   * @returns 原始值
   * @throws {SecurityError} 当找不到还原映射时
   */
  public restore(desensitizedValue: string, fieldType: SensitiveFieldType): string {
    const key = `${fieldType}:${desensitizedValue}`;
    const original = this.restoreMap.get(key);
    if (!original) {
      throw new SecurityError(
        'DESENSITIZATION_RESTORE_FAILED',
        '无法还原脱敏数据：未找到对应的原始值映射',
        { fieldType, desensitizedValue },
      );
    }
    return original;
  }

  /**
   * 清除还原映射表
   * 在授权会话结束后调用，防止原始数据泄露
   */
  public clearRestoreMap(): void {
    this.restoreMap.clear();
  }

  /**
   * 注册自定义脱敏规则
   *
   * @param fieldType - 字段类型
   * @param rule - 脱敏规则
   */
  public registerRule(fieldType: SensitiveFieldType, rule: DesensitizationRule): void {
    this.rules.set(fieldType, rule);
  }

  /**
   * 注册按字段名的自定义规则
   *
   * @param fieldName - 字段名
   * @param rule - 脱敏规则
   */
  public registerFieldRule(fieldName: string, rule: DesensitizationRule): void {
    this.customFieldRules.set(fieldName, rule);
  }

  /**
   * 获取字段类型的脱敏规则
   *
   * @param fieldType - 字段类型
   * @returns 脱敏规则（如存在）
   */
  public getRule(fieldType: SensitiveFieldType): DesensitizationRule | undefined {
    return this.rules.get(fieldType);
  }

  /**
   * 获取当前脱敏场景
   */
  public getScenario(): DesensitizationScenario {
    return this.scenario;
  }

  /**
   * 检测文本中的敏感数据
   *
   * @param text - 待检测文本
   * @returns 检测到的敏感数据项列表
   */
  public detect(text: string) {
    return detectSensitiveData(text);
  }

  /**
   * 根据数据级别判断是否需要脱敏
   *
   * @param dataLevel - 数据级别
   * @returns 是否需要脱敏
   */
  public shouldDesensitize(dataLevel: DataLevel): boolean {
    switch (this.scenario) {
      case DesensitizationScenario.LLM_INPUT:
        return dataLevel === DataLevel.L3_SENSITIVE || dataLevel === DataLevel.L4_CONFIDENTIAL;
      case DesensitizationScenario.DISPLAY:
        return dataLevel === DataLevel.L3_SENSITIVE || dataLevel === DataLevel.L4_CONFIDENTIAL;
      case DesensitizationScenario.LOG:
        return (
          dataLevel === DataLevel.L2_INTERNAL ||
          dataLevel === DataLevel.L3_SENSITIVE ||
          dataLevel === DataLevel.L4_CONFIDENTIAL
        );
      case DesensitizationScenario.EXPORT:
        return dataLevel === DataLevel.L3_SENSITIVE || dataLevel === DataLevel.L4_CONFIDENTIAL;
      case DesensitizationScenario.RESEARCH:
        return (
          dataLevel === DataLevel.L2_INTERNAL ||
          dataLevel === DataLevel.L3_SENSITIVE ||
          dataLevel === DataLevel.L4_CONFIDENTIAL
        );
      default:
        return dataLevel === DataLevel.L3_SENSITIVE || dataLevel === DataLevel.L4_CONFIDENTIAL;
    }
  }

  /**
   * 应用脱敏规则到值
   *
   * @param value - 原始值
   * @param rule - 脱敏规则
   * @param fieldType - 字段类型
   * @returns 脱敏后的值
   */
  private applyRule(
    value: string,
    rule: DesensitizationRule,
    fieldType: SensitiveFieldType,
  ): string {
    switch (rule.algorithm) {
      case DesensitizationAlgorithm.MASK:
        return maskString(value, rule.keepPrefix ?? 0, rule.keepSuffix ?? 0, rule.maskChar ?? '*');
      case DesensitizationAlgorithm.REPLACE:
        return applyRuleToValue(value, fieldType, rule);
      case DesensitizationAlgorithm.HASH:
        return hashDesensitize(
          value,
          rule.salt ?? '',
          rule.hashAlgorithm === 'sha512' ? 'sha512' : 'sha256',
        );
      case DesensitizationAlgorithm.GENERALIZE:
        return applyRuleToValue(value, fieldType, rule);
      case DesensitizationAlgorithm.ENCRYPT:
        // 加密脱敏由EncryptionService处理，此处仅标记
        return value;
      default:
        return applyRuleToValue(value, fieldType, rule);
    }
  }
}

/**
 * 创建默认脱敏引擎实例的工厂函数
 *
 * @param scenario - 脱敏场景
 * @returns DesensitizationEngine实例
 */
export function createDesensitizationEngine(
  scenario: DesensitizationScenario = DesensitizationScenario.DISPLAY,
): DesensitizationEngine {
  return new DesensitizationEngine({
    scenario,
    autoDetect: true,
  });
}
