/**
 * 健澜科技 jlmedaios - M124-B 系统数据备份/恢复聚合器（运维工具）
 *
 * 【运维工具】本模块为运维侧数据导出与导入的纯函数层：
 *  - exportSystemData(tables, data)：把「表名清单 + 各表行数据」打包成带版本号、
 *    导出时间、行数统计与完整性校验和的标准 JSON 备份信封；
 *  - importSystemData(jsonData)：解析并校验备份信封，复核校验和后还原出
 *    「表名清单 + 各表行数据」，供运维在受控事务中物理恢复。
 *
 * 设计约束（生产安全）：
 *  - 纯函数：不依赖数据库、网络与系统时间副作用之外的任何 I/O，便于单测与复用；
 *  - 完整性自检：校验和采用零依赖 FNV-1a（64bit hex），禁止新增第三方依赖；
 *  - 不碰 WebSocket、不做物理写库——物理恢复由路由层在白名单事务中执行，
 *    本层只负责「打包格式」与「导入校验」，与 routes/adminBackup.ts 分层协作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 备份信封版本号；信封结构升级时递增，导入端据此做兼容判断 */
export const BACKUP_VERSION = '1.0.0';

/** 信封工具标识，导入端据此识别本系统产物，拒绝异系统文件 */
export const BACKUP_TOOL = 'jlmedaios-backup';

/** 标准备份信封结构（导出产物即此形状的 JSON） */
export interface BackupEnvelope {
  /** 固定标识 jlmedaios-backup */
  tool: typeof BACKUP_TOOL;
  /** 信封版本号，如 1.0.0 */
  version: string;
  /** 固定种类 system-backup */
  kind: 'system-backup';
  /** 导出时刻 ISO 字符串 */
  exportedAt: string;
  /** 本次备份包含的表名清单（白名单表，schema.table） */
  tables: string[];
  /** 各表行数统计 */
  rowCounts: Record<string, number>;
  /** 完整性校验和（FNV-1a 64bit hex，对规范化 data 计算） */
  checksum: string;
  /** 各表行数据：table -> 行数组 */
  data: Record<string, unknown[]>;
}

/** importSystemData 还原结果（与信封的数据部分对齐，已通过校验） */
export interface RestoredBackup {
  version: string;
  exportedAt: string;
  tables: string[];
  rowCounts: Record<string, number>;
  data: Record<string, unknown[]>;
}

/* ----------------------------------------------------------------------------
 * 零依赖 FNV-1a（64bit）校验和
 * 选用理由：备份完整性只需「防损坏/防误改」，不抗恶意篡改；零依赖、纯 JS、
 * 确定性输出，与 Bun/Node 运行时无关。抗篡改由文件传输通道（HTTPS/内网）兜底。
 * -------------------------------------------------------------------------- */

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const FNV_MOD = 1n << 64n;

/** 对一段 UTF-8 文本计算 FNV-1a 64bit，返回 16 进制小写字符串 */
export function fnv1aHex(input: string): string {
  let hash = FNV_OFFSET;
  // 逐字节（UTF-8）折叠；TextEncoder 在 Bun/现代 Node 均可用，不新增依赖
  const bytes = new TextEncoder().encode(input);
  for (const b of bytes) {
    hash ^= BigInt(b);
    hash = (hash * FNV_PRIME) % FNV_MOD;
  }
  return hash.toString(16).padStart(16, '0');
}

/**
 * 规范化负载用于校验和：对 data 按表名排序后序列化，保证键序无关、
 * 跨环境字节一致（空表、字段顺序差异不影响校验和稳定性）。
 */
function canonicalize(data: Record<string, unknown[]>): string {
  const sortedTables = Object.keys(data).sort();
  const ordered: Record<string, unknown[]> = {};
  for (const t of sortedTables) ordered[t] = Array.isArray(data[t]) ? data[t] : [];
  return JSON.stringify(ordered);
}

/* ----------------------------------------------------------------------------
 * 导出（纯函数）
 * -------------------------------------------------------------------------- */

