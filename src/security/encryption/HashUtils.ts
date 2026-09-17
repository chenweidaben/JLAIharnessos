/**
 * 健澜科技数智医院智能体 - security/encryption/HashUtils.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 哈希工具
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件提供哈希工具函数，包括SHA-256/SHA-512哈希、带盐哈希、
 * HMAC消息认证、bcrypt/argon2密码哈希接口。
 * 使用Node.js内置crypto模块，Bun兼容。
 *
 * @module security/encryption/HashUtils
 */

import * as crypto from 'node:crypto';

import { EncryptionError, HashAlgorithm } from '../types';

/**
 * 计算SHA-256哈希
 *
 * @param data - 输入数据
 * @param encoding - 输出编码，默认hex
 * @returns 哈希值
 */
export function sha256(data: string | Buffer, encoding: BufferEncoding = 'hex'): string {
  return crypto.createHash('sha256').update(data).digest(encoding);
}

/**
 * 计算SHA-512哈希
 *
 * @param data - 输入数据
 * @param encoding - 输出编码，默认hex
 * @returns 哈希值
 */
export function sha512(data: string | Buffer, encoding: BufferEncoding = 'hex'): string {
  return crypto.createHash('sha512').update(data).digest(encoding);
}

/**
 * 通用哈希函数
 *
 * @param algorithm - 哈希算法
 * @param data - 输入数据
 * @param encoding - 输出编码
 * @returns 哈希值
 */
export function hash(
  algorithm: HashAlgorithm,
  data: string | Buffer,
  encoding: BufferEncoding = 'hex',
): string {
  switch (algorithm) {
    case HashAlgorithm.SHA_256:
      return sha256(data, encoding);
    case HashAlgorithm.SHA_512:
      return sha512(data, encoding);
    case HashAlgorithm.SM3:
      // SM3需要额外库，此处使用SHA-256作为替代（生产环境应使用国密库）
      return sha256(data, encoding);
    default:
      throw new EncryptionError(`不支持的哈希算法: ${String(algorithm)}`, { algorithm });
  }
}

/**
 * 带盐哈希
 * 用于密码存储等场景，防止彩虹表攻击
 *
 * @param data - 输入数据
 * @param salt - 盐值
 * @param algorithm - 哈希算法，默认SHA-256
 * @param iterations - 迭代次数，默认10000
 * @returns 哈希值（格式：algorithm$iterations$salt$hash）
 */
export function saltedHash(
  data: string,
  salt?: string,
  algorithm: HashAlgorithm = HashAlgorithm.SHA_256,
  iterations = 10000,
): string {
  const actualSalt = salt ?? generateSalt(16);
  let result = data;
  for (let i = 0; i < iterations; i++) {
    result = hash(algorithm, actualSalt + result);
  }
  return `${algorithm}$${iterations}$${actualSalt}$${result}`;
}

/**
 * 验证带盐哈希
 *
 * @param data - 输入数据
 * @param storedHash - 存储的哈希值（格式：algorithm$iterations$salt$hash）
 * @returns 是否匹配
 */
export function verifySaltedHash(data: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 4) return false;
  const [algorithmStr, iterationsStr, salt, expectedHash] = parts;
  const algorithm = algorithmStr as HashAlgorithm;
  const iterations = parseInt(iterationsStr, 10);
  if (isNaN(iterations)) return false;

  let result = data;
  for (let i = 0; i < iterations; i++) {
    result = hash(algorithm, salt + result);
  }
  return result === expectedHash;
}

/**
 * 生成随机盐值
 *
 * @param length - 盐值长度（字节），默认16
 * @returns 盐值（hex编码）
 */
