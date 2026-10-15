/**
 * 健澜科技 jlmedaios - M125-B 演示数据一键初始化脚本
 *
 * 「演示就绪」：运行 `bun run seed:demo` 即可在本地 / 演示环境生成完整、自洽的
 * 院内演示数据集，并落盘为 data/demo-data.json，供前端联调、BFF 演示与截图使用。
 *
 * 用法：
 *   bun run seed:demo            # 使用默认种子（结果可复现）
 *   bun run seed:demo --seed=42  # 指定随机种子
 *
 * 不触碰数据库、WebSocket 与任何外部服务；纯本地文件 IO。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  generateDemoData,
  COUNT_DEPARTMENTS,
  COUNT_DOCTORS,
  COUNT_NURSES,
  COUNT_PHARMACISTS,
  COUNT_ADMINS,
  COUNT_PATIENTS,
  COUNT_VISITS,
  COUNT_PRESCRIPTIONS,
  COUNT_ADMISSIONS,
  COUNT_STAFF_MEMORIES,
  COUNT_PATIENT_FEEDBACKS,
} from '../src/bff/aggregators/demoDataGenerator';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'data', 'demo-data.json');

/** 解析 --seed=xx 参数 */
function parseSeed(): number {
  const arg = process.argv.find((a) => a.startsWith('--seed='));
  if (!arg) return undefined as unknown as number;
  const v = Number(arg.split('=')[1]);
  return Number.isFinite(v) ? Math.floor(v) : (undefined as unknown as number);
}

async function main(): Promise<void> {
  const seed = parseSeed();
  const data = seed === undefined ? generateDemoData() : generateDemoData(seed);

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(data), 'utf8');

  const total =
    data.departments.length +
    data.doctors.length +
    data.nurses.length +
    data.pharmacists.length +
    data.admins.length +
    data.patients.length +
    data.visits.length +
    data.prescriptions.length +
    data.admissions.length +
    data.staffDecisionMemories.length +
    data.patientFeedbacks.length;

  console.log('✅ 演示数据已生成（演示就绪）');
  console.log(`  科室:            ${data.departments.length}/${COUNT_DEPARTMENTS}`);
  console.log(`  医生:            ${data.doctors.length}/${COUNT_DOCTORS}`);
  console.log(`  护士:            ${data.nurses.length}/${COUNT_NURSES}`);
  console.log(`  药师:            ${data.pharmacists.length}/${COUNT_PHARMACISTS}`);
  console.log(`  管理员:          ${data.admins.length}/${COUNT_ADMINS}`);
  console.log(`  患者:            ${data.patients.length}/${COUNT_PATIENTS}`);
  console.log(`  就诊记录:        ${data.visits.length}/${COUNT_VISITS}`);
  console.log(`  处方:            ${data.prescriptions.length}/${COUNT_PRESCRIPTIONS}`);
  console.log(`  住院记录:        ${data.admissions.length}/${COUNT_ADMISSIONS}`);
  console.log(`  员工经验记忆:    ${data.staffDecisionMemories.length}/${COUNT_STAFF_MEMORIES}`);
  console.log(`  患者反馈:        ${data.patientFeedbacks.length}/${COUNT_PATIENT_FEEDBACKS}`);
  console.log(`  合计实体数:      ${total}`);
  console.log(`  输出文件:        ${OUT}`);
}

main().catch((err) => {
  console.error('❌ 演示数据生成失败:', err);
  process.exit(1);
});
