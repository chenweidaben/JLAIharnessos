/**
 * 健澜科技数智医院智能体操作系统（jlmedaios）- 技能包加载器
 *
 * 职责：
 *  1. 扫描 skills/library/ 目录下的 SKILL.md 文件
 *  2. 解析 YAML frontmatter（首个 --- 与第二个 --- 之间）+ Markdown 正文
 *  3. 用 SkillManifestSchema 做 Zod 校验
 *  4. 依赖校验：requiredTools / requiredAgents 必须在给定目录中真实存在
 *
 * 设计原则：
 *  - 纯函数式、可在 Bun 与 Node 下运行；不读取环境变量、不联网
 *  - 单个技能解析失败不影响其它技能；错误以结构化对象返回，绝不 throw 中断加载
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 */

import { parse as parseYaml } from 'yaml';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

import {
  SkillManifestSchema,
  type LoadedSkill,
  type SkillDependencyCatalog,
  type SkillDependencyIssue,
  type SkillManifest,
} from './types';

/** 单个技能解析错误（结构化条目） */
export interface SkillParseErrorItem {
  /** 来源文件相对/绝对路径 */
  filePath: string;
  /** 错误摘要 */
  message: string;
  /** Zod 问题明细（如有） */
  issues?: string[];
}

/** 目录加载结果 */
export interface SkillLoadResult {
  /** 加载并校验通过的技能 */
  loaded: LoadedSkill[];
  /** 解析/校验失败的文件 */
  errors: SkillParseErrorItem[];
  /** 依赖缺失问题（requiredTools/requiredAgents 不存在） */
  dependencyIssues: SkillDependencyIssue[];
}

/** 解析错误类（继承 Error，附带 issues） */
export class SkillParseError extends Error {
  issues?: string[];
  constructor(public filePath: string, message: string) {
    super(message);
    this.name = 'SkillParseError';
    Object.setPrototypeOf(this, SkillParseError.prototype);
  }
}

/**
 * 解析单份 SKILL.md 文本。
 * frontmatter 规则：文件以 `---` 开头，到下一行 `---` 之间为 YAML。
 */
export function parseSkillMarkdown(
  raw: string,
  filePath = 'SKILL.md',
): { manifest: SkillManifest; body: string } {
  // 去掉可能的 BOM
  const text = raw.replace(/^﻿/, '');
  if (!text.startsWith('---')) {
    throw new SkillParseError(
      filePath,
      'SKILL.md 必须以 frontmatter 分隔线（---）开头',
    );
  }
  // 找到第二个 ---（行首）
  const rest = text.slice(3);
  const closeIdx = rest.search(/^---\s*$/m);
  if (closeIdx === -1) {
    throw new SkillParseError(filePath, 'frontmatter 缺少结束分隔线（---）');
  }
  const frontmatterText = rest.slice(0, closeIdx);
  const body = rest.slice(closeIdx + 3).replace(/^\s*\n/, '');

  let parsed: unknown;
  try {
    parsed = parseYaml(frontmatterText);
  } catch (err) {
    throw new SkillParseError(
      filePath,
      `frontmatter 不是合法 YAML：${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SkillParseError(filePath, 'frontmatter 必须是一个 YAML 映射（对象）');
  }

  const result = SkillManifestSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map(
      (i) => `${i.path.join('.') || '(root)'}: ${i.message}`,
    );
    const e = new SkillParseError(filePath, `技能清单校验失败：${issues.join('；')}`);
    e.issues = issues;
    throw e;
  }
  return { manifest: result.data, body };
}

/**
 * 递归收集技能 Markdown 文件绝对路径（跳过隐藏目录）。
 * 兼容两种布局：
 *   - 扁平：skills/library/<role>/<skill-id>.md
 *   - 标准：skills/library/<role>/<skill-id>/SKILL.md
 * 统一收集 *.md，排除 README.md / INDEX.md。
 */
async function collectSkillFiles(rootDir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name.startsWith('.') || name.startsWith('_')) continue;
      const abs = join(dir, name);
      let s;
      try {
        s = await stat(abs);
      } catch {
        continue;
      }
      if (s.isDirectory()) {
        await walk(abs);
      } else if (name.endsWith('.md') && name !== 'README.md' && name !== 'INDEX.md') {
        out.push(abs);
      }
    }
  }
  await walk(rootDir);
  return out;
}

/**
 * 对一组已加载技能做依赖校验。
 * @returns 缺失依赖问题列表（为空表示全部依赖可解析）
 */
export function validateSkillDependencies(
  skills: LoadedSkill[],
  catalog: SkillDependencyCatalog,
): SkillDependencyIssue[] {
  const issues: SkillDependencyIssue[] = [];
  for (const skill of skills) {
    for (const tool of skill.manifest.requiredTools) {
      if (!catalog.tools.has(tool)) {
        issues.push({ skillId: skill.manifest.id, kind: 'missing_tool', name: tool });
      }
    }
    for (const agent of skill.manifest.requiredAgents) {
      if (!catalog.agents.has(agent)) {
        issues.push({ skillId: skill.manifest.id, kind: 'missing_agent', name: agent });
      }
    }
  }
  return issues;
}

/**
 * 从目录加载全部技能。
 *
 * @param rootDir 技能库根目录（如 <proj>/skills/library）
 * @param catalog 依赖目录（真实存在的工具名 / 智能体 id 集合）。
 *                传 null 则跳过依赖校验（仅做清单解析与结构校验）。
 */
export async function loadSkillsFromDir(
  rootDir: string,
  catalog: SkillDependencyCatalog | null,
): Promise<SkillLoadResult> {
  const result: SkillLoadResult = { loaded: [], errors: [], dependencyIssues: [] };
  const files = await collectSkillFiles(rootDir);

  for (const file of files) {
    const rel = relative(rootDir, file).split(sep).join('/');
    let raw: string;
    try {
      raw = await readFile(file, 'utf8');
    } catch (err) {
      result.errors.push({
        filePath: rel,
        message: `读取失败：${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }
    try {
      const { manifest, body } = parseSkillMarkdown(raw, rel);
      result.loaded.push({ manifest, body, filePath: file });
    } catch (err) {
      if (err instanceof SkillParseError) {
        result.errors.push({ filePath: rel, message: err.message, issues: err.issues });
      } else {
        result.errors.push({
          filePath: rel,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  result.loaded.sort((a, b) => a.manifest.id.localeCompare(b.manifest.id));

  if (catalog) {
    result.dependencyIssues = validateSkillDependencies(result.loaded, catalog);
  }
  return result;
}

/** 从单份文件加载（便于单元测试与试运行 API） */
export async function loadSkillFromFile(
  filePath: string,
  catalog?: SkillDependencyCatalog,
): Promise<{
  loaded?: LoadedSkill;
  errors: SkillParseErrorItem[];
  dependencyIssues: SkillDependencyIssue[];
}> {
  const raw = await readFile(filePath, 'utf8');
  try {
    const { manifest, body } = parseSkillMarkdown(raw, filePath);
    const loaded: LoadedSkill = { manifest, body, filePath };
    const dependencyIssues = catalog
      ? validateSkillDependencies([loaded], catalog)
      : [];
    return { loaded, errors: [], dependencyIssues };
  } catch (err) {
    if (err instanceof SkillParseError) {
      return { errors: [{ filePath, message: err.message, issues: err.issues }], dependencyIssues: [] };
    }
    return {
      errors: [{ filePath, message: err instanceof Error ? err.message : String(err) }],
      dependencyIssues: [],
    };
  }
}
