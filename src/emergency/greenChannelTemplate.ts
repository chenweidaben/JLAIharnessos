/**
 * 健澜科技 jlmedaios - 绿色通道时间节点模板（M1-B1）
 *
 * 为胸痛 / 卒中 / 创伤三类核心绿色通道定义标准时间节点链（节点键、名称、
 * 自到达急诊起的目标分钟数），并在通道完成时计算关键质控指标：
 *  - 卒中：D-to-CT（入门-影像，目标≤25min）、D-to-needle（入门-溶栓，目标≤60min）；
 *  - 胸痛：D-to-B（入门-球囊/PCI，目标≤90min）；首份心电图目标≤10min；
 *  - 创伤：ABC 评估即刻、急诊手术/输血等。
 *
 * 纯函数、可单测；与“先救治后付费”的绿色通道制度一致。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

export type GreenChannelType = 'chest_pain' | 'stroke' | 'trauma' | 'maternal' | 'neonatal';

/** 单个时间节点模板 */
export interface ChannelNodeTemplate {
  nodeKey: string;
  label: string;
  /** 自到达急诊起目标分钟数；0 表示即刻；null 表示无硬性时限 */
  targetMinutes: number | null;
  sortOrder: number;
}

/** 通道模板：节点链 + 需通知团队 + 亚型选项 */
export interface ChannelTemplate {
  type: GreenChannelType;
  name: string;
  nodes: ChannelNodeTemplate[];
  notifyTeams: string[];
  subtypes: string[];
}

/* ----------------------------- 卒中 ----------------------------- */
const STROKE: ChannelTemplate = {
  type: 'stroke',
  name: '卒中绿色通道',
  notifyTeams: ['神经内科', '影像科(CT)', '检验科', '导管室'],
  subtypes: ['急性缺血性卒中', '脑出血', '蛛网膜下腔出血'],
  nodes: [
    { nodeKey: 'arrive', label: '到达急诊', targetMinutes: 0, sortOrder: 0 },
    { nodeKey: 'activate', label: '启动绿色通道', targetMinutes: 0, sortOrder: 1 },
    { nodeKey: 'ct_scan', label: '完成头颅CT（DCT）', targetMinutes: 25, sortOrder: 2 },
    { nodeKey: 'labs', label: '凝血/血常规/血糖回报', targetMinutes: 25, sortOrder: 3 },
    { nodeKey: 'family_consent', label: '家属知情同意', targetMinutes: 45, sortOrder: 4 },
    { nodeKey: 'thrombolysis', label: '静脉溶栓（DNT）', targetMinutes: 60, sortOrder: 5 },
    { nodeKey: 'intervention', label: '血管内治疗/取栓', targetMinutes: 90, sortOrder: 6 },
    { nodeKey: 'transfer_ward', label: '转专科病房', targetMinutes: 120, sortOrder: 7 },
  ],
};

/* ----------------------------- 胸痛 ----------------------------- */
const CHEST_PAIN: ChannelTemplate = {
  type: 'chest_pain',
  name: '胸痛绿色通道',
  notifyTeams: ['心血管内科', '导管室', '检验科', '影像科'],
  subtypes: ['STEMI', 'NSTEMI', '主动脉夹层', '肺栓塞'],
  nodes: [
    { nodeKey: 'arrive', label: '到达急诊', targetMinutes: 0, sortOrder: 0 },
    { nodeKey: 'activate', label: '启动绿色通道', targetMinutes: 0, sortOrder: 1 },
    { nodeKey: 'ecg', label: '首份心电图', targetMinutes: 10, sortOrder: 2 },
    { nodeKey: 'troponin', label: '肌钙蛋白结果', targetMinutes: 20, sortOrder: 3 },
    { nodeKey: 'dual_antiplatelet', label: '双联抗血小板负荷', targetMinutes: 30, sortOrder: 4 },
    { nodeKey: 'pci', label: '球囊扩张/PCI（DB）', targetMinutes: 90, sortOrder: 5 },
    { nodeKey: 'transfer_ccu', label: '转CCU', targetMinutes: 120, sortOrder: 6 },
  ],
};

/* ----------------------------- 创伤 ----------------------------- */
const TRAUMA: ChannelTemplate = {
  type: 'trauma',
  name: '创伤绿色通道',
  notifyTeams: ['创伤外科', '麻醉科', '手术室', '输血科', '影像科', 'ICU'],
  subtypes: ['严重多发伤', '颅脑外伤', '胸腹联合伤', '骨盆骨折'],
  nodes: [
    { nodeKey: 'arrive', label: '到达急诊', targetMinutes: 0, sortOrder: 0 },
    { nodeKey: 'activate', label: '启动绿色通道', targetMinutes: 0, sortOrder: 1 },
    { nodeKey: 'abc', label: '气道/呼吸/循环评估', targetMinutes: 0, sortOrder: 2 },
    { nodeKey: 'fast_us', label: 'FAST床旁超声', targetMinutes: 10, sortOrder: 3 },
    { nodeKey: 'ct', label: '全身CT', targetMinutes: 30, sortOrder: 4 },
    { nodeKey: 'transfusion', label: '启动输血', targetMinutes: 30, sortOrder: 5 },
    { nodeKey: 'surgery', label: '急诊手术', targetMinutes: 60, sortOrder: 6 },
    { nodeKey: 'transfer_icu', label: '转ICU', targetMinutes: 120, sortOrder: 7 },
  ],
};

