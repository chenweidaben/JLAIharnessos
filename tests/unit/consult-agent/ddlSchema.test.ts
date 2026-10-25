/**
 * 健澜AI原生医院操作系统OS · M86 consult-agent 迁移 380–385 DDL 静态自洽校验
 *
 * 【静态校验边界 · 如实标注，禁止伪造通过】
 * 本测试仅对 deploy/postgres/init/380–385 六份 SQL 文本与
 * src/db/repositories/consultAgentRepo.ts 源码做正则 / 字符串静态比对：
 *   - 不执行任何 SQL，不连接、不启动真实 PostgreSQL；
 *   - 本机未做真实建表 / 触发器 / 索引 / 唯一约束 / 外键 / CHECK 枚举演练
 *     （基线 reports/consult-deepen/baseline-round0.md §10：本机无运行中 PostgreSQL）；
 *   - 覆盖率、触发器触发时机、外键级联、约束与索引的运行时行为以终态实测为准；
 *   - 本测试通过仅代表静态文本自洽，不构成“真实建表通过”结论，亦不替代集成库演练。
 *
 * 校验对象（schema consult，表名以 SQL 实际声明为准）：
 *   380 consult.threads                       咨询会话
 *   381 consult.messages                       会话消息
 *   382 consult.documents                      会话附件与抽取证据
 *   383 consult.diagnosis_prescription_drafts  诊断建议 / 用药处方 AI 草稿
 *   384 consult.audit_trail                    角色 / 工具 / 急症旁路审计轨迹
 *   385 consult.profile_memory                  用户长期画像事实
 *
 * 校验内容：表存在性；列名与类型族；索引（名称 / 唯一性 / 列序）；外键（声明列 /
 * 引用 schema.table(col) / ON DELETE 动作）；主键与唯一约束；SQL 中声明的序列；
 * 更新触发器；仓储 mapRow 蛇形列、INSERT / WHERE / ORDER BY 列清单与 DDL 双向对齐；
 * ON CONFLICT 冲突键对应主键或唯一约束。
 *
 * 静态解析方式：正则 / 字符串解析 SQL 与仓储源码；不执行 SQL、不连库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'bun:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INIT_DIR = join(__dirname, '..', '..', '..', 'deploy', 'postgres', 'init');
const REPO_PATH = join(
  __dirname,
  '..',
  '..',
  '..',
  'src',
  'db',
  'repositories',
  'consultAgentRepo.ts',
);

/** 说明性边界声明（同时由 describe 内说明性用例断言，避免被静默删改） */
const STATIC_ONLY_DISCLAIMER = [
  '本测试为静态文本自洽校验；本机未做真实 PostgreSQL 建表 / 触发器 / 索引 / 约束演练；',
  '覆盖率与运行时行为以终态实测为准；不得据此伪造“真实建表通过”结论。',
].join('\n');

// ============================================================================
// 静态期望基线（按 380–385 SQL 实际声明核对；类型族仅校验 DDL 主类型 token）
// ============================================================================

interface FkSpec {
  column: string;
  schema: string;
  table: string;
  refColumn: string;
  onDelete: string | null;
}

interface IndexSpec {
  name: string;
  unique: boolean;
  columns: string[];
}

interface TableSpec {
  file: string;
  schema: string;
  table: string;
  columns: Record<string, string>;
  indexes: IndexSpec[];
  fks: FkSpec[];
  triggers: string[];
  /** 仓储 ON CONFLICT 冲突键；普通 INSERT 表为 null */
  conflictKey: string | null;
}

