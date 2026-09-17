/**
 * 健澜科技数智医院智能体 - security/encryption/EncryptionService.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 加密服务
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件实现加密服务，支持AES-256-GCM字段加密，支持多种数据类型
 * （字符串、数字、对象），加密数据格式为版本+IV+密文+认证标签。
 * 使用Node.js内置crypto模块，Bun兼容。
 *
 * @module security/encryption/EncryptionService
 */

import * as crypto from 'node:crypto';

import { type EncryptedData, EncryptionAlgorithm, EncryptionError } from '../types';
import { type IKeyManager, LocalFileKeyManager } from './KeyManager';

/**
 * 加密服务配置
 */
export interface EncryptionServiceConfig {
  /** 密钥管理器 */
  keyManager?: IKeyManager;
  /** 密钥存储目录（当未指定keyManager时使用） */
  keyDir?: string;
  /** 默认加密算法 */
  defaultAlgorithm?: EncryptionAlgorithm;
  /** 默认数据密钥ID（不传则自动生成） */
  defaultKeyId?: string;
}

/**
 * 加密数据格式版本
 */
const ENCRYPTED_DATA_VERSION = 1;

/**
 * 加密服务
 *
 * 负责数据的加密和解密，使用AES-256-GCM认证加密算法，
 * 支持多种数据类型，加密数据包含版本号、IV、密文和认证标签。
 *
 * @example
 * const service = new EncryptionService({ keyDir: './.keys' });
 * const encrypted = await service.encrypt('敏感数据');
 * const decrypted = await service.decrypt(encrypted);
 */
export class EncryptionService {
  private readonly keyManager: IKeyManager;
  private readonly defaultAlgorithm: EncryptionAlgorithm;
  private defaultKeyId: string | null;
  private keyCache = new Map<string, Buffer>();

  /**
   * 构造加密服务
   *
   * @param config - 配置
   */
  constructor(config?: EncryptionServiceConfig) {
    this.keyManager = config?.keyManager ?? new LocalFileKeyManager(config?.keyDir ?? './.keys');
    this.defaultAlgorithm = config?.defaultAlgorithm ?? EncryptionAlgorithm.AES_256_GCM;
    this.defaultKeyId = config?.defaultKeyId ?? null;
  }

