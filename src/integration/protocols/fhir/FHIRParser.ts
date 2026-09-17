/**
 * 健澜科技数智医院智能体 - integration/protocols/fhir/FHIRParser.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - FHIR R4 解析器
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 负责将 FHIR R4 JSON 数据解析为资源模型，支持：
 * - JSON 格式解析
 * - 资源类型识别
 * - 引用（Reference）解析与解引用
 * - 扩展（Extension）处理
 * - Bundle 解析
 *
 * @module integration/protocols/fhir/FHIRParser
 */

import {
  type FHIRExtension,
  type FHIRReference,
  type FHIRResource,
  FHIRResourceModel,
  type FHIRResourceType,
  type FHIRValidationResult,
  SUPPORTED_RESOURCE_TYPES,
} from './FHIRResource';

/** FHIR Bundle 条目 */
export interface FHIRBundleEntry {
  fullUrl?: string;
  resource?: FHIRResource;
  search?: { mode?: string };
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
}

/** Bundle 分页链接 */
export interface FHIRBundleLink {
  relation: string;
  url: string;
}

/** FHIR Bundle */
export interface FHIRBundle {
  resourceType: 'Bundle';
  id?: string;
  type:
    | 'document'
    | 'message'
    | 'transaction'
    | 'transaction-response'
    | 'batch'
    | 'batch-response'
    | 'history'
    | 'searchset'
    | 'collection';
  total?: number;
  link?: FHIRBundleLink[];
  entry?: FHIRBundleEntry[];
}

/** 解析结果 */
export interface FHIRParseResult {
  /** 是否成功 */
  success: boolean;
  /** 资源模型（单资源时） */
  resource?: FHIRResourceModel;
  /** Bundle（Bundle 时） */
  bundle?: FHIRBundle;
  /** 是否为 Bundle */
  isBundle: boolean;
  /** 警告信息 */
  warnings: string[];
  /** 错误信息 */
  errors: string[];
}

/** 引用解析结果 */
export interface FHIRReferenceInfo {
  /** 原始引用字符串 */
  raw: string;
  /** 资源类型 */
  resourceType?: string;
  /** 资源ID */
  id?: string;
  /** 是否为内部引用 */
  isInternal: boolean;
}

/**
 * FHIR 解析器
 *
 * 将 FHIR R4 JSON 字符串解析为 FHIRResourceModel 或 Bundle，
 * 并识别资源类型、解析引用与扩展。
 *
 * @example
 * ```typescript
 * const parser = new FHIRParser();
 * const result = parser.parse(jsonString);
 * if (result.success && result.resource) {
 *   console.log(result.resource.resourceType);
 * }
 * ```
 */
export class FHIRParser {
  /** 是否在解析时执行资源校验 */
  public validateOnParse = true;

  /**
   * 解析 FHIR JSON
   *
   * @param json - FHIR JSON 字符串或对象
   * @returns 解析结果
   */
  parse(json: unknown): FHIRParseResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    let data: unknown;
    if (typeof json === 'string') {
      try {
        data = JSON.parse(json);
      } catch (error) {
        errors.push(`JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`);
        return { success: false, isBundle: false, warnings, errors };
      }
    } else {
      data = json;
    }

    if (typeof data !== 'object' || data === null) {
      errors.push('FHIR 数据必须是对象');
      return { success: false, isBundle: false, warnings, errors };
    }

    const obj = data as Record<string, unknown>;
    const resourceType = obj.resourceType;

    if (typeof resourceType !== 'string') {
      errors.push('FHIR 数据缺少 resourceType 字段');
      return { success: false, isBundle: false, warnings, errors };
    }

    // Bundle
    if (resourceType === 'Bundle') {
      return this.parseBundle(obj, warnings, errors);
    }

    // 单资源
    if (!(SUPPORTED_RESOURCE_TYPES as readonly string[]).includes(resourceType)) {
      warnings.push(`资源类型 [${resourceType}] 不在核心22种内，将按透传处理`);
    }

