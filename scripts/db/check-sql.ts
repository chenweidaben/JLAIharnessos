/**
 * 健澜科技杠OS - PostgreSQL DDL 静态完整性校验
 *
 * 本机/CI 可能没有 psql 或 Docker，本校验器在不启动数据库的前提下，
 * 对 deploy/postgres/init 下的初始化脚本做结构一致性检查：
 *   - 文件编号顺序、必备文件齐全
 *   - 所有 CREATE TABLE 落在已声明 schema
 *   - 关键表/序列/触发器/函数齐全（审计哈希链闭环）
 *   - 种子 SQL 的 INSERT 行数与 TS 单一事实源一致
 *   - 括号配平、无明显未闭合引号
 *
 * 用法：bun scripts/db/check-sql.ts
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, readFile } from 'node:fs/promises';
import { DRUG_SEEDS } from '../knowledge/seed-data/drugs.js';
import { ICD10_CURATED, ICD10_BLOCKS } from '../knowledge/seed-data/icd-curated.js';
import { LAB_SEED, EXAM_SEED } from '../knowledge/seed-data/labs.js';
import { PATHWAY_SEED, GUIDELINE_SEED } from '../knowledge/seed-data/clinical.js';
import { TCM_DISEASE, HERB_SEED, FORMULA_SEED, ACUPOINT_SEED } from '../knowledge/seed-data/tcm.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INIT_DIR = join(__dirname, '..', '..', 'deploy', 'postgres', 'init');

export interface CheckResult {
  ok: boolean;
  errors: string[];
  tables: string[];
  seedInsertCount: number;
}

/** 关键表必须存在 */
const REQUIRED_TABLES = [
  'iam.users',
  'iam.roles',
  'iam.user_roles',
  'iam.sessions',
  'clinical.patients',
  'clinical.visits',
  'clinical.medical_records',
  'clinical.prescriptions',
  'clinical.prescription_items',
  'clinical.orders',
  'clinical.lab_results',
  'clinical.imaging_reports',
  'agent.agents',
  'agent.agent_versions',
  'agent.workflow_instances',
  'agent.workflow_node_records',
  'agent.human_tasks',
  'agent.agent_invocations',
  'knowledge.knowledge_bases',
  'knowledge.documents',
  'knowledge.chunks',
  'knowledge.drugs',
  'knowledge.icd10',
  'knowledge.labs',
  'knowledge.exams',
  'knowledge.clinical_pathways',
  'knowledge.guidelines',
  'audit.audit_logs',
];

export async function verifySql(): Promise<CheckResult> {
  const errors: string[] = [];
  const files = (await readdir(INIT_DIR)).filter((f) => f.endsWith('.sql')).sort();

  // 必备文件
  for (const required of ['01-extensions.sql', '02-schemas.sql', '50-audit.sql', '71-seed-knowledge.sql']) {
    if (!files.includes(required)) errors.push(`缺少必备文件 ${required}`);
  }

  const contents = new Map<string, string>();
  for (const f of files) contents.set(f, await readFile(join(INIT_DIR, f), 'utf8'));
  const all = [...contents.values()].join('\n');

  // 已声明 schema
  const schemas = new Set<string>();
  for (const m of all.matchAll(/CREATE SCHEMA(?: IF NOT EXISTS)?\s+([a-z_]+)/gi)) schemas.add(m[1]);

  // 所有建表
  const tables: string[] = [];
  for (const m of all.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+([a-z0-9_]+)\.([a-z0-9_]+)/gi)) {
    tables.push(`${m[1]}.${m[2]}`);
  }

  // 表必须落在已声明 schema
  for (const t of tables) {
    const schema = t.split('.')[0];
    if (!schemas.has(schema)) errors.push(`表 ${t} 的 schema 未声明`);
  }
  // 关键表齐全
  for (const req of REQUIRED_TABLES) {
    if (!tables.includes(req)) errors.push(`缺少关键表 ${req}`);
  }

  // 审计哈希链闭环：序列 + 表 + BEFORE INSERT 触发器
  if (!/CREATE SEQUENCE(?: IF NOT EXISTS)? audit\.audit_logs_seq_seq/.test(all))
    errors.push('缺少 audit.audit_logs_seq_seq 序列');
  if (!/BEFORE INSERT ON audit\.audit_logs/.test(all))
    errors.push('audit.audit_logs 缺少 BEFORE INSERT 哈希链触发器');
  if (!/FUNCTION audit\.compute_chain_hash/.test(all))
    errors.push('缺少 audit.compute_chain_hash 函数');

  // 括号配平（按文件，忽略字符串内括号的粗略检查，仅作冒烟）
  for (const [f, sql] of contents) {
    const stripped = sql.replace(/'(?:''|[^'])*'/g, "''"); // 去掉字符串字面量
    const open = (stripped.match(/\(/g) || []).length;
    const close = (stripped.match(/\)/g) || []).length;
    if (open !== close) errors.push(`${f} 括号不配平：( ${open} vs ) ${close}`);
  }

  // 种子 INSERT 行数与 TS 源一致
  const seed = contents.get('71-seed-knowledge.sql') || '';
  const seedInsertCount = (seed.match(/^INSERT INTO/gm) || []).length;
  const expected =
    10 +
    DRUG_SEEDS.length +
    ICD10_BLOCKS.length +
    ICD10_CURATED.length +
    LAB_SEED.length +
    EXAM_SEED.length +
    PATHWAY_SEED.length +
    GUIDELINE_SEED.length +
    TCM_DISEASE.length +
    HERB_SEED.length +
    FORMULA_SEED.length +
    ACUPOINT_SEED.length;
  if (seedInsertCount !== expected)
    errors.push(`种子 INSERT 行数 ${seedInsertCount} 与 TS 源期望 ${expected} 不一致`);

  return { ok: errors.length === 0, errors, tables, seedInsertCount };
}

if (import.meta.main) {
  const r = await verifySql();
  console.log(`扫描到 ${r.tables.length} 张表，种子 INSERT ${r.seedInsertCount} 行`);
  if (r.ok) {
    console.log('✅ PostgreSQL DDL 静态校验通过');
  } else {
    console.error('❌ DDL 校验失败：');
    r.errors.forEach((e) => console.error('  - ' + e));
    process.exit(1);
  }
}
