/**
 * 健澜科技 jlmedaios - M129-B 第三方对接开放接口单测（系统集成）
 *
 * 验证纯函数层「Key 生成 -> 哈希收敛 -> 权限判定 -> 过期判定 -> 出口脱敏」闭环：
 *  - Key 生成：前缀固定、随机段唯一性、默认 90 天过期、可注入时间/熵源保证确定性；
 *  - 权限控制：白名单收敛（非法权限剔除、去重、空集最小授权）、hasPermission 判定；
 *  - 接口调用前置：过期判定（过期即拒、非法时间保守拒绝）、出口字段级脱敏。
 * 全部为纯函数断言，不依赖数据库与网络。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  API_KEY_DEFAULT_TTL_DAYS,
  API_KEY_PREFIX,
  OPEN_API_PERMISSIONS,
  buildThirdPartyApiKey,
  hashApiKey,
  hasPermission,
  isApiKeyExpired,
  maskPatientForOpenApi,
  normalizePermissions,
  sha256Hex,
} from '../../src/bff/aggregators/thirdPartyApiAggregator';

/** 固定时钟：2026-01-01T00:00:00Z，保证过期断言可重复 */
const FIXED_NOW = new Date('2026-01-01T00:00:00.000Z');

/** 确定性熵源：返回全零 24 字节（rng 仅用于构造可复现用例，真实场景走 crypto） */
const zeroRng = () => Buffer.alloc(24, 1);

describe('M129-B 第三方对接 API Key：生成', () => {
  it('格式：前缀固定 jlsk_live_，随机段为 base64url 32 字符', () => {
    const k = buildThirdPartyApiKey({ name: '区域卫生平台', now: FIXED_NOW, rng: zeroRng });
    expect(k.key.startsWith(API_KEY_PREFIX)).toBe(true);
    const secret = k.key.slice(API_KEY_PREFIX.length);
    expect(secret).toMatch(/^[A-Za-z0-9_-]{32}$/);
    // 返回结构含任务要求四要素
    expect(typeof k.key).toBe('string');
    expect(typeof k.name).toBe('string');
    expect(Array.isArray(k.permissions)).toBe(true);
    expect(typeof k.expires_at).toBe('string');
  });

  it('有效期：默认 90 天过期（安全红线）', () => {
    const k = buildThirdPartyApiKey({ name: '医联体', now: FIXED_NOW, rng: zeroRng });
    const exp = new Date(k.expires_at);
    const deltaDays = (exp.getTime() - FIXED_NOW.getTime()) / 86_400_000;
    expect(deltaDays).toBe(API_KEY_DEFAULT_TTL_DAYS);
  });

  it('有效期：自定义 ttlDays 生效；非法值回退 90 天；硬上限 365 天', () => {
    const d7 = buildThirdPartyApiKey({ name: 'x', ttlDays: 7, now: FIXED_NOW, rng: zeroRng });
    expect((new Date(d7.expires_at).getTime() - FIXED_NOW.getTime()) / 86_400_000).toBe(7);
    const bad = buildThirdPartyApiKey({ name: 'x', ttlDays: -5, now: FIXED_NOW, rng: zeroRng });
    expect((new Date(bad.expires_at).getTime() - FIXED_NOW.getTime()) / 86_400_000).toBe(90);
    const capped = buildThirdPartyApiKey({ name: 'x', ttlDays: 10_000, now: FIXED_NOW, rng: zeroRng });
    expect((new Date(capped.expires_at).getTime() - FIXED_NOW.getTime()) / 86_400_000).toBe(365);
  });

  it('唯一性：不同随机源产出不同 Key 与不同哈希', () => {
    const a = buildThirdPartyApiKey({ name: 'x', now: FIXED_NOW });
    const b = buildThirdPartyApiKey({ name: 'x', now: FIXED_NOW });
    expect(a.key).not.toBe(b.key);
    expect(a.keyHash).not.toBe(b.keyHash);
  });

  it('命名：空名称兜底为「未命名对接方」', () => {
    const k = buildThirdPartyApiKey({ name: '   ', now: FIXED_NOW, rng: zeroRng });
    expect(k.name).toBe('未命名对接方');
  });
});

