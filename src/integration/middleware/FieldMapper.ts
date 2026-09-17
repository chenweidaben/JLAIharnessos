/**
 * 健澜科技数智医院智能体 - integration/middleware/FieldMapper.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 字段映射器
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 提供不同系统间字段名映射、编码转换（ICD-10、药品编码等）、
 * 单位转换和日期格式转换的配置化映射引擎。
 *
 * @module integration/middleware/FieldMapper
 */

import type {
  CodeMappingRule,
  FieldMappingRule,
  UnitConversionRule,
} from '../adapters/AdapterConfig';

/** 映射方向 */
export type MappingDirection = 'source_to_target' | 'target_to_source';

/** 映射结果 */
export interface MappingResult {
  /** 映射后的数据 */
  data: Record<string, unknown>;
  /** 未映射的字段 */
  unmappedFields: string[];
  /** 映射警告 */
  warnings: string[];
  /** 映射统计 */
  stats: {
    totalFields: number;
    mappedFields: number;
    skippedFields: number;
  };
}

/** 字段映射器配置 */
export interface FieldMapperConfig {
  /** 字段映射规则（按实体分组） */
  fieldMappings?: Record<string, FieldMappingRule[]>;
  /** 编码转换规则 */
  codeMappings?: Record<string, CodeMappingRule>;
  /** 单位转换规则 */
  unitConversions?: UnitConversionRule[];
  /** 是否保留未映射字段 */
  preserveUnmapped?: boolean;
  /** 日期格式（源） */
  sourceDateFormat?: string;
  /** 日期格式（目标） */
  targetDateFormat?: string;
}

/**
 * 字段映射器
 *
 * 配置化的字段映射引擎，支持：
 * - 字段名映射（sourceField → targetField）
 * - 值映射（通过 valueMap 配置）
 * - 数据类型转换（string/number/boolean/date）
 * - 编码转换（ICD-10、药品编码等）
 * - 单位转换（如 mg→g、℃→℉）
 * - 日期格式转换
 * - 默认值填充
 *
 * @example
 * ```typescript
 * const mapper = new FieldMapper({
 *   fieldMappings: {
 *     patient: [
 *       { sourceField: 'patientId', targetField: 'id' },
 *       { sourceField: 'name', targetField: 'patientName' },
 *       { sourceField: 'sex', targetField: 'gender', valueMap: { '1': 'male', '2': 'female' } },
 *     ],
 *   },
 * });
 *
 * const result = mapper.map('patient', { patientId: 'P001', name: '张三', sex: '1' });
 * // result.data = { id: 'P001', patientName: '张三', gender: 'male' }
 * ```
 */
export class FieldMapper {
  private config: Required<FieldMapperConfig>;

  constructor(config: FieldMapperConfig = {}) {
    this.config = {
      fieldMappings: config.fieldMappings ?? {},
      codeMappings: config.codeMappings ?? {},
      unitConversions: config.unitConversions ?? [],
      preserveUnmapped: config.preserveUnmapped ?? false,
      sourceDateFormat: config.sourceDateFormat ?? 'YYYYMMDDHHmmss',
      targetDateFormat: config.targetDateFormat ?? 'YYYY-MM-DDTHH:mm:ssZ',
    };
  }

  // ============================================================
  // 字段映射
  // ============================================================

