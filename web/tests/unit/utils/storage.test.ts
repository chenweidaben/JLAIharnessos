/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * storage 封装测试：localStorage / sessionStorage
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { storage, local, session } from '@/utils/storage';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('storage.get', () => {
  it('读取已存在的键', () => {
    window.localStorage.setItem('jianlan:user', JSON.stringify({ name: '李医生' }));
    expect(storage.get('local', 'user', null)).toEqual({ name: '李医生' });
  });

  it('键不存在时返回默认值', () => {
    expect(storage.get('local', 'nonexistent', 'default')).toBe('default');
  });

  it('JSON 解析失败时返回默认值', () => {
    window.localStorage.setItem('jianlan:bad', '{invalid json');
    expect(storage.get('local', 'bad', 'fallback')).toBe('fallback');
  });
});

describe('storage.set', () => {
  it('写入并读取对象', () => {
    local.set('patient', { id: 'p1', name: '张三' });
    expect(local.get('patient', null)).toEqual({ id: 'p1', name: '张三' });
  });

  it('写入字符串', () => {
    local.set('token', 'abc123');
    expect(local.get('token', '')).toBe('abc123');
  });

  it('写入数字', () => {
    local.set('age', 58);
    expect(local.get('age', 0)).toBe(58);
  });

  it('命名空间隔离：不污染原始 localStorage', () => {
    local.set('key', 'value');
    expect(window.localStorage.getItem('key')).toBeNull();
    expect(window.localStorage.getItem('jianlan:key')).toBe(JSON.stringify('value'));
  });
});

describe('storage.remove', () => {
  it('移除键', () => {
    local.set('tmp', 'data');
    local.remove('tmp');
    expect(local.get('tmp', null)).toBeNull();
  });
});

describe('storage.clear', () => {
  it('清空 local', () => {
    local.set('a', 1);
    local.set('b', 2);
    storage.clear('local');
    expect(local.get('a', null)).toBeNull();
    expect(local.get('b', null)).toBeNull();
  });
});

describe('session 封装', () => {
  it('session 读写', () => {
    session.set('currentPatient', { id: 'p9' });
    expect(session.get('currentPatient', null)).toEqual({ id: 'p9' });
  });

  it('session.remove', () => {
    session.set('tmp', 1);
    session.remove('tmp');
    expect(session.get('tmp', null)).toBeNull();
  });

  it('local 与 session 互不影响', () => {
    local.set('shared', 'local-val');
    session.set('shared', 'session-val');
    expect(local.get('shared', '')).toBe('local-val');
    expect(session.get('shared', '')).toBe('session-val');
  });
});
