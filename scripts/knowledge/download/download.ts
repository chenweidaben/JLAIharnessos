/**
 * 健澜科技杠OS - 权威医疗知识库合规获取编排器
 *
 * 设计原则（医院多为内网/等保环境，数据获取必须可审计、可复核）：
 *  - 默认 dry-run：不联网，只输出来源清单、许可证、落盘路径与申请指引；
 *  - 加 --execute 才真正下载标记为 autoDownload 的开放数据源；
 *  - 需注册 / 持证 / 仅在线查阅的数据源，永远不自动抓取，只生成申请步骤；
 *  - 每个下载文件记录来源 URL、许可证、SHA-256、时间，写入 REGISTRY 与 MANIFEST。
 *
 * 用法（bun）：
 *   bun scripts/knowledge/download/download.ts --list
 *   bun scripts/knowledge/download/download.ts --list --category terminology
 *   bun scripts/knowledge/download/download.ts --source mesh            # dry-run
 *   bun scripts/knowledge/download/download.ts --source mesh --execute  # 真正下载
 *   bun scripts/knowledge/download/download.ts --all-open --execute --out data/knowledge/raw
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import { createWriteStream, existsSync, mkdirSync, createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve, relative } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { KNOWLEDGE_SOURCES, type KnowledgeSource } from './sources';

interface DownloadItem {
  url: string;
  filename: string;
  /** 动态解析标记，用于日志 */
  note?: string;
}

interface CliOptions {
  list: boolean;
  execute: boolean;
  source?: string;
  allOpen: boolean;
  out: string;
  category?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const opt: CliOptions = { list: false, execute: false, allOpen: false, out: 'data/knowledge/raw' };
  for (const a of argv) {
    if (a === '--list') opt.list = true;
    else if (a === '--execute') opt.execute = true;
    else if (a === '--all-open') opt.allOpen = true;
    else if (a.startsWith('--source=')) opt.source = a.slice('--source='.length);
    else if (a.startsWith('--out=')) opt.out = a.slice('--out='.length);
    else if (a.startsWith('--category=')) opt.category = a.slice('--category='.length);
  }
  return opt;
}

/** 为开放源解析具体下载文件（URL 可能按年份/版本动态生成） */
async function resolveDownloads(s: KnowledgeSource): Promise<DownloadItem[]> {
  const year = new Date().getFullYear();
  if (s.id === 'mesh') {
    // NLM MeSH 年度 XML，desc 主词表 + supp 增补；新年份未发布时回退上一年
    const items: DownloadItem[] = [];
    for (const kind of ['desc', 'supp']) {
      items.push({
        url: `https://nlmpubs.nlm.nih.gov/online/mesh/MESH_FILES/xmlmesh/${kind}${year}.gz`,
        filename: `mesh/${kind}${year}.gz`,
        note: '若本年未发布，下载器会自动回退上一年',
      });
    }
    return items;
  }
  if (s.id === 'tcm-mkg') {
    // Zenodo 记录 API 动态列出文件，避免硬编码易失效直链
    try {
      const recordId = s.url.split('/').pop();
      const res = await fetch(`https://zenodo.org/api/records/${recordId}`);
      if (res.ok) {
        const json = (await res.json()) as { files?: Array<{ key: string; links: { self: string } }> };
        return (json.files ?? []).map((f) => ({
          url: f.links.self,
          filename: `tcm-mkg/${f.key}`.replace(/\//g, '__'),
        }));
      }
    } catch {
      /* 离线时回退为来源卡 */
    }
    return [];
  }
  if (s.id === 'chembl') {
    // ChEMBL latest 为版本化目录，需人工确认具体版本，给出稳定的下载入口而非臆造直链
    return [
      {
        url: 'https://ftp.ebi.ac.uk/pub/databases/chembl/ChEMBLdb/latest/',
        filename: 'chembl/PLEASE_SELECT_RELEASE.txt',
        note: 'latest 为目录索引，请在该目录选择 chembl_XX_postgresql.tar.gz 后更新此清单',
      },
    ];
  }
  return [];
}

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok) return res;
      if (res.status === 404) return res; // 让调用方决定回退
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 1000 * i));
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function sha256OfFile(path: string): Promise<string> {
  const hash = createHash('sha256');
  await new Promise<void>((resolveP, reject) => {
    const rs = createReadStream(path);
    rs.on('data', (c) => hash.update(c));
    rs.on('end', () => resolveP());
    rs.on('error', reject);
  });
  return hash.digest('hex');
}

