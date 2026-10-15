/**
 * 健澜科技 jlmedaios - M142-A 健康体检管理聚合器（预防保健与患者服务）
 *
 * 设计目标：让普通人“看得懂”体检报告 —— 结果不只给数值和参考区间，
 * 还要把每个异常项翻译成大白话，并附上可执行的生活方式 / 就医建议
 * （例如“血压偏高，建议低盐饮食 + 复查”）。
 *
 * 三个纯函数（无 I/O、无 DB、确定性）：
 *   - createCheckupOrder(patientId, packageName, items)            体检开单
 *   - recordCheckupResult(checkupId, item, value, unit, refRange, flag)  记录结果并自动解读
 *   - generateCheckupReport(checkupId)                             生成通俗版报告
 *
 * 医疗安全红线：本模块只做辅助解读与生活方式建议，不做诊断、不替代医生结论；
 *               任何异常项都建议“复查 / 到相应科室就诊”。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 体检套餐 */
export type CheckupPackage = '入职体检' | '健康体检' | '老年体检' | '妇科体检' | '专项检查';
export const CHECKUP_PACKAGES: CheckupPackage[] = ['入职体检', '健康体检', '老年体检', '妇科体检', '专项检查'];

/** 结果标记：N 正常 / H 偏高 / L 偏低 / A 异常（手动） */
export type CheckupFlag = 'N' | 'H' | 'L' | 'A';

/** 体检单（开单结果） */
export interface CheckupOrder {
  id: string;
  checkupNo: string;
  patientId: string;
  packageName: CheckupPackage;
  items: string[];
  status: 'ordered' | 'in_progress' | 'completed' | 'cancelled';
  orderedAt: string;
}

/** 单项体检结果（含通俗解读） */
export interface CheckupResult {
  id: string;
  checkupId: string;
  item: string;
  value: number;
  unit: string;
  refRange: string;
  flag: CheckupFlag;
  abnormal: boolean;
  /** 大白话解释，不堆医学术语 */
  plainText: string;
  /** 通俗的生活方式 / 就医建议 */
  advice: string;
  recordedAt: string;
}

/** 通俗版体检报告 */
export interface CheckupReport {
  checkupId: string;
  checkupNo: string;
  patientId: string;
  packageName: CheckupPackage;
  /** 一段话总结，普通人一眼看懂 */
  summary: string;
  totalItems: number;
  normalCount: number;
  abnormalCount: number;
  results: CheckupResult[];
  abnormalItems: CheckupResult[];
  /** 总体建议 */
  overallAdvice: string;
  generatedAt: string;
}

/** 本模块错误（路由层映射为 HTTP 状态） */
export class CheckupError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CheckupError';
  }
}

const badRequest = (m: string) => new CheckupError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new CheckupError(404, 'NOT_FOUND', m);

/* --------------------------------------------------------------------------
 * 进程内轻量登记处：纯函数之间靠它串联（开单 -> 录结果 -> 出报告）。
 * 仅用于本模块内存态演示与单测，生产落库走 clinical.health_checkup* 两张表。
 * ------------------------------------------------------------------------ */
const orders = new Map<string, CheckupOrder>();
const resultsByCheckup = new Map<string, CheckupResult[]>();
let seq = 0;
const nextId = (prefix: string) => `${prefix}_${(++seq).toString(36)}_${Date.now().toString(36)}`;

/* --------------------------------------------------------------------------
 * 通俗解读词典：按项目名关键词命中，命中不到走通用模板。
 * 每条都给出 H（偏高）/ L（偏低）/ N（正常）三档大白话。
 * ------------------------------------------------------------------------ */
interface ItemAdvice {
  match: (item: string) => boolean;
  high: string;
  low: string;
  normal: string;
}

const ITEM_ADVISORIES: ItemAdvice[] = [
  {
    match: (it) => it.includes('收缩压') || (it.includes('血压') && !it.includes('舒张')),
    high: '您的高压（收缩压）偏高了，说明血管在放松时承受的压力偏大。',
    low: '您的高压（收缩压）偏低，起身时容易头晕乏力。',
    normal: '高压（收缩压）在正常范围，血管压力良好。',
  },
  {
    match: (it) => it.includes('舒张压') || it.includes('低压'),
    high: '您的低压（舒张压）偏高了。',
    low: '您的低压（舒张压）偏低。',
    normal: '低压（舒张压）在正常范围。',
  },
  {
    match: (it) => it.includes('血糖') || it.includes('葡萄糖'),
    high: '您的血糖比正常范围高一些，提示身体调节糖分的能力下降。',
    low: '您的血糖偏低，容易出现心慌、出冷汗、手抖。',
    normal: '血糖在正常范围，糖分代谢良好。',
  },
  {
    match: (it) => it.includes('BMI') || it.includes('体重指数') || it.includes('体质指数'),
    high: '您的体重指数偏高，也就是体重相对身高偏重。',
    low: '您的体重指数偏低，偏瘦。',
    normal: '体重指数在正常范围，身材匀称。',
  },
  {
    match: (it) => it.includes('胆固醇') || it.includes('血脂') || it.includes('甘油三酯'),
    high: '您的血脂偏高，血液里的“油分”多了一些。',
    low: '您的血脂偏低。',
    normal: '血脂在正常范围。',
  },
  {
    match: (it) => it.includes('血红蛋白') || it.includes('血色素'),
    high: '血红蛋白偏高。',
    low: '血红蛋白偏低，也就是常说的贫血，容易觉得累、面色苍白。',
    normal: '血红蛋白在正常范围，没有贫血。',
  },
  {
    match: (it) => it.includes('白细胞'),
    high: '白细胞偏高，往往提示身体某处可能有炎症或感染。',
    low: '白细胞偏低，抵抗力可能偏弱。',
    normal: '白细胞在正常范围，免疫状态良好。',
  },
];