    try {
      const model = FHIRResourceModel.fromObject(data);
      let validation: FHIRValidationResult | undefined;
      if (this.validateOnParse) {
        validation = model.validate();
        errors.push(...validation.errors.map((e) => `${e.path}: ${e.message}`));
        warnings.push(...validation.warnings.map((w) => `${w.path}: ${w.message}`));
      }
      return {
        success: errors.length === 0,
        resource: model,
        isBundle: false,
        warnings,
        errors,
      };
    } catch (error) {
      errors.push(`资源创建失败: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, isBundle: false, warnings, errors };
    }
  }

  /**
   * 解析 Bundle
   */
  private parseBundle(
    obj: Record<string, unknown>,
    warnings: string[],
    errors: string[],
  ): FHIRParseResult {
    const bundle = obj as unknown as FHIRBundle;
    if (!bundle.type) {
      errors.push('FHIR Bundle 缺少 type 字段');
    }
    if (!Array.isArray(bundle.entry)) {
      bundle.entry = [];
    }
    // 校验每个条目资源
    for (const [idx, entry] of bundle.entry.entries()) {
      if (entry.resource && !entry.resource.resourceType) {
        warnings.push(`Bundle 条目 [${idx}] 缺少 resourceType`);
      }
    }
    return {
      success: errors.length === 0,
      bundle,
      isBundle: true,
      warnings,
      errors,
    };
  }

  /**
   * 解析引用字符串
   *
   * FHIR 引用形如 "Patient/P001"、"Patient/P001/_history/5"、
   * "https://api.example.com/fhir/Patient/P001" 等。
   *
   * @param reference - 引用对象或引用字符串
   * @returns 解析后的引用信息
   */
  parseReference(reference: FHIRReference | string | undefined): FHIRReferenceInfo | undefined {
    if (!reference) return undefined;
    const raw = typeof reference === 'string' ? reference : (reference.reference ?? '');
    if (!raw) return undefined;

    // 绝对URL
    const urlMatch = /^https?:\/\/.+\/([A-Za-z]+)\/([A-Za-z0-9\-.]+)/.exec(raw);
    if (urlMatch) {
      return {
        raw,
        resourceType: urlMatch[1],
        id: urlMatch[2],
        isInternal: false,
      };
    }

    // 相对引用 Patient/P001
    const relMatch = /^([A-Za-z]+)\/([A-Za-z0-9\-.]+)(?:\/_history\/[0-9]+)?$/.exec(raw);
    if (relMatch) {
      return {
        raw,
        resourceType: relMatch[1],
        id: relMatch[2],
        isInternal: true,
      };
    }

    return { raw, isInternal: raw.startsWith('urn:') || raw.startsWith('#') };
  }

  /**
   * 提取资源中所有扩展
   *
   * @param resource - FHIR 资源
   * @returns 扩展列表
   */
  extractExtensions(resource: FHIRResource): FHIRExtension[] {
    const result: FHIRExtension[] = [];
    if (Array.isArray(resource.extension)) {
      result.push(...resource.extension);
    }
    // 递归搜索顶层业务字段中的扩展（如 Patient.name[].extension）
    for (const value of Object.values(resource)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (
            typeof item === 'object' &&
            item !== null &&
            Array.isArray((item as Record<string, unknown>).extension)
          ) {
            result.push(...((item as Record<string, unknown>).extension as FHIRExtension[]));
          }
        }
      }
    }
    return result;
  }

  /**
   * 从 Bundle 中按类型提取资源
   *
   * @param bundle - FHIR Bundle
   * @param resourceType - 资源类型
   * @returns 资源列表
   */
  extractResourcesByType(bundle: FHIRBundle, resourceType: FHIRResourceType): FHIRResource[] {
    return (bundle.entry ?? [])
      .filter((e) => e.resource?.resourceType === resourceType)
      .map((e) => e.resource!)
      .filter(Boolean);
  }
}
