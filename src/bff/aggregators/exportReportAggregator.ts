/**
 * 健澜科技 jlmedaios - 报表中心导出聚合器（M148-D 产品化收尾）
 *
 * 本模块是「打印级报表」的纯函数工厂：
 *   - exportToPdf(htmlContent, filename)：把「报表正文 HTML」套进统一的打印模板
 *     （医院抬头 / 深海蓝 VI / 斜向水印 / 重复页脚 / A4 分页规则），产出可直接
 *     在浏览器中「Ctrl/Cmd+P → 另存为 PDF」的完整 HTML，不引任何外部 PDF 库；
 *   - exportToExcel(data, headers, sheetName)：纯函数产出 Excel/WPS 可直接打开的
 *     .xls（零依赖 HTML 表格），带工作表名标题行；
 *   - generateReport(type, format, filters)：路由主入口，按报表类型取数并调用上面两个
 *     纯函数组装最终下载结果。
 *
 * 报表类型（M148-D）：
 *   - opd_daily     门诊日报（PDF）
 *   - inp_monthly   住院月报（Excel）
 *   - dept_perf     科室绩效（PDF）
 *   - qc_report     质控报告（PDF）
 *
 * 安全：仅返回聚合统计量，不暴露患者个体 PII；纯函数、零新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* -------------------------------------------------------------------------- */
/* 类型定义                                                                    */
/* -------------------------------------------------------------------------- */

/** 报表类型枚举（与前端 type=xxx 对齐） */
export type CenterReportType = 'opd_daily' | 'inp_monthly' | 'dept_perf' | 'qc_report';

/** 导出格式：pdf（打印级 HTML，浏览器另存为 PDF）/ excel（.xls） */
export type CenterExportFormat = 'pdf' | 'excel';

/** 表头定义：key 对应数据对象字段，title 为导出列中文名 */
export interface CenterHeader {
  key: string;
  title: string;
}

/** 报表筛选条件（全部可选，宽松筛选——非法值忽略而非报错） */
export interface CenterReportFilters {
  /** 报表基准日期 yyyy-mm-dd（演示数据仅用于稳定派生） */
  date?: string;
  /** 科室名（精确包含匹配，空=全部科室） */
  department?: string;
}