/** 按 flag 给出可执行的通俗建议 */
function adviceFor(item: string, flag: CheckupFlag): string {
  if (flag === 'N') return '保持目前均衡饮食、规律作息和定期体检的好习惯即可。';
  const high = flag === 'H' || flag === 'A';
  if (item.includes('收缩压') || item.includes('血压')) {
    return high
      ? '血压偏高，建议低盐饮食、少熬夜、规律运动，并在 2-4 周后复查；若持续偏高请到心内科就诊。'
      : '血压偏低，起身动作放慢，注意补水和营养，必要时到内科就诊。';
  }
  if (item.includes('血糖')) {
    return high
      ? '血糖偏高，建议少吃甜食和精制主食、控制体重，并复查空腹血糖；必要时到内分泌科就诊。'
      : '血糖偏低，身边备些糖果，规律进餐，出现心慌出汗及时补充糖分。';
  }
  if (item.includes('BMI') || item.includes('体重指数')) {
    return high
      ? '体重偏重，建议控制总热量、少吃油炸甜食，循序渐进地快走或慢跑，把体重慢慢降到正常范围。'
      : '体重偏轻，建议增加优质蛋白和主食摄入，必要时到营养科就诊。';
  }
  if (item.includes('胆固醇') || item.includes('血脂') || item.includes('甘油三酯')) {
    return '血脂偏高，建议少吃动物内脏、油炸食品和肥肉，多吃蔬菜与粗粮，3 个月后复查血脂，必要时到心内科就诊。';
  }
  if (item.includes('血红蛋白')) {
    return '提示贫血，建议多吃瘦肉、动物肝脏、深绿色蔬菜，必要时到血液科或内科查明原因。';
  }
  if (item.includes('白细胞')) {
    return '白细胞异常，建议注意有无发热、咳嗽等感染表现，按医生安排复查血常规，必要时到内科就诊。';
  }
  // 通用兜底
  return high
    ? `「${item}」略高于参考范围，建议清淡饮食、规律作息，1-2 周后复查该项；如仍异常请到相应门诊就诊。`
    : `「${item}」略低于参考范围，建议注意休息与营养，1-2 周后复查；如持续偏低请到相应门诊就诊。`;
}

/** 把参考区间字符串（如 "90-120"、"3.9-6.1"）解析为上下限 */
function parseRange(refRange: string): { low: number; high: number } | null {
  if (!refRange) return null;
  const m = refRange.trim().match(/([0-9]+(?:\.[0-9]+)?)\s*[-~—]\s*([0-9]+(?:\.[0-9]+)?)/);
  if (!m) return null;
  return { low: Number(m[1]), high: Number(m[2]) };
}

/** 依据数值与参考区间自动判定 flag；调用方显式传入时尊重其结论 */
function resolveFlag(item: string, value: number, refRange: string, flag: string | undefined): CheckupFlag {
  if (flag && ['N', 'H', 'L', 'A'].includes(flag.toUpperCase())) {
    return flag.toUpperCase() as CheckupFlag;
  }
  const range = parseRange(refRange);
  if (!range) return 'N';
  if (value > range.high) return 'H';
  if (value < range.low) return 'L';
  return 'N';
}

/** 生成某项的大白话解释 */
function plainTextFor(item: string, flag: CheckupFlag): string {
  const advisory = ITEM_ADVISORIES.find((a) => a.match(item));
  if (advisory) {
    if (flag === 'H' || flag === 'A') return advisory.high;
    if (flag === 'L') return advisory.low;
    return advisory.normal;
  }
  if (flag === 'N') return `「${item}」结果在正常参考范围内。`;
  if (flag === 'L') return `「${item}」结果略低于正常参考范围，需要稍微关注一下。`;
  return `「${item}」结果略高于正常参考范围，需要稍微关注一下。`;
}

/* ============================== 纯函数：开单 ============================== */

/**
 * 体检开单。
 * @param patientId   患者 ID
 * @param packageName 体检套餐（入职/健康/老年/妇科/专项）
 * @param items       体检项目清单
 */
