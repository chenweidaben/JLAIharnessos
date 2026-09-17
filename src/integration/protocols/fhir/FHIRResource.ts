/**
 * 健澜科技数智医院智能体 - integration/protocols/fhir/FHIRResource.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - FHIR R4 资源模型
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 实现 HL7 FHIR R4（v4.0.1）常用资源的模型封装，支持 22 种核心临床资源：
 * Patient, Encounter, Observation, Condition, MedicationRequest, Procedure,
 * DiagnosticReport, ImagingStudy, AllergyIntolerance, CarePlan, Claim, Coverage,
 * Practitioner, Organization, Location, Appointment, Schedule, Slot,
 * ServiceRequest, Medication, MedicationAdministration, Immunization。
 *
 * 本模块为核心子集实现，不追求 FHIR 规范全集，仅覆盖健澜集成所需场景。
 *
 * @module integration/protocols/fhir/FHIRResource
 */

/** FHIR 资源类型（R4 常用 22 种） */
export type FHIRResourceType =
  | 'Patient'
  | 'Encounter'
  | 'Observation'
  | 'Condition'
  | 'MedicationRequest'
  | 'Procedure'
  | 'DiagnosticReport'
  | 'ImagingStudy'
  | 'AllergyIntolerance'
  | 'CarePlan'
  | 'Claim'
  | 'Coverage'
  | 'Practitioner'
  | 'Organization'
  | 'Location'
  | 'Appointment'
  | 'Schedule'
  | 'Slot'
  | 'ServiceRequest'
  | 'Medication'
  | 'MedicationAdministration'
  | 'Immunization';

/** FHIR 编码概念（Coding） */
export interface FHIRCoding {
  system?: string;
  code?: string;
  display?: string;
  version?: string;
  userSelected?: boolean;
}

/** FHIR 可编码概念（CodeableConcept） */
export interface FHIRCodeableConcept {
  coding?: FHIRCoding[];
  text?: string;
}

/** FHIR 引用（Reference） */
export interface FHIRReference {
  reference?: string;
  type?: string;
  display?: string;
  identifier?: Record<string, unknown>;
}

/** FHIR 数量（Quantity） */
export interface FHIRQuantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

/** FHIR 数量范围（Range） */
export interface FHIRRange {
  low?: FHIRQuantity;
  high?: FHIRQuantity;
}

/** FHIR 扩展（Extension） */
export interface FHIRExtension {
  url: string;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueDecimal?: number;
  valueDateTime?: string;
  valueCode?: string;
  valueQuantity?: FHIRQuantity;
  valueReference?: FHIRReference;
}

/** FHIR 标识符（Identifier） */
export interface FHIRIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  system?: string;
  value?: string;
}

/** FHIR 人类姓名（HumanName） */
export interface FHIRHumanName {
  use?: string;
  text?: string;
  family?: string;
  given?: string[];
}

/** FHIR 联系方式（ContactPoint） */
export interface FHIRContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
}

/** FHIR 地址（Address） */
export interface FHIRAddress {
  use?: string;
  type?: string;
  text?: string;
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/** FHIR Period */
export interface FHIRPeriod {
  start?: string;
  end?: string;
}

/** FHIR Narrative（文本） */
export interface FHIRNarrative {
  status?: 'generated' | 'extensions' | 'additional' | 'empty';
  div?: string;
}

/**
 * FHIR 资源基础结构
 *
 * 所有 FHIR 资源共享的最小字段集。具体资源可在此基础上扩展业务字段。
 */
export interface FHIRBaseResource {
  /** 资源类型（必填） */
  resourceType: FHIRResourceType;
  /** 资源逻辑ID */
  id?: string;
  /** 元数据 */
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
    tag?: FHIRCoding[];
  };
  /** 隐式规则集 */
  implicitRules?: string;
  /** 语言 */
  language?: string;
  /** 文本摘要 */
  text?: FHIRNarrative;
  /** 扩展 */
  extension?: FHIRExtension[];
  /** 修饰扩展 */
  modifierExtension?: FHIRExtension[];
}