/** 导出结果（统一信封，供路由直接转成 HTTP 下载响应） */
export interface ExportResult {
  /** 报表类型 */
  reportType: CenterReportType;
  /** 报表中文名 */
  reportName: string;
  /** 导出格式 */
  format: CenterExportFormat;
  /** 建议下载文件名 */
  filename: string;
  /** HTTP Content-Type */
  contentType: string;
  /** 导出正文（完整 HTML 文档 或 .xls 表格文本） */
  content: string;
  /** 数据行数 */
  rowCount: number;
  /** 是否演示数据 */
  demo: boolean;
  /** 生成时间（ISO） */
  generatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* 报表元数据（产品化收尾：四类报表固定中文列名）                                */
/* -------------------------------------------------------------------------- */

/** 各报表类型 → 中文名 + 默认导出格式 + 表头 */
const REPORT_META: Record<
  CenterReportType,
  { name: string; defaultFormat: CenterExportFormat; headers: CenterHeader[] }
> = {
  // 门诊日报（PDF）
  opd_daily: {
    name: '门诊日报',
    defaultFormat: 'pdf',
    headers: [
      { key: 'date', title: '日期' },
      { key: 'department', title: '科室' },
      { key: 'visitCount', title: '接诊人次' },
      { key: 'erCount', title: '急诊人次' },
      { key: 'avgWaitMin', title: '平均候诊(分)' },
      { key: 'avgFee', title: '次均费用(元)' },
      { key: 'satisfactionPct', title: '满意度(%)' },
    ],
  },
  // 住院月报（Excel）
  inp_monthly: {
    name: '住院月报',
    defaultFormat: 'excel',
    headers: [
      { key: 'month', title: '月份' },
      { key: 'department', title: '科室' },
      { key: 'inHospital', title: '月末在院' },
      { key: 'newAdmit', title: '新入院' },
      { key: 'discharged', title: '出院' },
      { key: 'avgLodDays', title: '平均住院日(天)' },
      { key: 'bedOccPct', title: '床位使用率(%)' },
      { key: 'turnoverRate', title: '病床周转(次)' },
    ],
  },
  // 科室绩效（PDF）
  dept_perf: {
    name: '科室绩效报告',
    defaultFormat: 'pdf',
    headers: [
      { key: 'rank', title: '排名' },
      { key: 'department', title: '科室' },
      { key: 'totalScore', title: '综合得分' },
      { key: 'caseCount', title: '出院例数' },
      { key: 'qualityScore', title: '医疗质量(分)' },
      { key: 'efficiencyScore', title: '运行效率(分)' },
      { key: 'revenue', title: '业务收入(万元)' },
    ],
  },
  // 质控报告（PDF）
  qc_report: {
    name: '医疗质控报告',
    defaultFormat: 'pdf',
    headers: [
      { key: 'department', title: '科室' },
      { key: 'sampled', title: '抽查病历' },
      { key: 'gradeARatePct', title: '甲级率(%)' },
      { key: 'majorDefects', title: '重大缺陷' },
      { key: 'defectCount', title: '一般缺陷' },
      { key: 'rectifyPct', title: '整改完成率(%)' },
    ],
  },
};

/** 支持的报表类型（供路由校验与前端枚举） */
export const CENTER_REPORT_TYPES: CenterReportType[] = Object.keys(REPORT_META) as CenterReportType[];

/** 合成科室池 */
const DEPARTMENTS = ['内科', '外科', '妇产科', '儿科', '心内科', '骨科', '急诊科', '神经内科'];

/** 医院抬头常量（产品化收尾：客户交付时整体替换为实际医院名） */
const HOSPITAL_NAME = '健澜示范医院';
const COMPANY_NAME = '杭州健澜科技有限公司';

/* -------------------------------------------------------------------------- */
/* 确定性伪随机（纯函数，保证同一输入输出稳定，便于单测）                        */
/* -------------------------------------------------------------------------- */

/** mulberry32：由整数种子产生确定性伪随机序列 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 由字符串派生稳定整数种子 */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* -------------------------------------------------------------------------- */
/* HTML 转义（纯函数）                                                          */
/* -------------------------------------------------------------------------- */

/** HTML 特殊字符转义，防止正文里的 & < > " 破坏模板 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* -------------------------------------------------------------------------- */
/* PDF 打印模板（产品化收尾：医院抬头 / 水印 / 页脚 / A4 分页）                  */
/* -------------------------------------------------------------------------- */

/**
 * 纯函数 exportToPdf：把「报表正文 HTML」套进统一打印模板。
 *
 * 设计要点（不引外部 PDF 库，前端/浏览器直接打印为 PDF）：
 *   - @page A4 纵向 + 页边距，打印时自动分页；
 *   - 深海蓝 VI 抬头条（#0a2540 → #123a5e）置于文档顶部首页；
 *   - 斜向「健澜科技 JLAN MEDAI」水印：position:fixed，浏览器打印时每页重复；
 *   - 页脚：position:fixed bottom，每页重复，含版权与「第 N 页」占位；
 *   - 表格行 page-break-inside:avoid，避免一行被劈到两页；
 *   - 内容区可插入 <div class="page-break"></div> 强制分页。
 *
 * @param htmlContent 报表正文（表头标题、摘要、表格等任意 HTML 片段）。
 * @param filename    建议下载文件名（.html / 打印另存为 .pdf）。
 * @returns ExportResult（content 为完整可打印 HTML 文档）。
 */
export function exportToPdf(htmlContent: string, filename: string): ExportResult {
  const safeName = filename.endsWith('.html') || filename.endsWith('.pdf') ? filename : `${filename}.html`;
  const stamp = new Date();
  const genDate = `${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, '0')}-${String(
    stamp.getDate(),
  ).padStart(2, '0')}`;
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(safeName)}</title>
<style>
  /* ============ 产品化收尾：深海蓝 VI 打印模板 ============ */
  @page { size: A4 portrait; margin: 18mm 15mm 20mm 15mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Microsoft YaHei", "PingFang SC", "Source Han Sans SC", sans-serif;
    color: #1a2332; font-size: 12px; line-height: 1.6; background: #fff;
  }
  /* 医院抬头（首页顶部） */
  .report-masthead {
    background: linear-gradient(135deg, #0a2540 0%, #123a5e 100%);
    color: #fff; padding: 18px 24px; border-radius: 4px; margin-bottom: 16px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .report-masthead .hospital { font-size: 18px; font-weight: 700; letter-spacing: 1px; }
  .report-masthead .brand { font-size: 11px; opacity: 0.85; text-align: right; }
  .report-title { font-size: 20px; font-weight: 700; color: #0a2540; margin: 8px 0 4px; }
  .report-meta { color: #5a6b80; font-size: 11px; margin-bottom: 14px; }
  /* 正文表格 */
  table.report { width: 100%; border-collapse: collapse; margin: 10px 0 16px; }
  table.report th {
    background: #123a5e; color: #fff; padding: 8px 10px; text-align: left; font-weight: 600;
    border: 1px solid #123a5e; font-size: 12px;
  }
  table.report td { padding: 7px 10px; border: 1px solid #d6dee8; font-size: 12px; }
  table.report tr:nth-child(even) td { background: #f4f7fb; }
  table.report tr { page-break-inside: avoid; break-inside: avoid; }
  .kpi-row { display: flex; gap: 12px; margin: 12px 0 16px; }
  .kpi {
    flex: 1; border: 1px solid #d6dee8; border-top: 3px solid #1e6fbf;
    border-radius: 4px; padding: 10px 12px; background: #f8fafc;
  }
  .kpi .num { font-size: 20px; font-weight: 700; color: #0a2540; }
  .kpi .lbl { font-size: 11px; color: #5a6b80; margin-top: 2px; }
  .section-h { color: #0a2540; font-size: 14px; font-weight: 700; border-left: 4px solid #1e6fbf; padding-left: 8px; margin: 16px 0 8px; }
  /* 分页控制：需要强制换页时插入 <div class="page-break"></div> */
  .page-break { page-break-after: always; break-after: page; }
  /* 斜向水印：fixed 定位，浏览器打印时每页重复出现 */
  .watermark {
    position: fixed; top: 45%; left: 50%; transform: translate(-50%, -50%) rotate(-28deg);
    font-size: 56px; font-weight: 800; color: rgba(10, 37, 64, 0.06);
    letter-spacing: 6px; pointer-events: none; z-index: 0; white-space: nowrap;
  }
  /* 页脚：fixed bottom，每页重复 */
  .report-footer {
    position: fixed; bottom: 0; left: 0; right: 0;
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 15mm; font-size: 10px; color: #8a99ad;
    border-top: 1px solid #e3e9f0; background: #fff;
  }
  .content { position: relative; z-index: 1; }
  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <!-- 斜向水印（每页重复） -->
  <div class="watermark">健澜科技 JLAN MEDAI</div>

  <!-- 医院抬头（首页） -->
  <div class="report-masthead">
    <div class="hospital">${escapeHtml(HOSPITAL_NAME)}</div>
    <div class="brand">${escapeHtml(COMPANY_NAME)}<br/>智慧医院报表平台 · M148</div>
  </div>

  <div class="content">
${htmlContent}
  </div>

  <!-- 页脚（每页重复） -->
  <div class="report-footer">
    <span>© ${stamp.getFullYear()} ${escapeHtml(COMPANY_NAME)} · 版权所有</span>
    <span>生成日期：${genDate}　|　第 <span class="page"></span> 页 / 共 <span class="pages"></span> 页</span>
  </div>
</body>
</html>`;
  return {
    reportType: 'opd_daily',
    reportName: '打印报表',
    format: 'pdf',
    filename: safeName,
    contentType: 'text/html; charset=utf-8',
    content: html,
    rowCount: 0,
    demo: true,
    generatedAt: stamp.toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* Excel（.xls，零依赖）序列化                                                 */
/* -------------------------------------------------------------------------- */

/**
 * 纯函数 exportToExcel：对象数组 + 表头 + 工作表名 → Excel/WPS 可直接打开的 .xls。
 *
 * 不引入任何 Excel 库；以 application/vnd.ms-excel 下发 HTML 表格文本，
 * 首行为加粗工作表名标题，第二行为表头，后续为数据行。
 *
 * @param data      数据行数组（对象）；按 headers.key 逐列取值。
 * @param headers   表头定义，决定列顺序与列中文名。
 * @param sheetName 工作表名（同时作为表格上方标题行，便于打印归档）。
 * @returns ExportResult（content 为 .xls 表格文本）。
 */
export function exportToExcel(
  data: Record<string, unknown>[],
  headers: CenterHeader[],
  sheetName: string,
): ExportResult {
  const esc = (s: string): string => escapeHtml(s);
  const cell = (v: unknown): string => esc(v == null ? '' : String(v));

  const titleRow = `<tr><th colspan="${headers.length}" style="font-size:14px;background:#0a2540;color:#fff;">${esc(sheetName)}</th></tr>`;
  const thRow = `<tr>${headers.map((h) => `<th>${esc(h.title)}</th>`).join('')}</tr>`;
  const bodyRows = data
    .map((row) => `<tr>${headers.map((h) => `<td>${cell(row[h.key])}</td>`).join('')}</tr>`)
    .join('');

  const content =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">` +
    `<head><meta charset="UTF-8"/>` +
    `<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>` +
    `<x:Name>${esc(sheetName)}</x:Name>` +
    `</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->` +
    `<style>table{border-collapse:collapse;}th{background:#123a5e;color:#fff;border:1px solid #123a5e;padding:6px 10px;}td{border:1px solid #d6dee8;padding:5px 10px;}</style>` +
    `</head><body><table>${titleRow}${thRow}<tbody>${bodyRows}</tbody></table></body></html>`;

  const stamp = new Date();
  return {
    reportType: 'inp_monthly',
    reportName: sheetName,
    format: 'excel',
    filename: `${sheetName}.xls`,
    contentType: 'application/vnd.ms-excel; charset=utf-8',
    content,
    rowCount: data.length,
    demo: true,
    generatedAt: stamp.toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* 演示数据生成（确定性，按报表类型）                                          */
/* -------------------------------------------------------------------------- */

/** 生成某报表类型的「全量」演示行（未筛选）。 */
function buildDemoRows(type: CenterReportType, baseDate: string): Record<string, unknown>[] {
  const seed = hashSeed(`${type}|${baseDate}`);
  const rand = mulberry32(seed);
  const rows: Record<string, unknown>[] = [];
  // 每类报表生成 8 个科室一行（月报/绩效/质控天然是科室维度）
  for (let i = 0; i < DEPARTMENTS.length; i++) {
    const dept = DEPARTMENTS[i];
    switch (type) {
      case 'opd_daily': {
        rows.push({
          date: baseDate,
          department: dept,
          visitCount: 120 + Math.floor(rand() * 380),
          erCount: Math.floor(rand() * 35),
          avgWaitMin: Math.round(8 + rand() * 22),
          avgFee: Math.round(60 + rand() * 380),
          satisfactionPct: Math.round((88 + rand() * 11) * 10) / 10,
        });
        break;
      }
      case 'inp_monthly': {
        const inHospital = 25 + Math.floor(rand() * 110);
        rows.push({
          month: baseDate.slice(0, 7) || '2026-10',
          department: dept,
          inHospital,
          newAdmit: 60 + Math.floor(rand() * 140),
          discharged: 58 + Math.floor(rand() * 140),
          avgLodDays: Math.round((4 + rand() * 9) * 10) / 10,
          bedOccPct: Math.round((70 + rand() * 28) * 10) / 10,
          turnoverRate: Math.round((1.5 + rand() * 3.5) * 10) / 10,
        });
        break;
      }
      case 'dept_perf': {
        rows.push({
          rank: 0, // 稍后按综合得分排序后回填
          department: dept,
          totalScore: Math.round((72 + rand() * 26) * 10) / 10,
          caseCount: 80 + Math.floor(rand() * 420),
          qualityScore: Math.round((75 + rand() * 24) * 10) / 10,
          efficiencyScore: Math.round((70 + rand() * 28) * 10) / 10,
          revenue: Math.round((300 + rand() * 2600) * 10) / 10,
        });
        break;
      }
      case 'qc_report': {
        rows.push({
          department: dept,
          sampled: 24 + Math.floor(rand() * 96),
          gradeARatePct: Math.round((80 + rand() * 19) * 10) / 10,
          majorDefects: Math.floor(rand() * 3),
          defectCount: Math.floor(rand() * 18),
          rectifyPct: Math.round((70 + rand() * 30) * 10) / 10,
        });
        break;
      }
    }
  }

  // 科室绩效：按综合得分降序后回填排名
  if (type === 'dept_perf') {
    rows.sort((a, b) => Number(b['totalScore']) - Number(a['totalScore']));
    rows.forEach((r, idx) => {
      r['rank'] = idx + 1;
    });
  }
  return rows;
}

/* -------------------------------------------------------------------------- */
/* 正文渲染：把数据行渲染成 PDF 正文 HTML 片段                                  */
/* -------------------------------------------------------------------------- */

/** 渲染 KPI 摘要卡片 */
function renderKpis(type: CenterReportType, rows: Record<string, unknown>[]): string {
  const sum = (key: string): number => rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
  const avg = (key: string): number =>
    rows.length ? Math.round((sum(key) / rows.length) * 10) / 10 : 0;
  switch (type) {
    case 'opd_daily':
      return `<div class="kpi-row">
        <div class="kpi"><div class="num">${sum('visitCount')}</div><div class="lbl">全天接诊人次</div></div>
        <div class="kpi"><div class="num">${sum('erCount')}</div><div class="lbl">急诊人次</div></div>
        <div class="kpi"><div class="num">${avg('avgWaitMin')}</div><div class="lbl">平均候诊(分)</div></div>
        <div class="kpi"><div class="num">${avg('satisfactionPct')}%</div><div class="lbl">患者满意度</div></div>
      </div>`;
    case 'dept_perf':
      return `<div class="kpi-row">
        <div class="kpi"><div class="num">${rows.length}</div><div class="lbl">参评科室</div></div>
        <div class="kpi"><div class="num">${avg('totalScore')}</div><div class="lbl">平均综合得分</div></div>
        <div class="kpi"><div class="num">${sum('caseCount')}</div><div class="lbl">出院例数合计</div></div>
        <div class="kpi"><div class="num">${sum('revenue')}</div><div class="lbl">业务收入(万元)</div></div>
      </div>`;
    case 'qc_report':
      return `<div class="kpi-row">
        <div class="kpi"><div class="num">${sum('sampled')}</div><div class="lbl">抽查病历总数</div></div>
        <div class="kpi"><div class="num">${avg('gradeARatePct')}%</div><div class="lbl">平均甲级率</div></div>
        <div class="kpi"><div class="num">${sum('majorDefects')}</div><div class="lbl">重大缺陷</div></div>
        <div class="kpi"><div class="num">${avg('rectifyPct')}%</div><div class="lbl">平均整改完成率</div></div>
      </div>`;
    default:
      return '';
  }
}

/** 渲染数据表格 */
function renderTable(headers: CenterHeader[], rows: Record<string, unknown>[]): string {
  const th = headers.map((h) => `<th>${escapeHtml(h.title)}</th>`).join('');
  const trs = rows
    .map((row) => {
      const tds = headers
        .map((h) => `<td>${escapeHtml(row[h.key] == null ? '' : String(row[h.key]))}</td>`)
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');
  return `<table class="report"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}

/** 组装 PDF 正文片段（标题 + KPI + 表格 + 说明） */
function renderPdfBody(type: CenterReportType, rows: Record<string, unknown>[], date: string): string {
  const meta = REPORT_META[type];
  const kpis = renderKpis(type, rows);
  const table = renderTable(meta.headers, rows);
  return `
    <div class="report-title">${escapeHtml(meta.name)}</div>
    <div class="report-meta">统计基准日：${escapeHtml(date)}　|　数据来源：${escapeHtml(COMPANY_NAME)} 智慧医院报表平台　|　密级：内部</div>
    ${kpis}
    <div class="section-h">一、明细数据</div>
    ${table}
    <div class="section-h">二、说明</div>
    <div style="color:#5a6b80;font-size:11px;line-height:1.8;">
      1. 本报告由系统自动汇总生成，仅含科室级聚合统计量，不涉及患者个体隐私信息；<br/>
      2. 打印请使用浏览器「打印 → 另存为 PDF」，纸张建议 A4 纵向，已启用背景图形打印；<br/>
      3. 报告解释权归 ${escapeHtml(COMPANY_NAME)} 所有。
    </div>
  `;
}

/* -------------------------------------------------------------------------- */
/* 主入口：generateReport（路由调用）                                          */
/* -------------------------------------------------------------------------- */

/**
 * 纯函数：按报表类型 + 筛选条件生成最终导出结果。
 *
 * @param type    报表类型；未知类型抛 Error（由路由转 400）。
 * @param format  导出格式；缺省按报表默认格式（PDF 类报表默认 pdf，住院月报默认 excel）。
 * @param filters 筛选条件（基准日期 / 科室）。
 * @returns ExportResult。
 */
export function generateReport(
  type: string,
  format: CenterExportFormat | string = '',
  filters: CenterReportFilters = {},
): ExportResult {
  if (!CENTER_REPORT_TYPES.includes(type as CenterReportType)) {
    throw new Error(`不支持的报表类型: ${type}`);
  }
  const t = type as CenterReportType;
  const meta = REPORT_META[t];
  const fmt: CenterExportFormat = format === 'excel' ? 'excel' : format === 'pdf' ? 'pdf' : meta.defaultFormat;

  const baseDate = filters.date || '2026-10-16';
  const department = filters.department?.trim() || '';

  // 1) 全量演示数据 → 2) 科室筛选
  let rows = buildDemoRows(t, baseDate);
  if (department) rows = rows.filter((r) => r['department'] === department);

  const stamp = baseDate.replace(/-/g, '');

  if (fmt === 'excel') {
    // 住院月报走 Excel：直接复用通用纯函数
    const result = exportToExcel(rows, meta.headers, meta.name);
    result.reportType = t;
    result.reportName = meta.name;
    result.filename = `${t}-${stamp}.xls`;
    return result;
  }

  // PDF：渲染正文 → 套打印模板
  const body = renderPdfBody(t, rows, baseDate);
  const result = exportToPdf(body, `${t}-${stamp}.html`);
  result.reportType = t;
  result.reportName = meta.name;
  result.filename = `${t}-${stamp}.pdf`;
  result.rowCount = rows.length;
  return result;
}
