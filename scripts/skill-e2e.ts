/**
 * 健澜科技数智医院智能体操作系统（jlmedaios）
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * 技能真实端到端验证（E2E）：
 *  - AI 病历生成：用真实 invoker + 真实 DeepSeek，输入主诉/现病史，产出结构化病历草稿；
 *  - 语音电子病历：ASR 文本接口（Mock 文本）走真实 invoker；
 *  - AI 病历质控：走真实 invoker。
 * 结果落 artifacts/skill-e2e.log。
 *
 * 运行：bun run scripts/skill-e2e.ts
 * 凭证仅从 process.env（.env）读取，不硬编码。
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { loadSkillsFromDir } from '../src/skills/index';
import { buildRealSkillInvokers } from '../src/skills/integration/realInvoker';
import { executeSkill } from '../src/skills/executor';
import type { LoadedSkill, SkillRunResult } from '../src/skills/index';

const LOG = join(process.cwd(), 'artifacts', 'skill-e2e.log');

function line(s: string): void {
  const out = `[${new Date().toISOString()}] ${s}\n`;
  process.stdout.write(out);
  appendFileSync(LOG, out, 'utf8');
}

/** 自动确认（E2E 环境：三级确认全部自动通过，不人工干预） */
const autoConfirm = {
  async requestUserConfirm(msg: string) {
    line(`  · 自动确认：${msg}`);
    return true;
  },
  async requestDoubleConfirm(msg: string) {
    line(`  · 自动双签复核：${msg}`);
    return true;
  },
};

function summarizeResult(r: SkillRunResult): string {
  const lines: string[] = [];
  lines.push(`  状态: ${r.status}`);
  if (r.reason) lines.push(`  原因: ${r.reason}`);
  lines.push(
    `  步骤: ${r.steps.map((s) => `${s.stepId}(${s.status})`).join(' -> ')}`,
  );
  // 提取 LLM 用量
  for (const [id, out] of Object.entries(r.outputs)) {
    if (out && typeof out === 'object' && 'text' in out) {
      const o = out as { text?: string; usage?: { input: number; output: number } };
      if (o.usage) {
        lines.push(`  LLM[${id}] 用量: input=${o.usage.input} output=${o.usage.output}`);
      }
      if (o.text) {
        const snippet = o.text.slice(0, 300).replace(/\s+/g, ' ');
        lines.push(`  LLM[${id}] 产出摘要: ${snippet}${o.text.length > 300 ? '...' : ''}`);
      }
    }
  }
  return lines.join('\n');
}

async function runSkill(
  skill: LoadedSkill,
  inputs: Record<string, unknown>,
): Promise<SkillRunResult> {
  const invokers = buildRealSkillInvokers({
    userId: 'u_e2e',
    userName: 'E2E医师',
    department: '呼吸内科',
    patientId: (inputs.patientId as string) ?? null,
  });
  return executeSkill(skill, {
    user: { userId: 'u_e2e', userName: 'E2E医师', roles: ['R02', 'R03', 'R04', 'R05', 'R06', 'R08', 'R10'] },
    tenantId: 'tenant-main',
    inputs,
    invokers,
    confirm: autoConfirm,
    audit: (e) => line(`  审计: ${e.action} -> ${e.result}`),
  });
}

async function main(): Promise<void> {
  mkdirSync(join(process.cwd(), 'artifacts'), { recursive: true });
  // 清空日志
  appendFileSync(LOG, `==== jlmedaios 技能 E2E 开始 ${new Date().toISOString()} ====\n`, 'utf8');

  const { loaded, errors, dependencyIssues } = await loadSkillsFromDir(
    join(process.cwd(), 'skills', 'library'),
    null,
  );
  line(`加载内置技能: ${loaded.length} 个, 错误 ${errors.length}, 依赖问题 ${dependencyIssues.length}`);
  if (errors.length) {
    for (const e of errors) line(`  加载错误: ${e.filePath} - ${e.message}`);
  }

  const byId = new Map(loaded.map((s) => [s.manifest.id, s]));

  // 1) AI 病历生成（真实 DeepSeek）
  const note = byId.get('ai-outpatient-record');
  if (note) {
    line('\n=== [1/3] AI 门诊病历生成（真实 DeepSeek）===');
    const r = await runSkill(note, {
      patientId: 'P2026090001',
      chiefComplaint: '反复咳嗽、咳痰伴发热3天',
      presentIllness:
        '患者3天前受凉后出现咳嗽，咳黄脓痰，伴发热，最高体温38.9℃，自服感冒药效果不佳。无胸痛咯血，无呼吸困难。既往无慢性病病史。',
    });
    line(summarizeResult(r));
  } else {
    line('未找到 ai-outpatient-record 技能');
  }

  // 2) 语音电子病历（ASR 文本接口 Mock）
  const voice = byId.get('voice-medical-record');
  if (voice) {
    line('\n=== [2/3] 语音电子病历（ASR 文本接口）===');
    const r = await runSkill(voice, {
      patientId: 'P2026090001',
      asrText: '患者，男，四十五岁，咳嗽三天，体温三十八度九，开阿莫西林零点五克每日三次，吃七天。',
      drugName: '阿莫西林',
    });
    line(summarizeResult(r));
  } else {
    line('未找到 voice-medical-record 技能');
  }

  // 3) AI 病历质控（dry）
  const qc = byId.get('medical-record-quality-control');
  if (qc) {
    line('\n=== [3/3] AI 病历内涵质控 ===');
    const r = await runSkill(qc, {
    department: '呼吸内科',
    startDate: '2026-08',
    endDate: '2026-09',
    frontPageData: {
      patientId: 'P2026090001',
      mainDiagnosis: '社区获得性肺炎',
      secondaryDiagnoses: ['急性支气管炎'],
      dischargeDisposition: '正常出院',
      totalCost: 8520.5,
    },
  });
    line(summarizeResult(r));
  } else {
    line('未找到 medical-record-quality-control 技能');
  }

  line(`\n==== E2E 结束 ${new Date().toISOString()} ====\n`);
}

main().catch((e) => {
  line(`E2E 异常: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
  process.exit(1);
});