  /**
   * 映射数据对象
   *
   * @param entityName - 实体名称（对应 fieldMappings 中的键）
   * @param sourceData - 源数据对象
   * @param direction - 映射方向
   * @returns 映射结果
   */
  map(
    entityName: string,
    sourceData: Record<string, unknown>,
    direction: MappingDirection = 'source_to_target',
  ): MappingResult {
    const rules = this.config.fieldMappings[entityName];
    const result: Record<string, unknown> = {};
    const unmappedFields: string[] = [];
    const warnings: string[] = [];
    let mappedCount = 0;

    if (!rules || rules.length === 0) {
      warnings.push(`实体 [${entityName}] 未配置映射规则`);
      return {
        data: this.config.preserveUnmapped ? { ...sourceData } : {},
        unmappedFields: Object.keys(sourceData),
        warnings,
        stats: {
          totalFields: Object.keys(sourceData).length,
          mappedFields: 0,
          skippedFields: Object.keys(sourceData).length,
        },
      };
    }

    const mappedSourceFields = new Set<string>();

    for (const rule of rules) {
      const sourceField = direction === 'source_to_target' ? rule.sourceField : rule.targetField;
      const targetField = direction === 'source_to_target' ? rule.targetField : rule.sourceField;

      if (!(sourceField in sourceData)) {
        if (rule.required) {
          warnings.push(`必填字段 [${sourceField}] 缺失`);
        }
        if (rule.defaultValue !== undefined) {
          result[targetField] = rule.defaultValue;
          mappedCount++;
        }
        continue;
      }

      const sourceValue = sourceData[sourceField];
      mappedSourceFields.add(sourceField);

      try {
        const mappedValue = this.applyRule(rule, sourceValue, direction);
        result[targetField] = mappedValue;
        mappedCount++;
      } catch (error) {
        warnings.push(
          `字段 [${sourceField}] 映射失败: ${error instanceof Error ? error.message : String(error)}`,
        );
        if (rule.defaultValue !== undefined) {
          result[targetField] = rule.defaultValue;
        }
      }
    }

    // 处理未映射字段
    if (this.config.preserveUnmapped) {
      for (const [key, value] of Object.entries(sourceData)) {
        if (!mappedSourceFields.has(key)) {
          result[key] = value;
          unmappedFields.push(key);
        }
      }
    } else {
      for (const key of Object.keys(sourceData)) {
        if (!mappedSourceFields.has(key)) {
          unmappedFields.push(key);
        }
      }
    }

    return {
      data: result,
      unmappedFields,
      warnings,
      stats: {
        totalFields: Object.keys(sourceData).length,
        mappedFields: mappedCount,
        skippedFields: unmappedFields.length,
      },
    };
  }

  /**
   * 应用单条映射规则
   */
  private applyRule(rule: FieldMappingRule, value: unknown, direction: MappingDirection): unknown {
    if (value === null || value === undefined) {
      return rule.defaultValue ?? value;
    }

    let result: unknown = value;

    // 值映射
    if (rule.valueMap && typeof result === 'string') {
      const valueMap =
        direction === 'source_to_target' ? rule.valueMap : this.invertValueMap(rule.valueMap);
      if (result in valueMap) {
        result = valueMap[result];
      }
    }

    // 数据类型转换
    if (rule.dataType) {
      result = this.convertDataType(result, rule.dataType, rule);
    }

    return result;
  }

  /**
   * 反转值映射表
   */
  private invertValueMap(valueMap: Record<string, string>): Record<string, string> {
    const inverted: Record<string, string> = {};
    for (const [key, value] of Object.entries(valueMap)) {
      inverted[value] = key;
    }
    return inverted;
  }

