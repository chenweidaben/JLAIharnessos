/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import { ErrorCodes, MedicalAgentError } from '@/core/errors';
import type { BuiltMedicalTool, MedicalToolCategory, MedicalUser } from '@/types';

/**
 * 工具注册中心
 *
 * 管理所有医疗工具的注册、发现、查询和过滤。
 * 支持按分类查询、按用户角色过滤可用工具、工具元数据查询。
 *
 * 基于 claude-code 工具注册机制扩展，增加医疗工具分类和角色过滤。
 *
 * @example
 * ```typescript
 * const registry = new MedicalToolRegistry();
 * registry.register(queryPatientTool);
 * registry.register(writeProgressNoteTool);
 *
 * // 获取工具
 * const tool = registry.get('query_patient');
 *
 * // 按分类查询
 * const patientTools = registry.listByCategory(MedicalToolCategory.PATIENT);
 *
 * // 按用户角色过滤
 * const availableTools = registry.getAvailableToolsForUser(currentUser);
 * ```
 */
export class MedicalToolRegistry {
  /** 工具存储 Map（key: 工具名, value: 工具定义） */
  private readonly tools = new Map<string, BuiltMedicalTool>();

  /** 工具别名映射（key: 别名, value: 工具名） */
  private readonly aliases = new Map<string, string>();

  /** 分类索引（key: 分类, value: 工具名集合） */
  private readonly categoryIndex = new Map<MedicalToolCategory, Set<string>>();

  /**
   * 注册医疗工具
   *
   * @param tool - 构建完成的医疗工具
   * @throws {MedicalAgentError} 当工具名已存在或工具无效时抛出
   */
  public register(tool: BuiltMedicalTool): void {
    // 验证工具
    if (!tool.name) {
      throw new MedicalAgentError(
        ErrorCodes.VALIDATION_ERROR,
        'Cannot register tool: missing name',
      );
    }

    // 检查是否已注册
    if (this.tools.has(tool.name)) {
      throw new MedicalAgentError(
        ErrorCodes.VALIDATION_ERROR,
        `Tool '${tool.name}' is already registered`,
        { toolName: tool.name },
      );
    }

    // 检查别名冲突
    if (tool.aliases) {
      for (const alias of tool.aliases) {
        if (this.aliases.has(alias)) {
          throw new MedicalAgentError(
            ErrorCodes.VALIDATION_ERROR,
            `Tool alias '${alias}' is already in use by tool '${this.aliases.get(alias)}'`,
            { alias, existingTool: this.aliases.get(alias) },
          );
        }
      }
    }

    // 注册工具
    this.tools.set(tool.name, tool);

    // 注册别名
    if (tool.aliases) {
      for (const alias of tool.aliases) {
        this.aliases.set(alias, tool.name);
      }
    }

    // 更新分类索引
    if (!this.categoryIndex.has(tool.category)) {
      this.categoryIndex.set(tool.category, new Set());
    }
    this.categoryIndex.get(tool.category)!.add(tool.name);
  }

