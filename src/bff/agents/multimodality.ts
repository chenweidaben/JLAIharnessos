/**
 * MEDMUSE 多模态扩展骨架 - 检验报告 PDF/图片 OCR 预留（纯函数，零依赖）。
 *
 * 背景：临床场景中大量检验结果以拍照/扫描件（PDF、JPG/PNG）形式存在，尚未结构化
 * 进 LIS。本模块为后续接入真实 OCR / 文档解析引擎预留稳定接口：
 *   - parseLabReport(fileName, mime)：DEMO 模式返回 mock 结构化结果
 *     （项目 / 参考值 / 结果 / 异常 flag），供 agent 直接消费；
 *   - summarizeOcrResult(ocrText)：把原始 OCR 文本压缩为 agent 可读的摘要。
 *
 * 医疗安全：当前为 DEMO 骨架，不读取、不解析真实文件内容，仅返回演示数据；
 * 后续接入真实解析时，结构化结果不得由 AI 臆造，必须可回溯到原始页面。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 结果异常标记：H 偏高 / L 偏低 / N 正常 */
export type LabFlag = 'H' | 'L' | 'N';

/** 单条结构化检验项目 */
export interface LabItem {
  /** 项目名称 */
  name: string;
  /** 参考值范围 */
  refRange: string;
  /** 测得结果（原样字符串，保留单位由解析引擎补全） */
  result: string;
  /** 异常 flag */
  flag: LabFlag;
}

/** parseLabReport 的结构化返回 */
export interface LabReportParseResult {
  /** 原始文件名（透传，便于日志/审计回溯） */
  fileName: string;
  /** MIME 类型（透传，区分 PDF / 图片） */
  mime: string;
  /** 当前固定为 'demo'：未接真实解析引擎 */
  mode: 'demo';
  /** 结构化项目条数 */
  itemCount: number;
  items: LabItem[];
  /** 一句话异常摘要，供 agent 快速定位 */
  summary: string;
}

/**
 * 解析检验报告（DEMO 骨架）。
 *
 * 不读取真实文件，仅按 fileName / mime 返回一组确定性的血常规演示结构化结果，
 * 便于前端联调与 agent 编排验证。fileName / mime 原样回显，供后续按类型分发。
 */
export function parseLabReport(fileName: string, mime: string): LabReportParseResult {
  // DEMO mock：一组含偏高/偏低的血常规项目
  const items: LabItem[] = [
    { name: '白细胞计数 WBC', refRange: '3.5-9.5 ×10^9/L', result: '11.2', flag: 'H' },
    { name: '红细胞计数 RBC', refRange: '3.8-5.8 ×10^12/L', result: '4.6', flag: 'N' },
    { name: '血红蛋白 HGB', refRange: '115-150 g/L', result: '108', flag: 'L' },
    { name: '血小板计数 PLT', refRange: '125-350 ×10^9/L', result: '230', flag: 'N' },
    { name: 'C反应蛋白 CRP', refRange: '0-10 mg/L', result: '24.6', flag: 'H' },
  ];

  const abnormal = items.filter((it) => it.flag !== 'N');

  return {
    fileName,
    mime,
    mode: 'demo',
    itemCount: items.length,
    items,
    summary: `演示解析：共 ${items.length} 项，异常 ${abnormal.length} 项（${abnormal
      .map((a) => a.name)
      .join('、')}）。`,
  };
}

/** OCR 摘要中最多保留的数据行数，防止长图文本撑爆 agent 上下文 */
export const OCR_SUMMARY_MAX_LINES = 12;

/**
 * 把原始 OCR 文本压缩为 agent 可读的摘要（规则压缩，不调 LLM）。
 *
 * 处理步骤：
 *   1. 折叠空白、去掉空行；
 *   2. 优先保留疑似数据行（含数字或异常标记 ↑/↓/异常/偏高/偏低/H/L）；
 *   3. 截断到 OCR_SUMMARY_MAX_LINES 行；
 *   4. 汇总总行数、数据行数、异常行数。
 *
 * 空文本返回固定提示。返回长度严格小于等于输入（折叠后）。
 */
export function summarizeOcrResult(ocrText: string): string {
  if (!ocrText || !ocrText.trim()) {
    return '（OCR 文本为空，未能从报告中提取到检验信息）';
  }

  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const looksLikeData = (l: string): boolean =>
    /\d/.test(l) || /(↑|↓|异常|偏高|偏低)/.test(l);

  const dataLines = lines.filter(looksLikeData);
  // 数据行为空时退化为保留原始行，避免摘要丢失全部信息
  const pool = dataLines.length > 0 ? dataLines : lines;
  const picked = pool.slice(0, OCR_SUMMARY_MAX_LINES);
  const abnormalCount = pool.filter((l) => /(↑|↓|异常|偏高|偏低)/.test(l)).length;

  return (
    `OCR 摘要（演示）：识别 ${lines.length} 行，疑似数据 ${pool.length} 行，` +
    `标记异常 ${abnormalCount} 行；要点：${picked.join(' ｜ ')}`
  );
}