export function generateSalt(length = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * HMAC（哈希消息认证码）
 * 用于消息完整性和身份认证
 *
 * @param algorithm - 哈希算法
 * @param key - 密钥
 * @param data - 输入数据
 * @param encoding - 输出编码
 * @returns HMAC值
 */
export function hmac(
  algorithm: HashAlgorithm,
  key: string | Buffer,
  data: string | Buffer,
  encoding: BufferEncoding = 'hex',
): string {
  const algo = algorithm === HashAlgorithm.SM3 ? 'sha256' : algorithm;
  return crypto.createHmac(algo, key).update(data).digest(encoding);
}

/**
 * HMAC验证
 *
 * @param algorithm - 哈希算法
 * @param key - 密钥
 * @param data - 输入数据
 * @param expectedHmac - 期望的HMAC值
 * @returns 是否匹配
 */
export function verifyHmac(
  algorithm: HashAlgorithm,
  key: string | Buffer,
  data: string | Buffer,
  expectedHmac: string,
): boolean {
  const computed = hmac(algorithm, key, data);
  return timingSafeEqual(computed, expectedHmac);
}

/**
 * 时序安全比较
 * 防止时序攻击
 *
 * @param a - 字符串a
 * @param b - 字符串b
 * @returns 是否相等
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * PBKDF2密码哈希
 * 使用PBKDF2算法进行密码哈希（NIST推荐）
 *
 * @param password - 密码
 * @param salt - 盐值（可选，不传则自动生成）
 * @param iterations - 迭代次数，默认100000
 * @param keyLength - 密钥长度，默认64
 * @returns 哈希值（格式：pbkdf2$iterations$salt$hash）
 */
export function pbkdf2Hash(
  password: string,
  salt?: string,
  iterations = 100000,
  keyLength = 64,
): string {
  const actualSalt = salt ?? generateSalt(16);
  const derivedKey = crypto.pbkdf2Sync(password, actualSalt, iterations, keyLength, 'sha512');
  return `pbkdf2$${iterations}$${actualSalt}$${derivedKey.toString('hex')}`;
}

/**
 * 验证PBKDF2密码哈希
 *
 * @param password - 密码
 * @param storedHash - 存储的哈希值
 * @returns 是否匹配
 */
export function verifyPbkdf2Hash(password: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const [, iterationsStr, salt, expectedHash] = parts;
  const iterations = parseInt(iterationsStr, 10);
  if (isNaN(iterations)) return false;

  const derivedKey = crypto.pbkdf2Sync(
    password,
    salt,
    iterations,
    expectedHash.length / 2,
    'sha512',
  );
  return timingSafeEqual(derivedKey.toString('hex'), expectedHash);
}

/**
 * bcrypt密码哈希（接口定义）
 * 注意：实际bcrypt需要bcryptjs或bcrypt库，此处提供接口和PBKDF2替代实现
 *
 * @param password - 密码
 * @param saltRounds - 盐轮数，默认12
 * @returns 哈希值
 */
export function bcryptHash(password: string, saltRounds = 12): string {
  // 使用PBKDF2模拟bcrypt格式（生产环境应使用真正的bcrypt库）
  const iterations = Math.pow(2, saltRounds);
  return pbkdf2Hash(password, undefined, iterations, 32);
}

/**
 * 验证bcrypt密码哈希
 *
 * @param password - 密码
 * @param storedHash - 存储的哈希值
 * @returns 是否匹配
 */
export function verifyBcryptHash(password: string, storedHash: string): boolean {
  return verifyPbkdf2Hash(password, storedHash);
}

/**
 * Argon2密码哈希（接口定义）
 * 注意：实际Argon2需要argon2库，此处提供接口和PBKDF2替代实现
 *
 * @param password - 密码
 * @returns 哈希值
 */
export function argon2Hash(password: string): string {
  // 使用PBKDF2模拟（生产环境应使用真正的argon2库）
  return pbkdf2Hash(password, undefined, 100000, 64);
}

/**
 * 验证Argon2密码哈希
 *
 * @param password - 密码
 * @param storedHash - 存储的哈希值
 * @returns 是否匹配
 */
export function verifyArgon2Hash(password: string, storedHash: string): boolean {
  return verifyPbkdf2Hash(password, storedHash);
}

/**
 * 生成随机令牌
 *
 * @param length - 令牌长度（字节），默认32
 * @returns 令牌（hex编码）
 */
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 生成UUID v4
 *
 * @returns UUID字符串
 */
export function generateUuid(): string {
  return crypto.randomUUID();
}
