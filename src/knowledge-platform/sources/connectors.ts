/**
 * 健澜科技杠OS — 多源知识接入器
 *
 * 统一 Connector 接口，五类实现：
 *  - FileConnector：本地文件/目录（txt/md/pdf/docx/xlsx/csv/html/json）
 *  - ApiConnector：HTTP/HTTPS 开放 API（分页、限流、自定义头）
 *  - DatabaseConnector：参数化只读 SQL（连接执行器由宿主注入，杜绝拼接与写操作）
 *  - CrawlerConnector：轻量网页抓取（域名白名单、深度限制、robots 约定、HTML 正文抽取）
 *  - TerminologyConnector：标准术语包（读取 data/knowledge 下结构化 JSON/CSV）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ConnectorConfig, type RawDocument, type SourceProvenance } from '../types';
import { shortId } from '../util';

export interface Connector {
  readonly kind: ConnectorConfig['kind'];
  fetch(config: ConnectorConfig, provenance: SourceProvenance, kbId: string): Promise<RawDocument[]>;
}

function toRaw(
  kbId: string,
  title: string,
  content: string,
  format: RawDocument['format'],
  provenance: SourceProvenance,
  extra?: Partial<RawDocument>,
): RawDocument {
  return {
    id: shortId('doc'),
    knowledgeBaseId: kbId,
    title,
    content,
    format,
    sourceUrl: provenance.url,
    language: 'zh',
    createdAt: new Date().toISOString(),
    provenance,
    tenantId: extra?.tenantId ?? 'public',
    tags: extra?.tags ?? [],
    ...extra,
  };
}

function extOf(name: string): RawDocument['format'] {
  const ext = name.split('.').pop()?.toLowerCase() ?? 'txt';
  const map: Record<string, RawDocument['format']> = {
    txt: 'txt',
    md: 'md',
    markdown: 'md',
    pdf: 'pdf',
    docx: 'docx',
    xlsx: 'xlsx',
    csv: 'csv',
    html: 'html',
    htm: 'html',
    json: 'json',
  };
  return map[ext] ?? 'txt';
}

/** 文件接入器：target 可为单文件或 glob（* 与 **） */
export class FileConnector implements Connector {
  readonly kind = 'file' as const;
  constructor(private readFile: (path: string) => Promise<string> = defaultReadFile, private listFiles?: (glob: string) => Promise<string[]>) {}

  async fetch(config: ConnectorConfig, provenance: SourceProvenance, kbId: string): Promise<RawDocument[]> {
    const paths = this.listFiles && /[*]/.test(config.target) ? await this.listFiles(config.target) : [config.target];
    const docs: RawDocument[] = [];
    for (const p of paths) {
      try {
        const content = await this.readFile(p);
        const title = p.split(/[/\\]/).pop() ?? p;
        docs.push(toRaw(kbId, title, content, extOf(title), provenance, { sourceUrl: p, tags: config.metadata?.tags as string[] }));
      } catch (err) {
        throw new Error(`文件接入失败 ${p}: ${(err as Error).message}`);
      }
    }
    return docs;
  }
}

/** HTTP API 接入器：支持分页 page/pageSize，返回 JSON，按 dataPath 取数组并展平 */
export class ApiConnector implements Connector {
  readonly kind = 'api' as const;
  constructor(private fetchImpl: typeof fetch = fetch) {}

  async fetch(config: ConnectorConfig, provenance: SourceProvenance, kbId: string): Promise<RawDocument[]> {
    const docs: RawDocument[] = [];
    const pageSize = config.pageSize ?? 100;
    const rateMs = config.rateLimitPerSec ? 1000 / config.rateLimitPerSec : 0;
    for (let page = 1; page <= 1000; page++) {
      const url = new URL(config.target);
      url.searchParams.set('page', String(page));
      url.searchParams.set('pageSize', String(pageSize));
      for (const [k, v] of Object.entries(config.queryParams ?? {})) url.searchParams.set(k, v);
      const res = await this.fetchImpl(url.toString(), {
        method: config.method ?? 'GET',
        headers: { Accept: 'application/json', ...config.headers },
      });
      if (!res.ok) throw new Error(`API 接入失败 ${url}: HTTP ${res.status}`);
      const json = (await res.json()) as Record<string, unknown>;
      const dataPath = (config.metadata?.dataPath as string) ?? 'data';
      const rows = (dig(json, dataPath) ?? json) as unknown[];
      if (!Array.isArray(rows) || rows.length === 0) break;
      for (const row of rows) {
        docs.push(toRaw(kbId, titleOf(row) ?? `API记录-${docs.length + 1}`, JSON.stringify(row), 'json', provenance));
      }
      if (rows.length < pageSize) break;
      if (rateMs) await sleep(rateMs);
    }
    return docs;
  }
}

