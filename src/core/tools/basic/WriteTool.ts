/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 基础工具 - 文件写入
 * 基于 claude-code FileWriteTool 简化适配，增加医疗工具框架封装。
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { z } from 'zod';

import { ErrorCodes, MedicalAgentError } from '@/core/errors';
import { MedicalToolCategory } from '@/types';

import { buildMedicalTool } from '../buildMedicalTool';

/** 写入工具输入 Schema */
const WriteToolInput = z.object({
  /** 文件路径（绝对路径或相对于工作目录） */
  file_path: z.string().describe('要写入的文件路径'),
  /** 要写入的内容 */
  content: z.string().describe('要写入文件的文本内容'),
});

/** 写入工具输出类型 */
interface WriteToolOutput {
  /** 是否成功 */
  success: boolean;
  /** 文件路径 */
  file_path: string;
  /** 写入的字节数 */
  bytes_written: number;
  /** 是否为新创建文件 */
  created: boolean;
}

/** 最大写入大小（字节） */
const MAX_WRITE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * 写入文件工具
 *
 * 将内容写入指定文件，如果文件已存在则覆盖。
 * 属于基础工具，中风险（修改文件系统）。
 *
 * 基于 claude-code FileWriteTool 简化适配。
 */
export const writeTool = buildMedicalTool({
  name: 'write_file',
  description: '将文本内容写入文件。如果文件已存在，将被覆盖。如果目录不存在，将自动创建。',
  category: MedicalToolCategory.BASIC,
  riskLevel: 'medium',
  requiresAuth: false,
  requiresConfirm: true,
  requiredPermissions: [],
  inputSchema: WriteToolInput,
  outputSchema: z.object({
    success: z.boolean(),
    file_path: z.string(),
    bytes_written: z.number(),
    created: z.boolean(),
  }),

  isConcurrencySafe: (): boolean => false,
  isReadOnly: (): boolean => false,
  isDestructive: (): boolean => true,

  async execute(input: unknown, _context): Promise<WriteToolOutput> {
    const parsed = WriteToolInput.parse(input);
    const filePath = path.resolve(parsed.file_path);
    const content = parsed.content;

    // 检查内容大小
    const contentSize = Buffer.byteLength(content, 'utf-8');
    if (contentSize > MAX_WRITE_SIZE) {
      throw new MedicalAgentError(
        ErrorCodes.VALIDATION_ERROR,
        `写入内容过大（${(contentSize / 1024 / 1024).toFixed(2)}MB），最大支持 ${MAX_WRITE_SIZE / 1024 / 1024}MB`,
        { file_path: filePath, content_size: contentSize },
      );
    }

    // 检查文件是否已存在
    let created = false;
    try {
      await fs.access(filePath);
    } catch {
      created = true;
    }

    // 确保目录存在
    const dir = path.dirname(filePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }

    // 写入文件
    await fs.writeFile(filePath, content, 'utf-8');

    return {
      success: true,
      file_path: filePath,
      bytes_written: contentSize,
      created,
    };
  },
});
