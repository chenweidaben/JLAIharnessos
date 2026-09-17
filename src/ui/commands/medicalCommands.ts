/**
 * 健澜科技数智医院智能体 - 医疗斜杠命令
 *
 * 定义医疗场景斜杠命令，包含命令定义、描述、参数、处理函数骨架。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type { MedicalCommand } from '../types';

// ============================================================================
// 命令分类
// ============================================================================

/** 命令分类 */
export const COMMAND_CATEGORIES = [
  '患者管理',
  '病历',
  '医嘱',
  '检验检查',
  '用药',
  '警报',
  '临床决策',
  '科室运营',
  '集成',
  '系统',
] as const;

// ============================================================================
// 医疗命令定义
// ============================================================================

/** 全部医疗命令定义 */
export const MEDICAL_COMMANDS: MedicalCommand[] = [
  // ---- 患者管理 ----
  {
    name: 'patient',
    description: '查询/切换患者',
    aliases: ['p', '患者'],
    type: 'local-jsx',
    category: '患者管理',
    usage: '/patient [姓名/住院号/门诊号]',
  },
  {
    name: 'current',
    description: '显示当前患者信息',
    aliases: ['cur', '当前'],
    type: 'local',
    category: '患者管理',
    usage: '/current',
  },
  {
    name: 'summary',
    description: '生成患者摘要',
    aliases: ['sum', '摘要'],
    type: 'prompt',
    category: '患者管理',
    usage: '/summary',
  },
  {
    name: 'history',
    description: '查看患者就诊历史',
    aliases: ['hist', '历史'],
    type: 'local-jsx',
    category: '患者管理',
    usage: '/history [患者ID]',
  },

  // ---- 病历 ----
  {
    name: 'record',
    description: '生成/查看病历',
    aliases: ['r', '病历'],
    type: 'local-jsx',
    category: '病历',
    usage: '/record [类型: 入院/病程/查房/会诊/出院]',
  },
  {
    name: 'qa',
    description: '病历质控检查',
    aliases: ['质控'],
    type: 'prompt',
    category: '病历',
    usage: '/qa [病历ID]',
  },
  {
    name: 'sign',
    description: '病历签名（CA）',
    aliases: ['签名'],
    type: 'local',
    category: '病历',
    usage: '/sign [病历ID]',
  },
  {
    name: 'template',
    description: '病历模板管理',
    aliases: ['tpl', '模板'],
    type: 'local-jsx',
    category: '病历',
    usage: '/template [列表/新建/编辑]',
  },

  // ---- 医嘱 ----
  {
    name: 'order',
    description: '开医嘱/查看医嘱',
    aliases: ['o', '医嘱'],
    type: 'local-jsx',
    category: '医嘱',
    usage: '/order [内容]',
  },
  {
    name: 'order-set',
    description: '医嘱套餐',
    aliases: ['os', '套餐'],
    type: 'local-jsx',
    category: '医嘱',
    usage: '/order-set [搜索/应用]',
  },
  {
    name: 'discontinue',
    description: '停止医嘱',
    aliases: ['dc', '停嘱'],
    type: 'local',
    category: '医嘱',
    usage: '/discontinue [医嘱ID]',
  },
  {
    name: 'vitals',
    description: '查看/录入生命体征',
    aliases: ['v', '体征'],
    type: 'local',
    category: '医嘱',
    usage: '/vitals [录入/查看]',
  },

  // ---- 检验检查 ----
  {
    name: 'lab',
    description: '查检验/开检验',
    aliases: ['l', '检验'],
    type: 'prompt',
    category: '检验检查',
    usage: '/lab [项目名/类别]',
  },
  {
    name: 'imaging',
    description: '查影像/AI分析',
    aliases: ['img', '影像', '检查'],
    type: 'local-jsx',
    category: '检验检查',
    usage: '/imaging [检查类型]',
  },
  {
    name: 'pathology',
    description: '查病理报告',
    aliases: ['path', '病理'],
    type: 'local-jsx',
    category: '检验检查',
    usage: '/pathology [报告ID]',
  },
  {
    name: 'compare',
    description: '检验结果对比/趋势',
    aliases: ['cmp', '对比'],
    type: 'prompt',
    category: '检验检查',
    usage: '/compare [项目名] [时间范围]',
  },

  // ---- 用药 ----
  {
    name: 'drug',
    description: '查药品/相互作用',
    aliases: ['d', '药品', '用药'],
    type: 'prompt',
    category: '用药',
    usage: '/drug [药品名]',
  },
  {
    name: 'interaction',
    description: '药物相互作用检查',
    aliases: ['inter', '相互作用'],
    type: 'prompt',
    category: '用药',
    usage: '/interaction [药品1] [药品2] ...',
  },
  {
    name: 'allergy',
    description: '过敏史查询/录入',
    aliases: ['过敏'],
    type: 'local',
    category: '用药',
    usage: '/allergy [查询/录入]',
  },
  {
    name: 'prescription',
    description: '开具处方',
    aliases: ['rx', '处方'],
    type: 'local-jsx',
    category: '用药',
    usage: '/prescription [药品/剂量/频次]',
  },

  // ---- 警报 ----
  {
    name: 'alert',
    description: '查看/处理警报',
    aliases: ['a', '警报'],
    type: 'local',
    category: '警报',
    usage: '/alert [列表/确认/忽略]',
  },
  {
    name: 'critical',
    description: '危急值管理',
    aliases: ['crit', '危急值'],
    type: 'local-jsx',
    category: '警报',
    usage: '/critical [列表/确认/处理]',
  },

  // ---- 诊断/临床决策 ----
  {
    name: 'diagnosis',
    description: '辅助诊断/鉴别诊断',
    aliases: ['dx', '诊断'],
    type: 'prompt',
    category: '临床决策',
    usage: '/diagnosis [症状/检查结果]',
  },
  {
    name: 'guideline',
    description: '临床指南查询',
    aliases: ['guide', '指南'],
    type: 'prompt',
    category: '临床决策',
    usage: '/guideline [疾病/主题]',
  },
  {
    name: 'ddx',
    description: '鉴别诊断分析',
    type: 'prompt',
    category: '临床决策',
    usage: '/ddx [主要症状]',
  },

  // ---- 会诊 ----
  {
    name: 'consult',
    description: '发起/管理会诊',
    aliases: ['会诊'],
    type: 'local-jsx',
    category: '会诊',
    usage: '/consult [发起/列表/记录]',
  },
  {
    name: 'mdt',
    description: '多学科会诊(MDT)',
    type: 'local-jsx',
    category: '会诊',
    usage: '/mdt [发起/管理]',
  },

  // ---- 模式切换 ----
  {
    name: 'mode',
    description: '切换工作模式',
    aliases: ['m', '模式'],
    type: 'local',
    category: '模式切换',
    usage: '/mode [门诊/查房/会诊/质控]',
  },
  {
    name: 'outpatient',
    description: '切换到门诊模式',
    aliases: ['门诊'],
    type: 'local',
    category: '模式切换',
    usage: '/outpatient',
  },
  {
    name: 'ward',
    description: '切换到查房模式',
    aliases: ['查房'],
    type: 'local',
    category: '模式切换',
    usage: '/ward',
  },

  // ---- 系统 ----
  {
    name: 'help',
    description: '显示帮助和可用命令',
    aliases: ['h', '?', '帮助'],
    type: 'local-jsx',
    category: '系统',
    usage: '/help [命令名]',
  },
  {
    name: 'clear',
    description: '清空当前对话',
    aliases: ['cls', '清空'],
    type: 'local',
    category: '系统',
    usage: '/clear',
  },
  {
    name: 'theme',
    description: '切换主题',
    aliases: ['主题'],
    type: 'local-jsx',
    category: '系统',
    usage: '/theme [jianlan-dark/jianlan-light]',
  },
  {
    name: 'settings',
    description: '系统设置',
    aliases: ['设置', 'config'],
    type: 'local-jsx',
    category: '系统',
    usage: '/settings',
  },
  {
    name: 'keybindings',
    description: '键位绑定管理',
    aliases: ['keys', '键位'],
    type: 'local-jsx',
    category: '系统',
    usage: '/keybindings',
  },
  {
    name: 'status',
    description: '系统状态',
    aliases: ['状态'],
    type: 'local',
    category: '系统',
    usage: '/status',
  },
  {
    name: 'export',
    description: '导出病历/会诊记录',
    aliases: ['导出'],
    type: 'local-jsx',
    category: '系统',
    usage: '/export [类型] [格式]',
  },
  {
    name: 'exit',
    description: '退出程序',
    aliases: ['quit', 'q', '退出'],
    type: 'local',
    category: '系统',
    usage: '/exit',
  },

  // ---- 任务要求：补充完整医疗命令 ----
  // 病历补充
  {
    name: 'generate-record',
    description: 'AI 生成门诊/入院病历',
    aliases: ['gen-record', '生成病历'],
    type: 'prompt',
    category: '病历',
    usage: '/generate-record [类型: 门诊/入院/病程/出院]',
  },
  // 医嘱补充
  {
    name: 'create-order',
    description: '开具临时/长期医嘱（含CDS校验）',
    aliases: ['co', '开嘱'],
    type: 'local-jsx',
    category: '医嘱',
    usage: '/create-order [内容]',
  },
  {
    name: 'cancel-order',
    description: '取消/停用在执行医嘱',
    aliases: ['cancel', '停嘱'],
    type: 'local-jsx',
    category: '医嘱',
    usage: '/cancel-order [医嘱ID]',
  },
  // 检验检查补充
  {
    name: 'order-lab',
    description: '开具检验申请单',
    aliases: ['ol', '开检验'],
    type: 'local-jsx',
    category: '检验检查',
    usage: '/order-lab [项目]',
  },
  {
    name: 'image',
    description: '查询影像/检查报告',
    aliases: ['影像', '看图'],
    type: 'local-jsx',
    category: '检验检查',
    usage: '/image [检查号/部位]',
  },
  {
    name: 'order-image',
    description: '开具影像/检查申请',
    aliases: ['oi', '开检查'],
    type: 'local-jsx',
    category: '检验检查',
    usage: '/order-image [检查项目]',
  },
  // 用药补充
  {
    name: 'create-prescription',
    description: '开具电子处方（含审核）',
    aliases: ['crx', '开处方'],
    type: 'local-jsx',
    category: '用药',
    usage: '/create-prescription [药品/剂量/频次]',
  },
  // 警报补充
  // （critical 已在“警报”分类中定义）
  // 临床决策补充
  {
    name: 'cds',
    description: '临床决策支持(CDS)规则检索',
    aliases: ['cds-check', '临床决策'],
    type: 'prompt',
    category: '临床决策',
    usage: '/cds [症状/用药/检验]',
  },
  {
    name: 'treatment',
    description: '生成治疗方案建议',
    aliases: ['tx', '治疗'],
    type: 'prompt',
    category: '临床决策',
    usage: '/treatment [疾病/主诊断]',
  },
  // 科室运营
  {
    name: 'department',
    description: '科室运行信息一览',
    aliases: ['dept', '科室'],
    type: 'local',
    category: '科室运营',
    usage: '/department [科室名]',
  },
  {
    name: 'schedule',
    description: '医生排班查询',
    aliases: ['排班'],
    type: 'local-jsx',
    category: '科室运营',
    usage: '/schedule [医生/日期]',
  },
  {
    name: 'appointment',
    description: '预约挂号管理',
    aliases: ['预约'],
    type: 'local-jsx',
    category: '科室运营',
    usage: '/appointment [查询/登记/改约]',
  },
  {
    name: 'followup',
    description: '出院随访管理',
    aliases: ['随访'],
    type: 'local-jsx',
    category: '科室运营',
    usage: '/followup [患者/计划]',
  },
  {
    name: 'quality',
    description: '科室质控指标看板',
    aliases: ['质控指标'],
    type: 'local-jsx',
    category: '科室运营',
    usage: '/quality [月度/季度]',
  },
  {
    name: 'drg',
    description: 'DRG/DIP 病组分析',
    aliases: ['drg分析'],
    type: 'local-jsx',
    category: '科室运营',
    usage: '/drg [病组/病案号]',
  },
  {
    name: 'operation',
    description: '科室运营数据看板',
    aliases: ['运营'],
    type: 'local-jsx',
    category: '科室运营',
    usage: '/operation [门诊量/床位/收入]',
  },
  // 集成
  {
    name: 'sync',
    description: '同步 HIS 数据',
    aliases: ['synchis', '同步'],
    type: 'local',
    category: '集成',
    usage: '/sync [患者/全量]',
  },
  {
    name: 'fetch-emr',
    description: '从 EMR 调阅病历',
    aliases: ['emr', '调阅'],
    type: 'local',
    category: '集成',
    usage: '/fetch-emr [患者ID]',
  },
  {
    name: 'hl7',
    description: '查看/发送 HL7 消息',
    aliases: ['hl7msg'],
    type: 'local',
    category: '集成',
    usage: '/hl7 [消息类型/方向]',
  },
  // 系统补充
  {
    name: 'about',
    description: '关于健澜科技与版本信息',
    aliases: ['关于'],
    type: 'local-jsx',
    category: '系统',
    usage: '/about',
  },
];