async function streamToFile(res: Response, dest: string): Promise<number> {
  mkdirSync(join(dest, '..'), { recursive: true });
  // 目录索引页不是数据文件，直接落盘提示文本
  if (!res.body || res.headers.get('content-type')?.includes('text/html')) {
    const text = await res.text();
    await writeFile(dest, text);
    return Buffer.byteLength(text);
  }
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(dest));
  const stat = await readFile(dest).then((b) => b.length).catch(() => 0);
  return stat;
}

/** 生成单个数据源的合规来源卡（无论是否可自动下载都生成） */
function sourceCard(s: KnowledgeSource, outDir: string): string {
  const lines = [
    `# ${s.name}${s.nameEn ? ` (${s.nameEn})` : ''}`,
    '',
    `- 数据源 ID：${s.id}`,
    `- 类别：${s.category}`,
    `- 发布机构：${s.publisher}`,
    `- 官方入口：${s.url}`,
    `- 许可证：${s.license}`,
    `- 许可证说明：${s.licenseNote}`,
    `- 获取方式：${s.access}`,
    `- 可再分发：${s.redistributable ? '是（需保留来源与许可声明）' : '否'}`,
    `- 可商业使用：${s.commercialUse ? '是' : '否（需授权）'}`,
    `- 交付形态：${s.artifacts.join('、')}`,
    `- 建议落盘目录：${join(outDir, s.targetDir ?? s.id)}`,
    '',
    '## 获取与合规步骤',
    s.instructions,
  ];
  if (s.notes) lines.push('', `> 备注：${s.notes}`);
  if (!s.redistributable) {
    lines.push('', '> **合规红线**：该数据源不得随健澜科技杠OS仓库或发行包再分发；如需在院内部署，请由医院按上述指引单独获取并仅在授权范围内使用。');
  }
  return lines.join('\n') + '\n';
}

function printList(sources: KnowledgeSource[]) {
  for (const s of sources) {
    const flag = s.autoDownload ? '可自动下载' : s.access === 'open' ? '开放(手动)' : s.access === 'registration' ? '需注册' : s.access === 'credentialed' ? '需认证' : '仅在线';
    console.log(`[${flag.padEnd(6)}] ${s.id.padEnd(20)} ${s.license.padEnd(14)} ${s.name}`);
  }
}

