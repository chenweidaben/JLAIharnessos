/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * localStorage / sessionStorage 安全封装
 */
const NAMESPACE = 'jianlan:';

type StorageType = 'local' | 'session';

function getStorage(type: StorageType): Storage {
  return type === 'local' ? window.localStorage : window.sessionStorage;
}

export const storage = {
  get<T>(type: StorageType, key: string, defaultValue: T): T {
    try {
      const raw = getStorage(type).getItem(NAMESPACE + key);
      if (raw == null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  },
  set(type: StorageType, key: string, value: unknown): void {
    try {
      getStorage(type).setItem(NAMESPACE + key, JSON.stringify(value));
    } catch {
      /* 静默失败 */
    }
  },
  remove(type: StorageType, key: string): void {
    getStorage(type).removeItem(NAMESPACE + key);
  },
  clear(type: StorageType): void {
    getStorage(type).clear();
  },
};

export const local = {
  get: <T>(key: string, defaultValue: T) => storage.get<T>('local', key, defaultValue),
  set: (key: string, value: unknown) => storage.set('local', key, value),
  remove: (key: string) => storage.remove('local', key),
};

export const session = {
  get: <T>(key: string, defaultValue: T) => storage.get<T>('session', key, defaultValue),
  set: (key: string, value: unknown) => storage.set('session', key, value),
  remove: (key: string) => storage.remove('session', key),
};
