/**
 * 健澜科技数智医院智能体操作系统（jlmedaios）
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * DeepSeek 真实端到端验证脚本（一次性）
 *
 * 用 bun 自动加载的 .env（process.env）构造门诊问诊/CDS 场景的 LLMRequestParams，
 * 经 DeepSeekProvider.streamChat 真实调用一次，把流式输出与 usage 打印到 stdout，
 * 并把响应落一份日志到 artifacts/deepseek-e2e.log。
 *
 * 安全：绝不打印 API Key；key 仅来自 process.env。
 *
 * 运行：bun run scripts/deepseek-e2e.ts
 */

import { mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

import { DeepSeekProvider } from '../src/core/agent/providers/DeepSeekProvider';

const LOG_DIR = join(process.cwd(), 'artifacts');
const LOG_FILE = join(LOG_DIR, 'deepseek-e2e.log');

function log(line: string): void {
  console.log(line);
  mkdirSync(LOG_DIR, { recursive: true });
  appendFileSync(LOG_FILE, line + '\n', 'utf8');
}

async function main(): Promise<void> {
  // 强制走 deepseek 路径，便于本脚本直连验证
  const provider = new DeepSeekProvider({
    apiKey: process.env.LLM_API_KEY,
    baseURL: process.env.LLM_BASE_URL,
    chatModel: process.env.LLM_MODEL,
    reasoningModel: process.env.LLM_REASONING_MODEL,
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS) || 60_000,
  });

  const model = provider.getModel('sonnet');
  log('=== jlmedaios DeepSeek E2E ===');
  log(`模型(sonnet->) : ${model.model}`);
  log(`baseURL        : ${process.env.LLM_BASE_URL ?? 'https://api.deepseek.com/v1'}`);
  log(`apiKey 状态    : ${process.env.LLM_API_KEY ? '已从环境变量加载(已脱敏)' : '缺失'}`);
  log('--- 流式输出开始 ---');

  const params = {
    system:
      '你是健澜科技数智医院智能体的门诊健康助手。请用简洁、严谨、面向患者的中文回答，' +
      '不给出具体处方，仅作健康科普与就诊建议。',
    messages: [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: '医生您好，我最近体检发现空腹血糖 7.2mmol/L，请问可能是什么原因？需要进一步做哪些检查？',
          },
        ],
      },
    ],
    tools: [],
    maxTokens: 400,
    temperature: 0.2,
  };

  const t0 = Date.now();
  let full = '';
  let lastUsage = { input: 0, output: 0 };
  try {
    for await (const ev of provider.streamChat(params, 'sonnet')) {
      if (ev.type === 'text_delta') {
        process.stdout.write(ev.text);
        full += ev.text;
      } else if (ev.type === 'message_stop') {
        process.stdout.write('\n');
        lastUsage = ev.usage;
      }
    }
    // generator 完全结束后再读累计（确保 streamChat 聚合已执行）
    const cum = provider.getCumulativeUsage();
    log('--- 流式输出结束 ---');
    log(`stopReason     : end_turn/stop`);
    log(`usage(input/out): ${lastUsage.input} / ${lastUsage.output}`);
    log(`累计 usage     : ${cum.input} / ${cum.output}`);
    log(`耗时           : ${Date.now() - t0} ms`);
    log('--- 完整回复 ---');
    log(full);
  } catch (err) {
    log('--- E2E 失败 ---');
    log(String(err instanceof Error ? err.stack ?? err.message : err));
    process.exitCode = 1;
  }
}

void main();
