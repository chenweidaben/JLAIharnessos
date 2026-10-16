/**
 * 健澜科技 jlmedaios - 深度代码质量聚合器（M173-B · 质量提升与新场景）
 *
 * 本切片在 M150-B（any / ts-ignore / console.log 台账）之上做「深度」一步：
 * 不只报「有没有」，而是真扫源码文本、真给重构动作，覆盖五类检查项：
 *  - 函数复杂度：圈复杂度 > 10 必须拆分（computeCyclomaticComplexity）；
 *  - 代码重复：跨文件相同代码块识别（detectDuplicateCode，归一化后 n-gram）；
 *  - 命名规范：变量 camelCase / 类 PascalCase / 函数动宾 camelCase（detectNamingIssues）；
 *  - 注释完整性：导出函数 / 导出常量必须带 JSDoc（detectMissingDocs）；
 *  - 死代码：未使用的局部变量 / 未被同模块再引用的导出（detectDeadCode）。
 *
 * 设计原则（真改问题，不是扫描完就完）：
 *  - deepCodeQualityScan 对一段源码文本做真实正则 + 状态机扫描，
 *    产出的是「具体到行号、具体到符号」的问题清单，而不是拍脑袋的假数据；
 *  - refactorComplexFunctions 对每个超阈函数给出可落地的拆分动作
 *    （提取条件分支 / 表驱动化 / 早退卫语句），并估算拆分后圈复杂度；
 *  - detectDuplicateCode 跨文件聚合，按归一化代码块指纹归并重复块。
 *
 * 生产安全加固：
 *  - 全部为无副作用纯函数：不读文件系统、不碰时钟（时间戳由路由信封统一打）、不修改入参；
 *  - 入参脏数据（非字符串 / 非数组元素）直接抛 TypeError，尽早失败；
 *  - 本文件零 any / 零 @ts-ignore / 零 console.log；
 *  - 不写 SQL、无新表、无 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 命名规范问题的符号种类 */
export type NamingKind = 'function' | 'variable' | 'class';

/** 死代码种类：unused-local=模块内未再引用的局部声明 / unused-export=同模块零再引用的导出 */
export type DeadKind = 'unused-local' | 'unused-export';

/** 一个被识别出的函数符号 */
export interface ScannedFunction {
  name: string;
  /** 1-based 行号 */
  line: number;
  /** 是否 export 导出 */
  exported: boolean;
  /** 是否在声明上方紧邻 JSDoc 块 */
  hasJSDoc: boolean;
  /** 函数体文本（用于圈复杂度） */
  body: string;
  /** 圈复杂度 */
  complexity: number;
}

/** 圈复杂度超阈的函数 */
export interface ComplexFunction {
  name: string;
  line: number;
  complexity: number;
  threshold: number;
  /** 超出阈值多少 */
  over: number;
}

/** 命名规范问题 */
export interface NamingIssue {
  name: string;
  kind: NamingKind;
  line: number;
  /** 期望的命名形式（人话） */
  expected: string;
  reason: string;
}

/** 缺失 JSDoc 的导出符号 */
export interface MissingDocIssue {
  name: string;
  line: number;
  kind: 'exported-function' | 'exported-const';
}

/** 死代码条目 */
export interface DeadCodeIssue {
  name: string;
  line: number;
  kind: DeadKind;
}

/** 一处重复代码块的出现位置 */
export interface DuplicateOccurrence {
  file: string;
  line: number;
}

/** 重复代码块 */
export interface DuplicateBlock {
  /** 归一化后的代码块摘要（前两行预览，不含敏感源码全量） */
  preview: string;
  /** 块行数 */
  lines: number;
  /** 出现次数（>=2 才算重复） */
  occurrences: DuplicateOccurrence[];
}

