/**
 * 健澜科技杠OS - MFA 一次性恢复（备份）码
 *
 * 用户丢失验证器时用备份码应急登录。备份码仅以 SHA-256 哈希存储、明文仅在生成时
 * 展示一次；每个备份码使用一次后立即失效。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import * as crypto from 'node:crypto';

import { timingSafeEqual } from '../encryption/HashUtils.js';

// 去除易混淆字符（0/O、1/I/L）
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** 生成单个备份码（格式 XXXX-XXXX） */
export function generateBackupCode(): string {
  const chars: string[] = [];
  for (let i = 0; i < 8; i++) {
    chars.push(ALPHABET[crypto.randomInt(ALPHABET.length)]);
  }
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}

/** 生成一组备份码 */
export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => generateBackupCode());
}

/** 规范化用户输入（去横线/空格、大写） */
export function normalizeBackupCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

/** 备份码存储哈希（SHA-256 hex） */
export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(normalizeBackupCode(code)).digest('hex');
}

/** 常量时间比对备份码是否匹配某个存储哈希 */
export function matchesBackupCode(code: string, storedHash: string): boolean {
  return timingSafeEqual(hashBackupCode(code), storedHash);
}
