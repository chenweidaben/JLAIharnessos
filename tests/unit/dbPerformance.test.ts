/**
 * 健澜科技 jlmedaios - 数据库性能聚合器纯函数单测（M145-A · 生产化收尾）
 *
 * 覆盖：
 *  - 索引创建：291-performance-indexes.sql 含 4 条核心表新索引 + COMMENT，
 *    notifications 不重复加索引；
 *  - 慢查询识别：analyzeSlowQueries() 目录完整、按严重度 + 耗时降序；
 *  - 建议生成：suggestIndex() 产出索引名 / DDL / 写入影响评估，脏输入抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

import {
  analyzeSlowQueries,
  recommendCoreIndexes,
  suggestIndex,
} from '../../src/bff/aggregators/dbPerformanceAggregator';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_FILE = join(
  __dirname,
  '..',
  '..',
  'deploy',
  'postgres',
  'init',
  '291-performance-indexes.sql',
);

/* ------------------------------------------------------------------ */
/* 1. 索引创建（291 迁移脚本静态校验）                                  */
/* ------------------------------------------------------------------ */

describe('291-performance-indexes.sql 索引创建', () => {
  it('包含 4 条核心表新索引（IF NOT EXISTS 幂等）', async () => {
    const sql = await readFile(SQL_FILE, 'utf8');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_patients_hospital_created');
    expect(sql).toContain('ON clinical.patients (hospital_id, created_at DESC)');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_visits_patient_status_admit');
    expect(sql).toContain('ON clinical.visits (patient_id, status, admit_at DESC)');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_rx_visit_status_created');
    expect(sql).toContain('ON clinical.prescriptions (visit_id, status, created_at DESC)');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_records_visit_created');
    expect(sql).toContain('ON clinical.medical_records (visit_id, created_at DESC)');
  });

  it('每条索引都附 COMMENT 说明加索引理由与写入路径影响', async () => {
    const sql = await readFile(SQL_FILE, 'utf8');
    const commentCount = (sql.match(/COMMENT ON INDEX/g) ?? []).length;
    expect(commentCount).toBe(4);
    // 每条 COMMENT 都点明「不影响」既有写入热路径
    expect(sql).toMatch(/不影响.*写入/);
  });

  it('notifications 不重复加索引（263 已覆盖，控制写放大）', async () => {
    const sql = await readFile(SQL_FILE, 'utf8');
    // 不应在 notifications 表上新建任何索引
    expect(sql).not.toMatch(/CREATE INDEX[^;]*ON clinical\.notifications/);
    expect(sql).toContain('notifications');
  });

  it('版权与「生产化收尾」标注齐全', async () => {
    const sql = await readFile(SQL_FILE, 'utf8');
    expect(sql).toContain('杭州健澜科技有限公司');
    expect(sql).toContain('生产化收尾');
  });
});

/* ------------------------------------------------------------------ */
/* 2. 慢查询识别                                                        */
/* ------------------------------------------------------------------ */

describe('analyzeSlowQueries 慢查询识别', () => {
  it('返回 5 条核心表慢查询模式副本', () => {
    const rows = analyzeSlowQueries();
    expect(rows).toHaveLength(5);
    const tables = rows.map((r) => r.table).sort();
    expect(tables).toEqual(
      [
        'clinical.medical_records',
        'clinical.notifications',
        'clinical.patients',
        'clinical.prescriptions',
        'clinical.visits',
      ].sort(),
    );
  });

  it('按严重度 high > medium > low 排序，同级按耗时降序', () => {
    const rows = analyzeSlowQueries();
    const order = rows.map((r) => r.severity);
    expect(order).toEqual(['high', 'high', 'high', 'medium', 'low']);
    // 三条 high 之间按 avgMs 降序
    const highs = rows.filter((r) => r.severity === 'high');
    for (let i = 1; i < highs.length; i += 1) {
      expect(highs[i - 1].avgMs).toBeGreaterThanOrEqual(highs[i].avgMs);
    }
  });

  it('notifications 条目 fixIndex 为 none（已覆盖，不再加索引）', () => {
    const nt = analyzeSlowQueries().find((r) => r.table === 'clinical.notifications');
    expect(nt?.fixIndex).toBe('none');
    expect(nt?.severity).toBe('low');
  });

  it('返回的是副本，外部修改不影响下次调用', () => {
    const first = analyzeSlowQueries();
    first.push({ id: 'x', table: 'x', pattern: 'x', description: 'x', avgMs: 1, callsPerDay: 1, fixIndex: 'x', severity: 'low' });
    expect(analyzeSlowQueries()).toHaveLength(5);
  });
});

/* ------------------------------------------------------------------ */
/* 3. 索引建议生成                                                      */
/* ------------------------------------------------------------------ */

describe('suggestIndex 建议生成', () => {
  it('生成索引名 / DDL / 写入影响评估', () => {
    const s = suggestIndex('clinical.visits', ['patient_id', 'status', 'admit_at'], 'eq_range');
    expect(s.indexName).toBe('idx_visits_patient_id_status_admit_at');
    expect(s.ddl).toBe(
      'CREATE INDEX IF NOT EXISTS idx_visits_patient_id_status_admit_at ON clinical.visits (patient_id, status, admit_at);',
    );
    expect(s.riskLevel).toBe('low');
    expect(s.rationale).toContain('等值过滤');
    expect(s.writeImpact).toContain('不影响');
  });

  it('表名缺省 schema 时补 clinical. 前缀', () => {
    const s = suggestIndex('prescriptions', ['visit_id', 'status'], 'eq');
    expect(s.table).toBe('clinical.prescriptions');
    expect(s.indexName).toBe('idx_prescriptions_visit_id_status');
  });

  it('partial + notifications 表追加 WHERE read_at IS NULL', () => {
    const s = suggestIndex('clinical.notifications', ['staff_id', 'created_at'], 'partial');
    expect(s.ddl).toContain('WHERE read_at IS NULL');
  });

  it('与 291 迁移对齐的 4 条推荐索引全部为低风险窄列 btree', () => {
    const recs = recommendCoreIndexes();
    expect(recs).toHaveLength(4);
    for (const r of recs) {
      expect(r.riskLevel).toBe('low');
      expect(r.ddl).toContain('CREATE INDEX IF NOT EXISTS');
    }
    expect(recs.map((r) => r.table)).toEqual([
      'clinical.patients',
      'clinical.visits',
      'clinical.prescriptions',
      'clinical.medical_records',
    ]);
  });

  it('脏输入抛 TypeError（空表名 / 空列数组 / 空串列）', () => {
    expect(() => suggestIndex('' as unknown as string, ['a'], 'eq')).toThrow();
    expect(() => suggestIndex('clinical.visits', [], 'eq')).toThrow();
    expect(() => suggestIndex('clinical.visits', ['a', '  '], 'eq')).toThrow();
  });
});
