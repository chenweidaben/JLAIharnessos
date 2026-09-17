/**
 * 健澜科技杠OS - PostgreSQL DDL 与知识种子回归测试
 *
 * 本机无 psql/Docker 时也能运行：对初始化 SQL 做结构完整性校验，
 * 并校验种子数据质量（非空、危急值区间合理、编码格式）。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import { describe, it, expect } from 'bun:test';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { verifySql } from '../../../scripts/db/check-sql.js';
import { LAB_SEED } from '../../../scripts/knowledge/seed-data/labs.js';
import { ICD10_CURATED } from '../../../scripts/knowledge/seed-data/icd-curated.js';
import { DRUG_SEEDS } from '../../../scripts/knowledge/seed-data/drugs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INIT_DIR = join(__dirname, '..', '..', '..', 'deploy', 'postgres', 'init');

describe('PostgreSQL DDL 静态完整性', () => {
  it('表/序列/触发器/种子全部齐全且自洽', async () => {
    const r = await verifySql();
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.tables.length).toBeGreaterThanOrEqual(28);
    expect(r.seedInsertCount).toBeGreaterThan(2000);
  });

  it('五个分层 schema 均已声明', async () => {
    const schema = await readFile(join(INIT_DIR, '02-schemas.sql'), 'utf8');
    for (const s of ['iam', 'clinical', 'agent', 'knowledge', 'audit']) {
      expect(schema).toContain(`CREATE SCHEMA IF NOT EXISTS ${s}`);
    }
  });

  it('postgresql.conf 开启 WAL 归档与 SCRAM 认证', async () => {
    const conf = await readFile(join(INIT_DIR, '..', 'postgresql.conf'), 'utf8');
    expect(conf).toMatch(/archive_mode\s*=\s*on/);
    expect(conf).toMatch(/archive_command/);
    expect(conf).toMatch(/scram-sha-256/);
  });
});

describe('知识种子数据质量', () => {
  it('检验项目危急值区间合理（危急低 ≤ 参考低 ≤ 参考高 ≤ 危急高）', () => {
    for (const [name, , , , , lo, hi, clo, chi] of LAB_SEED) {
      expect(lo <= hi).toBe(true);
      if (clo !== '' && chi !== '') {
        expect(clo <= lo).toBe(true);
        expect(hi <= chi).toBe(true);
      }
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('ICD-10 编码格式合法且名称非空', () => {
    for (const item of ICD10_CURATED) {
      const [code, name] = item.split('|');
      expect(code.trim()).toMatch(/^[A-Z]\d/);
      expect((name || '').trim().length).toBeGreaterThan(0);
    }
  });

  it('药品通用名非空且分类存在', () => {
    expect(DRUG_SEEDS.length).toBeGreaterThan(400);
    for (const d of DRUG_SEEDS) {
      expect(d.n.trim().length).toBeGreaterThan(0);
      expect(d.c.trim().length).toBeGreaterThan(0);
    }
  });
});
