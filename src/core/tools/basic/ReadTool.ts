/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 基础工具 - 文件读取
 * 基于 claude-code FileReadTool 简化适配，增加医疗工具框架封装。
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { z } from 'zod';

import { ErrorCodes, MedicalAgentError } from '@/core/errors';
import { MedicalToolCategory } from '@/types';

import { buildMedicalTool } from '../buildMedicalTool';

/** 读取工具输入 Schema */
const ReadToolInput = z.object({
  /** 文件路径（绝对路径或相对于工作目录） */
  file_path: z.string().describe('要读取的文件路径'),
  /** 起始行号（从1开始，可选） */
  offset: z.number().int().min(0).optional().describe('起始行号（从0开始），用于分段读取大文件'),
  /** 读取行数（可选，默认全部） */
  limit: z.number().int().min(1).max(2000).optional().describe('读取的最大行数，默认读取全部'),
});

/** 读取工具输出类型 */
interface ReadToolOutput {
  /** 是否成功 */
  success: boolean;
  /** 文件路径 */
  file_path: string;
  /** 文件内容 */
  content: string;
  /** 实际读取的起始行 */
  offset: number;
  /** 实际读取的行数 */
  lines_read: number;
  /** 文件总行数 */
  total_lines: number;
  /** 是否被截断 */
  truncated: boolean;
}

/** 最大文件大小（字节），超过则拒绝读取 */
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * 读取文件工具
 *
 * 读取指定文件的内容，支持分段读取大文件。
 * 属于基础工具，低风险，只读操作。
 *
 * 基于 claude-code FileReadTool 简化适配。
 */
export const readTool = buildMedicalTool({
  name: 'read_file',
  description: '读取文件内容。支持指定起始行和行数来分段读取大文件。返回文件的文本内容。',
  category: MedicalToolCategory.BASIC,
  riskLevel: 'low',
  requiresAuth: false,
  requiresConfirm: false,
  requiredPermissions: [],
  inputSchema: ReadToolInput,
  outputSchema: z.object({
    success: z.boolean(),
    file_path: z.string(),
    content: z.string(),
    offset: z.number(),
    lines_read: z.number(),
    total_lines: z.number(),
    truncated: z.boolean(),
  }),

  isConcurrencySafe: (): boolean => true,
  isReadOnly: (): boolean => true,

  async execute(input: unknown, _context): Promise<ReadToolOutput> {
    const parsed = ReadToolInput.parse(input);
    const filePath = path.resolve(parsed.file_path);
    const offset = parsed.offset ?? 0;
    const limit = parsed.limit;

    // 检查文件是否存在及大小
    let stats: import('fs').Stats;
    try {
      stats = await fs.stat(filePath);
    } catch {
      throw new MedicalAgentError(ErrorCodes.VALIDATION_ERROR, `文件不存在: ${filePath}`, {
        file_path: filePath,
      });
    }

    if (!stats.isFile()) {
      throw new MedicalAgentError(ErrorCodes.VALIDATION_ERROR, `路径不是文件: ${filePath}`, {
        file_path: filePath,
      });
    }

    if (stats.size > MAX_FILE_SIZE) {
      throw new MedicalAgentError(
        ErrorCodes.VALIDATION_ERROR,
        `文件过大（${(stats.size / 1024 / 1024).toFixed(2)}MB），最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        { file_path: filePath, file_size: stats.size },
      );
    }

    // 读取文件内容
    const rawContent = await fs.readFile(filePath, 'utf-8');
    const allLines = rawContent.split('\n');
    const totalLines = allLines.length;

    // 分段读取
    const startLine = Math.min(offset, totalLines);
    const endLine = limit ? Math.min(startLine + limit, totalLines) : totalLines;
    const contentLines = allLines.slice(startLine, endLine);
    const content = contentLines.join('\n');

    return {
      success: true,
      file_path: filePath,
      content,
      offset: startLine,
      lines_read: contentLines.length,
      total_lines: totalLines,
      truncated: endLine < totalLines,
    };
  },
});