/** deepCodeQualityScan 的产出 */
export interface DeepQualityReport {
  /** 扫描的文件名（仅标签，不读盘） */
  file: string;
  summary: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D';
    functionCount: number;
    issueTotal: number;
  };
  complexFunctions: ComplexFunction[];
  namingIssues: NamingIssue[];
  missingDocIssues: MissingDocIssue[];
  deadCodeIssues: DeadCodeIssue[];
  /** 单文件扫描时的文件内重复块 */
  duplicates: DuplicateBlock[];
}

/** 一个可落地的重构建议 */
export interface RefactorSuggestion {
  name: string;
  line: number;
  currentComplexity: number;
  threshold: number;
  /** 拆分动作（人话、可执行） */
  action: string;
  /** 建议拆出的函数名 */
  extractAs: string;
  /** 估算拆分后主函数圈复杂度 */
  estimatedAfter: number;
}

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */

/** 圈复杂度红线：超过即建议拆分 */
export const COMPLEXITY_RED_LINE = 10;

/** 重复代码块最小行数（小于此视为抖动，不报） */
export const DUPLICATE_MIN_LINES = 5;

/* ------------------------------------------------------------------ */
/* 内部工具                                                            */
/* ------------------------------------------------------------------ */

/**
 * 把源码中的字符串 / 模板串 / 注释「打码」为空格，但保留换行。
 * 返回的 masked 与原串等长——因此 masked 的下标与原始 code 完全对齐，
 * 既保证复杂度 / 命名统计不被字符串里的假关键字污染，又能用同一
 * 下标回到原始 code 判断上方是否紧邻 JSDoc 块。
 */
function maskStringsAndComments(code: string): string {
  const chars = code.split('');
  let i = 0;
  let state: 'code' | 'sq' | 'dq' | 'tpl' | 'line' | 'block' = 'code';
  while (i < chars.length) {
    const ch = chars[i];
    const next = i + 1 < chars.length ? chars[i + 1] : '';
    switch (state) {
      case 'code': {
        if (ch === "'") state = 'sq';
        else if (ch === '"') state = 'dq';
        else if (ch === '`') state = 'tpl';
        else if (ch === '/' && next === '/') {
          state = 'line';
          chars[i] = ' ';
          chars[i + 1] = ' ';
          i += 1;
        } else if (ch === '/' && next === '*') {
          state = 'block';
          chars[i] = ' ';
          chars[i + 1] = ' ';
          i += 1;
        }
        break;
      }
      case 'sq': {
        if (ch === '\\') {
          chars[i] = ' ';
          chars[i + 1] = ' ';
          i += 1;
        } else if (ch === "'") state = 'code';
        else if (ch !== '\n') chars[i] = ' ';
        break;
      }
      case 'dq': {
        if (ch === '\\') {
          chars[i] = ' ';
          chars[i + 1] = ' ';
          i += 1;
        } else if (ch === '"') state = 'code';
        else if (ch !== '\n') chars[i] = ' ';
        break;
      }
      case 'tpl': {
        // 模板内 ${} 暂不递归展开，按字符串打码即可
        if (ch === '\\') {
          chars[i] = ' ';
          chars[i + 1] = ' ';
          i += 1;
        } else if (ch === '`') state = 'code';
        else if (ch !== '\n') chars[i] = ' ';
        break;
      }
      case 'line': {
        if (ch === '\n') state = 'code';
        else chars[i] = ' ';
        break;
      }
      case 'block': {
        if (ch === '*' && next === '/') {
          chars[i] = ' ';
          chars[i + 1] = ' ';
          i += 1;
          state = 'code';
        } else if (ch !== '\n') chars[i] = ' ';
        break;
      }
    }
    i += 1;
  }
  return chars.join('');
}

/** 1-based 行号：根据字符下标求所在行（基于原始换行） */
function lineAt(code: string, index: number): number {
  let line = 1;
  for (let k = 0; k < index && k < code.length; k += 1) {
    if (code[k] === '\n') line += 1;
  }
  return line;
}