const SPECS: TableSpec[] = [
  {
    file: '380-consult-threads.sql',
    schema: 'consult',
    table: 'threads',
    columns: {
      id: 'uuid',
      user_id: 'uuid',
      patient_id: 'uuid',
      title: 'text',
      status: 'text',
      intent: 'text',
      safety_level: 'text',
      current_role: 'text',
      meta: 'jsonb',
      closed_at: 'timestamptz',
      created_at: 'timestamptz',
      updated_at: 'timestamptz',
    },
    indexes: [
      {
        name: 'idx_consult_threads_user_updated',
        unique: false,
        columns: ['user_id', 'updated_at'],
      },
    ],
    fks: [
      { column: 'user_id', schema: 'iam', table: 'users', refColumn: 'id', onDelete: null },
      {
        column: 'patient_id',
        schema: 'clinical',
        table: 'patients',
        refColumn: 'id',
        onDelete: null,
      },
    ],
    triggers: ['trg_consult_threads_updated'],
    conflictKey: 'id',
  },
  {
    file: '381-consult-messages.sql',
    schema: 'consult',
    table: 'messages',
    columns: {
      id: 'uuid',
      thread_id: 'uuid',
      role: 'text',
      content: 'text',
      intent: 'text',
      role_kind: 'text',
      tool_calls: 'jsonb',
      tool_name: 'text',
      safety_level: 'text',
      disclaimer: 'text',
      trace_id: 'text',
      created_at: 'timestamptz',
    },
    indexes: [
      {
        name: 'idx_consult_messages_thread_created',
        unique: false,
        columns: ['thread_id', 'created_at'],
      },
    ],
    fks: [
      {
        column: 'thread_id',
        schema: 'consult',
        table: 'threads',
        refColumn: 'id',
        onDelete: 'cascade',
      },
    ],
    triggers: [],
    conflictKey: null,
  },
  {
    file: '382-consult-documents.sql',
    schema: 'consult',
    table: 'documents',
    columns: {
      id: 'uuid',
      thread_id: 'uuid',
      message_id: 'uuid',
      file_name: 'text',
      mime_type: 'text',
      size_bytes: 'bigint',
      evidence_summary: 'text',
      extracted_evidence: 'jsonb',
      created_at: 'timestamptz',
    },
    indexes: [
      {
        name: 'idx_consult_documents_thread_created',
        unique: false,
        columns: ['thread_id', 'created_at'],
      },
    ],
    fks: [
      {
        column: 'thread_id',
        schema: 'consult',
        table: 'threads',
        refColumn: 'id',
        onDelete: 'cascade',
      },
      {
        column: 'message_id',
        schema: 'consult',
        table: 'messages',
        refColumn: 'id',
        onDelete: null,
      },
    ],
    triggers: [],
    conflictKey: null,
  },
  {
    file: '383-consult-drafts.sql',
    schema: 'consult',
    table: 'diagnosis_prescription_drafts',
    columns: {
      id: 'uuid',
      thread_id: 'uuid',
      kind: 'text',
      title: 'text',
      summary: 'text',
      content: 'text',
      evidence: 'jsonb',
      needs_physician_review: 'boolean',
      is_out_of_hospital_prescription: 'boolean',
      status: 'text',
      draft_hash: 'text',
      reviewer_id: 'uuid',
      reviewed_at: 'timestamptz',
      review_note: 'text',
      created_at: 'timestamptz',
      updated_at: 'timestamptz',
    },
    indexes: [
      {
        name: 'uq_consult_drafts_thread_kind_hash',
        unique: true,
        columns: ['thread_id', 'kind', 'draft_hash'],
      },
      { name: 'idx_consult_drafts_thread_kind', unique: false, columns: ['thread_id', 'kind'] },
    ],
    fks: [
      {
        column: 'thread_id',
        schema: 'consult',
        table: 'threads',
        refColumn: 'id',
        onDelete: 'cascade',
      },
      { column: 'reviewer_id', schema: 'iam', table: 'users', refColumn: 'id', onDelete: null },
    ],
    triggers: ['trg_consult_drafts_updated'],
    conflictKey: 'id',
  },
  {
    file: '384-consult-audit-trail.sql',
    schema: 'consult',
    table: 'audit_trail',
    columns: {
      id: 'uuid',
      thread_id: 'uuid',
      actor_role: 'text',
      action: 'text',
      tool_name: 'text',
      tool_status: 'text',
      duration_ms: 'int',
      evidence_count: 'int',
      error_class: 'text',
      trace_id: 'text',
      detail: 'jsonb',
      created_at: 'timestamptz',
    },
    indexes: [
      {
        name: 'idx_consult_audit_thread_created',
        unique: false,
        columns: ['thread_id', 'created_at'],
      },
      { name: 'idx_consult_audit_trace', unique: false, columns: ['trace_id'] },
    ],
    fks: [
      {
        column: 'thread_id',
        schema: 'consult',
        table: 'threads',
        refColumn: 'id',
        onDelete: 'cascade',
      },
    ],
    triggers: [],
    conflictKey: null,
  },
  {
    file: '385-consult-profile-memory.sql',
    schema: 'consult',
    table: 'profile_memory',
    columns: {
      id: 'uuid',
      user_id: 'text',
      thread_id: 'uuid',
      facts: 'jsonb',
      updated_at: 'timestamptz',
    },
    indexes: [],
    fks: [
      {
        column: 'thread_id',
        schema: 'consult',
        table: 'threads',
        refColumn: 'id',
        onDelete: 'set null',
      },
    ],
    triggers: ['trg_consult_profile_updated'],
    conflictKey: 'user_id',
  },
];