// ============================================================================
// 拼音/缩写检索索引
// ============================================================================

/** 命令名 → 拼音/缩写 token 列表（用于模糊搜索） */
const COMMAND_PINYIN: Record<string, string[]> = {
  patient: ['huanzhe', 'hz', 'patient', 'bhr'],
  current: ['dangqian', 'dq', 'current'],
  summary: ['zhaiyao', 'zy', 'summary'],
  history: ['lishi', 'ls', 'history'],
  record: ['bingli', 'bl', 'record'],
  'generate-record': ['scbl', 'scbl', 'generate', 'shengcheng'],
  qa: ['zhikong', 'zk', 'qa', 'quality'],
  order: ['yizhu', 'yz', 'order'],
  'create-order': ['kaiyizhu', 'kyz', 'createorder'],
  'cancel-order': ['quxiao', 'qx', 'cancelorder'],
  vitals: ['tizheng', 'tz', 'vitals'],
  lab: ['jianyan', 'jy', 'lab', 'chem'],
  'order-lab': ['kaijianyan', 'kjy'],
  image: ['yingxiang', 'yx', 'image'],
  'order-image': ['kaijiancha', 'kjc'],
  drug: ['yaopin', 'yp', 'drug'],
  prescription: ['chufang', 'cf', 'rx'],
  'create-prescription': ['kaicf', 'kcrx'],
  alert: ['jingbao', 'jb', 'alert'],
  critical: ['weijizhi', 'wjz', 'critical'],
  cds: ['cds', 'linchuangjuece', 'lcjc'],
  diagnosis: ['zhenduan', 'zd', 'dx'],
  treatment: ['zhiliao', 'zl', 'tx'],
  mode: ['moshi', 'ms', 'mode'],
  department: ['keshi', 'ks', 'dept'],
  schedule: ['paiban', 'pb', 'schedule'],
  appointment: ['yuyue', 'yy', 'appt'],
  followup: ['suifang', 'sf', 'follow'],
  quality: ['zhikong', 'zk', 'quality'],
  drg: ['drg', 'jibingzu'],
  operation: ['yunying', 'yy', 'op'],
  sync: ['tongbu', 'tb', 'sync'],
  'fetch-emr': ['diaoyue', 'dy', 'emr'],
  hl7: ['hl7', 'xunxi'],
  help: ['bangzhu', 'bz', 'help'],
  clear: ['qingping', 'qp', 'clear'],
  exit: ['tuichu', 'tc', 'exit'],
  settings: ['shezhi', 'sz', 'settings'],
  about: ['guanyu', 'gy', 'about'],
};

