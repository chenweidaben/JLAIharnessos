/**
 * 健澜科技数智医院智能体 - RADAR 集成层内置数据与降级逻辑
 *
 * 数据来源：项目根 `.radar-contract.json`（由 vendor/damo-radar 的
 * RADAR_infer_results_demo.csv 表头解析生成），保证 BFF 降级数值与
 * Python 推理服务 demo 模式**同源**，绝不臆造字段。
 *
 * 契约：docs/RADAR_FUSION_CONTRACT.md §1/§2/§3.3/§3.6
 *  - 18 器官（中文 key，顺序固定）
 *  - 146 临床发现（key / organ_zh / name_zh / name_en / probability / positive / tier）
 *  - positive = probability >= positive_threshold（默认 0.5，可配 RADAR_POSITIVE_THRESHOLD）
 *  - tier：critical（内置 curated 集合）/ major（positive 且 prob>=0.6）/ minor（其余 positive）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/** 18 器官中文 key，顺序固定（契约 §1） */
export const RADAR_ORGAN_ORDER = [
  '主动脉',
  '十二指肠',
  '大肠',
  '小肠',
  '心脏',
  '肋骨',
  '肝',
  '肺',
  '肾',
  '肾上腺',
  '胃',
  '胆囊',
  '胰腺',
  '脾',
  '膀胱',
  '门静脉',
  '食管',
  '骶骨',
] as const;

/** positive 判定阈值（可被环境变量覆盖） */
export function radarPositiveThreshold(): number {
  const v = Number(process.env.RADAR_POSITIVE_THRESHOLD);
  return Number.isFinite(v) && v > 0 ? v : 0.5;
}

/** 模型标识（契约 §3.6，不得改名） */
export const RADAR_MODEL = 'damo-radar';
export const RADAR_MODEL_VERSION = 'eaec6129';
export const RADAR_DISCLAIMER =
  '本结果由 DAMO-RADAR AI 模型辅助生成，仅作第二阅片参考，最终诊断须由放射科医师复核签名。';

/**
 * critical 发现 key 集合（契约 §2 curated 集合）。
 * 覆盖：恶性肿瘤 / 急重症 / 各器官转移瘤 / 主动脉夹层 / 阑尾炎 / 脾梗死 /
 *       肠穿孔 / 肠套叠 / 门静脉栓塞。
 */
export const RADAR_CRITICAL_KEYS: ReadonlySet<string> = new Set([
  '主动脉_主动脉夹层',
  '肝_肝细胞癌',
  '肝_胆管癌',
  '胆囊_胆囊癌',
  '胆囊_胆管癌',
  '胰腺_肿瘤或胰腺癌',
  '胃_胃癌',
  '大肠_结肠癌',
  '大肠_直肠癌',
  '小肠_淋巴瘤',
  '肾_肾细胞癌（透明细胞癌）',
  '肾_肾盂癌',
  '膀胱_膀胱癌',
  '脾_脾脏淋巴瘤',
  '脾_梗死',
  '肺_肺占位',
  '肺_转移瘤',
  '肝_转移瘤',
  '肾上腺_转移瘤',
  '肋骨_转移瘤（乳腺癌 骨转移）',
  '大肠_阑尾炎',
  '大肠_肠穿孔',
  '大肠_肠套叠',
  '门静脉_栓塞',
]);

/* ------------------------------------------------------------------ */
/* 类型（严格对齐契约，不得增删字段名）                                   */
/* ------------------------------------------------------------------ */

export interface RadarFindingDef {
  key: string;
  organ_zh: string;
  name_zh: string;
  name_en: string;
}

export interface RadarFinding extends RadarFindingDef {
  probability: number;
  positive: boolean;
  tier: 'critical' | 'major' | 'minor';
}

export interface RadarCatalogOrgan {
  key: string;
  name_zh: string;
  name_en: string;
  findings: { key: string; name_zh: string; name_en: string }[];
}

export interface RadarCatalog {
  organs: RadarCatalogOrgan[];
  positive_threshold: number;
  critical_findings: string[];
}

export interface RadarResultSummary {
  critical_count: number;
  major_count: number;
  minor_count: number;
  positive_count: number;
  critical_findings: string[];
  major_findings: string[];
}

export interface RadarResult {
  study_uid: string;
  model: string;
  model_version: string;
  mode: 'demo' | 'production';
  generated_at: string;
  positive_threshold: number;
  findings: RadarFinding[];
  summary: RadarResultSummary;
  disclaimer: string;
}

interface ContractFindingRow {
  key: string;
  organ_zh: string;
  name_zh: string;
  name_en: string;
  demo_prob: number;
}

interface ContractShape {
  organs: string[];
  findings: ContractFindingRow[];
}

/* ------------------------------------------------------------------ */
/* 加载契约（惰性、缓存、多路径回退）                                     */
/* ------------------------------------------------------------------ */

let cached: ContractShape | null = null;