/**
 * exportSystemData：把表清单与行数据打包为标准备份信封。
 *
 * @param tables 白名单表名清单（schema.table）；缺省回退为 data 的键集合
 * @param data   各表行数据：table -> 行数组；非数组值安全兜底为空数组
 * @returns      标准备份信封（含 rowCounts / checksum / exportedAt）
 */
export function exportSystemData(
  tables: string[],
  data: Record<string, unknown[]>,
): BackupEnvelope {
  const source = data && typeof data === 'object' ? data : {};
  const tableList = Array.isArray(tables) && tables.length > 0 ? [...tables] : Object.keys(source);

  // 归一：每张表必须对应一个数组行集
  const normalized: Record<string, unknown[]> = {};
  const rowCounts: Record<string, number> = {};
  for (const t of tableList) {
    const rows = source[t];
    normalized[t] = Array.isArray(rows) ? rows : [];
    rowCounts[t] = normalized[t].length;
  }

  const exportedAt = new Date().toISOString();
  const checksum = fnv1aHex(canonicalize(normalized));

  return {
    tool: BACKUP_TOOL,
    version: BACKUP_VERSION,
    kind: 'system-backup',
    exportedAt,
    tables: [...tableList],
    rowCounts,
    checksum,
    data: normalized,
  };
}

/* ----------------------------------------------------------------------------
 * 导入（纯函数）
 * -------------------------------------------------------------------------- */

/**
 * importSystemData：解析并校验备份信封，还原出「表清单 + 行数据」。
 *
 * 接受 JSON 字符串或已解析对象；任何不合法/被篡改的信封都抛 Error，
 * 由路由层捕获后返回 400。校验顺序：类型结构 -> tool/kind 标识 ->
 * tables/data 形状 -> 校验和复核（防文件损坏或中途被改）。
 *
 * @param jsonData 备份文件内容（JSON 字符串或对象）
 * @returns        已通过完整性校验的还原结果
 * @throws         信封缺失/格式错误/校验和不匹配时抛出可读中文错误
 */
export function importSystemData(jsonData: string | unknown): RestoredBackup {
  let parsed: unknown;
  if (typeof jsonData === 'string') {
    const text = jsonData.trim();
    if (!text) throw new Error('备份文件内容为空');
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('备份文件不是合法 JSON');
    }
  } else {
    parsed = jsonData;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('备份文件结构错误：应为对象信封');
  }
  const env = parsed as Record<string, unknown>;

  if (env.tool !== BACKUP_TOOL) {
    throw new Error(`非本系统备份文件（tool=${String(env.tool)}）`);
  }
  if (env.kind !== 'system-backup') {
    throw new Error('备份文件种类错误（kind 应为 system-backup）');
  }
  if (typeof env.version !== 'string' || !env.version) {
    throw new Error('备份信封缺少 version');
  }
  if (typeof env.exportedAt !== 'string' || !env.exportedAt) {
    throw new Error('备份信封缺少 exportedAt');
  }
  if (!Array.isArray(env.tables)) {
    throw new Error('备份信封 tables 必须为数组');
  }
  if (!env.data || typeof env.data !== 'object' || Array.isArray(env.data)) {
    throw new Error('备份信封 data 必须为对象');
  }
  if (typeof env.checksum !== 'string' || !env.checksum) {
    throw new Error('备份信封缺少 checksum');
  }

  const rawData = env.data as Record<string, unknown>;
  const tables = env.tables.filter((t): t is string => typeof t === 'string');

  // 归一行集，与导出侧同构
  const normalized: Record<string, unknown[]> = {};
  const rowCounts: Record<string, number> = {};
  for (const t of tables) {
    const rows = rawData[t];
    normalized[t] = Array.isArray(rows) ? rows : [];
    rowCounts[t] = normalized[t].length;
  }

  // 完整性复核：重算校验和并与信封自带值比对
  const expected = fnv1aHex(canonicalize(normalized));
  if (expected !== (env.checksum as string).toLowerCase()) {
    throw new Error('备份文件校验和不匹配：文件可能已损坏或被篡改');
  }

  return {
    version: env.version,
    exportedAt: env.exportedAt,
    tables,
    rowCounts,
    data: normalized,
  };
}
