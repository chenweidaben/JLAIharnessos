/**
 * 健澜科技数智医院智能体 - security/encryption/KeyManager.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 密钥管理接口
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件定义密钥管理接口，支持主密钥+数据密钥的双层密钥体系，
 * 密钥轮换支持，并提供本地文件密钥存储实现（开发环境用）。
 * 生产环境应对接KMS（如阿里云KMS、华为云KMS、医院自建HSM）。
 *
 * @module security/encryption/KeyManager
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { EncryptionAlgorithm, EncryptionError, type KeyMetadata, KeyType } from '../types';

/**
 * 密钥管理接口
 * 所有密钥管理实现（本地文件、KMS、HSM）均需实现此接口
 */
export interface IKeyManager {
  /**
   * 获取数据加密密钥
   *
   * @param keyId - 密钥ID
   * @returns 密钥（Buffer）
   */
  getDataKey(keyId: string): Promise<Buffer>;

  /**
   * 生成新的数据密钥
   *
   * @param purpose - 密钥用途
   * @returns 密钥ID和密钥
   */
  generateDataKey(purpose?: string): Promise<{ keyId: string; key: Buffer }>;

  /**
   * 轮换密钥
   *
   * @param keyId - 密钥ID
   * @returns 新密钥ID
   */
  rotateKey(keyId: string): Promise<string>;

  /**
   * 获取密钥元数据
   *
   * @param keyId - 密钥ID
   * @returns 密钥元数据
   */
  getKeyMetadata(keyId: string): Promise<KeyMetadata | undefined>;

  /**
   * 销毁密钥
   *
   * @param keyId - 密钥ID
   */
  destroyKey(keyId: string): Promise<void>;
}

/**
 * 本地文件密钥存储实现
 * 用于开发和测试环境，生产环境应使用KMS/HSM。
 * 主密钥用于加密数据密钥，数据密钥用于加密实际数据。
 */
export class LocalFileKeyManager implements IKeyManager {
  private readonly keyDir: string;
  private readonly masterKeyPath: string;
  private masterKey: Buffer | null = null;
  private keyCache = new Map<string, Buffer>();

  /**
   * 构造本地文件密钥管理器
   *
   * @param keyDir - 密钥存储目录
   */
  constructor(keyDir = './.keys') {
    this.keyDir = path.resolve(keyDir);
    this.masterKeyPath = path.join(this.keyDir, 'master.key');

    // 确保密钥目录存在
    if (!fs.existsSync(this.keyDir)) {
      fs.mkdirSync(this.keyDir, { recursive: true });
      // 设置目录权限（仅所有者可读写）
      try {
        fs.chmodSync(this.keyDir, 0o700);
      } catch {
        // Windows上可能不支持
      }
    }

    // 加载或创建主密钥
    this.loadOrCreateMasterKey();
  }

  /**
   * 获取数据加密密钥
   */
  public async getDataKey(keyId: string): Promise<Buffer> {
    // 检查缓存
    const cached = this.keyCache.get(keyId);
    if (cached) return cached;

    const keyPath = this.getKeyPath(keyId);
    if (!fs.existsSync(keyPath)) {
      throw new EncryptionError(`密钥不存在: ${keyId}`, { keyId });
    }

    try {
      const encryptedKey = fs.readFileSync(keyPath);
      const key = this.decryptDataKey(encryptedKey);
      this.keyCache.set(keyId, key);
      return key;
    } catch (error) {
      throw new EncryptionError(`密钥解密失败: ${keyId}`, { error: String(error) });
    }
  }

  /**
   * 生成新的数据密钥
   */
  public async generateDataKey(purpose?: string): Promise<{ keyId: string; key: Buffer }> {
    const keyId = `dk-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const key = crypto.randomBytes(32); // AES-256密钥

    // 加密存储数据密钥
    const encryptedKey = this.encryptDataKey(key);
    const keyPath = this.getKeyPath(keyId);
    fs.writeFileSync(keyPath, encryptedKey);

    // 存储元数据
    const metadata: KeyMetadata = {
      keyId,
      keyType: KeyType.DATA,
      algorithm: EncryptionAlgorithm.AES_256_GCM,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    const metadataPath = this.getMetadataPath(keyId);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    this.keyCache.set(keyId, key);
    return { keyId, key };
  }

  /**
   * 轮换密钥
   * 生成新密钥，旧密钥标记为rotated（仍可用于解密历史数据）
   */
  public async rotateKey(keyId: string): Promise<string> {
    const oldKey = await this.getDataKey(keyId);

    // 标记旧密钥为rotated
    const metadataPath = this.getMetadataPath(keyId);
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) as KeyMetadata;
      metadata.status = 'rotated';
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    // 生成新密钥
    const { keyId: newKeyId, key } = await this.generateDataKey('rotation');
    return newKeyId;
  }

  /**
   * 获取密钥元数据
   */
  public async getKeyMetadata(keyId: string): Promise<KeyMetadata | undefined> {
    const metadataPath = this.getMetadataPath(keyId);
    if (!fs.existsSync(metadataPath)) return undefined;
    try {
      return JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) as KeyMetadata;
    } catch {
      return undefined;
    }
  }

  /**
   * 销毁密钥
   */
  public async destroyKey(keyId: string): Promise<void> {
    const keyPath = this.getKeyPath(keyId);
    const metadataPath = this.getMetadataPath(keyId);

    // 标记为destroyed（不立即删除，保留元数据用于审计）
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) as KeyMetadata;
      metadata.status = 'destroyed';
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    // 删除密钥文件
    if (fs.existsSync(keyPath)) {
      fs.unlinkSync(keyPath);
    }

    this.keyCache.delete(keyId);
  }

  /**
   * 加载或创建主密钥
   */
  private loadOrCreateMasterKey(): void {
    if (fs.existsSync(this.masterKeyPath)) {
      this.masterKey = fs.readFileSync(this.masterKeyPath);
    } else {
      // 生成新的主密钥（32字节 = AES-256）
      this.masterKey = crypto.randomBytes(32);
      fs.writeFileSync(this.masterKeyPath, this.masterKey);
      try {
        fs.chmodSync(this.masterKeyPath, 0o600);
      } catch {
        // Windows上可能不支持
      }
    }
  }

  /**
   * 使用主密钥加密数据密钥
   */
  private encryptDataKey(dataKey: Buffer): Buffer {
    if (!this.masterKey) {
      throw new EncryptionError('主密钥未加载', {});
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(dataKey), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // 格式：iv(12) + authTag(16) + encrypted
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * 使用主密钥解密数据密钥
   */
  private decryptDataKey(encrypted: Buffer): Buffer {
    if (!this.masterKey) {
      throw new EncryptionError('主密钥未加载', {});
    }
    const iv = encrypted.subarray(0, 12);
    const authTag = encrypted.subarray(12, 28);
    const ciphertext = encrypted.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  /**
   * 获取密钥文件路径
   */
  private getKeyPath(keyId: string): string {
    return path.join(this.keyDir, `${keyId}.key`);
  }

  /**
   * 获取密钥元数据文件路径
   */
  private getMetadataPath(keyId: string): string {
    return path.join(this.keyDir, `${keyId}.meta.json`);
  }
}