  /**
   * 数据类型转换
   */
  private convertDataType(value: unknown, dataType: string, rule: FieldMappingRule): unknown {
    switch (dataType) {
      case 'string':
        return String(value);
      case 'number': {
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`无法将值 "${String(value)}" 转换为数字`);
        }
        return num;
      }
      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value === 'true' || value === '1' || value === 'Y';
        }
        return Boolean(value);
      case 'date':
        return this.convertDate(value, rule);
      case 'array':
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          return value.split(',').map((s) => s.trim());
        }
        return [value];
      case 'object':
        if (typeof value === 'object' && value !== null) return value;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            throw new Error(`无法将值解析为JSON对象`);
          }
        }
        return value;
      default:
        return value;
    }
  }

  /**
   * 日期格式转换
   */
  private convertDate(value: unknown, rule: FieldMappingRule): string {
    const dateStr = String(value);
    const sourceFormat = rule.sourceDateFormat ?? this.config.sourceDateFormat;
    const targetFormat = rule.targetDateFormat ?? this.config.targetDateFormat;

    // 简单日期解析（支持常见格式）
    const date = this.parseDate(dateStr, sourceFormat);
    if (!date) {
      return dateStr; // 解析失败返回原值
    }

    return this.formatDate(date, targetFormat);
  }

  /**
   * 解析日期字符串
   */
  private parseDate(dateStr: string, format: string): Date | null {
    // 尝试标准ISO格式
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // 尝试 YYYYMMDDHHmmss 格式（HL7常用）
    const hl7Match = /^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/.exec(dateStr);
    if (hl7Match) {
      const [, year, month, day, hour = '00', minute = '00', second = '00'] = hl7Match;
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      );
    }

    // 尝试 YYYY-MM-DD 格式
    const standardMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
    if (standardMatch) {
      const [, year, month, day] = standardMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    return null;
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date, format: string): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const replacements: Record<string, string> = {
      YYYY: String(date.getFullYear()),
      MM: pad(date.getMonth() + 1),
      DD: pad(date.getDate()),
      HH: pad(date.getHours()),
      mm: pad(date.getMinutes()),
      ss: pad(date.getSeconds()),
    };

    let result = format;
    for (const [token, value] of Object.entries(replacements)) {
      result = result.replace(token, value);
    }

    // ISO格式特殊处理
    if (format === 'YYYY-MM-DDTHH:mm:ssZ') {
      return date.toISOString();
    }

    return result;
  }

  // ============================================================
  // 编码转换
  // ============================================================

  /**
   * 转换编码
   *
   * @param codeType - 编码类型（如 'gender', 'order_type', 'icd10'）
   * @param code - 源编码值
   * @param direction - 转换方向
   * @returns 目标编码值
   */
  convertCode(
    codeType: string,
    code: string,
    direction: MappingDirection = 'source_to_target',
  ): string {
    const rule = this.config.codeMappings[codeType];
    if (!rule) {
      return code; // 无映射规则，返回原值
    }

    const mappings =
      direction === 'source_to_target' ? rule.mappings : this.invertMappings(rule.mappings);

    if (code in mappings) {
      return mappings[code];
    }

    return rule.defaultCode ?? code;
  }

  /**
   * 反转编码映射
   */
  private invertMappings(mappings: Record<string, string>): Record<string, string> {
    const inverted: Record<string, string> = {};
    for (const [key, value] of Object.entries(mappings)) {
      inverted[value] = key;
    }
    return inverted;
  }

  // ============================================================
  // 单位转换
  // ============================================================

  /**
   * 转换单位
   *
   * @param value - 数值
   * @param fromUnit - 源单位
   * @param toUnit - 目标单位
   * @returns 转换后的值
   */
  convertUnit(value: number, fromUnit: string, toUnit: string): number {
    if (fromUnit === toUnit) return value;

    const rule = this.config.unitConversions.find(
      (r) => r.fromUnit === fromUnit && r.toUnit === toUnit,
    );

    if (rule) {
      let result = value * rule.factor + (rule.offset ?? 0);
      if (rule.precision !== undefined) {
        result = Number(result.toFixed(rule.precision));
      }
      return result;
    }

    // 尝试反向转换
    const reverseRule = this.config.unitConversions.find(
      (r) => r.fromUnit === toUnit && r.toUnit === fromUnit,
    );

    if (reverseRule && reverseRule.factor !== 0) {
      let result = (value - (reverseRule.offset ?? 0)) / reverseRule.factor;
      if (reverseRule.precision !== undefined) {
        result = Number(result.toFixed(reverseRule.precision));
      }
      return result;
    }

    // 无转换规则，返回原值
    return value;
  }

  // ============================================================
  // 配置管理
  // ============================================================

  /**
   * 添加字段映射规则
   */
  addFieldMapping(entityName: string, rule: FieldMappingRule): void {
    if (!this.config.fieldMappings[entityName]) {
      this.config.fieldMappings[entityName] = [];
    }
    this.config.fieldMappings[entityName].push(rule);
  }

  /**
   * 添加编码映射规则
   */
  addCodeMapping(codeType: string, rule: CodeMappingRule): void {
    this.config.codeMappings[codeType] = rule;
  }

  /**
   * 添加单位转换规则
   */
  addUnitConversion(rule: UnitConversionRule): void {
    this.config.unitConversions.push(rule);
  }

  /**
   * 获取配置
   */
  getConfig(): FieldMapperConfig {
    return { ...this.config };
  }
}

/**
 * 常用编码映射预设
 */