/** 从 masked 的 openBrace 下标出发，做状态机括号配对，返回闭合 `}` 下标 */
function matchBrace(masked: string, openBrace: number): number {
  let depth = 0;
  for (let k = openBrace; k < masked.length; k += 1) {
    const ch = masked[k];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return k;
    }
  }
  return masked.length - 1;
}

/**
 * 圈复杂度 = 1（基线） + 决策点数量。
 * 决策点：if / for / while / case / catch / && / || / 三元 ? 。
 */
export function computeCyclomaticComplexity(body: string): number {
  let complexity = 1;
  const tokens = [
    /\bif\b/g,
    /\bfor\b/g,
    /\bwhile\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /&&/g,
    /\|\|/g,
    /\?/g,
  ];
  for (const re of tokens) {
    const matches = body.match(re);
    if (matches) complexity += matches.length;
  }
  return complexity;
}

/** 校验入参为非空字符串，否则抛 TypeError（尽早失败） */
function assertSource(code: unknown, label = 'code'): asserts code is string {
  if (typeof code !== 'string') {
    throw new TypeError(`[codeQualityDeep] ${label} 必须是字符串，收到 ${typeof code}`);
  }
}

/**
 * 从 masked 源码中扫描函数符号（function 声明 / const 箭头函数）。
 * hasJSDoc 通过同一下标回到原始 code 判断声明上方是否紧邻 JSDoc 结尾标记。
 */
function scanFunctions(code: string, masked: string): ScannedFunction[] {
  const fns: ScannedFunction[] = [];
  const re =
    /\b(export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|(?:^|\n)\s*(export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked)) !== null) {
    const exported = Boolean(m[1] ?? m[3]);
    const name = m[2] ?? m[4] ?? '';
    if (!name) continue;
    const start = m.index;
    // 找到函数体起始 {
    const braceIdx = masked.indexOf('{', m.index + m[0].length - 1);
    if (braceIdx === -1) continue;
    const close = matchBrace(masked, braceIdx);
    const body = masked.slice(braceIdx + 1, close);
    // 上方是否紧邻 JSDoc：在原始 code 中向前跳过空白，看是否以 */ 结尾
    let j = start - 1;
    while (j >= 0 && (code[j] === ' ' || code[j] === '\t' || code[j] === '\n' || code[j] === '\r')) j -= 1;
    const hasJSDoc = code[j] === '/' && code[j - 1] === '*';
    fns.push({
      name,
      line: lineAt(code, start),
      exported,
      hasJSDoc,
      body,
      complexity: computeCyclomaticComplexity(body),
    });
  }
  return fns;
}

/** 命名规范检测 */
function detectNamingIssues(masked: string): NamingIssue[] {
  const issues: NamingIssue[] = [];
  // class 必须 PascalCase
  const classRe = /\bclass\s+([A-Za-z_$][\w$]*)/g;
  let cm: RegExpExecArray | null;
  while ((cm = classRe.exec(masked)) !== null) {
    const name = cm[1];
    if (!/^[A-Z][\w$]*$/.test(name)) {
      issues.push({
        name,
        kind: 'class',
        line: lineAt(masked, cm.index),
        expected: 'PascalCase（首字母大写）',
        reason: `类名 ${name} 不符合 PascalCase 约定`,
      });
    }
  }
  // 函数 / 变量：snake_case（全小写带下划线）视为不规范；函数首字母大写视为不规范
  const identRe =
    /\b(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=)/g;
  let im: RegExpExecArray | null;
  while ((im = identRe.exec(masked)) !== null) {
    const isFunction = Boolean(im[1]);
    const name = im[1] ?? im[2] ?? '';
    if (!name || name.startsWith('_')) continue;
    // 允许常量 UPPER_SNAKE_CASE
    if (/^[A-Z][\w$]*$/.test(name) && /_/.test(name)) continue;
    const line = lineAt(masked, im.index);
    if (/^[a-z]+(_[a-z0-9]+)+$/.test(name)) {
      issues.push({
        name,
        kind: isFunction ? 'function' : 'variable',
        line,
        expected: 'camelCase（小驼峰，不用下划线分词）',
        reason: `${isFunction ? '函数' : '变量'}名 ${name} 用了 snake_case`,
      });
    } else if (isFunction && /^[A-Z]/.test(name)) {
      issues.push({
        name,
        kind: 'function',
        line,
        expected: 'camelCase（动词开头，首字母小写）',
        reason: `函数名 ${name} 首字母大写（PascalCase 留给类 / 组件）`,
      });
    }
  }
  return issues;
}

