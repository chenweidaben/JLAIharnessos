/**
 * 健澜科技杠OS - 智能体包管理器
 *
 * 智能体包（AgentPackage）是开源市场分发、医院信息科间共享、低代码平台导入导出
 * 的最小单元。由于编排 DSL 是纯声明式数据（不含可执行代码），包的安装是安全的：
 * 工具能力受注册表与权限约束，表达式受白名单沙箱约束。
 *
 * 职责：
 *   - 打包：聚合智能体定义、工作流、提示词资源与知识库引用，计算 SHA-256 校验和；
 *   - 导入：结构 + 语义校验、校验和验证、注册到 AgentRegistry；
 *   - 序列化：YAML/JSON 文本与文件读写。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { createHash } from 'node:crypto';
import type { AgentDefinition, AgentPackage, KnowledgeRef } from '../dsl/types.js';
import { loadAgentPackage, serializeDsl, parseDslText } from '../dsl/loader.js';
import type { ValidationResult } from '../dsl/types.js';
import type { ReferenceResolver } from '../engine/validator.js';
import type { AgentRegistry } from '../agent/AgentRegistry.js';

/** 当前包格式版本 */
export const PACKAGE_FORMAT_VERSION = '1.0.0';

/** 打包选项 */
export interface ExportOptions {
  prompts?: Record<string, string>;
  knowledgeRefs?: KnowledgeRef[];
}

/** 导入结果 */
export interface ImportResult {
  agent: AgentDefinition;
  validations: ValidationResult[];
  checksumValid: boolean;
}

/**
 * 智能体包管理器
 */
export class AgentPackManager {
  constructor(private readonly registry: AgentRegistry) {}

  /** 计算包内容校验和（对除 checksum 外的规范化 JSON 求 SHA-256） */
  computeChecksum(pkg: Omit<AgentPackage, 'checksum'>): string {
    const { checksum: _ignored, ...canonical } = pkg as AgentPackage;
    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    return createHash('sha256').update(json).digest('hex');
  }

  /** 导出智能体包 */
  exportPackage(agent: AgentDefinition, options: ExportOptions = {}): AgentPackage {
    const pkg: Omit<AgentPackage, 'checksum'> = {
      packageFormatVersion: PACKAGE_FORMAT_VERSION,
      agent,
      prompts: options.prompts ?? this.registry.getPrompts(agent.id),
      knowledgeRefs: options.knowledgeRefs ?? this.buildKnowledgeRefs(agent),
      packagedAt: new Date().toISOString(),
    };
    const checksum = this.computeChecksum(pkg);
    return { ...pkg, checksum };
  }

  /** 从智能体声明的知识库构造引用元数据 */
  private buildKnowledgeRefs(agent: AgentDefinition): KnowledgeRef[] {
    return (agent.knowledgeBases ?? []).map((name) => ({
      name,
      source: 'platform',
      license: 'internal',
    }));
  }

  /** 导入智能体包（校验 + 注册） */
  importPackage(
    source: string | AgentPackage | unknown,
    options: { resolver?: ReferenceResolver; format?: 'yaml' | 'json' } = {},
  ): ImportResult {
    const data = typeof source === 'string' ? parseDslText(source, options.format) : source;

    // 校验和验证（先在原始数据上）
    const rawPkg = data as AgentPackage;
    let checksumValid = false;
    if (rawPkg?.checksum) {
      const { checksum: _c, ...withoutChecksum } = rawPkg;
      const expected = this.computeChecksum(withoutChecksum as Omit<AgentPackage, 'checksum'>);
      checksumValid = expected === rawPkg.checksum;
    }

    // 结构 + 语义校验
    const { pkg, validations } = loadAgentPackage(data, { resolver: options.resolver });

    // 版本兼容检查
    if (!this.isVersionCompatible(pkg.packageFormatVersion)) {
      validations.push({
        valid: false,
        issues: [
          {
            severity: 'error',
            code: 'VERSION_INCOMPATIBLE',
            message: `包格式版本 ${pkg.packageFormatVersion} 与当前支持版本 ${PACKAGE_FORMAT_VERSION} 不兼容`,
          },
        ],
      });
    }

    const hasError = validations.some((v) => !v.valid);
    if (!hasError) {
      this.registry.register(pkg.agent, pkg.prompts);
    }

    return { agent: pkg.agent, validations, checksumValid };
  }

  /** 简单主版本兼容判断 */
  private isVersionCompatible(v: string): boolean {
    const major = Number(v.split('.')[0]);
    const currentMajor = Number(PACKAGE_FORMAT_VERSION.split('.')[0]);
    return major === currentMajor;
  }

  /** 序列化为文本 */
  toText(pkg: AgentPackage, format: 'yaml' | 'json' = 'yaml'): string {
    return serializeDsl(pkg, format);
  }

  /** 从文本解析为包对象（不落库） */
  fromText(text: string, format?: 'yaml' | 'json'): AgentPackage {
    return parseDslText(text, format) as AgentPackage;
  }
}
