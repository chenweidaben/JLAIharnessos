/**
 * 健澜科技杠OS - 智能体包目录加载器
 *
 * 从约定的目录结构加载智能体包，使智能体可以"文件即配置"地分发与版本管理：
 *
 *   agents/<agent-id>/
 *     agent.yaml          # 智能体定义（工作流内联）
 *     prompts/*.md        # 提示词文件（键为相对路径，如 prompts/system.md）
 *     examples/*.json     # 虚拟患者示例（仅文档/测试，不参与运行）
 *     README.md           # 智能体说明
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { parseAgent } from '../dsl/schema.js';
import { parseDslText } from '../dsl/loader.js';
import type { AgentDefinition, AgentPackage, ValidationResult } from '../dsl/types.js';
import { AgentPackManager } from './AgentPackManager.js';
import { AgentRegistry } from '../agent/AgentRegistry.js';
import type { ReferenceResolver } from '../engine/validator.js';

/** 单个智能体目录加载结果 */
export interface LoadedAgentDir {
  agentId: string;
  dir: string;
  agent: AgentDefinition;
  pkg: AgentPackage;
}

/** 递归收集指定子目录下所有文件（相对 posix 路径 → 绝对路径） */
async function collectFiles(baseDir: string, subdir: string): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const root = join(baseDir, subdir);
  async function walk(current: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(current);
    } catch {
      return; // 目录不存在视为空
    }
    for (const name of entries) {
      if (name.startsWith('.')) continue;
      const abs = join(current, name);
      const s = await stat(abs);
      if (s.isDirectory()) {
        await walk(abs);
      } else {
        const rel = relative(root, abs).split(sep).join('/');
        result.set(`${subdir}/${rel}`, abs);
      }
    }
  }
  await walk(root);
  return result;
}

/**
 * 从目录加载智能体包。
 * @param dir 智能体目录（含 agent.yaml）
 */
export async function loadAgentPackageFromDir(dir: string): Promise<LoadedAgentDir> {
  const manifestPath = join(dir, 'agent.yaml');
  const manifestText = await readFile(manifestPath, 'utf8');
  const manifest = parseDslText(manifestText, 'yaml') as AgentDefinition;
  const agent = parseAgent(manifest);

  // 读取 prompts/*.md
  const promptFiles = await collectFiles(dir, 'prompts');
  const prompts: Record<string, string> = {};
  for (const [key, abs] of promptFiles) {
    prompts[key] = await readFile(abs, 'utf8');
  }

  // 重新计算校验和，保证目录产物与标准包一致
  const pm = new AgentPackManager(new AgentRegistry());
  const pkg = pm.exportPackage(agent, { prompts });

  return { agentId: agent.id, dir, agent, pkg };
}

/** 扫描智能体根目录下全部智能体并加载 */
export async function loadAllAgentsFromDir(
  rootDir: string,
): Promise<{ loaded: LoadedAgentDir[]; errors: { dir: string; error: string }[] }> {
  const loaded: LoadedAgentDir[] = [];
  const errors: { dir: string; error: string }[] = [];
  let entries: string[];
  try {
    entries = await readdir(rootDir);
  } catch {
    return { loaded, errors };
  }
  for (const name of entries) {
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const dir = join(rootDir, name);
    try {
      const s = await stat(dir);
      if (!s.isDirectory()) continue;
      loaded.push(await loadAgentPackageFromDir(dir));
    } catch (err) {
      errors.push({ dir: name, error: err instanceof Error ? err.message : String(err) });
    }
  }
  loaded.sort((a, b) => a.agentId.localeCompare(b.agentId));
  return { loaded, errors };
}

/**
 * 加载根目录下全部智能体，校验并注册到注册中心。
 * @returns 注册结果（含每个智能体的校验结果）
 */
export async function loadAndRegisterAgents(
  rootDir: string,
  registry: AgentRegistry,
  resolver?: ReferenceResolver,
): Promise<{
  registered: string[];
  validations: Record<string, ValidationResult>;
  errors: { dir: string; error: string }[];
}> {
  const { loaded, errors } = await loadAllAgentsFromDir(rootDir);
  const pm = new AgentPackManager(registry);
  const registered: string[] = [];
  const validations: Record<string, ValidationResult> = {};

  for (const item of loaded) {
    const result = pm.importPackage(item.pkg, { resolver });
    validations[item.agentId] = { valid: result.validations.every((v) => v.valid), issues: result.validations.flatMap((v) => v.issues) };
    if (result.checksumValid && result.validations.every((v) => v.valid)) {
      registered.push(item.agentId);
    }
  }
  return { registered, validations, errors };
}