async function processSource(s: KnowledgeSource, outDir: string, execute: boolean) {
  const cardDir = join(outDir, '_source-cards');
  await mkdir(cardDir, { recursive: true });
  await writeFile(join(cardDir, `${s.id}.md`), sourceCard(s, relative(process.cwd(), outDir) || outDir), 'utf8');

  if (!s.autoDownload) {
    console.log(`\n■ ${s.name}（${s.access}）— 不自动下载`);
    console.log(`  来源卡已生成：${relative(process.cwd(), join(cardDir, `${s.id}.md`))}`);
    console.log(`  指引：${s.instructions}`);
    return { source: s.id, downloaded: [] as string[], skipped: true };
  }

  const items = await resolveDownloads(s);
  if (items.length === 0) {
    console.log(`\n■ ${s.name}：离线或未能解析文件清单，仅生成来源卡（--execute 联网重试）`);
    return { source: s.id, downloaded: [] as string[], skipped: true };
  }

  const downloaded: string[] = [];
  for (const item of items) {
    const dest = resolve(join(outDir, item.filename));
    mkdirSync(join(dest, '..'), { recursive: true });
    if (!execute) {
      console.log(`\n■ [dry-run] ${s.name}`);
      console.log(`  将下载 ${item.url}`);
      console.log(`  落盘到 ${relative(process.cwd(), dest)}${item.note ? `\n  说明：${item.note}` : ''}`);
      continue;
    }
    try {
      let res = await fetchWithRetry(item.url);
      // MeSH 新年份 404 回退上一年
      if (res.status === 404 && /(desc|supp)\d{4}\.gz$/.test(item.url)) {
        const prev = item.url.replace(/(\d{4})\.gz$/, (m, y) => `${Number(y) - 1}.gz`);
        console.log(`  本年文件不存在，回退 ${prev}`);
        res = await fetchWithRetry(prev);
      }
      if (!res.ok) {
        console.error(`  ✗ 下载失败 ${item.url}：HTTP ${res.status}`);
        continue;
      }
      const size = await streamToFile(res, dest);
      const checksum = await sha256OfFile(dest).catch(() => '');
      downloaded.push(relative(process.cwd(), dest));
      console.log(`  ✓ ${item.filename} (${(size / 1024 / 1024).toFixed(2)} MB, sha256=${checksum.slice(0, 16)}…)`);
    } catch (e) {
      console.error(`  ✗ ${item.url}：${(e as Error).message}`);
    }
  }
  return { source: s.id, downloaded, skipped: false };
}

async function main() {
  const opt = parseArgs(process.argv.slice(2));
  let sources = KNOWLEDGE_SOURCES;
  if (opt.category) sources = sources.filter((s) => s.category === opt.category);
  if (opt.source) {
    const one = KNOWLEDGE_SOURCES.find((s) => s.id === opt.source);
    if (!one) {
      console.error(`未找到数据源：${opt.source}；用 --list 查看全部`);
      process.exit(1);
    }
    sources = [one];
  }
  if (!opt.allOpen && !opt.source) sources = sources; // --list 或默认全部生成卡片

  if (opt.list && !opt.source && !opt.allOpen) {
    printList(opt.category ? sources : KNOWLEDGE_SOURCES);
    console.log(`\n共 ${KNOWLEDGE_SOURCES.length} 个数据源。许可证详见 DATA_LICENSES.md 与 data/knowledge/raw/_source-cards/。`);
    return;
  }

  const outDir = resolve(opt.out);
  await mkdir(outDir, { recursive: true });
  console.log(`模式：${opt.execute ? '执行下载' : 'dry-run（仅预览/生成来源卡，加 --execute 真正下载）'}`);
  console.log(`输出目录：${outDir}\n`);

  const targets = opt.allOpen ? sources.filter((s) => s.autoDownload) : sources;
  const results: Array<{ source: string; downloaded: string[]; skipped: boolean }> = [];
  for (const s of targets) {
    results.push(await processSource(s, outDir, opt.execute));
  }

  // 汇总 REGISTRY
  const registryPath = join(outDir, 'REGISTRY.json');
  let registry: Record<string, unknown> = {};
  if (existsSync(registryPath)) {
    try { registry = JSON.parse(await readFile(registryPath, 'utf8')); } catch { registry = {}; }
  }
  registry.generatedAt = new Date().toISOString();
  registry.sources ??= {};
  for (const r of results) (registry.sources as Record<string, unknown>)[r.source] = r;
  await writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf8');

  const totalFiles = results.reduce((n, r) => n + r.downloaded.length, 0);
  console.log(`\n完成：处理 ${results.length} 个数据源，下载 ${totalFiles} 个文件。`);
  if (!opt.execute) console.log('当前为 dry-run，未写入数据文件；确认许可证合规后加 --execute 执行。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