export function createCheckupOrder(
  patientId: string,
  packageName: CheckupPackage,
  items: string[],
): CheckupOrder {
  if (!patientId || typeof patientId !== 'string') throw badRequest('patientId 不能为空');
  if (!CHECKUP_PACKAGES.includes(packageName)) {
    throw badRequest(`非法体检套餐：${String(packageName)}，可选：${CHECKUP_PACKAGES.join(' / ')}`);
  }
  if (!Array.isArray(items) || items.length === 0 || items.some((i) => typeof i !== 'string' || !i.trim())) {
    throw badRequest('items 至少包含一个非空体检项目');
  }
  const order: CheckupOrder = {
    id: nextId('ord'),
    checkupNo: `CK${new Date().getFullYear()}${String(orders.size + 1).padStart(5, '0')}`,
    patientId,
    packageName,
    items: items.map((i) => i.trim()),
    status: 'ordered',
    orderedAt: new Date().toISOString(),
  };
  orders.set(order.id, order);
  resultsByCheckup.set(order.id, []);
  return order;
}

/* ============================== 纯函数：录结果 ============================== */

/**
 * 记录某个体检项目的结果，并自动完成 flag 判定 + 通俗解读。
 * @param checkupId 体检单 ID
 * @param item      项目名（如 收缩压 / 空腹血糖 / BMI）
 * @param value     测量值
 * @param unit      单位（mmHg / mmol/L / kg/m² …）
 * @param refRange  参考区间（如 "90-120"）
 * @param flag      可传 '' | N | H | L | A；留空则按参考区间自动判定
 */
export function recordCheckupResult(
  checkupId: string,
  item: string,
  value: number,
  unit: string,
  refRange: string,
  flag: string,
): CheckupResult {
  const order = orders.get(checkupId);
  if (!order) throw notFound(`体检单不存在：${String(checkupId)}`);
  if (!item || !item.trim()) throw badRequest('item 不能为空');
  if (typeof value !== 'number' || Number.isNaN(value)) throw badRequest('value 必须是数字');

  const resolved = resolveFlag(item.trim(), value, refRange ?? '', flag);
  const abnormal = resolved !== 'N';
  const result: CheckupResult = {
    id: nextId('res'),
    checkupId,
    item: item.trim(),
    value,
    unit: unit ?? '',
    refRange: refRange ?? '',
    flag: resolved,
    abnormal,
    plainText: plainTextFor(item.trim(), resolved),
    advice: adviceFor(item.trim(), resolved),
    recordedAt: new Date().toISOString(),
  };
  const list = resultsByCheckup.get(checkupId) ?? [];
  list.push(result);
  resultsByCheckup.set(checkupId, list);

  // 全部项目录完则自动置为 completed
  if (list.length >= order.items.length) {
    order.status = 'completed';
  } else if (order.status === 'ordered') {
    order.status = 'in_progress';
  }
  return result;
}

/* ============================== 纯函数：出报告 ============================== */

/** 生成“看得懂”的通俗版体检报告 */
export function generateCheckupReport(checkupId: string): CheckupReport {
  const order = orders.get(checkupId);
  if (!order) throw notFound(`体检单不存在：${String(checkupId)}`);
  const results = resultsByCheckup.get(checkupId) ?? [];
  const abnormalItems = results.filter((r) => r.abnormal);
  const normalCount = results.length - abnormalItems.length;

  let summary: string;
  if (results.length === 0) {
    summary = `这是一次「${order.packageName}」，目前还没有录入检查结果，报告待生成。`;
  } else if (abnormalItems.length === 0) {
    summary = `本次「${order.packageName}」共查了 ${results.length} 项，全部在正常范围内，整体情况不错，继续保持！`;
  } else {
    summary =
      `本次「${order.packageName}」共查了 ${results.length} 项，其中 ${normalCount} 项正常，` +
      `${abnormalItems.length} 项需要关注。下面把异常项用红色标了出来，并用大白话写了原因和建议，` +
      `您照着建议调整生活方式，并按时复查即可，不用太紧张。`;
  }

  const overallAdvice =
    abnormalItems.length === 0
      ? '继续保持均衡饮食、规律运动和定期体检的好习惯。'
      : `重点关注 ${abnormalItems.map((r) => `「${r.item}」`).join('、')}：` +
        abnormalItems.map((r) => r.advice).join('；') +
        '。以上为生活方式建议，具体诊疗请到相应科室由医生确认。';

  return {
    checkupId: order.id,
    checkupNo: order.checkupNo,
    patientId: order.patientId,
    packageName: order.packageName,
    summary,
    totalItems: results.length,
    normalCount,
    abnormalCount: abnormalItems.length,
    results,
    abnormalItems,
    overallAdvice,
    generatedAt: new Date().toISOString(),
  };
}

/* ====================== 路由层辅助（读，纯包装） ====================== */

/** 管理端：列出全部体检单 */
export function listCheckupOrdersView(): Array<Omit<CheckupOrder, never> & { resultCount: number }> {
  return [...orders.values()]
    .sort((a, b) => b.orderedAt.localeCompare(a.orderedAt))
    .map((o) => ({ ...o, resultCount: (resultsByCheckup.get(o.id) ?? []).length }));
}

/** 患者端：读取某份体检报告 */
export function getCheckupReportView(checkupId: string): CheckupReport {
  return generateCheckupReport(checkupId);
}
