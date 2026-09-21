/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * DAMO-RADAR 内置确定性降级数据（契约 §0 双模式 / §4 降级）：
 *  - 推理服务不可用 / demo 模式时，前端用本模块生成与 Python demo 同源数值，绝不白屏。
 *  - 18 器官 / 146 发现来自 radarCatalogData.ts（由 .radar-contract.json 自动生成）。
 *  - 阈值、critical 集合按契约 §2 内置；与 Python 服务保持一致。
 */
import type {
  RadarCatalog,
  RadarFinding,
  RadarMode,
  RadarResult,
  RadarTier,
} from '@/types/imagingAi';

import { RADAR_DEMO_FINDINGS,RADAR_ORGAN_KEYS } from './radarCatalogData';

/** 阳性判定阈值（契约 §2，默认 0.5；对应后端 RADAR_POSITIVE_THRESHOLD） */
export const RADAR_POSITIVE_THRESHOLD = 0.5;

/**
 * critical 发现集合（契约 §2 curated）：恶性肿瘤 / 急重症。
 * 以 finding.key 精确匹配，覆盖 25 项。
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
  '肺_肺占位',
  '肺_转移瘤',
  '肝_转移瘤',
  '肾上腺_转移瘤',
  '肋骨_转移瘤（乳腺癌 骨转移）',
  '大肠_阑尾炎',
  '脾_梗死',
  '大肠_肠穿孔',
  '大肠_肠套叠',
  '小肠_套叠',
  '门静脉_栓塞',
]);

/** 契约 §3.6 免责声明原文 */
export const RADAR_DISCLAIMER =
  '本结果由 DAMO-RADAR AI 模型辅助生成，仅作第二阅片参考，最终诊断须由放射科医师复核签名。';

/** 由概率 + critical 集合推导分级（契约 §2） */
export function resolveTier(key: string, positive: boolean, probability: number): RadarTier {
  if (!positive) return 'minor';
  if (RADAR_CRITICAL_KEYS.has(key)) return 'critical';
  // major：其余 positive 中 probability>=0.6；minor：其余 positive
  return probability >= 0.6 ? 'major' : 'minor';
}

/** 用内置 demo 概率装配 146 条发现（确定性，无随机） */
export function buildDemoFindings(
  threshold: number = RADAR_POSITIVE_THRESHOLD,
): RadarFinding[] {
  return RADAR_DEMO_FINDINGS.map((f) => {
    const probability = f.demo_prob;
    const positive = probability >= threshold;
    return {
      key: f.key,
      organ_zh: f.organ_zh,
      name_zh: f.name_zh,
      name_en: f.name_en,
      probability,
      positive,
      tier: resolveTier(f.key, positive, probability),
    };
  });
}

/** 汇总（契约 §3.6 summary） */
export function summarizeFindings(findings: RadarFinding[]) {
  const critical_findings: string[] = [];
  const major_findings: string[] = [];
  let major_count = 0;
  let minor_count = 0;
  for (const f of findings) {
    if (!f.positive) continue;
    if (f.tier === 'critical') critical_findings.push(f.name_zh);
    else if (f.tier === 'major') {
      major_count += 1;
      major_findings.push(f.name_zh);
    } else {
      minor_count += 1;
    }
  }
  return {
    critical_count: critical_findings.length,
    major_count,
    minor_count,
    positive_count: findings.filter((f) => f.positive).length,
    critical_findings,
    major_findings,
  };
}

/** 装配完整 RaderResult（契约 §3.6） */
export function buildDemoResult(studyUid: string, mode: RadarMode = 'demo'): RadarResult {
  const findings = buildDemoFindings();
  return {
    study_uid: studyUid,
    model: 'damo-radar',
    model_version: 'eaec6129',
    mode,
    generated_at: '2026-09-21T14:00:00+08:00',
    positive_threshold: RADAR_POSITIVE_THRESHOLD,
    findings,
    summary: summarizeFindings(findings),
    disclaimer: RADAR_DISCLAIMER,
  };
}

/** 静态目录（契约 §3.3）：18 器官 + 每器官发现骨架（不含概率） */
export function buildCatalog(): RadarCatalog {
  const byOrgan = new Map<string, RadarCatalog['organs'][number]['findings']>();
  for (const organ of RADAR_ORGAN_KEYS) byOrgan.set(organ, []);
  for (const f of RADAR_DEMO_FINDINGS) {
    byOrgan.get(f.organ_zh)?.push({ key: f.key, name_zh: f.name_zh, name_en: f.name_en });
  }
  return {
    organs: RADAR_ORGAN_KEYS.map((organ) => ({
      key: organ,
      name_zh: organ,
      findings: byOrgan.get(organ) ?? [],
    })),
    positive_threshold: RADAR_POSITIVE_THRESHOLD,
    critical_findings: Array.from(RADAR_CRITICAL_KEYS),
  };
}
