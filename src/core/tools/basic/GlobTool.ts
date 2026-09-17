/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 基础工具 - 文件搜索（Glob）
 * 基于 claude-code GlobTool 简化适配，增加医疗工具框架封装。
 */

import * as path from 'path';
import { z } from 'zod';

import { ErrorCodes, MedicalAgentError } from '@/core/errors';
import { MedicalToolCategory } from '@/types';

import { buildMedicalTool } from '../buildMedicalTool';

/** Glob 工具输入 Schema */
const GlobToolInput = z.object({
  /** 搜索路径（绝对路径或相对于工作目录） */
  path: z.string().default('.').describe('搜索的起始目录路径'),
  /** Glob 模式（支持多个） */
  pattern: z.string().describe('Glob 匹配模式，如 "**/*.ts"、"src/**/*.{ts,tsx}"'),
  /** 最大返回结果数 */
  max_results: z.number().int().min(1).max(500).default(100).describe('最大返回的文件数量'),
});

/** Glob 工具输出类型 */
interface GlobToolOutput {
  /** 是否成功 */
  success: boolean;
  /** 匹配的文件列表 */
  files: string[];
  /** 匹配总数 */
  total_matches: number;
  /** 是否被截断 */
  truncated: boolean;
  /** 搜索路径 */
  search_path: string;
  /** 使用的模式 */
  pattern: string;
}

/**
 * 简单的 Glob 匹配器
 *
 * 支持 **、*、?、[] 等常见 glob 语法。
 * 简化实现，适用于基础文件搜索场景。
 */
class SimpleGlob {
  private readonly pattern: string;
  private readonly regex: RegExp;

  constructor(pattern: string) {
    this.pattern = pattern;
    this.regex = this.globToRegex(pattern);
  }

  /**
   * 将 glob 模式转换为正则表达式
   */
  private globToRegex(glob: string): RegExp {
    let regex = '';
    let i = 0;

    while (i < glob.length) {
      const char = glob[i];

      if (char === '*') {
        if (glob[i + 1] === '*') {
          // ** 匹配任意路径段
          regex += '.*';
          i += 2;
          // 跳过后面的 /
          if (glob[i] === '/') {
            i++;
          }
          continue;
        } else {
          // * 匹配单个路径段内的任意字符
          regex += '[^/]*';
          i++;
          continue;
        }
      }

      if (char === '?') {
        regex += '[^/]';
        i++;
        continue;
      }

      if (char === '[') {
        // 字符类
        let j = i + 1;
        if (glob[j] === '!') {
          regex += '[^';
          j++;
        } else {
          regex += '[';
        }
        while (j < glob.length && glob[j] !== ']') {
          regex += glob[j];
          j++;
        }
        regex += ']';
        i = j + 1;
        continue;
      }

      if (char === '.') {
        regex += '\\.';
        i++;
        continue;
      }

      if (char === '/') {
        regex += '/';
        i++;
        continue;
      }

      // 普通字符
      regex += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      i++;
    }

    return new RegExp(`^${regex}$`);
  }

  /**
   * 测试路径是否匹配
   */
  public match(filePath: string): boolean {
    // 规范化路径分隔符
    const normalized = filePath.replace(/\\/g, '/');
    return this.regex.test(normalized);
  }
}

/**
 * 递归遍历目录，收集所有文件
 */
async function walkDirectory(dir: string, maxFiles: number): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string): Promise<void> {
    if (results.length >= maxFiles) return;

    let entries: import('fs').Dirent[];
    try {
      const { promises: fs } = await import('fs');
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxFiles) return;

      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        // 跳过常见的忽略目录
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === 'dist' ||
          entry.name === 'build' ||
          entry.name === '.venv'
        ) {
          continue;
        }
        await walk(fullPath);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }

  await walk(dir);
  return results;
}

/**
 * 文件搜索工具（Glob）
 *
 * 根据 glob 模式搜索匹配的文件。
 * 属于基础工具，低风险，只读操作。
 *
 * 基于 claude-code GlobTool 简化适配。
 */
export const globTool = buildMedicalTool({
  name: 'glob_search',
  description:
    '根据 glob 模式搜索文件。支持 **（递归匹配）、*（匹配任意字符）、?（匹配单个字符）等语法。返回匹配的文件路径列表。',
  category: MedicalToolCategory.BASIC,
  riskLevel: 'low',
  requiresAuth: false,
  requiresConfirm: false,
  requiredPermissions: [],
  inputSchema: GlobToolInput,
  outputSchema: z.object({
    success: z.boolean(),
    files: z.array(z.string()),
    total_matches: z.number(),
    truncated: z.boolean(),
    search_path: z.string(),
    pattern: z.string(),
  }),

  isConcurrencySafe: (): boolean => true,
  isReadOnly: (): boolean => true,

  async execute(input: unknown, _context): Promise<GlobToolOutput> {
    const parsed = GlobToolInput.parse(input);
    const searchPath = path.resolve(parsed.path);
    const pattern = parsed.pattern;
    const maxResults = parsed.max_results;

    // 检查搜索路径是否存在
    const { promises: fs } = await import('fs');
    try {
      const stats = await fs.stat(searchPath);
      if (!stats.isDirectory()) {
        throw new MedicalAgentError(
          ErrorCodes.VALIDATION_ERROR,
          `搜索路径不是目录: ${searchPath}`,
          { path: searchPath },
        );
      }
    } catch (error) {
      if (error instanceof MedicalAgentError) throw error;
      throw new MedicalAgentError(ErrorCodes.VALIDATION_ERROR, `搜索路径不存在: ${searchPath}`, {
        path: searchPath,
      });
    }

    // 创建 glob 匹配器
    const glob = new SimpleGlob(pattern);

    // 遍历目录并匹配
    const allFiles = await walkDirectory(searchPath, maxResults * 2);
    const matchedFiles: string[] = [];

    for (const file of allFiles) {
      // 计算相对于搜索路径的路径用于匹配
      const relativePath = path.relative(searchPath, file);
      if (glob.match(relativePath) || glob.match(file)) {
        matchedFiles.push(file);
        if (matchedFiles.length >= maxResults) break;
      }
    }

    return {
      success: true,
      files: matchedFiles,
      total_matches: matchedFiles.length,
      truncated: matchedFiles.length >= maxResults,
      search_path: searchPath,
      pattern,
    };
  },
});