/** FHIR 资源（允许任意业务字段） */
export type FHIRResource = FHIRBaseResource & Record<string, unknown>;

/** 资源校验问题 */
export interface FHIRValidationIssue {
  /** 字段路径 */
  path: string;
  /** 严重级别 */
  severity: 'error' | 'warning' | 'information';
  /** 问题描述 */
  message: string;
}

/** 资源校验结果 */
export interface FHIRValidationResult {
  valid: boolean;
  errors: FHIRValidationIssue[];
  warnings: FHIRValidationIssue[];
}

/** 受支持的 FHIR 资源类型集合 */
export const SUPPORTED_RESOURCE_TYPES: readonly FHIRResourceType[] = [
  'Patient',
  'Encounter',
  'Observation',
  'Condition',
  'MedicationRequest',
  'Procedure',
  'DiagnosticReport',
  'ImagingStudy',
  'AllergyIntolerance',
  'CarePlan',
  'Claim',
  'Coverage',
  'Practitioner',
  'Organization',
  'Location',
  'Appointment',
  'Schedule',
  'Slot',
  'ServiceRequest',
  'Medication',
  'MedicationAdministration',
  'Immunization',
];

/**
 * FHIR 资源封装类
 *
 * 提供 FHIR 资源的构造、序列化/反序列化与校验能力。
 *
 * @example
 * ```typescript
 * const patient = new FHIRResourceModel({
 *   resourceType: 'Patient',
 *   id: 'P001',
 *   gender: 'male',
 * });
 * patient.addExtension('http://jianlan.health/isVip', { valueBoolean: true });
 * const json = patient.toJSON();
 * ```
 */
export class FHIRResourceModel {
  private resource: FHIRResource;

  /**
   * 构造函数
   *
   * @param resource - FHIR 资源对象
   */
  constructor(resource: FHIRResource) {
    this.resource = { ...resource };
  }

  /**
   * 获取资源类型
   */
  get resourceType(): FHIRResourceType {
    return this.resource.resourceType;
  }

  /**
   * 获取资源ID
   */
  get id(): string | undefined {
    return this.resource.id;
  }

  /**
   * 获取原始资源对象
   */
  toJSON(): FHIRResource {
    return { ...this.resource };
  }

  /**
   * 序列化为 JSON 字符串
   */
  serialize(): string {
    return JSON.stringify(this.resource);
  }

