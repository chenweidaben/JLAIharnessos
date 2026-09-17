/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 基础工具 - 内容搜索（Grep）
 * 基于 claude-code GrepTool 简化适配，增加医疗工具框架封装。
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { z } from 'zod';

import { ErrorCodes, MedicalAgentError } from '@/core/errors';
import { MedicalToolCategory } from '@/types';

import { buildMedicalTool } from '../buildMedicalTool';

/** Grep 工具输入 Schema */
const GrepToolInput = z.object({
  /** 搜索路径（绝对路径或相对于工作目录） */
  path: z.string().default('.').describe('搜索的起始目录或文件路径'),
  /** 搜索模式（正则表达式或普通字符串） */
  pattern: z.string().describe('要搜索的内容模式（支持正则表达式）'),
  /** 是否使用正则表达式 */
  is_regex: z.boolean().default(false).describe('是否将 pattern 作为正则表达式处理'),
  /** 是否忽略大小写 */
  ignore_case: z.boolean().default(false).describe('是否忽略大小写'),
  /** 文件 glob 过滤模式（如 ** slash *.ts） */
  file_pattern: z.string().optional().describe('只搜索匹配此 glob 模式的文件'),
  /** 最大返回结果数 */
  max_results: z.number().int().min(1).max(200).default(50).describe('最大返回的匹配行数'),
  /** 上下文行数（匹配行前后显示的行数） */
  context_lines: z.number().int().min(0).max(10).default(0).describe('匹配行前后显示的上下文行数'),
});

/** 单个匹配结果 */
interface GrepMatch {
  /** 文件路径 */
  file_path: string;
  /** 行号（从1开始） */
  line_number: number;
  /** 匹配的行内容 */
  line_content: string;
  /** 匹配的起始列 */
  match_start: number;
  /** 匹配的结束列 */
  match_end: number;
}

/** Grep 工具输出类型 */
interface GrepToolOutput {
  /** 是否成功 */
  success: boolean;
  /** 匹配结果列表 */
  matches: GrepMatch[];
  /** 匹配总数 */
  total_matches: number;
  /** 搜索的文件数 */
  files_searched: number;
  /** 是否被截断 */
  truncated: boolean;
  /** 搜索路径 */
  search_path: string;
  /** 搜索模式 */
  pattern: string;
}

/** 最大文件大小（字节），超过则跳过 */
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

/**
 * 简单的 glob 匹配（用于文件过滤）
 */
function simpleGlobMatch(pattern: string, filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const patternNormalized = pattern.replace(/\\/g, '/');

  // 处理 **
  const regexStr = patternNormalized
    .replace(/\*\*/g, '<<<GLOBSTAR>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/<<<GLOBSTAR>>>/g, '.*')
    .replace(/\./g, '\\.');

  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(normalized);
}

/**
 * 递归收集文件列表
 */
async function collectFiles(dir: string, filePattern?: string, maxFiles = 1000): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string): Promise<void> {
    if (results.length >= maxFiles) return;

    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxFiles) return;

      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
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
        // 检查文件大小
        try {
          const stats = await fs.stat(fullPath);
          if (stats.size > MAX_FILE_SIZE) continue;
        } catch {
          continue;
        }

        // 检查文件模式过滤
        if (filePattern) {
          const relativePath = path.relative(dir, fullPath);
          if (!simpleGlobMatch(filePattern, relativePath)) continue;
        }

        results.push(fullPath);
      }
    }
  }

  await walk(dir);
  return results;
}

/**
 * 内容搜索工具（Grep）
 *
 * 在文件中搜索匹配的内容，支持正则表达式和大小写忽略。
 * 属于基础工具，低风险，只读操作。
 *
 * 基于 claude-code GrepTool 简化适配。
 */
export const grepTool = buildMedicalTool({
  name: 'grep_search',
  description:
    '在文件中搜索文本内容。支持正则表达式、忽略大小写、文件类型过滤。返回匹配的行及其位置信息。',
  category: MedicalToolCategory.BASIC,
  riskLevel: 'low',
  requiresAuth: false,
  requiresConfirm: false,
  requiredPermissions: [],
  inputSchema: GrepToolInput,
  outputSchema: z.object({
    success: z.boolean(),
    matches: z.array(
      z.object({
        file_path: z.string(),
        line_number: z.number(),
        line_content: z.string(),
        match_start: z.number(),
        match_end: z.number(),
      }),
    ),
    total_matches: z.number(),
    files_searched: z.number(),
    truncated: z.boolean(),
    search_path: z.string(),
    pattern: z.string(),
  }),

  isConcurrencySafe: (): boolean => true,
  isReadOnly: (): boolean => true,

  async execute(input: unknown, _context): Promise<GrepToolOutput> {
    const parsed = GrepToolInput.parse(input);
    const searchPath = path.resolve(parsed.path);
    const pattern = parsed.pattern;
    const maxResults = parsed.max_results;
    const contextLines = parsed.context_lines;

    // 构建正则表达式
    let regex: RegExp;
    try {
      const flags = parsed.ignore_case ? 'gi' : 'g';
      if (parsed.is_regex) {
        regex = new RegExp(pattern, flags);
      } else {
        // 转义特殊字符
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escaped, flags);
      }
    } catch {
      throw new MedicalAgentError(ErrorCodes.VALIDATION_ERROR, `无效的搜索模式: ${pattern}`, {
        pattern,
      });
    }

    // 收集要搜索的文件
    let filesToSearch: string[];
    let filesSearched = 0;

    try {
      const stats = await fs.stat(searchPath);
      if (stats.isFile()) {
        filesToSearch = [searchPath];
      } else if (stats.isDirectory()) {
        filesToSearch = await collectFiles(searchPath, parsed.file_pattern);
      } else {
        throw new MedicalAgentError(
          ErrorCodes.VALIDATION_ERROR,
          `搜索路径既不是文件也不是目录: ${searchPath}`,
        );
      }
    } catch (error) {
      if (error instanceof MedicalAgentError) throw error;
      throw new MedicalAgentError(ErrorCodes.VALIDATION_ERROR, `搜索路径不存在: ${searchPath}`, {
        path: searchPath,
      });
    }

    // 搜索文件
    const matches: GrepMatch[] = [];
    let truncated = false;

    for (const file of filesToSearch) {
      if (matches.length >= maxResults) {
        truncated = true;
        break;
      }

      filesSearched++;

      let content: string;
      try {
        content = await fs.readFile(file, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (matches.length >= maxResults) {
          truncated = true;
          break;
        }

        const line = lines[i];
        regex.lastIndex = 0;
        const match = regex.exec(line);

        if (match) {
          matches.push({
            file_path: file,
            line_number: i + 1,
            line_content: line,
            match_start: match.index,
            match_end: match.index + match[0].length,
          });

          // 如果需要上下文行，添加上下文（简化实现：只记录主匹配）
          if (contextLines > 0) {
            // 上下文行的处理在输出时由调用方决定
          }
        }
      }
    }

    return {
      success: true,
      matches,
      total_matches: matches.length,
      files_searched: filesSearched,
      truncated,
      search_path: searchPath,
      pattern,
    };
  },
});
