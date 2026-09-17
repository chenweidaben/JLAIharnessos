/**
 * 健澜科技杠OS — 知识中台轻量持久化
 *
 * 默认基于本地 JSON 文件（data/knowledge/runtime），零外部依赖即可运行；
 * 生产环境可实现相同接口替换为 PostgreSQL/对象存储。所有写操作幂等、失败降级为内存态。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

export interface KVStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  keys(): Promise<string[]>;
  delete(key: string): Promise<void>;
}

export class JsonFileStore implements KVStore {
  private cache = new Map<string, unknown>();
  private loaded = false;

  constructor(private baseDir: string) {}

  private async fs(): Promise<{
    read: (p: string) => Promise<string>;
    write: (p: string, c: string) => Promise<void>;
    mkdir: (p: string) => Promise<void>;
    readdir: (p: string) => Promise<string[]>;
  }> {
    const g = globalThis as unknown as {
      Bun?: {
        file: (p: string) => {
          text: () => Promise<string>;
          writer: () => { write: (c: string) => Promise<number> | number };
        };
      };
    };
    if (g.Bun) {
      const bun = g.Bun;
      return {
        read: (p) => bun.file(p).text(),
        write: async (p, c) => {
          await bun.file(p).writer().write(c);
        },
        mkdir: async () => undefined,
        readdir: async () => [],
      };
    }
    const fs = await import('node:fs/promises');
    return {
      read: (p) => fs.readFile(p, 'utf-8'),
      write: (p, c) => fs.writeFile(p, c, 'utf-8'),
      mkdir: async (p) => {
        await fs.mkdir(p, { recursive: true });
      },
      readdir: (p) => fs.readdir(p).catch(() => [] as string[]),
    };
  }

  private pathOf(key: string): string {
    const safe = key.replace(/[^a-zA-Z0-9_.-]/g, '_');
    return `${this.baseDir}/${safe}.json`;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const nodeFs = await import('node:fs/promises');
      await nodeFs.mkdir(this.baseDir, { recursive: true });
      const files = await nodeFs.readdir(this.baseDir).catch(() => [] as string[]);
      for (const f of files) {
        if (!f.endsWith('.json')) continue;
        try {
          const raw = await nodeFs.readFile(`${this.baseDir}/${f}`, 'utf-8');
          this.cache.set(f.replace(/\.json$/, ''), JSON.parse(raw));
        } catch {
          /* 忽略损坏文件 */
        }
      }
    } catch {
      /* 目录不可读时退化为纯内存 */
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    await this.ensureLoaded();
    return this.cache.get(key) as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.ensureLoaded();
    this.cache.set(key, value);
    try {
      const nodeFs = await import('node:fs/promises');
      await nodeFs.mkdir(this.baseDir, { recursive: true });
      await nodeFs.writeFile(this.pathOf(key), JSON.stringify(value), 'utf-8');
    } catch {
      /* 写入失败仅保留内存态 */
    }
  }

  async keys(): Promise<string[]> {
    await this.ensureLoaded();
    return [...this.cache.keys()];
  }

  async delete(key: string): Promise<void> {
    await this.ensureLoaded();
    this.cache.delete(key);
    try {
      const nodeFs = await import('node:fs/promises');
      await nodeFs.unlink(this.pathOf(key)).catch(() => undefined);
    } catch {
      /* ignore */
    }
  }
}

/** 纯内存存储（测试用） */
export class MemoryStore implements KVStore {
  private map = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | undefined> {
    return this.map.get(key) as T | undefined;
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.map.set(key, value);
  }
  async keys(): Promise<string[]> {
    return [...this.map.keys()];
  }
  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }
}