function candidateContractPaths(): string[] {
  // 本文件位于 <root>/src/integration/adapters/radar/radarData.ts，向上 4 级到根
  const fromModule = path.resolve(import.meta.dir, '../../../../.radar-contract.json');
  return [
    fromModule,
    path.resolve(process.cwd(), '.radar-contract.json'),
    path.resolve(process.cwd(), 'src/integration/adapters/radar/.radar-contract.json'),
  ];
}

/** 加载原始契约（带缓存，同步读取；读取失败抛错） */
export function loadContract(): ContractShape {
  if (cached) return cached;
  let lastErr: unknown = null;
  for (const p of candidateContractPaths()) {
    try {
      if (!fs.existsSync(p)) continue;
      const parsed = JSON.parse(fs.readFileSync(p, 'utf-8')) as ContractShape;
      if (!parsed || !Array.isArray(parsed.findings) || parsed.findings.length === 0) {
        throw new Error(`契约文件为空或格式错误: ${p}`);
      }
      cached = parsed;
      return parsed;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    '未找到 RADAR 契约文件 .radar-contract.json（项目根），降级数据不可用',
    { cause: lastErr },
  );
}

/* ------------------------------------------------------------------ */
/* 派生：器官英文名（取该器官首条 finding 的 name_en 前缀）              */
/* ------------------------------------------------------------------ */

function buildOrganMap(rows: ContractFindingRow[]): Map<string, { en: string; items: ContractFindingRow[] }> {
  const map = new Map<string, { en: string; items: ContractFindingRow[] }>();
  for (const r of rows) {
    let entry = map.get(r.organ_zh);
    if (!entry) {
      const en = r.name_en.includes('_') ? r.name_en.split('_')[0] : r.name_en;
      entry = { en, items: [] };
      map.set(r.organ_zh, entry);
    }
    entry.items.push(r);
  }
  return map;
}

/** 计算单个 finding 的 tier（仅 positive 有意义；非 positive 归为 minor 不参与告警） */
export function classifyTier(
  key: string,
  probability: number,
  positive: boolean,
  threshold: number,
): 'critical' | 'major' | 'minor' {
  if (!positive) return 'minor';
  if (RADAR_CRITICAL_KEYS.has(key)) return 'critical';
  return probability >= Math.max(threshold, 0.6) ? 'major' : 'minor';
}

/** 构建完整 146 发现（按契约顺序），附 probability/positive/tier */
export function buildFindings(studyUid: string, mode: 'demo' | 'production' = 'demo'): RadarResult {
  const contract = loadContract();
  const threshold = radarPositiveThreshold();
  void studyUid;
  void mode;

  const findings: RadarFinding[] = contract.findings.map((r) => {
    const positive = r.demo_prob >= threshold;
    return {
      key: r.key,
      organ_zh: r.organ_zh,
      name_zh: r.name_zh,
      name_en: r.name_en,
      probability: r.demo_prob,
      positive,
      tier: classifyTier(r.key, r.demo_prob, positive, threshold),
    };
  });

  const positiveFindings = findings.filter((f) => f.positive);
  const critical = positiveFindings.filter((f) => f.tier === 'critical');
  const major = positiveFindings.filter((f) => f.tier === 'major');
  const minor = positiveFindings.filter((f) => f.tier === 'minor');

  return {
    study_uid: studyUid,
    model: RADAR_MODEL,
    model_version: RADAR_MODEL_VERSION,
    mode,
    generated_at: new Date().toISOString(),
    positive_threshold: threshold,
    findings,
    summary: {
      critical_count: critical.length,
      major_count: major.length,
      minor_count: minor.length,
      positive_count: positiveFindings.length,
      critical_findings: critical.map((f) => f.key),
      major_findings: major.map((f) => f.key),
    },
    disclaimer: RADAR_DISCLAIMER,
  };
}

/** 静态目录：18 器官 / 146 发现（轻量，不含概率） */
export function buildCatalog(): RadarCatalog {
  const contract = loadContract();
  const organMap = buildOrganMap(contract.findings);
  const organs: RadarCatalogOrgan[] = RADAR_ORGAN_ORDER.map((organZh) => {
    const entry = organMap.get(organZh);
    const items = entry?.items ?? [];
    return {
      key: organZh,
      name_zh: organZh,
      name_en: entry?.en ?? organZh,
      findings: items.map((r) => ({ key: r.key, name_zh: r.name_zh, name_en: r.name_en })),
    };
  });
  return {
    organs,
    positive_threshold: radarPositiveThreshold(),
    critical_findings: Array.from(RADAR_CRITICAL_KEYS),
  };
}

/** 统计：发现总数（应为 146）与器官数（应为 18），供自检使用 */
export function catalogStats(): { organCount: number; findingCount: number } {
  const c = buildCatalog();
  return {
    organCount: c.organs.length,
    findingCount: c.organs.reduce((n, o) => n + o.findings.length, 0),
  };
}