  /**
   * 批量注册医疗工具
   *
   * @param tools - 医疗工具列表
   */
  public registerAll(tools: readonly BuiltMedicalTool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * 注销医疗工具
   *
   * @param toolName - 工具名称或别名
   * @throws {MedicalAgentError} 当工具不存在时抛出
   */
  public unregister(toolName: string): void {
    const resolvedName = this.resolveName(toolName);

    if (!resolvedName) {
      throw new MedicalAgentError(ErrorCodes.TOOL_NOT_FOUND, `Tool '${toolName}' not found`, {
        toolName,
      });
    }

    const tool = this.tools.get(resolvedName)!;

    // 移除工具
    this.tools.delete(resolvedName);

    // 移除别名
    if (tool.aliases) {
      for (const alias of tool.aliases) {
        this.aliases.delete(alias);
      }
    }

    // 更新分类索引
    const categoryTools = this.categoryIndex.get(tool.category);
    if (categoryTools) {
      categoryTools.delete(resolvedName);
      if (categoryTools.size === 0) {
        this.categoryIndex.delete(tool.category);
      }
    }
  }

  /**
   * 获取医疗工具
   *
   * @param toolName - 工具名称或别名
   * @returns 工具定义，不存在时返回 undefined
   */
  public get(toolName: string): BuiltMedicalTool | undefined {
    const resolvedName = this.resolveName(toolName);
    return resolvedName ? this.tools.get(resolvedName) : undefined;
  }

  /**
   * 获取医疗工具（必须存在）
   *
   * @param toolName - 工具名称或别名
   * @returns 工具定义
   * @throws {MedicalAgentError} 当工具不存在时抛出
   */
  public getOrThrow(toolName: string): BuiltMedicalTool {
    const tool = this.get(toolName);
    if (!tool) {
      throw new MedicalAgentError(ErrorCodes.TOOL_NOT_FOUND, `Tool '${toolName}' not found`, {
        toolName,
      });
    }
    return tool;
  }

  /**
   * 列出所有已注册的工具
   *
   * @param category - 可选，按分类过滤
   * @returns 工具定义列表
   */
  public list(category?: MedicalToolCategory): readonly BuiltMedicalTool[] {
    if (category) {
      const toolNames = this.categoryIndex.get(category);
      if (!toolNames) return [];
      return Array.from(toolNames)
        .map((name) => this.tools.get(name))
        .filter((t): t is BuiltMedicalTool => t !== undefined);
    }
    return Array.from(this.tools.values());
  }

  /**
   * 按分类查询工具
   *
   * @param category - 工具分类
   * @returns 该分类下的工具列表
   */
  public listByCategory(category: MedicalToolCategory): readonly BuiltMedicalTool[] {
    return this.list(category);
  }

  /**
   * 获取所有分类
   *
   * @returns 已注册工具的分类列表
   */
  public listCategories(): readonly MedicalToolCategory[] {
    return Array.from(this.categoryIndex.keys());
  }

  /**
   * 按用户角色过滤可用工具
   *
   * 综合检查工具的 allowedRoles、requiredTitles、isEnabled 等条件，
   * 返回当前用户可使用的工具列表。
   *
   * @param user - 当前用户
   * @returns 用户可用的工具列表
   */
  public getAvailableToolsForUser(user: MedicalUser): readonly BuiltMedicalTool[] {
    return Array.from(this.tools.values()).filter((tool) => {
      // 检查是否启用
      if (!tool.isEnabled()) return false;

      // 检查角色
      if (tool.allowedRoles && tool.allowedRoles.length > 0) {
        if (!tool.allowedRoles.includes(user.role)) return false;
      }

      // 检查职称
      if (tool.requiredTitles && tool.requiredTitles.length > 0) {
        if (!user.title || !tool.requiredTitles.includes(user.title)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 检查工具是否已注册
   *
   * @param toolName - 工具名称或别名
   * @returns 是否已注册
   */
  public has(toolName: string): boolean {
    return this.resolveName(toolName) !== null;
  }

  /**
   * 获取工具元数据
   *
   * 返回工具的描述性元数据，用于工具搜索和LLM工具列表构建。
   *
   * @param toolName - 工具名称或别名
   * @returns 工具元数据
   */
  public getToolMetadata(toolName: string):
    | {
        name: string;
        description: string;
        category: MedicalToolCategory;
        riskLevel: string;
        aliases?: readonly string[];
      }
    | undefined {
    const tool = this.get(toolName);
    if (!tool) return undefined;

    return {
      name: tool.name,
      description: tool.description,
      category: tool.category,
      riskLevel: tool.riskLevel,
      aliases: tool.aliases,
    };
  }

  /**
   * 获取所有工具元数据
   *
   * @returns 所有工具的元数据列表
   */
  public getAllToolMetadata(): readonly {
    name: string;
    description: string;
    category: MedicalToolCategory;
    riskLevel: string;
  }[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      category: tool.category,
      riskLevel: tool.riskLevel,
    }));
  }

  /**
   * 获取已注册工具数量
   *
   * @returns 工具数量
   */
  public size(): number {
    return this.tools.size;
  }

  /**
   * 清空所有已注册工具
   *
   * 主要用于测试和重置。
   */
  public clear(): void {
    this.tools.clear();
    this.aliases.clear();
    this.categoryIndex.clear();
  }

  /**
   * 解析工具名称（处理别名）
   *
   * @param nameOrAlias - 工具名称或别名
   * @returns 解析后的工具名称，未找到时返回 null
   */
  private resolveName(nameOrAlias: string): string | null {
    if (this.tools.has(nameOrAlias)) {
      return nameOrAlias;
    }
    const resolved = this.aliases.get(nameOrAlias);
    return resolved ?? null;
  }
}