  /**
   * 加密字符串
   *
   * @param plaintext - 明文字符串
   * @param keyId - 密钥ID（可选，使用默认密钥）
   * @returns 加密数据对象
   */
  public async encryptString(plaintext: string, keyId?: string): Promise<EncryptedData> {
    const actualKeyId = await this.resolveKeyId(keyId);
    const key = await this.getKey(actualKeyId);

    const iv = crypto.randomBytes(12); // GCM推荐96位IV
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      version: ENCRYPTED_DATA_VERSION,
      algorithm: this.defaultAlgorithm,
      iv: iv.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      authTag: authTag.toString('base64'),
      keyId: actualKeyId,
      encryptedAt: new Date().toISOString(),
    };
  }

  /**
   * 解密字符串
   *
   * @param encrypted - 加密数据对象
   * @returns 明文字符串
   * @throws {EncryptionError} 当解密失败或认证标签不匹配时
   */
  public async decryptString(encrypted: EncryptedData): Promise<string> {
    const key = await this.getKey(encrypted.keyId);
    const iv = Buffer.from(encrypted.iv, 'base64');
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');
    const authTag = Buffer.from(encrypted.authTag ?? '', 'base64');

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return plaintext.toString('utf-8');
    } catch (error) {
      throw new EncryptionError('解密失败：数据可能已被篡改或密钥不正确', {
        keyId: encrypted.keyId,
        error: String(error),
      });
    }
  }

  /**
   * 加密任意数据（字符串、数字、对象等）
   *
   * @param data - 待加密数据
   * @param keyId - 密钥ID（可选）
   * @returns 加密数据对象
   */
  public async encrypt<T>(data: T, keyId?: string): Promise<EncryptedData> {
    const serialized = JSON.stringify(data);
    return this.encryptString(serialized, keyId);
  }

  /**
   * 解密任意数据
   *
   * @param encrypted - 加密数据对象
   * @returns 解密后的数据
   */
  public async decrypt<T>(encrypted: EncryptedData): Promise<T> {
    const serialized = await this.decryptString(encrypted);
    try {
      return JSON.parse(serialized) as T;
    } catch {
      return serialized as unknown as T;
    }
  }

  /**
   * 加密数字
   *
   * @param value - 数字
   * @param keyId - 密钥ID
   * @returns 加密数据对象
   */
  public async encryptNumber(value: number, keyId?: string): Promise<EncryptedData> {
    return this.encryptString(value.toString(), keyId);
  }

  /**
   * 解密数字
   *
   * @param encrypted - 加密数据对象
   * @returns 数字
   */
  public async decryptNumber(encrypted: EncryptedData): Promise<number> {
    const str = await this.decryptString(encrypted);
    const num = parseFloat(str);
    if (isNaN(num)) {
      throw new EncryptionError('解密结果不是有效数字');
    }
    return num;
  }

  /**
   * 加密对象
   *
   * @param obj - 待加密对象
   * @param keyId - 密钥ID
   * @returns 加密数据对象
   */
  public async encryptObject<T extends object>(obj: T, keyId?: string): Promise<EncryptedData> {
    return this.encryptString(JSON.stringify(obj), keyId);
  }

  /**
   * 解密对象
   *
   * @param encrypted - 加密数据对象
   * @returns 解密后的对象
   */
  public async decryptObject<T extends object>(encrypted: EncryptedData): Promise<T> {
    const str = await this.decryptString(encrypted);
    return JSON.parse(str) as T;
  }

  /**
   * 将加密数据序列化为字符串（Base64编码的JSON）
   *
   * @param encrypted - 加密数据对象
   * @returns Base64编码的字符串
   */
  public serialize(encrypted: EncryptedData): string {
    return Buffer.from(JSON.stringify(encrypted)).toString('base64');
  }

  /**
   * 反序列化加密数据
   *
   * @param serialized - Base64编码的字符串
   * @returns 加密数据对象
   */
  public deserialize(serialized: string): EncryptedData {
    try {
      const json = Buffer.from(serialized, 'base64').toString('utf-8');
      return JSON.parse(json) as EncryptedData;
    } catch (error) {
      throw new EncryptionError('加密数据反序列化失败', { error: String(error) });
    }
  }

  /**
   * 轮换加密密钥
   * 生成新密钥，旧密钥仍可用于解密历史数据
   *
   * @param oldKeyId - 旧密钥ID
   * @returns 新密钥ID
   */
  public async rotateKey(oldKeyId?: string): Promise<string> {
    const keyIdToRotate = oldKeyId ?? this.defaultKeyId;
    if (!keyIdToRotate) {
      // 如果没有默认密钥，生成新的
      const { keyId } = await this.keyManager.generateDataKey('default');
      this.defaultKeyId = keyId;
      return keyId;
    }
    const newKeyId = await this.keyManager.rotateKey(keyIdToRotate);
    if (this.defaultKeyId === keyIdToRotate) {
      this.defaultKeyId = newKeyId;
    }
    // 清除旧密钥缓存
    this.keyCache.delete(keyIdToRotate);
    return newKeyId;
  }

  /**
   * 获取默认密钥ID
   */
  public async getDefaultKeyId(): Promise<string> {
    if (!this.defaultKeyId) {
      const { keyId } = await this.keyManager.generateDataKey('default');
      this.defaultKeyId = keyId;
    }
    return this.defaultKeyId;
  }

  /**
   * 解析密钥ID
   */
  private async resolveKeyId(keyId?: string): Promise<string> {
    if (keyId) return keyId;
    return this.getDefaultKeyId();
  }

  /**
   * 获取密钥（带缓存）
   */
  private async getKey(keyId: string): Promise<Buffer> {
    const cached = this.keyCache.get(keyId);
    if (cached) return cached;
    const key = await this.keyManager.getDataKey(keyId);
    this.keyCache.set(keyId, key);
    return key;
  }

  /**
   * 清除密钥缓存
   */
  public clearKeyCache(): void {
    this.keyCache.clear();
  }
}
