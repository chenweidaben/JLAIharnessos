/**
 * 健澜AI原生医院操作系统OS - P4-3 登录防爆破+速率限制 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore,
  checkAccountLockout, recordAccountFailure, resetAccountFailures, adminUnlockAccount,
  checkIpLogin, recordIpLoginHit, adminUnlockIp,
  takeReadToken, takeWriteToken, listStatus,
  ACCOUNT_FAIL_THRESHOLD, ACCOUNT_LOCK_MS, IP_LOGIN_THRESHOLD, IP_LOGIN_BAN_MS,
} from '../../src/bff/aggregators/loginLockoutAggregator';

beforeEach(() => { __resetStore(); });

describe('P4-3 账号锁定', () => {
  test('失败计数递增', () => {
    const s = recordAccountFailure('alice');
    expect(s.fails).toBe(1);
    expect(recordAccountFailure('alice').fails).toBe(2);
  });
  test('5 次失败锁定 15min', () => {
    for (let i = 0; i < ACCOUNT_FAIL_THRESHOLD; i++) recordAccountFailure('alice');
    const s = checkAccountLockout('alice');
    expect(s?.lockedUntil).toBeTruthy();
    const lockMs = new Date(s!.lockedUntil!).getTime() - Date.now();
    expect(lockMs).toBeGreaterThan(ACCOUNT_LOCK_MS - 5000);
    expect(lockMs).toBeLessThanOrEqual(ACCOUNT_LOCK_MS);
  });
  test('锁定期间 checkAccountLockout 返回状态', () => {
    for (let i = 0; i < 5; i++) recordAccountFailure('alice');
    expect(checkAccountLockout('alice')).not.toBeNull();
  });
  test('成功登录清零失败计数', () => {
    recordAccountFailure('alice'); recordAccountFailure('alice');
    resetAccountFailures('alice');
    expect(checkAccountLockout('alice')).toBeNull();
    // 再失败不会延续之前的计数
    recordAccountFailure('alice');
    expect(checkAccountLockout('alice')).toBeNull();
  });
  test('adminUnlockAccount 解除锁定', () => {
    for (let i = 0; i < 5; i++) recordAccountFailure('alice');
    expect(adminUnlockAccount('alice')).toBe(true);
    expect(checkAccountLockout('alice')).toBeNull();
  });
});

describe('P4-3 IP 防爆破', () => {
  test('20 次命中 → 封禁 5min', () => {
    for (let i = 0; i < IP_LOGIN_THRESHOLD + 1; i++) recordIpLoginHit('1.2.3.4');
    const s = checkIpLogin('1.2.3.4');
    expect(s?.bannedUntil).toBeTruthy();
    const banMs = new Date(s!.bannedUntil!).getTime() - Date.now();
    expect(banMs).toBeGreaterThan(IP_LOGIN_BAN_MS - 5000);
    expect(banMs).toBeLessThanOrEqual(IP_LOGIN_BAN_MS);
  });
  test('adminUnlockIp 解除封禁', () => {
    for (let i = 0; i < 25; i++) recordIpLoginHit('1.2.3.4');
    expect(adminUnlockIp('1.2.3.4')).toBe(true);
    expect(checkIpLogin('1.2.3.4')).toBeNull();
  });
});

describe('P4-3 通用 read/write 限流', () => {
  test('read 100/min 内放行', () => {
    for (let i = 0; i < 100; i++) expect(takeReadToken('9.9.9.9')).toBeNull();
  });
  test('read >100 → 返回复试秒数', () => {
    for (let i = 0; i < 100; i++) takeReadToken('9.9.9.9');
    const retry = takeReadToken('9.9.9.9');
    expect(retry).not.toBeNull();
    expect(retry!).toBeGreaterThan(0);
  });
  test('write 30/min 内放行，第 31 次 429', () => {
    for (let i = 0; i < 30; i++) expect(takeWriteToken('8.8.8.8')).toBeNull();
    expect(takeWriteToken('8.8.8.8')).not.toBeNull();
  });
  test('不同 IP 独立桶', () => {
    for (let i = 0; i < 30; i++) takeWriteToken('1.1.1.1');
    expect(takeWriteToken('2.2.2.2')).toBeNull();
  });
});

describe('P4-3 状态列表', () => {
  test('listStatus 返回锁定账号/IP', () => {
    for (let i = 0; i < 5; i++) recordAccountFailure('bob');
    for (let i = 0; i < 25; i++) recordIpLoginHit('5.5.5.5');
    const items = listStatus();
    expect(items.length).toBe(2);
    expect(items.find((x) => x.key === 'bob' && x.type === 'account')).toBeTruthy();
    expect(items.find((x) => x.key === '5.5.5.5' && x.type === 'ip-login')).toBeTruthy();
  });
  test('未锁定时 listStatus 为空', () => {
    recordAccountFailure('nobody');
    expect(listStatus().length).toBe(0);
  });
});
