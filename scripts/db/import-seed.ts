/**
 * 健澜科技杠OS - 权威开放医疗知识库种子导入
 *
 * 从 scripts/knowledge/seed-data/*.ts（单一事实源）生成幂等 SQL：
 *   deploy/postgres/init/71-seed-knowledge.sql
 *
 * - Docker 首次初始化时由 docker-entrypoint-initdb.d 自动执行；
 * - 也可手动对已有库执行：psql -f deploy/postgres/init/71-seed-knowledge.sql
 *
 * 这样知识种子只在 TS 中维护一份，避免 SQL 与 TS 双份维护漂移。
 *
 * 用法：bun scripts/db/import-seed.ts
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { DRUG_SEEDS } from '../knowledge/seed-data/drugs.js';
import { ICD10_CURATED, ICD10_BLOCKS } from '../knowledge/seed-data/icd-curated.js';
import { LAB_SEED, EXAM_SEED } from '../knowledge/seed-data/labs.js';
import { PATHWAY_SEED, GUIDELINE_SEED } from '../knowledge/seed-data/clinical.js';
import { TCM_DISEASE, HERB_SEED, FORMULA_SEED, ACUPOINT_SEED } from '../knowledge/seed-data/tcm.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const OUT = join(ROOT, 'deploy', 'postgres', 'init', '71-seed-knowledge.sql');

/** SQL 字符串字面量转义 */
function q(v: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}
/** 数字/空（'' 视为 NULL） */
function n(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return 'NULL';
  return String(v);
}
/** jsonb 数组 */
function jb(arr: string[] | undefined): string {
  if (!arr || arr.length === 0) return "'[]'";
  return q(JSON.stringify(arr));
}

/** 智能体引用的逻辑知识库（开箱即用，与各 agent.yaml 的 knowledgeBases 对齐） */
const KNOWLEDGE_BASES: Array<[string, string, string, string, string]> = [
  ['clinical-guidelines', '临床指南库', '权威临床指南与专家共识', 'guideline', '中华医学会等'],
  ['medical-record-standards', '病历书写规范库', '病历书写基本规范与病案质控标准', 'standard', '国家卫健委'],
  ['drug-instructions', '药品说明书库', '药品说明书、用药禁忌与黑框警示', 'drug', 'NMPA/CDE'],
  ['lab-reference', '检验参考库', '检验项目参考区间与危急值（LOINC）', 'standard', 'LOINC'],
  ['icd-coding', 'ICD 编码库', 'ICD-10 疾病编码与名称', 'standard', '国家医保版/临ICD'],
  ['drg-dip', 'DRG/DIP 分组库', 'DRG/DIP 分组规则与 OpenDRG', 'standard', 'CHS-DRG/OpenDRG'],
  ['follow-up-protocols', '随访方案库', '分病种随访路径与随访问卷模板', 'guideline', '临床路径'],
  ['triage-departments', '科室与分诊库', '科室职能、分诊规则与预检分级', 'general', '院内维护'],
  ['differential-diagnosis', '鉴别诊断库', '症状-鉴别诊断知识', 'textbook', '医学教材'],
  ['management-standards', '管理与质控标准库', '等级评审、核心制度与运营指标口径', 'standard', '国家卫健委'],
];

const lines: string[] = [];
const counts: Record<string, number> = {};

lines.push(
  '-- 健澜科技杠OS - 权威开放医疗知识库种子（由 scripts/db/import-seed.ts 生成，请勿手改）',
  '-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.',
  'BEGIN;',
  '',
);

// ---- 知识库 ----
lines.push('-- 逻辑知识库');
for (const [id, name, desc, level, source] of KNOWLEDGE_BASES) {
  lines.push(
    `INSERT INTO knowledge.knowledge_bases(id,name,description,authority_level,source,license,version) VALUES ` +
      `(${q(id)},${q(name)},${q(desc)},${q(level)},${q(source)},${q('CC/开放使用，见 DATA_LICENSES.md')},${q('1.0.0')}) ` +
      `ON CONFLICT (id) DO NOTHING;`,
  );
}
counts.knowledge_bases = KNOWLEDGE_BASES.length;
lines.push('');

// ---- 药品 ----
lines.push('-- 药品');
for (const d of DRUG_SEEDS) {
  lines.push(
    `INSERT INTO knowledge.drugs(generic_name,drug_class,dosage_forms,caution,is_rx) VALUES ` +
      `(${q(d.n)},${q(d.c)},${jb(d.f)},${q(d.caution ?? null)},${d.rx === false ? 'false' : 'true'}) ` +
      `ON CONFLICT (generic_name) DO NOTHING;`,
  );
}
counts.drugs = DRUG_SEEDS.length;
lines.push('');

// ---- ICD 类目块 ----
lines.push('-- ICD-10 类目块');
for (const [s, e, name] of ICD10_BLOCKS) {
  lines.push(
    `INSERT INTO knowledge.icd_blocks(range_start,range_end,name) VALUES (${q(s)},${q(e)},${q(name)});`,
  );
}
counts.icd_blocks = ICD10_BLOCKS.length;

