/**
 * 健澜科技 jlmedaios - M151-B UI 无障碍对比度修复聚合器（纯函数）
 *
 * 【质量补齐与新场景】针对 M150-D 无障碍巡检暴露的两处对比度违规做确定性修复与复验：
 *  - 强调色 Accent：#4A90D9 on 白底对比度仅 3.34:1（< WCAG AA 4.5:1）
 *      → 收敛为更深的深海蓝 #2E6FB5（实测 5.18:1，白字反白同值 5.18:1）
 *  - 次要文字 Secondary Text：#8C8C8C on 白底对比度仅 3.36:1（< 4.5:1）
 *      → 收敛为更深的中性灰 #595959（实测 7.00:1）
 *
 * 本模块对外两个纯函数：
 *  - fixContrastIssues()：FixedPalette —— 给出「旧色 → 新色」修复映射，
 *      每个色对均带修复前/修复后实测对比度（WCAG 公式真实计算，不硬编码）；
 *  - verifyContrastCompliance()：ComplianceResult —— 对修复后的色板做合规复验，
 *      覆盖正文与按钮反白等全部使用场景，输出 pass/fail、通过率得分与字母等级。
 *
 * 设计约束（生产级）：
 *  - 纯函数：不读 DOM、不发请求、不连数据库、不依赖时间与随机数；
 *  - 同入参（含无参）多次调用结果逐字节一致，可安全高频轮询；
 *  - 对比度按 WCAG 2.x 相对亮度公式真实计算，hex 归一化（大小写 / 3 位缩写展开）；
 *  - 新色值保持深海蓝 VI 调性（#2E6FB5 为深海蓝加深，#595959 为中性灰加深），不变丑。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ *
 * 【质量补齐与新场景】VI 修复色板常量
 * ------------------------------------------------------------------ */

/** WCAG 2.x AA 正文对比度阈值（1~21） */
export const WCAG_AA_RATIO = 4.5;

/** 待修复：原强调色（对比度不足） */
export const LEGACY_ACCENT = '#4A90D9';
/** 修复后强调色（深海蓝加深，保持 VI 调性） */
export const FIXED_ACCENT = '#2E6FB5';

/** 待修复：原次要文字灰（对比度不足） */
export const LEGACY_SECONDARY_TEXT = '#8C8C8C';
/** 修复后次要文字灰（中性灰加深） */
export const FIXED_SECONDARY_TEXT = '#595959';

/** 正文承载背景（管理后台默认白底） */
export const BODY_BACKGROUND = '#FFFFFF';

/* ------------------------------------------------------------------ *
 * 类型定义
 * ------------------------------------------------------------------ */

/**
 * 单条对比度修复项：描述一个 VI 色值从违规旧色到合规新色的收敛过程。
 */
export interface PaletteFix {
  /** 用途角色：强调色 / 次要文字 */
  role: 'accent' | 'secondaryText';
  /** 人类可读用途说明 */
  label: string;
  /** 修复前（违规）色值 */
  from: string;
  /** 修复后（合规）色值 */
  to: string;
  /** 承载该文字的背景色 */
  background: string;
  /** 修复前实测对比度（两位小数） */
  beforeRatio: number;
  /** 修复后实测对比度（两位小数） */
  afterRatio: number;
  /** WCAG AA 要求阈值 */
  required: number;
  /** 修复后是否达标 */
  fixed: boolean;
  /** 修复说明 */
  note: string;
}

/**
 * fixContrastIssues() 返回体：修复后的 VI 色板。
 */
export interface FixedPalette {
  /** 适用标准名称 */
  standard: string;
  /** WCAG AA 正文对比度阈值 */
  requiredRatio: number;
  /** 逐条修复映射 */
  fixes: PaletteFix[];
  /** 是否全部修复达标 */
  allFixed: boolean;
  /** 版权归属（随报告下发，便于审计溯源） */
  copyright: string;
}

/**
 * 单条色对合规复验结果。
 */
export interface CompliancePair {
  foreground: string;
  background: string;
  /** 使用场景说明（如「强调色链接 on 白底」） */
  usage: string;
  /** 实测对比度（两位小数） */
  ratio: number;
  /** 要求阈值 */
  required: number;
  pass: boolean;
}

/**
 * verifyContrastCompliance() 返回体：修复后色板的合规复验报告。
 */
export interface ComplianceResult {
  /** 适用标准 */
  standard: string;
  /** WCAG AA 正文对比度阈值 */
  requiredRatio: number;
  /** 全部使用场景色对 */
  pairs: CompliancePair[];
  /** 达标数 */
  passCount: number;
  /** 未达标数 */
  failCount: number;
  /** 是否全场景合规 */
  compliant: boolean;
  /** 通过率得分 0~100 */
  score: number;
  /** 字母等级 */
  grade: 'A' | 'B' | 'C' | 'D';
}

/* ------------------------------------------------------------------ *
 * 内部纯工具（WCAG 对比度真实公式）
 * ------------------------------------------------------------------ */

/** hex 归一化：trim、转大写、展开 3 位缩写（#abc -> #AABBCC） */
function normalizeHex(input: string): string {
  const s = input.trim();
  if (s.startsWith('#')) {
    const body = s.slice(1).toUpperCase();
    if (body.length === 3) {
      return '#' + body.split('').map((c) => c + c).join('');
    }
    return '#' + body;
  }
  return s.toUpperCase();
}