  /**
   * 设置字段值
   *
   * @param path - 字段名（支持点号嵌套路径，如 "name.family"）
   * @param value - 字段值
   */
  set(path: string, value: unknown): this {
    const parts = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cursor: Record<string, any> = this.resource as Record<string, any>;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (typeof cursor[key] !== 'object' || cursor[key] === null) {
        cursor[key] = {};
      }
      cursor = cursor[key] as Record<string, any>;
    }
    cursor[parts[parts.length - 1]] = value;
    return this;
  }

  /**
   * 读取字段值
   *
   * @param path - 字段路径
   * @returns 字段值，不存在返回 undefined
   */
  get<T = unknown>(path: string): T | undefined {
    const parts = path.split('.');
    let cursor: unknown = this.resource;
    for (const key of parts) {
      if (cursor === null || cursor === undefined || typeof cursor !== 'object') return undefined;
      cursor = (cursor as Record<string, unknown>)[key];
    }
    return cursor as T | undefined;
  }

  /**
   * 添加扩展
   *
   * @param url - 扩展URL
   * @param value - 扩展值
   */
  addExtension(url: string, value: Partial<FHIRExtension>): this {
    this.resource.extension ??= [];
    this.resource.extension.push({ url, ...value });
    return this;
  }

  /**
   * 按URL查找扩展
   *
   * @param url - 扩展URL
   * @returns 扩展值（第一个匹配项）
   */
  getExtension(url: string): FHIRExtension | undefined {
    return this.resource.extension?.find((ext) => ext.url === url);
  }

  /**
   * 校验资源（基础结构校验）
   *
   * @returns 校验结果
   */
  validate(): FHIRValidationResult {
    const errors: FHIRValidationIssue[] = [];
    const warnings: FHIRValidationIssue[] = [];

    // 必填 resourceType
    if (!this.resource.resourceType) {
      errors.push({ path: 'resourceType', severity: 'error', message: '资源缺少 resourceType' });
    } else if (!SUPPORTED_RESOURCE_TYPES.includes(this.resource.resourceType)) {
      warnings.push({
        path: 'resourceType',
        severity: 'warning',
        message: `资源类型 [${this.resource.resourceType}] 不在核心22种资源内，将按透传处理`,
      });
    }

    // id 格式校验（如存在）
    if (this.resource.id !== undefined) {
      const idStr = String(this.resource.id);
      if (idStr.length > 64) {
        errors.push({ path: 'id', severity: 'error', message: '资源ID长度超过64字符' });
      }
      if (!/^[A-Za-z0-9\-.]{1,64}$/.test(idStr)) {
        warnings.push({
          path: 'id',
          severity: 'warning',
          message: `资源ID [${idStr}] 含非 FHIR 推荐字符`,
        });
      }
    }

    // 各资源类型必填字段最小校验
    this.validateRequiredFields(errors);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 按资源类型校验必填字段（最小集）
   */
  private validateRequiredFields(errors: FHIRValidationIssue[]): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = this.resource as Record<string, any>;
    switch (this.resource.resourceType) {
      case 'Patient':
        if (!r.name || !Array.isArray(r.name) || r.name.length === 0) {
          errors.push({
            path: 'Patient.name',
            severity: 'error',
            message: 'Patient 资源应至少包含一个 name',
          });
        }
        break;
      case 'Observation':
        if (!r.status) {
          errors.push({
            path: 'Observation.status',
            severity: 'error',
            message: 'Observation 资源缺少 status',
          });
        }
        if (!r.code) {
          errors.push({
            path: 'Observation.code',
            severity: 'error',
            message: 'Observation 资源缺少 code',
          });
        }
        break;
      case 'Encounter':
        if (!r.status) {
          errors.push({
            path: 'Encounter.status',
            severity: 'error',
            message: 'Encounter 资源缺少 status',
          });
        }
        break;
      case 'Condition':
        if (!r.code) {
          errors.push({
            path: 'Condition.code',
            severity: 'error',
            message: 'Condition 资源缺少 code',
          });
        }
        if (!r.subject) {
          errors.push({
            path: 'Condition.subject',
            severity: 'error',
            message: 'Condition 资源缺少 subject（患者引用）',
          });
        }
        break;
      case 'DiagnosticReport':
        if (!r.status) {
          errors.push({
            path: 'DiagnosticReport.status',
            severity: 'error',
            message: 'DiagnosticReport 资源缺少 status',
          });
        }
        if (!r.code) {
          errors.push({
            path: 'DiagnosticReport.code',
            severity: 'error',
            message: 'DiagnosticReport 资源缺少 code',
          });
        }
        break;
      default:
        // 其余资源无强制必填字段
        break;
    }
  }

  /**
   * 从 JSON 字符串反序列化
   *
   * @param json - JSON 字符串
   * @returns FHIRResourceModel 实例
   * @throws {Error} JSON 解析失败或缺少 resourceType
   */
  static deserialize(json: string): FHIRResourceModel {
    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch (error) {
      throw new Error(
        `FHIR JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return FHIRResourceModel.fromObject(data);
  }

  /**
   * 从普通对象创建资源模型
   *
   * @param obj - 普通对象
   * @returns FHIRResourceModel 实例
   */
  static fromObject(obj: unknown): FHIRResourceModel {
    if (typeof obj !== 'object' || obj === null) {
      throw new Error('FHIR 资源必须是对象');
    }
    const resource = obj as FHIRResource;
    if (!resource.resourceType) {
      throw new Error('FHIR 资源缺少 resourceType 字段');
    }
    return new FHIRResourceModel(resource);
  }
}
