/**
 * 健澜科技 jlmedaios - 轻量字段加密工具（M3-J）
 *
 * 用于数据库敏感字段（姓名/手机号/身份证号）的字段级加密与哈希：
 *  - AES-256-GCM，密钥由环境变量 FIELD_ENCRYPTION_KEY 派生（scrypt）；
 *  - 未配置密钥时使用开发态默认值并警告（仅限本地）；
 *  - 哈希（SHA-256）用于唯一约束/去重，不存明文；
 *  - 与重型 EncryptionService（KMS/多密钥）互补，本工具面向单库字段加密。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import * as crypto from 'node:crypto';

const SALT = 'jlmedaios-field-encryption';
let _key: Buffer | null = null;

function getKey(): Buffer {
  if (_key) return _key;
  const secret = process.env.FIELD_ENCRYPTION_KEY ?? process.env.JWT_SECRET;
  if (!secret) {
    console.warn('[security] FIELD_ENCRYPTION_KEY 未设置，使用开发态字段密钥（仅限本地开发）');
    _key = crypto.scryptSync('dev-only-insecure-field-key-change-me', SALT, 32);
    return _key;
  }
  _key = crypto.scryptSync(secret, SALT, 32);
  return _key;
}

/** 重置派生密钥缓存（测试用） */
export function _resetFieldKey(): void {
  _key = null;
}

/** 加密字段，返回紧凑字符串 v1.iv.tag.ciphertext（均为 base64） */
export function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    'v1',
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.');
}

/** 解密字段；数据被篡改或密钥错误时抛出 */
export function decryptField(blob: string): string {
  const parts = blob.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('字段密文格式不正确');
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ]);
  return plain.toString('utf8');
}

/** 计算字段 SHA-256 哈希（去空格、小写），用于唯一约束/去重 */
export function hashField(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

/** 从身份证号推导出生日期（18 位） */
export function birthDateFromIdCard(idCard: string): string | null {
  if (!/^\d{17}[\dXx]$/.test(idCard)) return null;
  const y = idCard.slice(6, 10);
  const m = idCard.slice(10, 12);
  const d = idCard.slice(12, 14);
  return `${y}-${m}-${d}`;
}

/** 从身份证号推导性别（第 17 位奇男偶女） */
export function genderFromIdCard(idCard: string): '男' | '女' | null {
  if (!/^\d{17}[\dXx]$/.test(idCard)) return null;
  return Number(idCard[16]) % 2 === 1 ? '男' : '女';
}