// ============================================================================
// 命令执行结果
// ============================================================================
export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * 解析斜杠命令输入
 * @param input - 用户输入（以/开头）
 * @returns 解析结果：命令名和参数
 */
export function parseSlashCommand(input: string): { name: string; args: string } | null {
  if (!input.startsWith('/')) return null;
  const parts = input.slice(1).split(/\s+/);
  const name = parts[0]?.toLowerCase() ?? '';
  const args = parts.slice(1).join(' ');
  return { name, args };
}

/**
 * 查找命令（支持名称和别名）
 * @param name - 命令名或别名
 * @returns 匹配的命令定义，未找到返回null
 */
export function findCommand(name: string): MedicalCommand | null {
  const lower = name.toLowerCase();
  return (
    MEDICAL_COMMANDS.find((c) => c.name === lower) ??
    MEDICAL_COMMANDS.find((c) => (c.aliases ?? []).some((a) => a.toLowerCase() === lower)) ??
    null
  );
}

/**
 * 按分类获取命令
 * @param category - 分类名称
 * @returns 该分类的命令列表
 */
export function getCommandsByCategory(category: string): MedicalCommand[] {
  return MEDICAL_COMMANDS.filter((c) => c.category === category);
}

/**
 * 模糊搜索命令（支持名称/描述/别名/拼音/缩写）
 * @param query - 搜索关键词
 * @returns 匹配的命令列表
 */
