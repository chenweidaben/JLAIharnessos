/**
 * 健澜科技 jlmedaios - 医院内部即时通讯（M138-C）纯函数单测
 *
 * 覆盖：
 *  - 发送消息：sendMessage 构造合法消息、类型越界回退、加密往返（明文可还原）、
 *    senderId/receiverId 必填、不能自发给自己；
 *  - 对话分页：getConversation 双向匹配两人会话、按时间正序、page/pageSize 切片正确；
 *  - 未读统计：getUnreadCount 只统计「接收方 = 本人」的未读，自己发出的不计入。
 *
 * 全部内存加密存储，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it } from 'bun:test';

import {
  __resetImStore,
  getConversation,
  getUnreadCount,
  sendMessage,
  type ImMessage,
} from '../../src/bff/aggregators/imAggregator';

beforeEach(() => __resetImStore());

describe('sendMessage 发送消息（加密构造）', () => {
  it('四类合法类型原样保留，内容加密后可解密还原，且为未读', () => {
    for (const type of ['text', 'image', 'file', 'system'] as const) {
      const m = sendMessage('u_doc_zhang', 'u_nurse_li', `你好-${type}`, type);
      expect(m.type).toBe(type);
      expect(m.content).toBe(`你好-${type}`); // 落库密文，对外视图解密回明文
      expect(m.readAt).toBeNull();
      expect(m.senderId).toBe('u_doc_zhang');
      expect(m.receiverId).toBe('u_nurse_li');
      expect(typeof m.id).toBe('string');
      expect(m.id.length).toBeGreaterThan(0);
      expect(typeof m.createdAt).toBe('string');
    }
  });

  it('未知类型回退 text，不抛错、不丢消息', () => {
    const m = sendMessage('u1', 'u2', 'hi', 'weird_type' as never);
    expect(m.type).toBe('text');
  });

  it('senderId 为空（含纯空白）直接抛错', () => {
    expect(() => sendMessage('  ', 'u2', 'hi', 'text')).toThrow();
    expect(() => sendMessage('', 'u2', 'hi', 'text')).toThrow();
  });

  it('receiverId 为空（含纯空白）直接抛错', () => {
    expect(() => sendMessage('u1', '   ', 'hi', 'text')).toThrow();
    expect(() => sendMessage('u1', '', 'hi', 'text')).toThrow();
  });

  it('不能给自己发消息', () => {
    expect(() => sendMessage('u1', 'u1', 'hi', 'text')).toThrow();
  });

  it('id / senderId 自动 trim，消息内容往返一致', () => {
    const m = sendMessage('  u1  ', '  u2  ', '  交班注意  ', 'text');
    expect(m.senderId).toBe('u1');
    expect(m.receiverId).toBe('u2');
    expect(m.content).toBe('交班注意');
  });
});

describe('getConversation 双人会话分页', () => {
  it('只返回两人之间的双向消息，按时间正序', () => {
    sendMessage('u1', 'u2', '第一条', 'text');
    sendMessage('u2', 'u1', '第二条', 'text');
    sendMessage('u1', 'u3', '给第三者的消息', 'text'); // 不应出现在 u1-u2 会话

    const list = getConversation('u1', 'u2');
    expect(list).toHaveLength(2);
    expect(list[0].content).toBe('第一条');
    expect(list[1].content).toBe('第二条');
  });

  it('page / pageSize 切片正确', () => {
    // 造 25 条两人会话消息
    for (let i = 0; i < 25; i++) {
      sendMessage('u1', 'u2', `消息#${i}`, 'text');
    }
    const p1 = getConversation('u1', 'u2', 1, 10);
    expect(p1).toHaveLength(10);
    expect(p1[0].content).toBe('消息#0');

    const p2 = getConversation('u1', 'u2', 2, 10);
    expect(p2).toHaveLength(10);
    expect(p2[0].content).toBe('消息#10');

    const p3 = getConversation('u1', 'u2', 3, 10);
    expect(p3).toHaveLength(5);
    expect(p3[0].content).toBe('消息#20');
  });

  it('非法页码 / 条数收敛为安全默认；空会话返回空数组', () => {
    expect(getConversation('nobody', 'somebody')).toEqual([]);
    // 无消息时分页不报错
    expect(getConversation('u1', 'u2', 0, -5)).toEqual([]);
  });
});

describe('getUnreadCount 未读统计', () => {
  it('只统计「接收方 = 本人」的未读消息', () => {
    sendMessage('u1', 'u2', '早', 'text'); // u2 未读 +1
    sendMessage('u1', 'u2', '交班', 'text'); // u2 未读 +1
    sendMessage('u2', 'u1', '收到', 'text'); // u1 未读 +1

    expect(getUnreadCount('u2')).toBe(2);
    expect(getUnreadCount('u1')).toBe(1); // 自己发出的「早/交班」不计入
    expect(getUnreadCount('u3')).toBe(0);
  });

  it('空 userId 返回 0，不抛错', () => {
    expect(getUnreadCount('')).toBe(0);
    expect(getUnreadCount('   ')).toBe(0);
  });
});
