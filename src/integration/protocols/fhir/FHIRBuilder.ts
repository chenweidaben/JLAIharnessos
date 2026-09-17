/**
 * 健澜科技数智医院智能体 - integration/protocols/fhir/FHIRBuilder.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - FHIR R4 构建器
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 提供流式 API 构建 FHIR R4 资源，支持：
 * - 链式字段设置
 * - 资源引用管理
 * - Bundle 构建
 * - 构建前校验
 *
 * @module integration/protocols/fhir/FHIRBuilder
 */

import type { FHIRBundle, FHIRBundleEntry } from './FHIRParser';
import {
  type FHIRCodeableConcept,
  type FHIRExtension,
  type FHIRReference,
  type FHIRResource,
  FHIRResourceModel,
  type FHIRResourceType,
  type FHIRValidationResult,
} from './FHIRResource';

/**
 * FHIR 构建器
 *
 * 流式 API 构建单个 FHIR 资源。
 *
 * @example
 * ```typescript
 * const patient = new FHIRBuilder('Patient')
 *   .setId('P001')
 * .set('gender', 'male')
 *   .addHumanName({ family: '张', given: ['伟'] })
 *   .build();
 * ```
 */
export class FHIRBuilder {
  private resource: Record<string, unknown>;

  /**
   * 构造函数
   *
   * @param resourceType - FHIR 资源类型
   */
  constructor(resourceType: FHIRResourceType) {
    this.resource = { resourceType };
  }

  /**
   * 设置资源ID
   *
   * @param id - 资源ID
   */
  setId(id: string): this {
    this.resource.id = id;
    return this;
  }

  /**
   * 设置元数据
   *
   * @param meta - 元数据
   */
  setMeta(meta: Record<string, unknown>): this {
    this.resource.meta = { ...(this.resource.meta ?? {}), ...meta };
    return this;
  }

  /**
   * 设置字段（支持点号嵌套路径）
   *
   * @param path - 字段路径
   * @param value - 字段值
   */
  set(path: string, value: unknown): this {
    const parts = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cursor: Record<string, any> = this.resource;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (typeof cursor[key] !== 'object' || cursor[key] === null || Array.isArray(cursor[key])) {
        cursor[key] = {};
      }
      cursor = cursor[key] as Record<string, any>;
    }
    cursor[parts[parts.length - 1]] = value;
    return this;
  }

  /**
   * 添加编码概念到字段
   *
   * @param path - 字段路径
   * @param concept - 编码概念
   */
  setCodeableConcept(path: string, concept: FHIRCodeableConcept): this {
    return this.set(path, concept);
  }

  /**
   * 添加引用
   *
   * @param path - 字段路径（如 subject）
   * @param reference - 引用对象或 "Type/Id" 字符串
   * @param display - 显示名
   */
  setReference(path: string, reference: FHIRReference | string, display?: string): this {
    const ref: FHIRReference =
      typeof reference === 'string'
        ? { reference, display }
        : { ...reference, ...(display ? { display } : {}) };
    return this.set(path, ref);
  }

  /**
   * 添加人类姓名
   *
   * @param name - 姓名对象
   */
  addHumanName(name: { family?: string; given?: string[]; text?: string; use?: string }): this {
    if (!Array.isArray(this.resource.name)) {
      this.resource.name = [];
    }
    (this.resource.name as unknown[]).push(name);
    return this;
  }

  /**
   * 添加扩展
   *
   * @param url - 扩展URL
   * @param value - 扩展值
   */
  addExtension(url: string, value: Partial<FHIRExtension>): this {
    if (!Array.isArray(this.resource.extension)) {
      this.resource.extension = [];
    }
    (this.resource.extension as FHIRExtension[]).push({ url, ...value });
    return this;
  }

  /**
   * 构建资源模型
   *
   * @returns FHIRResourceModel 实例
   */
  build(): FHIRResourceModel {
    return new FHIRResourceModel(this.resource as FHIRResource);
  }

  /**
   * 构建并校验
   *
   * @returns 校验结果与资源模型
   */
  buildAndValidate(): { resource: FHIRResourceModel; validation: FHIRValidationResult } {
    const resource = this.build();
    return { resource, validation: resource.validate() };
  }
}

/**
 * FHIR Bundle 构建器
 *
 * 用于组合多个资源为 Bundle（事务/搜索结果集/文档等）。
 *
 * @example
 * ```typescript
 * const bundle = new FHIRBundleBuilder('searchset')
 *   .addResource(patientModel)
 *   .addResource(encounterModel)
 *   .build();
 * ```
 */
export class FHIRBundleBuilder {
  private entries: FHIRBundleEntry[] = [];
  private readonly bundleType: FHIRBundle['type'];
  private bundleId?: string;

  /**
   * 构造函数
   *
   * @param type - Bundle 类型
   */
  constructor(type: FHIRBundle['type'] = 'collection') {
    this.bundleType = type;
  }

  /**
   * 设置 Bundle ID
   *
   * @param id - Bundle ID
   */
  setId(id: string): this {
    this.bundleId = id;
    return this;
  }

  /**
   * 添加资源到 Bundle
   *
   * @param resource - 资源模型或资源对象
   * @param fullUrl - 可选的完整URL
   */
  addResource(resource: FHIRResourceModel | FHIRResource, fullUrl?: string): this {
    const res = resource instanceof FHIRResourceModel ? resource.toJSON() : resource;
    const entry: FHIRBundleEntry = { resource: res };
    if (fullUrl) {
      entry.fullUrl = fullUrl;
    }
    this.entries.push(entry);
    return this;
  }

  /**
   * 添加事务请求条目（transaction）
   *
   * @param resource - 资源
   * @param method - HTTP 方法
   * @param url - 请求路径
   */
  addTransactionRequest(
    resource: FHIRResourceModel | FHIRResource,
    method: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
  ): this {
    const res = resource instanceof FHIRResourceModel ? resource.toJSON() : resource;
    this.entries.push({
      resource: res,
      request: { method, url },
    });
    return this;
  }

  /**
   * 构建 Bundle
   *
   * @returns FHIR Bundle 对象
   */
  build(): FHIRBundle {
    return {
      resourceType: 'Bundle',
      ...(this.bundleId ? { id: this.bundleId } : {}),
      type: this.bundleType,
      total: this.entries.length,
      entry: this.entries,
    };
  }
}