// ============================================================================
// 静态解析器（正则 / 字符串；不执行 SQL、不连库）
// ============================================================================

interface ParsedColumn {
  name: string;
  type: string;
  primaryKey: boolean;
  unique: boolean;
  references: FkSpec | null;
}

interface ParsedIndex {
  name: string;
  unique: boolean;
  columns: string[];
}

interface ParsedTable {
  columns: Map<string, ParsedColumn>;
  indexes: ParsedIndex[];
  triggers: string[];
}

interface RepoRefs {
  mapRow: Record<string, string[]>;
  insert: Record<string, string[]>;
  where: Record<string, string[]>;
  order: Record<string, string[]>;
  conflict: Record<string, string | null>;
  referencedTables: string[];
}

/** 提取 CREATE TABLE 括号主体（跳过单引号字符串，按括号深度配对） */
function extractTableBody(sql: string, table: string): string | null {
  const head = new RegExp(`CREATE TABLE(?: IF NOT EXISTS)? consult\\.${table}\\s*\\(`, 'i');
  const m = head.exec(sql);
  if (!m) return null;
  if (m.index === null) return null;
  const start = m.index + m[0].length - 1;
  let depth = 0;
  let inStr = false;
  for (let i = start; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      if (inStr && sql[i + 1] === "'") {
        i++;
        continue;
      }
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return sql.slice(start + 1, i);
    }
  }
  return null;
}

