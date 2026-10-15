/**
 * 健澜科技 jlmedaios - M132-A 部署文档单测（产品化收尾）
 *
 * 三类断言：
 *  - 文档完整性：docs/DEPLOYMENT_GUIDE.md 必须覆盖环境要求/数据库初始化/.env 配置/
 *    启动命令/Nginx 反代/HTTPS/FAQ 全部章节，并带版权声明；
 *  - 配置项覆盖：REQUIRED_ENV_KEYS 中的每个键，必须同时出现在部署指南与 .env.example，
 *    防止「代码要配、文档没写」或「文档写了、样例没有」；
 *  - 命令正确性：检查清单中的命令必须落在 VERIFIED_COMMANDS 白名单内，
 *    且白名单每条命令必须在部署指南正文中逐字出现，杜绝文档命令跑不起来。
 *
 * 全部为纯文件读取 + 字符串断言，不依赖数据库与网络。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'bun:test';

import {
  DEPLOYMENT_DOC_PATH,
  ENV_EXAMPLE_PATH,
  REQUIRED_ENV_KEYS,
  VERIFIED_COMMANDS,
  generateDeploymentChecklist,
} from '../../src/bff/aggregators/deploymentDocAggregator';

/** 从仓库根读取文本文件（测试运行 cwd 即仓库根） */
function readRepoFile(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), 'utf8');
}

const doc = readRepoFile(DEPLOYMENT_DOC_PATH);
const envExample = readRepoFile(ENV_EXAMPLE_PATH);
const checklist = generateDeploymentChecklist();

describe('M132-A 部署文档：文档完整性', () => {
  it('文档存在且包含全部要求章节', () => {
    // 任务书要求覆盖的七个主题词，任一缺失即视为文档不完整
    const requiredTopics = [
      '环境要求',
      '数据库初始化',
      '.env',
      '启动',
      'Nginx',
      'HTTPS',
      'FAQ',
    ];
    for (const topic of requiredTopics) {
      expect(doc).toContain(topic);
    }
  });

  it('环境要求明确 Node / Bun / PostgreSQL 版本线', () => {
    expect(doc).toContain('Bun');
    expect(doc).toContain('PostgreSQL');
    expect(doc).toMatch(/Node\.?js|Node/);
    // 版本硬约束可被运维核对
    expect(doc).toContain('1.3.0');
    expect(doc).toContain('16');
  });

  it('包含版权声明「杭州健澜科技有限公司」', () => {
    expect(doc).toContain('杭州健澜科技有限公司');
  });

  it('检查清单覆盖全部 8 个部署阶段，id 唯一', () => {
    const ids = checklist.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const categories = new Set(checklist.map((c) => c.category));
    expect(categories.size).toBe(8);
    // 必做项构成最短可上线路径
    const requiredItems = checklist.filter((c) => c.required);
    expect(requiredItems.length).toBeGreaterThanOrEqual(10);
  });
});

describe('M132-A 部署文档：配置项覆盖', () => {
  it('REQUIRED_ENV_KEYS 每个键都在部署指南中说明', () => {
    for (const key of REQUIRED_ENV_KEYS) {
      expect(doc).toContain(key);
    }
  });

  it('REQUIRED_ENV_KEYS 每个键都在 .env.example 中定义', () => {
    for (const key of REQUIRED_ENV_KEYS) {
      expect(envExample).toContain(key);
    }
  });

  it('生产安全红线项被显式强调', () => {
    // 脱敏与 Prompt 防护在生产必须为 true；演示模式必须关闭
    expect(doc).toMatch(/ENABLE_DESENSITIZATION.*true/i);
    expect(doc).toMatch(/ENABLE_PROMPT_GUARD.*true/i);
    expect(doc).toContain('DEMO_MODE');
  });
});

describe('M132-A 部署文档：命令正确性', () => {
  it('清单中的命令全部来自 VERIFIED_COMMANDS 白名单', () => {
    const commandsInChecklist = [...new Set(checklist.map((c) => c.command).filter(Boolean))];
    for (const cmd of commandsInChecklist) {
      expect(VERIFIED_COMMANDS).toContain(cmd);
    }
  });

  it('白名单命令每条都在部署指南正文中逐字出现', () => {
    for (const cmd of VERIFIED_COMMANDS) {
      expect(doc).toContain(cmd);
    }
  });

  it('构建-启动链路命令齐备：install -> typecheck -> build -> 产物启动', () => {
    expect(doc).toContain('bun install');
    expect(doc).toContain('bun run typecheck');
    expect(doc).toContain('bun run build');
    expect(doc).toContain('bun dist/server.js');
  });

  it('反向代理与 HTTPS 运维命令齐备：nginx -t / reload / certbot', () => {
    expect(doc).toContain('nginx -t');
    expect(doc).toContain('nginx -s reload');
    expect(doc).toContain('certbot --nginx');
  });

  it('上线验证包含存活与就绪双探针', () => {
    expect(doc).toContain('curl -f http://127.0.0.1:8080/health');
    expect(doc).toContain('curl -f http://127.0.0.1:8080/ready');
  });
});