// ---- ICD-10 编码（code|name；按类目块回填 block_start）----
lines.push('-- ICD-10 编码');
const inBlock = (code: string): string | null => {
  const prefix = code.replace(/\..*$/, '').slice(0, 3).toUpperCase();
  for (const [s, e] of ICD10_BLOCKS) {
    if (prefix >= s && prefix <= e) return s;
  }
  return null;
};
for (const item of ICD10_CURATED) {
  const bar = item.indexOf('|');
  const code = bar >= 0 ? item.slice(0, bar).trim() : item.trim();
  const name = bar >= 0 ? item.slice(bar + 1).trim() : '';
  lines.push(
    `INSERT INTO knowledge.icd10(code,name,block_start,is_curated) VALUES (${q(code)},${q(name)},${q(inBlock(code))},true) ` +
      `ON CONFLICT (code) DO NOTHING;`,
  );
}
counts.icd10 = ICD10_CURATED.length;
lines.push('');

// ---- 检验项目 ----
lines.push('-- 检验项目');
for (const [name, abbr, loinc, specimen, unit, lo, hi, clo, chi, remark] of LAB_SEED) {
  lines.push(
    `INSERT INTO knowledge.labs(item_name,abbreviation,loinc_code,specimen,unit,ref_low,ref_high,critical_low,critical_high,remark) VALUES ` +
      `(${q(name)},${q(abbr)},${q(loinc)},${q(specimen)},${q(unit)},${n(lo)},${n(hi)},${n(clo)},${n(chi)},${q(remark ?? null)});`,
  );
}
counts.labs = LAB_SEED.length;

// ---- 检查项目 ----
lines.push('-- 检查项目');
for (const [name, cat, abbr, ind, prep] of EXAM_SEED) {
  lines.push(
    `INSERT INTO knowledge.exams(exam_name,category,abbreviation,indications,preparation) VALUES ` +
      `(${q(name)},${q(cat)},${q(abbr)},${q(ind)},${q(prep)});`,
  );
}
counts.exams = EXAM_SEED.length;
lines.push('');

// ---- 临床路径 ----
lines.push('-- 临床路径');
for (const [disease, icd, los, tx, stages, discharge, variation] of PATHWAY_SEED) {
  lines.push(
    `INSERT INTO knowledge.clinical_pathways(disease,icd_code,standard_los,treatment,stages,discharge_criteria,variation_sources) VALUES ` +
      `(${q(disease)},${q(icd)},${n(los)},${q(tx)},${q(stages)},${q(discharge)},${q(variation)});`,
  );
}
counts.pathways = PATHWAY_SEED.length;

// ---- 临床指南 ----
lines.push('-- 临床指南');
for (const [title, publisher, kp, ev, disease] of GUIDELINE_SEED) {
  lines.push(
    `INSERT INTO knowledge.guidelines(title,publisher,key_points,evidence,related_disease) VALUES ` +
      `(${q(title)},${q(publisher)},${q(kp)},${q(ev)},${q(disease)});`,
  );
}
counts.guidelines = GUIDELINE_SEED.length;
lines.push('');

// ---- 中医 ----
lines.push('-- 中医病种');
for (const [disease, cat, west, syn] of TCM_DISEASE) {
  lines.push(
    `INSERT INTO knowledge.tcm_diseases(disease,category,western_ref,syndromes) VALUES (${q(disease)},${q(cat)},${q(west)},${q(syn)});`,
  );
}
counts.tcm_diseases = TCM_DISEASE.length;
lines.push('-- 中药材');
for (const [name, nature, flavor, meridian, effects, dosage, caution] of HERB_SEED) {
  lines.push(
    `INSERT INTO knowledge.tcm_herbs(herb_name,nature,flavor,meridian,effects,dosage,caution) VALUES ` +
      `(${q(name)},${q(nature)},${q(flavor)},${q(meridian)},${q(effects)},${q(dosage)},${q(caution)});`,
  );
}
counts.tcm_herbs = HERB_SEED.length;
lines.push('-- 中医方剂');
for (const [name, source, comp, effects, ind, caution] of FORMULA_SEED) {
  lines.push(
    `INSERT INTO knowledge.tcm_formulas(formula_name,source,composition,effects,indications,caution) VALUES ` +
      `(${q(name)},${q(source)},${q(comp)},${q(effects)},${q(ind)},${q(caution)});`,
  );
}
counts.tcm_formulas = FORMULA_SEED.length;
lines.push('-- 针灸穴位');
for (const [name, meridian, loc, ind] of ACUPOINT_SEED) {
  lines.push(
    `INSERT INTO knowledge.tcm_acupoints(acupoint,meridian,location,indications) VALUES (${q(name)},${q(meridian)},${q(loc)},${q(ind)});`,
  );
}
counts.tcm_acupoints = ACUPOINT_SEED.length;

lines.push('') ;
lines.push('COMMIT;');
lines.push('');

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, lines.join('\n'), 'utf8');

const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log('已生成', OUT);
console.log('行数统计：');
for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(20)} ${v}`);
console.log(`  ${'合计'.padEnd(20)} ${total}`);