/** hex（任意大小写 / 3 位缩写）→ 0~1 RGB */
function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const n = normalizeHex(hex).replace('#', '');
  return {
    r: parseInt(n.slice(0, 2), 16) / 255,
    g: parseInt(n.slice(2, 4), 16) / 255,
    b: parseInt(n.slice(4, 6), 16) / 255,
  };
}

/** WCAG 相对亮度 */
function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const channel = (c: number): number =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/**
 * WCAG 2.x 对比度（1~21，保留两位小数）。
 * 真实公式计算：(L浅 + 0.05) / (L深 + 0.05)。
 */
export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(hexToRgb01(foreground));
  const l2 = relativeLuminance(hexToRgb01(background));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

/* ------------------------------------------------------------------ *
 * 对外纯函数
 * ------------------------------------------------------------------ */

/**
 * 【质量补齐与新场景】修复对比度问题：返回修复后的 VI 色板 FixedPalette。
 *
 * 内置两条确定性修复映射（均为真实 WCAG 公式计算前后对比度）：
 *  1. 强调色 #4A90D9 → #2E6FB5（深海蓝加深）
 *  2. 次要文字 #8C8C8C → #595959（中性灰加深）
 *
 * 纯函数：不读 DOM / 不发请求 / 不依赖时间与随机数，重复调用结果一致。
 */
export function fixContrastIssues(): FixedPalette {
  const fixes: PaletteFix[] = ([
    {
      role: 'accent',
      label: '强调色（链接 / 主按钮文字 on 白底）',
      from: LEGACY_ACCENT,
      to: FIXED_ACCENT,
      background: BODY_BACKGROUND,
      beforeRatio: contrastRatio(LEGACY_ACCENT, BODY_BACKGROUND),
      afterRatio: contrastRatio(FIXED_ACCENT, BODY_BACKGROUND),
      required: WCAG_AA_RATIO,
      fixed: false, // 下面统一回填
      note: '强调色加深为深海蓝 #2E6FB5，保持 VI 调性不变丑',
    },
    {
      role: 'secondaryText',
      label: '次要说明文字（on 白底）',
      from: LEGACY_SECONDARY_TEXT,
      to: FIXED_SECONDARY_TEXT,
      background: BODY_BACKGROUND,
      beforeRatio: contrastRatio(LEGACY_SECONDARY_TEXT, BODY_BACKGROUND),
      afterRatio: contrastRatio(FIXED_SECONDARY_TEXT, BODY_BACKGROUND),
      required: WCAG_AA_RATIO,
      fixed: false, // 下面统一回填
      note: '次要文字灰加深为 #595959，正文可读性达 WCAG AA',
    },
  ] as PaletteFix[]).map((f) => ({ ...f, fixed: f.afterRatio >= WCAG_AA_RATIO }));

  return {
    standard: 'WCAG 2.x AA',
    requiredRatio: WCAG_AA_RATIO,
    fixes,
    allFixed: fixes.every((f) => f.fixed),
    copyright: '杭州健澜科技有限公司',
  };
}

/**
 * 得分 → 字母等级
 */
function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 95) return 'A';
  if (score >= 85) return 'B';
  if (score >= 70) return 'C';
  return 'D';
}

/**
 * 【质量补齐与新场景】验证修复后色板的 WCAG AA 合规性。
 *
 * 基于 fixContrastIssues() 的新色值，复验全部使用场景色对：
 *  - 强调色 on 白底（链接 / 文字）
 *  - 次要文字 on 白底
 *  - 白字 on 强调色按钮（反白场景）
 *  - 主文字 on 白底（基线对照，应天然达标）
 *
 * 纯函数：全部色值来自本模块常量与 fixContrastIssues()，无 IO、无随机。
 */
export function verifyContrastCompliance(): ComplianceResult {
  const palette = fixContrastIssues();

  const usage: Array<{ foreground: string; background: string; usage: string }> = [
    { foreground: FIXED_ACCENT, background: BODY_BACKGROUND, usage: '强调色链接 on 白底（修复后）' },
    {
      foreground: FIXED_SECONDARY_TEXT,
      background: BODY_BACKGROUND,
      usage: '次要说明文字 on 白底（修复后）',
    },
    { foreground: BODY_BACKGROUND, background: FIXED_ACCENT, usage: '白字 on 强调色主按钮（反白）' },
    { foreground: '#1F1F1F', background: BODY_BACKGROUND, usage: '正文主文字 on 白底（基线对照）' },
  ];

  const pairs: CompliancePair[] = usage.map((u) => {
    const ratio = contrastRatio(u.foreground, u.background);
    return {
      ...u,
      ratio,
      required: WCAG_AA_RATIO,
      pass: ratio >= WCAG_AA_RATIO,
    };
  });

  const passCount = pairs.filter((p) => p.pass).length;
  const failCount = pairs.length - passCount;
  const score = pairs.length === 0 ? 100 : Math.round((passCount / pairs.length) * 100);

  return {
    standard: 'WCAG 2.x AA',
    requiredRatio: WCAG_AA_RATIO,
    pairs,
    passCount,
    failCount,
    // 合规 = 修复色板全部达标 且 复验无任何场景 fail
    compliant: palette.allFixed && failCount === 0,
    score,
    grade: scoreToGrade(score),
  };
}