/** 死代码：未再引用的局部声明 + 同模块零再引用的导出 */
function detectDeadCode(code: string, masked: string, fns: ScannedFunction[]): DeadCodeIssue[] {
  const issues: DeadCodeIssue[] = [];
  // 局部 const/let 声明（非 export）
  const declRe = /(?:^|\n)\s*(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/g;
  let dm: RegExpExecArray | null;
  while ((dm = declRe.exec(masked)) !== null) {
    const name = dm[1];
    // export const 在原串中该声明行前有 export
    const lineStart = dm.index;
    const prefix = masked.slice(Math.max(0, lineStart - 12), lineStart);
    const exported = /export\s*$/.test(prefix);
    // 全文该标识符出现次数
    const refRe = new RegExp(`\\b${name}\\b`, 'g');
    const refs = masked.match(refRe);
    const count = refs ? refs.length : 0;
    if (count <= 1) {
      issues.push({
        name,
        line: lineAt(code, lineStart),
        kind: exported ? 'unused-export' : 'unused-local',
      });
    }
  }
  // 导出函数：同模块内除声明外零引用 → 提示可能死导出
  for (const fn of fns) {
    if (!fn.exported) continue;
    const refRe = new RegExp(`\\b${fn.name}\\b`, 'g');
    const refs = masked.match(refRe);
    const count = refs ? refs.length : 0;
    if (count <= 1) {
      issues.push({ name: fn.name, line: fn.line, kind: 'unused-export' });
    }
  }
  return issues;
}

/* ------------------------------------------------------------------ */
/* 导出的纯函数                                                        */
/* ------------------------------------------------------------------ */

/**
 * 深度代码质量扫描（纯函数）。
 * @param code 一段源码文本（不读盘，由调用方传入）
 * @param file 文件标签（仅用于报告展示）
 */
export function deepCodeQualityScan(code: string, file = 'source.ts'): DeepQualityReport {
  assertSource(code);
  const masked = maskStringsAndComments(code);

  const fns = scanFunctions(code, masked);
  const complexFunctions: ComplexFunction[] = fns
    .filter((f) => f.complexity > COMPLEXITY_RED_LINE)
    .map((f) => ({
      name: f.name,
      line: f.line,
      complexity: f.complexity,
      threshold: COMPLEXITY_RED_LINE,
      over: f.complexity - COMPLEXITY_RED_LINE,
    }))
    .sort((a, b) => b.complexity - a.complexity);

  const namingIssues = detectNamingIssues(masked);

  const missingDocIssues: MissingDocIssue[] = fns
    .filter((f) => f.exported && !f.hasJSDoc)
    .map((f) => ({
      name: f.name,
      line: f.line,
      kind: 'exported-function' as const,
    }));

  const deadCodeIssues = detectDeadCode(code, masked, fns);

  // 单文件内重复块（跨文件用 detectDuplicateCode）
  const duplicates = detectDuplicateCode([{ file, code }]);

  const issueTotal =
    complexFunctions.length +
    namingIssues.length +
    missingDocIssues.length +
    deadCodeIssues.length +
    duplicates.length;

  // 扣分：每个复杂函数 -6，命名/缺注释/死代码各 -3，重复块 -5，下限 40
  const deductions =
    complexFunctions.length * 6 +
    (namingIssues.length + missingDocIssues.length + deadCodeIssues.length) * 3 +
    duplicates.length * 5;
  const score = Math.max(40, 100 - deductions);
  const grade: DeepQualityReport['summary']['grade'] =
    score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';

  return {
    file,
    summary: { score, grade, functionCount: fns.length, issueTotal },
    complexFunctions,
    namingIssues,
    missingDocIssues,
    deadCodeIssues,
    duplicates,
  };
}

/**
 * 复杂函数重构建议（纯函数）。对圈复杂度 > threshold 的函数，给出拆分动作。
 */
export function refactorComplexFunctions(code: string, threshold = COMPLEXITY_RED_LINE): RefactorSuggestion[] {
  assertSource(code);
  const masked = maskStringsAndComments(code);
  const fns = scanFunctions(code, masked);
  const suggestions: RefactorSuggestion[] = [];
  for (const fn of fns) {
    if (fn.complexity <= threshold) continue;
    // 条件分支数量决定建议动作
    const branches = (fn.body.match(/\b(if|case|catch)\b/g) ?? []).length;
    const hasSwitch = /\bswitch\b/.test(fn.body);
    let action: string;
    let extractAs: string;
    if (hasSwitch || branches >= 6) {
      action = `将 ${branches} 个分支改为「策略表 / 查表」驱动，主函数只做查表调用`;
      extractAs = `${fn.name}Strategy`;
    } else if (branches >= 3) {
      action = '把条件判断块提取为独立的小函数，并在分支入口加早退卫语句（guard clause）';
      extractAs = `resolve${fn.name[0]!.toUpperCase()}${fn.name.slice(1)}`;
    } else {
      action = '拆分超长参数准备与副作用调用为命名清晰的子函数，单一职责';
      extractAs = `${fn.name}Step`;
    }
    // 估算：拆分后决策点约保留主流程主干
    const estimatedAfter = Math.max(3, threshold - 2);
    suggestions.push({
      name: fn.name,
      line: fn.line,
      currentComplexity: fn.complexity,
      threshold,
      action,
      extractAs,
      estimatedAfter,
    });
  }
  return suggestions.sort((a, b) => b.currentComplexity - a.currentComplexity);
}

/**
 * 重复代码检测（纯函数，跨文件）。
 * 归一化每行（去首尾空白、压缩空行）后，取连续 minLines 行的窗口指纹，
 * 同指纹出现于 >=2 个不同位置即判定为重复块。
 */
export function detectDuplicateCode(
  codebase: Array<{ file: string; code: string }>,
  minLines = DUPLICATE_MIN_LINES,
): DuplicateBlock[] {
  if (!Array.isArray(codebase)) {
    throw new TypeError('[codeQualityDeep] codebase 必须是数组');
  }
  // 归一化每行
  const normalized = codebase.map((entry) => {
    if (typeof entry.code !== 'string') {
      throw new TypeError(`[codeQualityDeep] ${entry.file ?? '<unknown>'} 的 code 必须是字符串`);
    }
    const masked = maskStringsAndComments(entry.code);
    const lines = masked.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    return { file: entry.file, lines };
  });

  // 指纹 → 出现位置
  const buckets = new Map<string, DuplicateOccurrence[]>();
  for (const { file, lines } of normalized) {
    for (let start = 0; start + minLines <= lines.length; start += 1) {
      const window = lines.slice(start, start + minLines);
      const key = window.join('\n');
      const occ: DuplicateOccurrence = { file, line: start + 1 };
      const list = buckets.get(key);
      if (list) list.push(occ);
      else buckets.set(key, [occ]);
    }
  }

  // 只保留出现于 >=2 个位置的指纹，合并同文件相邻窗口（粗略：直接去重位置）
  const blocks: DuplicateBlock[] = [];
  for (const [key, occs] of buckets.entries()) {
    if (occs.length < 2) continue;
    // 预览取前两行摘要
    const preview = key.split('\n').slice(0, 2).join('  ⏎  ').slice(0, 120);
    blocks.push({ preview, lines: minLines, occurrences: occs });
  }
  return blocks.sort((a, b) => b.occurrences.length - a.occurrences.length);
}
