/**
 * 健澜科技杠OS - TOTP（RFC 6238）一次性动态口令
 *
 * 基于 Node/Bun 内置 crypto 的 HMAC 实现，零第三方依赖；兼容 Google Authenticator、
 * 微软 Authenticator、企业微信/钉钉动态码等主流验证器（默认 SHA-1、6 位、30s 步长）。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import * as crypto from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export interface TotpOptions {
  /** 时间步长（秒），默认 30 */
  period?: number;
  /** 口令位数，默认 6 */
  digits?: number;
  /** HMAC 算法，默认 sha1（验证器事实标准）；可选 sha256/sha512 */
  algorithm?: 'sha1' | 'sha256' | 'sha512';
}

export interface VerifyOptions extends TotpOptions {
  /** 允许的前后时间窗口（步），默认 1（容忍 ±30s 时钟漂移） */
  window?: number;
  /** 校验时刻（毫秒），默认当前时间；测试可注入固定值 */
  timestamp?: number;
}

/** Base32（RFC 4648）编码 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/** Base32 解码（容忍空格、小写与缺失填充） */
export function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`非法 Base32 字符: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** 生成随机 Base32 密钥（默认 20 字节 = 160 位，RFC 推荐） */
export function generateSecret(bytes = 20): string {
  return base32Encode(crypto.randomBytes(bytes));
}

/** HOTP（RFC 4226）：基于计数器生成口令 */
export function hotp(secret: string, counter: number, options: TotpOptions = {}): string {
  const digits = options.digits ?? 6;
  const algorithm = options.algorithm ?? 'sha1';
  const key = base32Decode(secret);

  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac(algorithm, key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 10 ** digits;
  return otp.toString().padStart(digits, '0');
}

/** TOTP（RFC 6238）：基于时间生成口令 */
export function totp(secret: string, options: TotpOptions & { timestamp?: number } = {}): string {
  const period = options.period ?? 30;
  const timestamp = options.timestamp ?? Date.now();
  const counter = Math.floor(timestamp / 1000 / period);
  return hotp(secret, counter, options);
}

/**
 * 校验用户提交的 TOTP。
 * @returns 命中则返回相对当前步的偏移（0 准时、-1/+1 漂移），失败返回 null。
 *          调用方应记录上一次成功的 counter+delta，拒绝同一口令重放。
 */
export function verifyTotp(token: string, secret: string, options: VerifyOptions = {}): number | null {
  const period = options.period ?? 30;
  const digits = options.digits ?? 6;
  const window = options.window ?? 1;
  const timestamp = options.timestamp ?? Date.now();

  const normalized = token.replace(/\s+/g, '');
  if (!new RegExp(`^\\d{${digits}}$`).test(normalized)) return null;

  const currentCounter = Math.floor(timestamp / 1000 / period);
  for (let delta = -window; delta <= window; delta++) {
    const candidate = hotp(secret, currentCounter + delta, options);
    if (candidate === normalized) return delta;
  }
  return null;
}

/** 生成 otpauth:// URI，供前端渲染二维码 */
export function buildOtpauthUri(params: {
  secret: string;
  issuer: string;
  accountName: string;
  digits?: number;
  period?: number;
}): string {
  const label = encodeURIComponent(`${params.issuer}:${params.accountName}`);
  const query = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer,
    algorithm: 'SHA1',
    digits: String(params.digits ?? 6),
    period: String(params.period ?? 30),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}