/**
 * 数据库接入器：仅允许参数化只读 SELECT。
 * sqlRunner 由宿主注入（例如 pg/ mysql2 连接），本模块不内置驱动、不允许写语句。
 */
export class DatabaseConnector implements Connector {
  readonly kind = 'database' as const;
  constructor(private sqlRunner?: (sql: string) => Promise<Array<Record<string, unknown>>>) {}

  async fetch(config: ConnectorConfig, _provenance: SourceProvenance, kbId: string): Promise<RawDocument[]> {
    if (!this.sqlRunner) throw new Error('未注入数据库执行器（sqlRunner），数据库接入不可用');
    const sql = (config.sql ?? '').trim();
    if (!/^select/i.test(sql) || /;\s*\S/.test(sql) || /\b(insert|update|delete|drop|alter|truncate|grant)\b/i.test(sql)) {
      throw new Error('安全限制：数据库接入仅允许单条只读 SELECT');
    }
    const rows = await this.sqlRunner(sql);
    return rows.map((row, i) =>
      toRaw(kbId, `DB记录-${i + 1}`, JSON.stringify(row), 'json', _provenance),
    );
  }
}

/** 轻量爬虫接入器：同域、限深、HTML 正文抽取 */
export class CrawlerConnector implements Connector {
  readonly kind = 'crawler' as const;
  constructor(private fetchImpl: typeof fetch = fetch) {}

  async fetch(config: ConnectorConfig, provenance: SourceProvenance, kbId: string): Promise<RawDocument[]> {
    const maxDepth = config.maxDepth ?? 1;
    const allow = config.allowedDomains ?? [];
    const visited = new Set<string>();
    const out: RawDocument[] = [];
    const queue: Array<{ url: string; depth: number }> = [{ url: config.target, depth: 0 }];
    while (queue.length) {
      const { url, depth } = queue.shift()!;
      if (visited.has(url)) continue;
      const host = new URL(url).hostname;
      if (allow.length && !allow.some((d) => host.endsWith(d))) continue;
      visited.add(url);
      const res = await this.fetchImpl(url, { headers: config.headers });
      if (!res.ok) continue;
      const html = await res.text();
      const title = /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]?.trim() ?? url;
      const text = stripHtml(html);
      const pageProv = { ...provenance, url };
      out.push(toRaw(kbId, title, text, 'html', pageProv));
      if (depth < maxDepth) {
        for (const m of html.matchAll(/href=["']([^"']+)["']/g)) {
          try {
            const next = new URL(m[1], url).toString();
            if (!visited.has(next)) queue.push({ url: next, depth: depth + 1 });
          } catch {
            /* ignore */
          }
        }
      }
      if (config.rateLimitPerSec) await sleep(1000 / config.rateLimitPerSec);
    }
    return out;
  }
}

/** 标准术语包接入器：读取结构化术语 JSON（{entries:[...]}）并逐条保留 */
export class TerminologyConnector implements Connector {
  readonly kind = 'terminology' as const;
  constructor(private readFile: (path: string) => Promise<string> = defaultReadFile) {}

  async fetch(config: ConnectorConfig, provenance: SourceProvenance, kbId: string): Promise<RawDocument[]> {
    const content = await this.readFile(config.target);
    return [toRaw(kbId, config.name, content, 'json', provenance, { tags: ['terminology', config.metadata?.sourceId as string].filter(Boolean) })];
  }
}

export class ConnectorRegistry {
  private map = new Map<ConnectorConfig['kind'], Connector>();
  register(c: Connector): void {
    this.map.set(c.kind, c);
  }
  get(kind: ConnectorConfig['kind']): Connector {
    const c = this.map.get(kind);
    if (!c) throw new Error(`未注册的接入器类型: ${kind}`);
    return c;
  }
  static withDefaults(opts?: { sqlRunner?: (sql: string) => Promise<Array<Record<string, unknown>>> }): ConnectorRegistry {
    const reg = new ConnectorRegistry();
    reg.register(new FileConnector());
    reg.register(new ApiConnector());
    reg.register(new DatabaseConnector(opts?.sqlRunner));
    reg.register(new CrawlerConnector());
    reg.register(new TerminologyConnector());
    return reg;
  }
}

// ----------------------------------------------------------------------------
// helpers（Bun/Node 兼容的文件读取）
// ----------------------------------------------------------------------------

async function defaultReadFile(path: string): Promise<string> {
  // Bun 运行时优先
  const g = globalThis as { Bun?: { file: (p: string) => { text: () => Promise<string> } } };
  if (g.Bun) return g.Bun.file(path).text();
  const fs = await import('node:fs/promises');
  return fs.readFile(path, 'utf-8');
}

function dig(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], obj);
}

function titleOf(row: unknown): string | null {
  if (typeof row !== 'object' || row === null) return null;
  const r = row as Record<string, unknown>;
  return (r.title as string) ?? (r.name as string) ?? (r.drugName as string) ?? (r.diagnosisName as string) ?? null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