export const COMMON_CODE_MAPPINGS: Record<string, CodeMappingRule> = {
  gender: {
    sourceSystem: 'his',
    targetSystem: 'jianlan',
    mappings: { '1': 'male', '2': 'female', '9': 'unknown', M: 'male', F: 'female', U: 'unknown' },
    defaultCode: 'unknown',
  },
  order_type: {
    sourceSystem: 'his',
    targetSystem: 'jianlan',
    mappings: {
      '1': 'drug',
      '2': 'examination',
      '3': 'lab',
      '4': 'treatment',
      '5': 'nursing',
      '6': 'diet',
    },
    defaultCode: 'other',
  },
  order_status: {
    sourceSystem: 'his',
    targetSystem: 'jianlan',
    mappings: { '0': 'pending', '1': 'active', '2': 'completed', '3': 'cancelled', '4': 'held' },
    defaultCode: 'pending',
  },
  encounter_type: {
    sourceSystem: 'his',
    targetSystem: 'jianlan',
    mappings: { '1': 'outpatient', '2': 'inpatient', '3': 'emergency', '4': 'observation' },
    defaultCode: 'outpatient',
  },
  // === 医学标准术语编码 ===
  icd10: {
    sourceSystem: 'his',
    targetSystem: 'icd10',
    mappings: {
      I10: 'I10', // 特发性（原发性）高血压
      'E11.9': 'E11.9', // 2型糖尿病
      'I21.4': 'I21.4', // 急性非ST段抬高型心肌梗死
      'J44.9': 'J44.9', // 慢性阻塞性肺疾病
      'K35.9': 'K35.9', // 急性阑尾炎
    },
  },
  snomed_ct: {
    sourceSystem: 'icd10',
    targetSystem: 'snomed_ct',
    mappings: {
      I10: '38341003', // 高血压
      'E11.9': '44054006', // 2型糖尿病
      'J44.9': '13645005', // COPD
    },
  },
  loinc: {
    sourceSystem: 'lis_local',
    targetSystem: 'loinc',
    mappings: {
      WBC: '6690-2',
      RBC: '789-8',
      HGB: '718-7',
      PLT: '777-3',
      GLU: '2345-7',
      K: '6298-4',
      Na: '2951-2',
    },
  },
  // 医保编码（国家医保药品/诊疗项目编码映射示例）
  insurance_drug: {
    sourceSystem: 'his_drug',
    targetSystem: 'nhsa',
    mappings: {
      YP001: 'XA01BA01', // 硝苯地平
      YP002: 'XA22BV01', // 二甲双胍
      YP003: 'XA01AD01', // 阿司匹林
    },
  },
};

/**
 * 常用单位转换预设
 */
export const COMMON_UNIT_CONVERSIONS: UnitConversionRule[] = [
  { fromUnit: 'mg', toUnit: 'g', factor: 0.001, precision: 6 },
  { fromUnit: 'g', toUnit: 'mg', factor: 1000, precision: 2 },
  { fromUnit: 'mmol/L', toUnit: 'mg/dL', factor: 18.0, precision: 2 }, // 葡萄糖
  { fromUnit: 'mg/dL', toUnit: 'mmol/L', factor: 1 / 18.0, precision: 2 },
  { fromUnit: '℃', toUnit: '℉', factor: 1.8, offset: 32, precision: 1 },
  { fromUnit: '℉', toUnit: '℃', factor: 5 / 9, offset: (-32 * 5) / 9, precision: 1 },
  { fromUnit: 'cm', toUnit: 'm', factor: 0.01, precision: 2 },
  { fromUnit: 'kg', toUnit: 'g', factor: 1000, precision: 0 },
  { fromUnit: 'mmHg', toUnit: 'kPa', factor: 0.133322, precision: 2 },
  { fromUnit: 'kPa', toUnit: 'mmHg', factor: 7.50062, precision: 2 },
  { fromUnit: 'IU/L', toUnit: 'U/L', factor: 1.0, precision: 2 },
  { fromUnit: 'mL', toUnit: 'L', factor: 0.001, precision: 4 },
  { fromUnit: 'L', toUnit: 'mL', factor: 1000, precision: 0 },
];