/** 按括号顶层深度拆分逗号分隔的列定义 / 约束片段 */
function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inStr = false;
  let cur = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "'") {
      if (inStr && body[i + 1] === "'") {
        cur += ch + body[i + 1];
        i++;
        continue;
      }
      inStr = !inStr;
      cur += ch;
      continue;
    }
    if (!inStr) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ',' && depth === 0) {
        parts.push(cur);
        cur = '';
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function parseColumnDef(def: string): ParsedColumn | null {
  const clean = def.replace(/--.*$/, '').trim();
  const m = /^([a-z_][a-z0-9_]*)\s+([a-z0-9_]+)/i.exec(clean);
  if (!m) return null;
  const ref =
    /REFERENCES\s+([a-z_]+)\.([a-z0-9_]+)\s*\(\s*([a-z_][a-z0-9_]*)\s*\)(?:\s+ON DELETE\s+(CASCADE|SET NULL|RESTRICT|NO ACTION))?/i.exec(
      clean,
    );
  return {
    name: m[1].toLowerCase(),
    type: m[2].toLowerCase(),
    primaryKey: /\bPRIMARY KEY\b/i.test(clean),
    unique: /\bUNIQUE\b/i.test(clean),
    references: ref
      ? {
          column: m[1].toLowerCase(),
          schema: ref[1].toLowerCase(),
          table: ref[2].toLowerCase(),
          refColumn: ref[3].toLowerCase(),
          onDelete: ref[4]?.toLowerCase() ?? null,
        }
      : null,
  };
}

function parseIndexes(sql: string, table: string): ParsedIndex[] {
  const out: ParsedIndex[] = [];
  const re =
    /CREATE\s+(UNIQUE\s+)?INDEX\s+IF NOT EXISTS\s+([a-z0-9_]+)\s+ON\s+consult\.([a-z0-9_]+)\s*\(([^)]+)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    if (m[3].toLowerCase() !== table) continue;
    const columns = m[4].split(',').map((c) =>
      c
        .trim()
        .replace(/\s+(ASC|DESC)$/i, '')
        .replace(/["`]/g, '')
        .toLowerCase(),
    );
    out.push({ name: m[2].toLowerCase(), unique: Boolean(m[1]), columns });
  }
  return out;
}

function parseTriggers(sql: string, table: string): string[] {
  const out: string[] = [];
  const re = /CREATE TRIGGER\s+([a-z0-9_]+)\s+BEFORE\s+UPDATE\s+ON\s+consult\.([a-z0-9_]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    if (m[2].toLowerCase() === table) out.push(m[1].toLowerCase());
  }
  return out;
}

function parseSequences(sql: string): string[] {
  return [...sql.matchAll(/CREATE SEQUENCE(?: IF NOT EXISTS)?\s+([a-z0-9_.]+)/gi)].map((m) =>
    m[1].toLowerCase(),
  );
}

function parseTable(sql: string, spec: TableSpec): ParsedTable {
  const body = extractTableBody(sql, spec.table);
  const columns = new Map<string, ParsedColumn>();
  if (body) {
    // 先剥离行内 -- 注释，避免注释粘连到下一列定义导致拆分错位
    const cleaned = body.replace(/--[^\n]*/g, '');
    for (const part of splitTopLevel(cleaned)) {
      const col = parseColumnDef(part);
      if (col) columns.set(col.name, col);
    }
  }
  return {
    columns,
    indexes: parseIndexes(sql, spec.table),
    triggers: parseTriggers(sql, spec.table),
  };
}

// ----------------------------------------------------------------------------
// 仓储源码静态解析（仅读文本，不 import 执行，不触发 pool 连接）
// ----------------------------------------------------------------------------

const MAP_FUNCTION_TABLE: Record<string, string> = {
  mapThreadRow: 'threads',
  mapMessageRow: 'messages',
  mapDocumentRow: 'documents',
  mapDraftRow: 'diagnosis_prescription_drafts',
  mapAuditRow: 'audit_trail',
  mapProfileRow: 'profile_memory',
};

const METHOD_TABLE: Record<string, string> = {
  findThread: 'threads',
  listThreads: 'threads',
  saveThread: 'threads',
  listMessages: 'messages',
  saveMessage: 'messages',
  listDocuments: 'documents',
  saveDocument: 'documents',
  listDrafts: 'diagnosis_prescription_drafts',
  saveDraft: 'diagnosis_prescription_drafts',
  listAudit: 'audit_trail',
  saveAudit: 'audit_trail',
  getProfile: 'profile_memory',
  saveProfile: 'profile_memory',
};

function uniq(values: string[]): string[] {
  return [...new Set(values.map((v) => v.toLowerCase()))].sort();
}

function extractFunctionBody(source: string, fn: string): string {
  const re = new RegExp(
    `function\\s+${fn}\\s*\\(row[^)]*\\)\\s*:\\s*[A-Za-z]+\\s*\\{([\\s\\S]*?)\\n\\}`,
  );
  const m = source.match(re);
  return m ? m[1] : '';
}

function extractMethodBody(source: string, method: string): string {
  const re = new RegExp(
    `async\\s+${method}\\s*\\([^)]*\\)\\s*:\\s*Promise<[^>]*>\\s*\\{([\\s\\S]*?)\\n  \\}`,
  );
  const m = source.match(re);
  return m ? m[1] : '';
}

function extractSqlTemplate(body: string): string {
  const m = /`([\s\S]*?)`/.exec(body);
  return m ? m[1] : '';
}

function parseRepoSource(source: string): RepoRefs {
  const refs: RepoRefs = {
    mapRow: {},
    insert: {},
    where: {},
    order: {},
    conflict: {},
    referencedTables: [],
  };

  for (const [fn, table] of Object.entries(MAP_FUNCTION_TABLE)) {
    const body = extractFunctionBody(source, fn);
    refs.mapRow[table] = uniq([...body.matchAll(/row\.([a-z][a-z0-9_]*)/g)].map((m) => m[1]));
  }

  for (const [method, table] of Object.entries(METHOD_TABLE)) {
    const body = extractMethodBody(source, method);
    const sql = extractSqlTemplate(body);
    refs.referencedTables.push(
      ...[...sql.matchAll(/(?:INSERT INTO|FROM)\s+consult\.([a-z0-9_]+)/gi)].map((m) =>
        m[1].toLowerCase(),
      ),
    );

    const ins = /INSERT INTO consult\.[a-z0-9_]+\s*\(([^)]+)\)/i.exec(sql);
    refs.insert[table] = ins
      ? uniq(ins[1].split(',').map((c) => c.trim().replace(/["`]/g, '')))
      : (refs.insert[table] ?? []);

    const conf = /ON CONFLICT\s*\(([a-z_][a-z0-9_]*)\)/i.exec(sql);
    refs.conflict[table] = conf ? conf[1].toLowerCase() : null;

    const where = /WHERE\s+([^\n]+)/i.exec(sql);
    refs.where[table] = uniq([
      ...(refs.where[table] ?? []),
      ...(where ? [...where[1].matchAll(/([a-z_][a-z0-9_]*)\s*=/g)].map((m) => m[1]) : []),
    ]);

    const order = /ORDER BY\s+([a-z_][a-z0-9_]*)/i.exec(sql);
    refs.order[table] = uniq([
      ...(refs.order[table] ?? []),
      ...(order ? [order[1].toLowerCase()] : []),
    ]);
  }

  refs.referencedTables = uniq(refs.referencedTables);
  return refs;
}

// ============================================================================
// 夹具加载（beforeAll 一次性读入文本；测试全程不连库）
// ============================================================================

const sqlByTable: Record<string, string> = {};
const parsedByTable: Record<string, ParsedTable> = {};
let repoSource = '';
let refs: RepoRefs;
let sequenceCount = 0;

beforeAll(async () => {
  for (const spec of SPECS) {
    sqlByTable[spec.table] = await readFile(join(INIT_DIR, spec.file), 'utf8');
    parsedByTable[spec.table] = parseTable(sqlByTable[spec.table], spec);
  }
  repoSource = await readFile(REPO_PATH, 'utf8');
  refs = parseRepoSource(repoSource);
  sequenceCount = SPECS.reduce((n, spec) => n + parseSequences(sqlByTable[spec.table]).length, 0);
});

// ============================================================================
// 1. 文件 / schema / 表存在性
// ============================================================================

describe('380–385 迁移文件与 consult schema 存在性（静态文本）', () => {
  it('六份迁移文件均可读取，且每份均声明 CREATE SCHEMA IF NOT EXISTS consult', () => {
    for (const spec of SPECS) {
      const sql = sqlByTable[spec.table];
      expect(sql.length).toBeGreaterThan(0);
      expect(sql).toMatch(/CREATE SCHEMA IF NOT EXISTS consult/i);
    }
  });

  it('六张表均以 CREATE TABLE IF NOT EXISTS consult.<表> 建表，表名与源码声明一致', () => {
    for (const spec of SPECS) {
      const sql = sqlByTable[spec.table];
      expect(sql).toMatch(
        new RegExp(`CREATE TABLE(?: IF NOT EXISTS)? consult\\.${spec.table}\\s*\\(`, 'i'),
      );
    }
  });
});

// ============================================================================
// 2. 列名与类型族双向对齐
// ============================================================================

describe('表列与类型族静态自洽', () => {
  it('预期列全部存在，主类型 token 与 DDL 一致', () => {
    for (const spec of SPECS) {
      const parsed = parsedByTable[spec.table];
      for (const [column, expectedType] of Object.entries(spec.columns)) {
        const actual = parsed.columns.get(column);
        expect(actual, `${spec.table}.${column} 缺失`).toBeDefined();
        expect(actual?.type, `${spec.table}.${column} 类型不符`).toBe(expectedType);
      }
    }
  });

  it('DDL 列清单与预期清单双向一致：无遗漏列、无预期外新增列', () => {
    for (const spec of SPECS) {
      const parsed = parsedByTable[spec.table];
      const expected = Object.keys(spec.columns).sort();
      const actual = [...parsed.columns.keys()].sort();
      expect(actual).toEqual(expected);
    }
  });
});

// ============================================================================
// 3. 索引 / 外键 / 主键 / 唯一约束 / 序列 / 触发器
// ============================================================================

describe('索引 / 外键 / 主键 / 唯一约束 / 序列 / 触发器存在性校验', () => {
  it('二级索引名称、UNIQUE 标志与列顺序与 DDL 一致', () => {
    for (const spec of SPECS) {
      const parsed = parsedByTable[spec.table];
      const actualByName = new Map(parsed.indexes.map((idx) => [idx.name, idx]));
      for (const expected of spec.indexes) {
        const actual = actualByName.get(expected.name);
        expect(actual, `${spec.table} 缺少索引 ${expected.name}`).toBeDefined();
        expect(actual?.unique, `${expected.name} 唯一性标志不符`).toBe(expected.unique);
        expect(actual?.columns, `${expected.name} 列顺序不符`).toEqual(expected.columns);
        actualByName.delete(expected.name);
      }
      expect(actualByName.size, `${spec.table} 存在预期外索引`).toBe(0);
    }
  });

  it('外键声明列、引用 schema.table(col) 与 ON DELETE 动作与 DDL 一致', () => {
    for (const spec of SPECS) {
      const parsed = parsedByTable[spec.table];
      const actualByColumn = new Map<string, FkSpec>(
        [...parsed.columns.values()].flatMap((c) =>
          c.references ? [[c.name, c.references] as [string, FkSpec]] : [],
        ),
      );
      for (const expected of spec.fks) {
        const actual = actualByColumn.get(expected.column);
        expect(actual, `${spec.table}.${expected.column} 缺少外键`).toBeDefined();
        expect(actual?.schema).toBe(expected.schema);
        expect(actual?.table).toBe(expected.table);
        expect(actual?.refColumn).toBe(expected.refColumn);
        expect(actual?.onDelete).toBe(expected.onDelete);
        actualByColumn.delete(expected.column);
      }
      expect(actualByColumn.size, `${spec.table} 存在预期外外键`).toBe(0);
    }
  });

  it('consult 内部外键目标列存在于被引用表 DDL；iam/clinical 外部目标仅校验声明文本', () => {
    for (const spec of SPECS) {
      for (const fk of spec.fks) {
        if (fk.schema !== 'consult') continue;
        const target = parsedByTable[fk.table];
        expect(target, `被引用表 consult.${fk.table} 不在本批迁移范围内`).toBeDefined();
        expect(target.columns.has(fk.refColumn), `consult.${fk.table}.${fk.refColumn} 不存在`).toBe(
          true,
        );
      }
    }
  });

  it('主键 id 在位；草稿三列唯一索引、画像 user_id 内联唯一约束在位', () => {
    for (const spec of SPECS) {
      const id = parsedByTable[spec.table].columns.get('id');
      expect(id?.primaryKey, `${spec.table}.id 未声明 PRIMARY KEY`).toBe(true);
    }
    const profile = parsedByTable.profile_memory.columns.get('user_id');
    expect(profile?.unique, 'profile_memory.user_id 缺少内联 UNIQUE').toBe(true);
    const draftUnique = parsedByTable.diagnosis_prescription_drafts.indexes.find(
      (idx) => idx.name === 'uq_consult_drafts_thread_kind_hash',
    );
    expect(draftUnique?.unique).toBe(true);
    expect(draftUnique?.columns).toEqual(['thread_id', 'kind', 'draft_hash']);
  });

  it('六份迁移 SQL 中未声明独立序列（uuid 由 gen_random_uuid() 默认值提供）', () => {
    for (const spec of SPECS) {
      expect(
        parseSequences(sqlByTable[spec.table]),
        `${spec.file} 不应声明 CREATE SEQUENCE`,
      ).toEqual([]);
    }
    expect(sequenceCount).toBe(0);
  });

  it('更新触发器在位；不可变表（messages/documents/audit_trail）无 BEFORE UPDATE 触发器', () => {
    for (const spec of SPECS) {
      expect(parsedByTable[spec.table].triggers.sort()).toEqual([...spec.triggers].sort());
    }
  });
});

// ============================================================================
// 4. 仓储 SQL / mapRow 与 DDL 双向列对齐
// ============================================================================

describe('consultAgentRepo.ts 仓储列 ↔ DDL 双向对齐', () => {
  it('mapRow 读取的每个蛇形列均存在于对应 DDL 表（仓储列 ⊆ DDL 列）', () => {
    for (const [table, columns] of Object.entries(refs.mapRow)) {
      const ddl = parsedByTable[table].columns;
      for (const column of columns) {
        expect(ddl.has(column), `mapRow ${table}.${column} 在 DDL 中不存在`).toBe(true);
      }
    }
  });

  it('INSERT 列清单每个列均存在于对应 DDL 表（仓储列 ⊆ DDL 列）', () => {
    for (const [table, columns] of Object.entries(refs.insert)) {
      const ddl = parsedByTable[table].columns;
      for (const column of columns) {
        expect(ddl.has(column), `INSERT ${table}.${column} 在 DDL 中不存在`).toBe(true);
      }
    }
  });

  it('WHERE / ORDER BY 引用列均存在于对应 DDL 表', () => {
    for (const spec of SPECS) {
      const ddl = parsedByTable[spec.table].columns;
      for (const column of refs.where[spec.table] ?? []) {
        expect(ddl.has(column), `WHERE ${spec.table}.${column} 在 DDL 中不存在`).toBe(true);
      }
      for (const column of refs.order[spec.table] ?? []) {
        expect(ddl.has(column), `ORDER BY ${spec.table}.${column} 在 DDL 中不存在`).toBe(true);
      }
    }
  });

  it('DDL 列全部被仓储 mapRow 或 INSERT 覆盖（DDL 列 ⊆ mapRow ∪ INSERT，无孤儿列）', () => {
    for (const spec of SPECS) {
      const ddlColumns = [...parsedByTable[spec.table].columns.keys()];
      const covered = new Set([
        ...(refs.mapRow[spec.table] ?? []),
        ...(refs.insert[spec.table] ?? []),
      ]);
      for (const column of ddlColumns) {
        expect(covered.has(column), `DDL 列 ${spec.table}.${column} 仓储未读取也未写入`).toBe(true);
      }
    }
  });

  it('ON CONFLICT 冲突键对应主键或唯一约束（可被 upsert 锁定）', () => {
    for (const spec of SPECS) {
      const conflict = refs.conflict[spec.table];
      if (spec.conflictKey === null) {
        expect(conflict, `${spec.table} 不应出现 ON CONFLICT`).toBeNull();
        continue;
      }
      expect(conflict).toBe(spec.conflictKey);
      if (conflict === null) continue;
      const parsed = parsedByTable[spec.table];
      const col = parsed.columns.get(conflict);
      const coveredByUniqueIndex = parsed.indexes.some(
        (idx) => idx.unique && idx.columns.includes(conflict),
      );
      const locked = col?.primaryKey === true || col?.unique === true || coveredByUniqueIndex;
      expect(locked, `${spec.table} 冲突键 ${conflict} 非主键 / 唯一约束`).toBe(true);
    }
  });

  it('仓储 SQL 仅引用 consult schema 内六张已建表，无预期外表名', () => {
    const expected = SPECS.map((s) => s.table).sort();
    expect(refs.referencedTables.sort()).toEqual(expected);
  });
});

// ============================================================================
// 5. 医疗红线 CHECK 静态在位（文本存在性，不模拟运行时拒绝分支）
// ============================================================================

describe('红线 CHECK 约束静态存在性（383 草稿三红线 + 枚举字典）', () => {
  it('草稿三红线 CHECK 锁定：需医师复核 = true、非院外处方 = false、状态 = pending_review', () => {
    const draftsSql = sqlByTable.diagnosis_prescription_drafts;
    expect(draftsSql).toMatch(
      /needs_physician_review\s+boolean[\s\S]*CHECK\s*\(\s*needs_physician_review\s*=\s*true\s*\)/i,
    );
    expect(draftsSql).toMatch(
      /is_out_of_hospital_prescription\s+boolean[\s\S]*CHECK\s*\(\s*is_out_of_hospital_prescription\s*=\s*false\s*\)/i,
    );
    expect(draftsSql).toMatch(
      /status\s+text[\s\S]*CHECK\s*\(\s*status\s*=\s*'pending_review'\s*\)/i,
    );
  });

  it('会话状态机 / 消息角色 / 意图 / 安全等级 / 审计角色枚举 CHECK 在位', () => {
    const threadsSql = sqlByTable.threads;
    for (const state of [
      'idle',
      'collecting',
      'clarifying',
      'drafting',
      'review_pending',
      'escalated',
      'closed',
      'aborted',
    ]) {
      expect(threadsSql).toContain(`'${state}'`);
    }
    const messagesSql = sqlByTable.messages;
    for (const role of ['user', 'assistant', 'tool', 'system']) {
      expect(messagesSql).toContain(`'${role}'`);
    }
    const auditSql = sqlByTable.audit_trail;
    for (const role of ['supervisor', 'examiner', 'doctor', 'pharmacist', 'system', 'user']) {
      expect(auditSql).toContain(`'${role}'`);
    }
  });
});

// ============================================================================
// 6. 静态边界声明（说明性用例）与汇总计数
// ============================================================================

describe('静态校验边界声明与计数汇总', () => {
  it('说明性用例：如实标注静态文本自洽校验边界，禁止伪造“真实建表通过”结论', () => {
    expect(STATIC_ONLY_DISCLAIMER).toContain('静态文本自洽校验');
    expect(STATIC_ONLY_DISCLAIMER).toContain('未做真实 PostgreSQL');
    expect(STATIC_ONLY_DISCLAIMER).toContain('覆盖率与运行时行为以终态实测为准');
    expect(STATIC_ONLY_DISCLAIMER).toContain('真实建表通过');
    // 边界事实：本测试只读两份文本，未 import 仓储实现、未触发 pool 连接
    expect(repoSource.length).toBeGreaterThan(0);
    expect(sqlByTable.threads.length).toBeGreaterThan(0);
  });

  it('汇总校验计数（仅供交付报告引用，不替代终态运行时实测）', () => {
    const columnCount = SPECS.reduce((n, s) => n + Object.keys(s.columns).length, 0);
    const indexCount = SPECS.reduce((n, s) => n + s.indexes.length, 0);
    const fkCount = SPECS.reduce((n, s) => n + s.fks.length, 0);
    const pkCount = SPECS.length;
    const extraUniqueCount =
      SPECS.filter((s) => s.table === 'diagnosis_prescription_drafts').length +
      (parsedByTable.profile_memory.columns.get('user_id')?.unique ? 1 : 0);
    const triggerCount = SPECS.reduce((n, s) => n + s.triggers.length, 0);
    const mapRowCount = SPECS.reduce((n, s) => n + (refs.mapRow[s.table]?.length ?? 0), 0);
    const insertCount = SPECS.reduce((n, s) => n + (refs.insert[s.table]?.length ?? 0), 0);
    const whereCount = SPECS.reduce((n, s) => n + (refs.where[s.table]?.length ?? 0), 0);
    const orderCount = SPECS.reduce((n, s) => n + (refs.order[s.table]?.length ?? 0), 0);

    expect(SPECS.length).toBe(6);
    expect(columnCount).toBe(66);
    expect(indexCount).toBe(7);
    expect(fkCount).toBe(9);
    expect(sequenceCount).toBe(0);
    expect(triggerCount).toBe(3);
    expect(pkCount).toBe(6);
    expect(extraUniqueCount).toBe(2);

    console.log('[ddlSchema 静态校验汇总]', {
      表数: SPECS.length,
      列数: columnCount,
      索引数: indexCount,
      外键数: fkCount,
      主键数: pkCount,
      唯一约束额外数: extraUniqueCount,
      序列数: sequenceCount,
      触发器数: triggerCount,
      仓储mapRow列: mapRowCount,
      仓储INSERT列: insertCount,
      仓储WHERE列: whereCount,
      仓储ORDER列: orderCount,
    });
  });
});
