/**
 * 健澜科技数智医院智能体 - 加密模块单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  EncryptionService,
  LocalFileKeyManager,
  sha256,
  sha512,
  hash,
  saltedHash,
  verifySaltedHash,
  generateSalt,
  hmac,
  verifyHmac,
  timingSafeEqual,
  pbkdf2Hash,
  verifyPbkdf2Hash,
  bcryptHash,
  verifyBcryptHash,
  generateToken,
  generateUuid,
  HashAlgorithm,
  EncryptionAlgorithm,
} from '../../../src/security';

const TEST_KEY_DIR = path.join(__dirname, 'test-keys');

describe('HashUtils - 基础哈希', () => {
  test('SHA-256哈希长度为64', () => {
    const result = sha256('test');
    expect(result.length).toBe(64);
  });

  test('SHA-256相同输入产生相同哈希', () => {
    expect(sha256('test')).toBe(sha256('test'));
  });

  test('SHA-256不同输入产生不同哈希', () => {
    expect(sha256('test1')).not.toBe(sha256('test2'));
  });

  test('SHA-512哈希长度为128', () => {
    const result = sha512('test');
    expect(result.length).toBe(128);
  });

  test('通用哈希函数支持SHA-256', () => {
    expect(hash(HashAlgorithm.SHA_256, 'test')).toBe(sha256('test'));
  });

  test('通用哈希函数支持SHA-512', () => {
    expect(hash(HashAlgorithm.SHA_512, 'test')).toBe(sha512('test'));
  });

  test('空字符串哈希', () => {
    expect(sha256('')).toBeDefined();
    expect(sha256('').length).toBe(64);
  });
});

describe('HashUtils - 带盐哈希', () => {
  test('带盐哈希格式正确', () => {
    const result = saltedHash('password123', 'mysalt');
    const parts = result.split('$');
    expect(parts.length).toBe(4);
    expect(parts[0]).toBe(HashAlgorithm.SHA_256);
  });

  test('相同密码相同盐产生相同哈希', () => {
    const h1 = saltedHash('password123', 'salt');
    const h2 = saltedHash('password123', 'salt');
    expect(h1).toBe(h2);
  });

  test('验证正确的带盐哈希', () => {
    const hashed = saltedHash('password123', 'salt');
    expect(verifySaltedHash('password123', hashed)).toBe(true);
  });

  test('验证错误的密码返回false', () => {
    const hashed = saltedHash('password123', 'salt');
    expect(verifySaltedHash('wrongpassword', hashed)).toBe(false);
  });

  test('自动生成盐值', () => {
    const result = saltedHash('password');
    expect(result).toBeDefined();
    expect(result.split('$').length).toBe(4);
  });
});

describe('HashUtils - 盐值生成', () => {
  test('生成盐值长度正确', () => {
    const salt = generateSalt(16);
    expect(salt.length).toBe(32); // 16字节 = 32 hex字符
  });

  test('两次生成不同盐值', () => {
    expect(generateSalt()).not.toBe(generateSalt());
  });
});

describe('HashUtils - HMAC', () => {
  test('HMAC-SHA256生成', () => {
    const result = hmac(HashAlgorithm.SHA_256, 'secretkey', 'message');
    expect(result).toBeDefined();
    expect(result.length).toBe(64);
  });

  test('相同密钥和消息产生相同HMAC', () => {
    const h1 = hmac(HashAlgorithm.SHA_256, 'key', 'msg');
    const h2 = hmac(HashAlgorithm.SHA_256, 'key', 'msg');
    expect(h1).toBe(h2);
  });

  test('不同密钥产生不同HMAC', () => {
    const h1 = hmac(HashAlgorithm.SHA_256, 'key1', 'msg');
    const h2 = hmac(HashAlgorithm.SHA_256, 'key2', 'msg');
    expect(h1).not.toBe(h2);
  });

  test('HMAC验证正确', () => {
    const key = 'secret';
    const msg = 'test message';
    const mac = hmac(HashAlgorithm.SHA_256, key, msg);
    expect(verifyHmac(HashAlgorithm.SHA_256, key, msg, mac)).toBe(true);
  });

  test('HMAC验证错误返回false', () => {
    expect(verifyHmac(HashAlgorithm.SHA_256, 'key', 'msg', 'wrongmac')).toBe(false);
  });
});

describe('HashUtils - 时序安全比较', () => {
  test('相同字符串返回true', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
  });

  test('不同字符串返回false', () => {
    expect(timingSafeEqual('abc', 'def')).toBe(false);
  });

  test('不同长度返回false', () => {
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('HashUtils - PBKDF2密码哈希', () => {
  test('PBKDF2哈希格式', () => {
    const result = pbkdf2Hash('password123');
    const parts = result.split('$');
    expect(parts[0]).toBe('pbkdf2');
    expect(parts.length).toBe(4);
  });

  test('PBKDF2验证正确密码', () => {
    const hashed = pbkdf2Hash('mypassword');
    expect(verifyPbkdf2Hash('mypassword', hashed)).toBe(true);
  });

  test('PBKDF2验证错误密码', () => {
    const hashed = pbkdf2Hash('mypassword');
    expect(verifyPbkdf2Hash('wrongpassword', hashed)).toBe(false);
  });
});

describe('HashUtils - bcrypt密码哈希', () => {
  test('bcrypt哈希生成', () => {
    const result = bcryptHash('password123');
    expect(result).toBeDefined();
    expect(result.split('$').length).toBe(4);
  });

  test('bcrypt验证正确密码', () => {
    const hashed = bcryptHash('testpassword');
    expect(verifyBcryptHash('testpassword', hashed)).toBe(true);
  });

  test('bcrypt验证错误密码', () => {
    const hashed = bcryptHash('testpassword');
    expect(verifyBcryptHash('wrong', hashed)).toBe(false);
  });
});

describe('HashUtils - 令牌生成', () => {
  test('生成令牌长度', () => {
    const token = generateToken(32);
    expect(token.length).toBe(64);
  });

  test('生成UUID格式', () => {
    const uuid = generateUuid();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  test('UUID唯一性', () => {
    const uuids = new Set();
    for (let i = 0; i < 100; i++) {
      uuids.add(generateUuid());
    }
    expect(uuids.size).toBe(100);
  });
});

describe('LocalFileKeyManager', () => {
  beforeAll(() => {
    if (!fs.existsSync(TEST_KEY_DIR)) {
      fs.mkdirSync(TEST_KEY_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(TEST_KEY_DIR)) {
      fs.rmSync(TEST_KEY_DIR, { recursive: true, force: true });
    }
  });

  test('生成数据密钥', async () => {
    const manager = new LocalFileKeyManager(TEST_KEY_DIR);
    const { keyId, key } = await manager.generateDataKey('test');
    expect(keyId).toBeDefined();
    expect(key.length).toBe(32); // AES-256密钥
  });

  test('获取已生成的数据密钥', async () => {
    const manager = new LocalFileKeyManager(TEST_KEY_DIR);
    const { keyId, key: originalKey } = await manager.generateDataKey('test2');
    const retrievedKey = await manager.getDataKey(keyId);
    expect(retrievedKey.equals(originalKey)).toBe(true);
  });

  test('获取不存在的密钥抛出错误', async () => {
    const manager = new LocalFileKeyManager(TEST_KEY_DIR);
    expect(manager.getDataKey('nonexistent-key')).rejects.toThrow();
  });

  test('密钥轮换', async () => {
    const manager = new LocalFileKeyManager(TEST_KEY_DIR);
    const { keyId } = await manager.generateDataKey('rotate-test');
    const newKeyId = await manager.rotateKey(keyId);
    expect(newKeyId).toBeDefined();
    expect(newKeyId).not.toBe(keyId);
    // 旧密钥应标记为rotated
    const metadata = await manager.getKeyMetadata(keyId);
    expect(metadata?.status).toBe('rotated');
  });

  test('密钥元数据', async () => {
    const manager = new LocalFileKeyManager(TEST_KEY_DIR);
    const { keyId } = await manager.generateDataKey('metadata-test');
    const metadata = await manager.getKeyMetadata(keyId);
    expect(metadata).toBeDefined();
    expect(metadata?.keyId).toBe(keyId);
    expect(metadata?.status).toBe('active');
  });

  test('销毁密钥', async () => {
    const manager = new LocalFileKeyManager(TEST_KEY_DIR);
    const { keyId } = await manager.generateDataKey('destroy-test');
    await manager.destroyKey(keyId);
    const metadata = await manager.getKeyMetadata(keyId);
    expect(metadata?.status).toBe('destroyed');
  });
});

describe('EncryptionService', () => {
  const testKeyDir = path.join(__dirname, 'enc-test-keys');

  beforeAll(() => {
    if (!fs.existsSync(testKeyDir)) {
      fs.mkdirSync(testKeyDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testKeyDir)) {
      fs.rmSync(testKeyDir, { recursive: true, force: true });
    }
  });

  test('字符串加密和解密', async () => {
    const service = new EncryptionService({ keyDir: testKeyDir });
    const plaintext = '这是一段敏感的患者信息';
    const encrypted = await service.encryptString(plaintext);
    expect(encrypted).toBeDefined();
    expect(encrypted.ciphertext).not.toBe(plaintext);
    expect(encrypted.algorithm).toBe(EncryptionAlgorithm.AES_256_GCM);
    const decrypted = await service.decryptString(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  test('加密数据包含所有必要字段', async () => {
    const service = new EncryptionService({ keyDir: testKeyDir });
    const encrypted = await service.encryptString('test');
    expect(encrypted.version).toBe(1);
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.authTag).toBeDefined();
    expect(encrypted.keyId).toBeDefined();
    expect(encrypted.encryptedAt).toBeDefined();
  });

  test('对象加密和解密', async () => {
    const service = new EncryptionService({ keyDir: testKeyDir });
    const obj = { name: '张三', age: 45, diagnosis: '高血压' };
    const encrypted = await service.encrypt(obj);
    const decrypted = await service.decrypt<typeof obj>(encrypted);
    expect(decrypted.name).toBe('张三');
    expect(decrypted.age).toBe(45);
    expect(decrypted.diagnosis).toBe('高血压');
  });

  test('数字加密和解密', async () => {
    const service = new EncryptionService({ keyDir: testKeyDir });
    const encrypted = await service.encryptNumber(12345.67);
    const decrypted = await service.decryptNumber(encrypted);
    expect(decrypted).toBe(12345.67);
  });

  test('篡改密文导致解密失败', async () => {
    const service = new EncryptionService({ keyDir: testKeyDir });
    const encrypted = await service.encryptString('sensitive data');
    // 篡改密文
    const tampered = { ...encrypted, ciphertext: Buffer.from('tampered').toString('base64') };
    expect(service.decryptString(tampered)).rejects.toThrow();
  });

  test('序列化和反序列化加密数据', async () => {
    const service = new EncryptionService({ keyDir: testKeyDir });
    const encrypted = await service.encryptString('test data');
    const serialized = service.serialize(encrypted);
    const deserialized = service.deserialize(serialized);
    expect(deserialized.ciphertext).toBe(encrypted.ciphertext);
    const decrypted = await service.decryptString(deserialized);
    expect(decrypted).toBe('test data');
  });

  test('密钥轮换', async () => {
    const service = new EncryptionService({ keyDir: testKeyDir });
    const oldKeyId = await service.getDefaultKeyId();
    const newKeyId = await service.rotateKey();
    expect(newKeyId).not.toBe(oldKeyId);
    // 旧密钥仍可解密历史数据
    const encrypted = await service.encryptString('old key data', oldKeyId);
    const decrypted = await service.decryptString(encrypted);
    expect(decrypted).toBe('old key data');
  });

  test('空字符串加密', async () => {
    const service = new EncryptionService({ keyDir: testKeyDir });
    const encrypted = await service.encryptString('');
    const decrypted = await service.decryptString(encrypted);
    expect(decrypted).toBe('');
  });

  test('长文本加密', async () => {
    const service = new EncryptionService({ keyDir: testKeyDir });
    const longText = '患者信息'.repeat(1000);
    const encrypted = await service.encryptString(longText);
    const decrypted = await service.decryptString(encrypted);
    expect(decrypted).toBe(longText);
  });
});
