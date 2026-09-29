/**
 * 健澜科技 jlmedaios - 实名认证/微信登录提供方 单元测试（M3-J）
 *
 * 纯函数与本地演示提供方：身份证校验、认证通过/失败、微信 code 换会话。
 * 第三方提供方的网络边界用 fetch stub 验证，不冒充真实认证。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect, afterEach } from 'bun:test';
import { isValidIdCard, LocalDemoRealnameProvider } from '../../src/internet-hospital/realname/LocalDemoProvider';
import { ThirdPartyRealnameProvider } from '../../src/internet-hospital/realname/ThirdPartyProvider';
import { LocalDemoWechatLoginProvider } from '../../src/internet-hospital/wechat/LocalDemoProvider';

/** 生成合法身份证号（含校验位） */
function validIdCard(front17: string): string {
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += Number(front17[i]) * weights[i];
  return front17 + checkCodes[sum % 11];
}

describe('身份证校验', () => {
  it('合法身份证通过', () => {
    const id = validIdCard('11010119900307123');
    expect(isValidIdCard(id)).toBe(true);
  });

  it('位数不足拒绝', () => {
    expect(isValidIdCard('11010119900307')).toBe(false);
  });

  it('校验位错误拒绝', () => {
    expect(isValidIdCard('110101199003071234')).toBe(false);
  });

  it('含非法字符拒绝', () => {
    expect(isValidIdCard('1101011990030712A4')).toBe(false);
  });
});

describe('本地演示实名认证', () => {
  const provider = new LocalDemoRealnameProvider();

  it('格式正确 → 通过，标注 demo', async () => {
    const id = validIdCard('11010119900307456');
    const r = await provider.verify({ realName: '张三', idCard: id });
    expect(r.passed).toBe(true);
    expect(r.isDemo).toBe(true);
    expect(r.provider).toBe('local-demo');
  });

  it('空姓名 → 失败', async () => {
    const r = await provider.verify({ realName: '  ', idCard: validIdCard('11010119900307456') });
    expect(r.passed).toBe(false);
  });

  it('身份证错误 → 失败', async () => {
    const r = await provider.verify({ realName: '张三', idCard: 'bad' });
    expect(r.passed).toBe(false);
    expect(r.reason).toBeTruthy();
  });

  it('提供人脸 → 返回演示分数', async () => {
    const r = await provider.verify({
      realName: '张三',
      idCard: validIdCard('11010119900307456'),
      faceImageBase64: 'fake',
    });
    expect(r.score).toBe(99);
  });
});

describe('本地演示微信登录', () => {
  const provider = new LocalDemoWechatLoginProvider();

  it('code 换确定性 openid', async () => {
    const r = await provider.code2Session('abc123');
    expect(r.openid).toBe('demo-openid-abc123');
    expect(r.unionid).toBe('demo-unionid-abc123');
  });

  it('空 code 抛错', async () => {
    await expect(provider.code2Session('  ')).rejects.toBeTruthy();
  });

  it('标注 demo', () => {
    expect(provider.isDemo).toBe(true);
  });
});

describe('第三方实名认证（网络边界）', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const setFetch = (fn: (...args: unknown[]) => unknown) => {
    globalThis.fetch = fn as typeof fetch;
  };

  it('网关返回 passed=true', async () => {
    setFetch(async () =>
      new Response(JSON.stringify({ passed: true, score: 98.5 }), { status: 200 }),
    );
    const provider = new ThirdPartyRealnameProvider({
      url: 'https://example.com/verify',
      apiKey: 'k',
      name: 'test',
    });
    const r = await provider.verify({ realName: '张三', idCard: 'x' });
    expect(r.passed).toBe(true);
    expect(r.isDemo).toBe(false);
  });

  it('网关返回 passed=false', async () => {
    setFetch(async () =>
      new Response(JSON.stringify({ passed: false, reason: '不匹配' }), { status: 200 }),
    );
    const provider = new ThirdPartyRealnameProvider({
      url: 'https://example.com/verify',
      apiKey: 'k',
    });
    const r = await provider.verify({ realName: 'x', idCard: 'y' });
    expect(r.passed).toBe(false);
    expect(r.reason).toBe('不匹配');
  });

  it('网关 500 → 失败', async () => {
    setFetch(async () => new Response('err', { status: 500 }));
    const provider = new ThirdPartyRealnameProvider({
      url: 'https://example.com/verify',
      apiKey: 'k',
    });
    const r = await provider.verify({ realName: 'x', idCard: 'y' });
    expect(r.passed).toBe(false);
  });

  it('网络异常 → 抛错（不冒充）', async () => {
    setFetch(async () => {
      throw new Error('ECONNREFUSED');
    });
    const provider = new ThirdPartyRealnameProvider({
      url: 'https://example.com/verify',
      apiKey: 'k',
    });
    await expect(provider.verify({ realName: 'x', idCard: 'y' })).rejects.toBeTruthy();
  });
});