export function searchCommands(query: string): MedicalCommand[] {
  const q = query.toLowerCase().replace(/^\//, '').trim();
  if (!q) return MEDICAL_COMMANDS;
  return MEDICAL_COMMANDS.filter((c) => {
    if (c.name.toLowerCase().includes(q)) return true;
    if (c.description.toLowerCase().includes(q)) return true;
    if ((c.aliases ?? []).some((a) => a.toLowerCase().includes(q))) return true;
    const pinyins = COMMAND_PINYIN[c.name] ?? [];
    if (pinyins.some((p) => p.includes(q))) return true;
    return false;
  });
}

/**
 * 内置命令处理器：为每个命令生成格式化的 Mock 输出
 *
 * 真实集成由 Agent 层完成，此处返回结构化、可读的结果文本，
 * 供命令面板/对话屏幕展示。
 */
const COMMAND_OUTPUTS: Record<string, (args: string) => string> = {
  patient: (a) =>
    `查询患者: ${a || '张明华'}\n  性别: 男  年龄: 58\n  科室: 心血管内科  床号: 1203-5\n  诊断: 冠心病 不稳定型心绞痛\n  过敏史: 青霉素`,
  current: () =>
    `当前患者: 张明华 (P202409001)\n  就诊号: I20260914003  就诊类型: 住院\n  主治: 陈维（主治医师）`,
  history: (a) =>
    `患者就诊历史 (${a || '张明华'}):\n  2026-06-12  心内科门诊  高血压随访\n  2025-11-03  心内科住院  不稳定型心绞痛 PCI术后\n  2024-09-20  急诊      急性胸痛`,
  record: (a) =>
    `调阅病历: ${a || '入院记录'}\n  状态: 已签名/已提交  作者: 陈维\n  质控: 已通过\n  最近修改: 2026-09-14 09:12`,
  'generate-record': (a) =>
    `AI 生成 ${a || '门诊'} 病历草稿完成。\n  含主诉、现病史、既往史、体格检查、初步诊断与诊疗计划。\n  请审阅后 CA 签名。`,
  qa: (a) =>
    `病历质控${a ? ` (${a})` : ''}:\n  ✓ 主诉/现病史完整\n  ⚠ 三级查房记录缺失1份\n  ⚠ 首次病程记录距入院>8h\n  通过率: 92%`,
  order: (a) =>
    `当前医嘱列表${a ? ` 筛选: ${a}` : ''}:\n  长期: 阿司匹林100mg qd · 阿托伐他汀20mg qn\n  临时: 心肌酶谱复查 · 10%葡萄糖酸钙10mL ivp st\n  紧急: 心电监护`,
  'create-order': (a) =>
    `已创建医嘱草稿: ${a || '（待录入内容）'}\n  CDS 校验: 通过（无相互作用/无过敏触发）\n  需 CA 签名后提交 HIS。`,
  'cancel-order': (a) =>
    `取消医嘱: ${a || 'O20260914007'}\n  原医嘱: 华法林 3mg qn\n  原因: 与阿司匹林联用出血风险高\n  状态: 已停止，已通知护理执行。`,
  vitals: () =>
    `当前生命体征:\n  T 36.8℃  P 88次/分  R 18次/分\n  BP 148/92 mmHg  SpO2 97%\n  趋势: BP ↑（较昨日升高）`,
  lab: (a) =>
    `检验结果${a ? ` (${a})` : ''}:\n  肌钙蛋白I 5.20 ng/mL  ↑↑危急\n  血钾    6.8 mmol/L    ↑↑危急\n  血红蛋白 132 g/L     正常\n  INR    2.3           目标内`,
  'order-lab': (a) =>
    `已开具检验申请: ${a || '心肌酶谱+电解质'}\n  标本: 静脉血  优先级: 紧急\n  预计 30 分钟内出结果。`,
  image: (a) =>
    `影像报告${a ? ` (${a})` : ''}:\n  胸部CT: 两肺纹理增多，未见实变\n  心脏彩超: EF 52%，左室舒张功能减低\n  AI 提示: 节段性室壁运动异常，建议结合心电图`,
  'order-image': (a) =>
    `已开具检查申请: ${a || '冠脉CTA'}\n  部位: 冠脉  注意: 需碘过敏试验、肾功能评估`,
  drug: (a) =>
    `药品信息: ${a || '阿司匹林'}\n  类别: 抗血小板  规格: 100mg/片\n  用法: 100mg po qd\n  相互作用: 与华法林联用出血风险↑`,
  prescription: (a) =>
    `处方列表${a ? ` (${a})` : ''}:\n  RX-20260914-011  阿托伐他汀 20mg×14\n  RX-20260914-012  美托洛尔缓释片 47.5mg×7\n  状态: 已审核/已发药`,
  'create-prescription': (a) =>
    `已生成处方草稿: ${a || '（待录入）'}\n  合理用药审核: 通过\n  需药师复核 + CA 双签名。`,
  alert: () =>
    `待处理警报 3 条:\n  🚨 血钾 6.8 mmol/L 危急值（待工号确认）\n  ⚠ 华法林×阿司匹林 相互作用（待确认）\n  🤧 青霉素过敏（已自动过滤）`,
  critical: () =>
    `危急值登记本:\n  2026-09-14 06:35  血钾 6.8  张明华  已通知/处理中\n  2026-09-13 22:10  血糖 2.1  李秀兰  已闭环`,
  cds: (a) =>
    `CDS 规则检索${a ? `: ${a}` : ''}:\n  ✓ 年龄/肾功能剂量调整提示\n  ⚠ 重复用药提示\n  ✕ 无拦截项`,
  diagnosis: (a) =>
    `辅助诊断建议${a ? `: ${a}` : ''}:\n  主诊断: 急性非ST段抬高型心肌梗死\n  鉴别: 主动脉夹层 · 肺栓塞 · 不稳定型心绞痛\n  依据: 肌钙蛋白↑↑ + 胸痛持续 + ECG改变`,
  treatment: (a) =>
    `治疗方案建议${a ? `: ${a}` : ''}:\n  1. 双联抗血小板 DAPT\n  2. 抗凝（低分子肝素）\n  3. 他汀强化 + β受体阻滞剂\n  4. 冠脉造影 + 必要时 PCI`,
  mode: (a) => `工作模式已切换: ${a || '门诊'}\n  可用: 门诊 / 查房 / 会诊 / 质控`,
  department: (a) =>
    `科室信息: ${a || '心血管内科'}\n  床位 60  在院 52  今日门诊 86\n  亚专业: 冠心病/心衰/心律失常`,
  schedule: (a) =>
    `排班查询${a ? `: ${a}` : ''}:\n  陈维  周一/三/五 上午 专家门诊\n  本周手术日: 周二、周四`,
  appointment: (a) =>
    `预约挂号${a ? `: ${a}` : ''}:\n  今日余号: 心内科 上午 3 / 下午 8\n  可改约/退号，请联系患者。`,
  followup: (a) =>
    `随访管理${a ? `: ${a}` : ''}:\n  本周待随访: 6 人（PCI术后2例、心衰3例、出院1例）\n  提醒已自动推送。`,
  quality: (a) =>
    `质控指标${a ? ` (${a})` : ''}:\n  甲级病历率 96.2%  危重抢救成功率 91%\n  住院死亡率 0.8%  平均住院日 7.4天`,
  drg: (a) =>
    `DRG 分析${a ? `: ${a}` : ''}:\n  主病组: FM11 冠心病介入  权重 1.82\n  费用: 2.1万  定额: 2.4万  结余 +3000`,
  operation: (a) =>
    `运营看板${a ? `: ${a}` : ''}:\n  月门诊量 2,430  床位使用率 86%\n  药占比 28%  耗占比 12%`,
  sync: (a) =>
    `HIS 同步${a ? `: ${a}` : ''}... 完成\n  同步医嘱 24 条 · 检验 8 条 · 费用单 12 条\n  状态: 一致。`,
  'fetch-emr': (a) =>
    `从 EMR 调阅 ${a || 'P202409001'} 病历...\n  入院记录 1 · 病程记录 12 · 手术记录 1\n  已完成脱敏与审计记录。`,
  hl7: (a) =>
    `HL7 消息${a ? ` (${a})` : ''}:\n  今日出站 ADT^A04 32 条 · 入站 ORU^R01 128 条\n  MLLP 连接: 已建立，无积压。`,
  help: (a) => (a ? getCommandHelp(a) : generateHelpText()),
  clear: () => '对话已清空。',
  exit: () => '正在退出健澜科技数智医院智能体...',
  settings: () =>
    `设置面板:\n  主题: jianlan-dark  流式速度: 12ms/字\n  CDS 拦截强度: 严格  审计日志: 开启`,
  about: () =>
    `健澜科技数智医院智能体 v1.0.0\n  基于 claude-code 2.1.88 架构定制\n  Copyright (c) 2026 健澜科技. All rights reserved.`,
};

/**
 * 执行命令（带格式化输出）
 * @param name - 命令名
 * @param args - 命令参数
 * @returns 执行结果
 */
export async function executeCommand(name: string, args: string): Promise<CommandResult> {
  const cmd = findCommand(name);
  if (!cmd) {
    return { success: false, message: `未知命令: /${name}，输入 /help 查看可用命令` };
  }

  const handler = COMMAND_OUTPUTS[cmd.name];
  if (handler) {
    return { success: true, message: handler(args), data: { command: cmd.name, args } };
  }

  // 兜底：按命令类型返回
  switch (cmd.type) {
    case 'local':
      return {
        success: true,
        message: `[本地命令] /${cmd.name} ${args}\n（命令处理将在Agent集成层实现）`,
      };
    case 'prompt':
      return {
        success: true,
        message: `[Prompt命令] /${cmd.name} ${args}\n（将生成Prompt发送给AI模型）`,
      };
    case 'local-jsx':
      return { success: true, message: `[JSX命令] /${cmd.name} ${args}\n（将渲染交互式UI组件）` };
    default:
      return { success: false, message: `未知命令类型: ${String(cmd.type)}` };
  }
}

/**
 * 获取命令帮助文本
 * @param name - 命令名
 * @returns 帮助文本
 */
export function getCommandHelp(name: string): string {
  const cmd = findCommand(name);
  if (!cmd) return `未知命令: /${name}`;
  const lines = [
    `命令: /${cmd.name}`,
    `描述: ${cmd.description}`,
    `分类: ${cmd.category}`,
    `类型: ${cmd.type}`,
  ];
  if (cmd.aliases && cmd.aliases.length > 0) {
    lines.push(`别名: ${cmd.aliases.map((a) => '/' + a).join(', ')}`);
  }
  if (cmd.usage) {
    lines.push(`用法: ${cmd.usage}`);
  }
  return lines.join('\n');
}

/**
 * 生成全部命令帮助列表
 * @returns 格式化的帮助文本
 */
export function generateHelpText(): string {
  const lines: string[] = ['健澜科技数智医院智能体 - 可用命令\n'];
  for (const category of COMMAND_CATEGORIES) {
    const cmds = getCommandsByCategory(category);
    if (cmds.length === 0) continue;
    lines.push(`\n【${category}】`);
    for (const cmd of cmds) {
      lines.push(`  /${cmd.name.padEnd(14)} ${cmd.description}`);
    }
  }
  lines.push('\n提示: 输入 /help <命令名> 查看详细用法');
  return lines.join('\n');
}