/* --------------------------- 孕产妇 ------------------------------ */
const MATERNAL: ChannelTemplate = {
  type: 'maternal',
  name: '孕产妇绿色通道',
  notifyTeams: ['产科', '新生儿科', '手术室', '输血科'],
  subtypes: ['产后出血', '胎膜早破', '子痫前期', '急产'],
  nodes: [
    { nodeKey: 'arrive', label: '到达急诊', targetMinutes: 0, sortOrder: 0 },
    { nodeKey: 'activate', label: '启动绿色通道', targetMinutes: 0, sortOrder: 1 },
    { nodeKey: 'assess', label: '产科快速评估', targetMinutes: 10, sortOrder: 2 },
    { nodeKey: 'surgery', label: '急诊剖宫产', targetMinutes: 30, sortOrder: 3 },
  ],
};

/* --------------------------- 新生儿 ------------------------------ */
const NEONATAL: ChannelTemplate = {
  type: 'neonatal',
  name: '新生儿绿色通道',
  notifyTeams: ['新生儿科', 'NICU'],
  subtypes: ['新生儿窒息', '早产儿', '新生儿黄疸'],
  nodes: [
    { nodeKey: 'arrive', label: '到达急诊', targetMinutes: 0, sortOrder: 0 },
    { nodeKey: 'activate', label: '启动绿色通道', targetMinutes: 0, sortOrder: 1 },
    { nodeKey: 'resuscitate', label: '新生儿复苏', targetMinutes: 0, sortOrder: 2 },
    { nodeKey: 'transfer_nicu', label: '转NICU', targetMinutes: 30, sortOrder: 3 },
  ],
};

const TEMPLATES: Record<GreenChannelType, ChannelTemplate> = {
  stroke: STROKE,
  chest_pain: CHEST_PAIN,
  trauma: TRAUMA,
  maternal: MATERNAL,
  neonatal: NEONATAL,
};

/** 获取通道模板 */
export function getChannelTemplate(type: GreenChannelType): ChannelTemplate {
  const t = TEMPLATES[type];
  if (!t) throw new Error(`未知绿色通道类型: ${type}`);
  return t;
}

/** 全部通道类型（供前端下拉） */
export function listChannelTypes(): Array<{ type: GreenChannelType; name: string; subtypes: string[] }> {
  return Object.values(TEMPLATES).map((t) => ({ type: t.type, name: t.name, subtypes: t.subtypes }));
}

/**
 * 计算两个时间的分钟差（arrive → actual），actual 缺失返回 null。
 */
export function elapsedMinutes(arrive: Date | string, actual: Date | string | null): number | null {
  if (!actual) return null;
  const a = new Date(arrive).getTime();
  const b = new Date(actual).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 60000);
}

/**
 * 由节点实际时间计算通道关键质控指标。
 * 返回 dbn / dct / dnt（分钟），以及是否超时。
 */
export interface ChannelMetrics {
  dbnMinutes: number | null;
  dctMinutes: number | null;
  dntMinutes: number | null;
  /** 关键节点超时情况（节点键 → 是否超时） */
  overdue: Record<string, boolean>;
}

export function computeMetrics(
  type: GreenChannelType,
  arriveTime: Date | string,
  nodes: Array<{ nodeKey: string; targetMinutes: number | null; actualTime: Date | string | null }>,
): ChannelMetrics {
  const overdue: Record<string, boolean> = {};
  for (const n of nodes) {
    if (n.actualTime && n.targetMinutes != null) {
      const used = elapsedMinutes(arriveTime, n.actualTime);
      overdue[n.nodeKey] = used != null && used > n.targetMinutes;
    } else {
      overdue[n.nodeKey] = false;
    }
  }

  const findElapsed = (key: string): number | null => {
    const n = nodes.find((x) => x.nodeKey === key);
    return n ? elapsedMinutes(arriveTime, n.actualTime) : null;
  };

  return {
    // 胸痛：PCI 球囊
    dbnMinutes: type === 'chest_pain' ? findElapsed('pci') : null,
    // 卒中：CT
    dctMinutes: type === 'stroke' ? findElapsed('ct_scan') : null,
    // 卒中：溶栓
    dntMinutes: type === 'stroke' ? findElapsed('thrombolysis') : null,
    overdue,
  };
}