describe('M129-B 第三方对接 API Key：哈希与凭证校验', () => {
  it('hashApiKey：SHA-256 64 位 hex，确定性，trim 归一', () => {
    expect(hashApiKey('jlsk_live_abc')).toBe(sha256Hex('jlsk_live_abc'));
    expect(hashApiKey(' jlsk_live_abc ')).toBe(hashApiKey('jlsk_live_abc'));
    expect(hashApiKey('x')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashApiKey：不同 Key 哈希不同，库内只存哈希', () => {
    expect(hashApiKey('jlsk_live_one')).not.toBe(hashApiKey('jlsk_live_two'));
  });
});

describe('M129-B 第三方对接 API Key：权限控制', () => {
  it('normalizePermissions：白名单子集收敛，非法权限被剔除', () => {
    const p = normalizePermissions([
      'patient:read',
      'admin:drop',
      'patient:read', // 重复去重
      'patient:prescriptions:read',
      'evil:*',
    ]);
    expect(p.sort()).toEqual(['patient:prescriptions:read', 'patient:read']);
  });

  it('normalizePermissions：空/非法入参 -> 空集（最小授权，绝不默认放行）', () => {
    expect(normalizePermissions(undefined)).toEqual([]);
    expect(normalizePermissions(null)).toEqual([]);
    expect(normalizePermissions([])).toEqual([]);
    expect(normalizePermissions(['anything'])).toEqual([]);
  });

  it('hasPermission：精确匹配；未授权数据面拒绝', () => {
    const granted = ['patient:read', 'patient:visits:read'];
    expect(hasPermission(granted, 'patient:read')).toBe(true);
    expect(hasPermission(granted, 'patient:prescriptions:read')).toBe(false);
  });

  it('hasPermission：空授权一律拒绝；"*" 全量放行', () => {
    expect(hasPermission([], 'patient:read')).toBe(false);
    expect(hasPermission(['*'], 'patient:prescriptions:read')).toBe(true);
  });

  it('白名单与路由权限面一致', () => {
    expect(OPEN_API_PERMISSIONS).toContain('patient:read');
    expect(OPEN_API_PERMISSIONS).toContain('patient:visits:read');
    expect(OPEN_API_PERMISSIONS).toContain('patient:prescriptions:read');
  });
});

describe('M129-B 第三方对接 API Key：过期判定', () => {
  it('未过期 -> false；已过期 -> true', () => {
    const future = new Date(FIXED_NOW.getTime() + 90 * 86_400_000).toISOString();
    expect(isApiKeyExpired(future, FIXED_NOW)).toBe(false);
    const past = new Date(FIXED_NOW.getTime() - 1000).toISOString();
    expect(isApiKeyExpired(past, FIXED_NOW)).toBe(true);
  });

  it('非法时间串保守视为过期（拒绝访问，fail-closed）', () => {
    expect(isApiKeyExpired('not-a-date', FIXED_NOW)).toBe(true);
  });
});

describe('M129-B 第三方对接开放接口：出口脱敏', () => {
  it('maskPatientForOpenApi：只下发白名单字段，敏感数据不出院', () => {
    const masked = maskPatientForOpenApi({
      id: 'P100001',
      patientNo: 'ZY2026090001',
      name: '张*',
      gender: 'male',
      age: 63,
      deptName: '心内科',
      diagnosis: '急性心肌梗死',
      // 敏感字段必须被剥离：
      phone: '13800000000',
      idCard: '330101196304120011',
      bedNo: '12-03',
      billing: { totalCost: 28600 },
      allergies: ['阿司匹林'],
    } as Record<string, unknown>);
    expect(masked).toEqual({
      id: 'P100001',
      patientNo: 'ZY2026090001',
      name: '张*',
      gender: 'male',
      age: 63,
      deptName: '心内科',
      diagnosis: '急性心肌梗死',
    });
    expect('phone' in masked).toBe(false);
    expect('idCard' in masked).toBe(false);
    expect('billing' in masked).toBe(false);
    expect('bedNo' in masked).toBe(false);
  });

  it('maskPatientForOpenApi：空/非对象入参兜底为空对象', () => {
    expect(maskPatientForOpenApi(null)).toEqual({});
    expect(maskPatientForOpenApi(undefined)).toEqual({});
    expect(maskPatientForOpenApi('nope' as unknown as Record<string, unknown>)).toEqual({});
  });
});
