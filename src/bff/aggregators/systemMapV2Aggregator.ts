/**
 * 健澜科技 jlmedaios - M181-B 系统功能全景图 V2 聚合器（300版本里程碑）
 *
 * 本模块为纯函数层，不依赖数据库与网络，便于单测与复用：
 *  - buildSystemMapV2()：一次性构建十大领域、全部子模块的系统全景 V2（SystemMapV2）；
 *  - getModuleCoverageV2()：基于全景统计模块覆盖率（CoverageStatsV2）。
 *
 * 十大领域（300版本里程碑 · 全覆盖、不漏模块）：
 *  1) 临床业务：门诊/住院/病历/处方/检查/检验/手术/麻醉/输血/DRG
 *  2) 护理业务：排班/交班/执行/风险/质量/MUSE
 *  3) 药事业务：审方/库存/采购/ADR/生命周期/抗菌药/SPD
 *  4) 管理业务：质控/院感/绩效/财务/设备/耗材/医保
 *  5) AI 能力：诊断/病历/用药/影像/问答/预测/科研/CDSS
 *  6) 平台能力：学习引擎/Personal Agent/知识联邦/自学习/数字孪生
 *  7) 患者服务：预约/缴费/报告/导诊/导航/教育/随访/MUSE
 *  8) 集团能力：多院/对比/调配/标准统一
 *  9) 运营支撑：病案/统计/设备/耗材/财务/人力/行政/党建
 * 10) 安全合规：等保三级/安全审计/数据脱敏/入侵防范
 *
 * 覆盖率口径（生产级，可复算）：
 *  - done（已上线）记 1 分，partial（部分实现）记 0.5 分，planned（规划中）记 0 分；
 *  - coveragePct = round1((done + 0.5 * partial) / total * 100)；
 *  - 每个领域独立给出同口径覆盖率，便于定位薄弱环节。
 *
 * 生产安全：本切片纯函数 + 路由 + 前端，无新表、不写 SQL、不触碰 WebSocket、不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 模块交付状态：done=已上线 / partial=部分实现 / planned=规划中 */
export type ModuleStatusV2 = 'done' | 'partial' | 'planned';

/** 单个功能模块（全景图叶子节点） */
export interface SystemModuleV2 {
  /** 模块稳定键：<domain>.<sub>，如 clinical.outpatient */
  key: string;
  /** 模块中文名 */
  name: string;
  /** 交付状态 */
  status: ModuleStatusV2;
  /** 模块用途一句话说明 */
  description: string;
  /** 代表端点/聚合器线索（前端悬停参考，可能为空串） */
  surface: string;
}

/** 一个业务领域（全景图分区） */
export interface SystemDomainV2 {
  /** 领域稳定键：clinical/nursing/pharmacy/management/ai/platform/patient/group/ops/security */
  key: string;
  /** 领域中文名 */
  name: string;
  /** 领域下全部子模块 */
  modules: SystemModuleV2[];
}

/** 系统功能全景图 V2（buildSystemMapV2 输出） */
export interface SystemMapV2 {
  /** 里程碑版本号（300版本里程碑） */
  version: string;
  /** 里程碑标注 */
  milestone: string;
  /** 构建时间 ISO 字符串 */
  generatedAt: string;
  /** 版权归属 */
  company: string;
  /** 十大领域 */
  domains: SystemDomainV2[];
}

/** 单领域覆盖率统计 */
export interface DomainCoverageV2 {
  key: string;
  name: string;
  total: number;
  done: number;
  partial: number;
  planned: number;
  /** 该领域覆盖率（0-100，保留 1 位小数） */
  coveragePct: number;
}

/** 模块覆盖率总览（getModuleCoverageV2 输出） */
export interface CoverageStatsV2 {
  totalDomains: number;
  totalModules: number;
  done: number;
  partial: number;
  planned: number;
  /** 全院覆盖率（0-100，保留 1 位小数） */
  coveragePct: number;
  /** 各领域覆盖率明细 */
  byDomain: DomainCoverageV2[];
}

/**
 * 全景图模块注册表（唯一事实来源 · 300版本里程碑 V2）。
 * 十大领域逐一枚举题目要求的全部子模块，确保「覆盖所有模块、不能漏」。
 * status 依据当前仓库聚合器/路由落地情况标注，随里程碑推进可上调。
 */
const REGISTRY_V2: SystemDomainV2[] = [
  {
    key: 'clinical',
    name: '临床业务',
    modules: [
      { key: 'clinical.outpatient', name: '门诊', status: 'done', description: '门诊工作站：挂号、就诊、开方、医嘱闭环', surface: '/api/v1/outpatient' },
      { key: 'clinical.inpatient', name: '住院', status: 'done', description: '住院管理：入出转、医嘱、病程、结算', surface: '/api/v1/inpatient' },
      { key: 'clinical.medicalRecord', name: '病历', status: 'done', description: '电子病历：EMR 五级、模板、质控、归档', surface: '/api/v1/medical' },
      { key: 'clinical.prescription', name: '处方', status: 'done', description: '处方流转与合规审查', surface: '/api/v1/prescription-review' },
      { key: 'clinical.exam', name: '检查', status: 'done', description: '检查申请与报告（RIS）', surface: '/api/v1/ris' },
      { key: 'clinical.lab', name: '检验', status: 'done', description: '检验申请与报告（LIS）、危急值闭环', surface: '/api/v1/lis' },
      { key: 'clinical.surgery', name: '手术', status: 'done', description: '手术排班、安全核查、术后记录', surface: '/api/v1/surgery' },
      { key: 'clinical.anesthesia', name: '麻醉', status: 'partial', description: '麻醉记录与 PACU 复苏跟踪', surface: '/api/v1/pacu-record' },
      { key: 'clinical.transfusion', name: '输血', status: 'done', description: '输血申请、交叉配血与不良反应闭环', surface: '/api/v1/transfusion' },
      { key: 'clinical.drg', name: 'DRG', status: 'done', description: 'DRG/DIP 分组、病组成本与预付管理', surface: '/api/v1/drg' },
    ],
  },
  {
    key: 'nursing',
    name: '护理业务',
    modules: [
      { key: 'nursing.schedule', name: '排班', status: 'done', description: '护理智能排班与人力调度', surface: '/api/v1/smart-schedule' },
      { key: 'nursing.handover', name: '交班', status: 'done', description: '护理交班（SBAR 结构化）', surface: '/api/v1/nursing/handover' },
      { key: 'nursing.execution', name: '执行', status: 'done', description: '医嘱执行单与移动护理核对', surface: '/api/v1/med-admin' },
      { key: 'nursing.risk', name: '风险', status: 'done', description: '跌倒/压疮/VTE 等护理风险评估', surface: '/api/v1/nursing/risk' },
      { key: 'nursing.quality', name: '质量', status: 'done', description: '护理敏感质量指标（NQI）', surface: '/api/v1/nursing/nqi' },
      { key: 'nursing.muse', name: 'MUSE', status: 'done', description: '护士 MUSE 工作台：任务、学习、成长', surface: '/api/v1/nurse-muse' },
    ],
  },
  {
    key: 'pharmacy',
    name: '药事业务',
    modules: [
      { key: 'pharmacy.review', name: '审方', status: 'done', description: '处方前置审核与合理用药审查', surface: '/api/v1/drug-review' },
      { key: 'pharmacy.inventory', name: '库存', status: 'done', description: '药库/药房库存与近效期预警', surface: '/api/v1/drug-inventory' },
      { key: 'pharmacy.procurement', name: '采购', status: 'partial', description: '药品采购计划与供应商协同', surface: '' },
      { key: 'pharmacy.adr', name: 'ADR', status: 'planned', description: '药品不良反应上报与监测', surface: '' },
      { key: 'pharmacy.lifecycle', name: '生命周期', status: 'done', description: '药品全生命周期管理（准入到退市）', surface: '/api/v1/drug-lifecycle' },
      { key: 'pharmacy.antibiotic', name: '抗菌药', status: 'done', description: '抗菌药分级管理与使用强度监控', surface: '/api/v1/antibiotic-deep' },
      { key: 'pharmacy.spd', name: 'SPD', status: 'done', description: '耗材 SPD 院内供应链物流与追溯', surface: '/api/v1/consumable-spd' },
    ],
  },
  {
    key: 'management',
    name: '管理业务',
    modules: [
      { key: 'management.qc', name: '质控', status: 'done', description: '医疗质量闭环与 PDCA 整改', surface: '/api/v1/quality-pdca' },
      { key: 'management.infection', name: '院感', status: 'done', description: '院感实时监测、聚集追踪与月报', surface: '/api/v1/infection-control' },
      { key: 'management.performance', name: '绩效', status: 'done', description: '科室/个人绩效与对标分析', surface: '/api/v1/performance-review' },
      { key: 'management.finance', name: '财务', status: 'done', description: '收费、结算、DRG/DIP 成本', surface: '/api/v1/billing' },
      { key: 'management.equipment', name: '设备', status: 'done', description: '医疗设备台账与巡检', surface: '/api/v1/equipment' },
      { key: 'management.consumable', name: '耗材', status: 'done', description: '高值/低值耗材请领与追溯', surface: '/api/v1/supply' },
      { key: 'management.insurance', name: '医保', status: 'done', description: '医保审核、拒付分析与智能对账', surface: '/api/v1/insurance-review' },
    ],
  },
  {
    key: 'ai',
    name: 'AI能力',
    modules: [
      { key: 'ai.diagnose', name: '诊断', status: 'done', description: 'AI 辅助诊断（Top5/鉴别/检验影像联动）', surface: '/api/v1/deep-diagnose' },
      { key: 'ai.record', name: '病历', status: 'done', description: '病历智能书写、质控与语音录入', surface: '/api/v1/ai-record' },
      { key: 'ai.medication', name: '用药', status: 'done', description: 'AI 用药审查与相互作用提示', surface: '/api/v1/ai-drug-review' },
      { key: 'ai.imaging', name: '影像', status: 'done', description: '影像 AI 辅助阅片与结构化报告', surface: '/api/v1/imaging-ai' },
      { key: 'ai.qa', name: '问答', status: 'done', description: '医学知识问答与助手对话', surface: '/api/v1/medical-qa' },
      { key: 'ai.forecast', name: '预测', status: 'done', description: '运营预测：出院日 LOS、急诊量、床位', surface: '/api/v1/admin/forecast' },
      { key: 'ai.research', name: '科研', status: 'done', description: '科研智能检索与自动统计', surface: '/api/v1/research/smart-search' },
      { key: 'ai.cdss', name: 'CDSS', status: 'done', description: '临床决策支持：规则/指南/危急值闭环', surface: '/api/v1/cdss-deep' },
    ],
  },
  {
    key: 'platform',
    name: '平台能力',
    modules: [
      { key: 'platform.learningEngine', name: '学习引擎', status: 'done', description: '在岗学习、课程与学习曲线', surface: '/api/v1/learning-dashboard' },
      { key: 'platform.personalAgent', name: 'Personal Agent', status: 'partial', description: '医师个人智能助理（偏好/成长）', surface: '/api/v1/personal-growth' },
      { key: 'platform.knowledgeFed', name: '知识联邦', status: 'done', description: '跨院知识联邦与隐私计算', surface: '/api/v1/knowledge-federation' },
      { key: 'platform.selfLearning', name: '自学习', status: 'done', description: '越用越聪明：反馈驱动的自学习闭环', surface: '/api/v1/self-learning' },
      { key: 'platform.digitalTwin', name: '数字孪生', status: 'done', description: '医院数字孪生：3D 院区与运营仿真', surface: '/api/v1/digital-twin' },
    ],
  },
  {
    key: 'patient',
    name: '患者服务',
    modules: [
      { key: 'patient.appointment', name: '预约', status: 'done', description: '预约挂号与号源调度', surface: '/api/v1/appt' },
      { key: 'patient.payment', name: '缴费', status: 'done', description: '移动支付与结算', surface: '/api/v1/internet-payment' },
      { key: 'patient.report', name: '报告', status: 'done', description: '检验检查报告推送与解读', surface: '/api/v1/patient-lab-explain' },
      { key: 'patient.guide', name: '导诊', status: 'done', description: '智能导诊与预问诊分诊', surface: '/api/v1/patient-guide' },
      { key: 'patient.navigation', name: '导航', status: 'planned', description: '院内室内导航与找路', surface: '' },
      { key: 'patient.education', name: '教育', status: 'done', description: '患教内容与个性化推送', surface: '/api/v1/patient-education' },
      { key: 'patient.followup', name: '随访', status: 'done', description: '出院随访与慢病随访闭环', surface: '/api/v1/smart-followup' },
      { key: 'patient.muse', name: 'MUSE', status: 'done', description: '患者 MUSE：健康计划与自我管理', surface: '/api/v1/patient-muse' },
    ],
  },
  {
    key: 'group',
    name: '集团能力',
    modules: [
      { key: 'group.multiHospital', name: '多院', status: 'done', description: '集团多院统一看板与租户管理', surface: '/api/v1/admin/group/dashboard' },
      { key: 'group.benchmark', name: '对比', status: 'done', description: '院际/科际对标与绩效横比', surface: '/api/v1/performance-benchmark' },
      { key: 'group.dispatch', name: '调配', status: 'partial', description: '集团内专家/床位/资源跨院调配', surface: '' },
      { key: 'group.standard', name: '标准统一', status: 'partial', description: '集团统一诊疗规范与数据标准', surface: '/api/v1/regional-coop' },
    ],
  },
  {
    key: 'ops',
    name: '运营支撑',
    modules: [
      { key: 'ops.archive', name: '病案', status: 'done', description: '病案首页、编目与归档质控', surface: '/api/v1/medical-archive' },
      { key: 'ops.statistics', name: '统计', status: 'done', description: '医院统计报表与上报数据', surface: '/api/v1/stat-report' },
      { key: 'ops.equipment', name: '设备', status: 'done', description: '设备全生命周期运维与效益分析', surface: '/api/v1/equipment-deep' },
      { key: 'ops.consumable', name: '耗材', status: 'done', description: '耗材二级库与消耗核算', surface: '/api/v1/supply' },
      { key: 'ops.finance', name: '财务', status: 'done', description: '财务核算、预算与成本分析', surface: '/api/v1/finance' },
      { key: 'ops.hr', name: '人力', status: 'done', description: '人事、排班与人才发展', surface: '/api/v1/hr-deep' },
      { key: 'ops.admin', name: '行政', status: 'done', description: 'OA 审批、公文与行政事务', surface: '/api/v1/oa-approval' },
      { key: 'ops.party', name: '党建', status: 'done', description: '党建工作与工会活动管理', surface: '/api/v1/party-culture' },
    ],
  },
  {
    key: 'security',
    name: '安全合规',
    modules: [
      { key: 'security.mlps', name: '等保三级', status: 'done', description: '网络安全等级保护三级合规基线', surface: '/api/v1/security-baseline' },
      { key: 'security.audit', name: '安全审计', status: 'done', description: '操作审计、登录日志与追溯', surface: '/api/v1/audit-log' },
      { key: 'security.masking', name: '数据脱敏', status: 'done', description: '敏感字段脱敏与隐私保护', surface: '/api/v1/admin/mask-config' },
      { key: 'security.intrusion', name: '入侵防范', status: 'partial', description: '入侵检测、漏洞扫描与基线核查', surface: '/api/v1/security-scan' },
    ],
  },
];

/** 覆盖率计分权重：done=1，partial=0.5，planned=0 */
const STATUS_WEIGHT_V2: Record<ModuleStatusV2, number> = {
  done: 1,
  partial: 0.5,
  planned: 0,
};

/** 保留 1 位小数（四舍五入） */
function round1V2(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * 构建系统功能全景图 V2（纯函数 · 300版本里程碑）。
 *  - 每次调用返回全新对象，generatedAt 取当前时刻 ISO；
 *  - domains 顺序与注册表一致（十大领域固定排列），便于前端稳定渲染；
 *  - 不依赖任何入参，空运行环境也可产出完整全景。
 */
export function buildSystemMapV2(): SystemMapV2 {
  return {
    version: '3.0.0',
    milestone: '300版本里程碑 M181-B',
    generatedAt: new Date().toISOString(),
    company: '杭州健澜科技有限公司',
    domains: REGISTRY_V2.map((d) => ({
      key: d.key,
      name: d.name,
      modules: d.modules.map((m) => ({ ...m })),
    })),
  };
}

/** 统计单个领域的模块计数与覆盖率 */
function summarizeDomainV2(domain: SystemDomainV2): DomainCoverageV2 {
  const modules = Array.isArray(domain.modules) ? domain.modules : [];
  let done = 0;
  let partial = 0;
  let planned = 0;
  for (const m of modules) {
    if (m.status === 'done') done += 1;
    else if (m.status === 'partial') partial += 1;
    else planned += 1;
  }
  const total = modules.length;
  const coveragePct = total === 0 ? 0 : round1V2(((done + 0.5 * partial) / total) * 100);
  return { key: domain.key, name: domain.name, total, done, partial, planned, coveragePct };
}

/**
 * 计算模块覆盖率统计（纯函数 · V2）。
 *  - 不传参时基于 buildSystemMapV2() 默认全景；
 *  - 支持传入自定义 SystemMapV2 做测试/裁剪场景；
 *  - map 非对象 / domains 非数组时安全兜底为全零统计，不抛错。
 */
export function getModuleCoverageV2(map?: SystemMapV2): CoverageStatsV2 {
  const source: SystemMapV2 = map ?? buildSystemMapV2();
  const domains =
    source && Array.isArray(source.domains) ? source.domains : [];

  const byDomain = domains.map(summarizeDomainV2);

  const done = byDomain.reduce((s, d) => s + d.done, 0);
  const partial = byDomain.reduce((s, d) => s + d.partial, 0);
  const planned = byDomain.reduce((s, d) => s + d.planned, 0);
  const totalModules = done + partial + planned;
  const coveragePct =
    totalModules === 0 ? 0 : round1V2(((done + 0.5 * partial) / totalModules) * 100);

  return {
    totalDomains: byDomain.length,
    totalModules,
    done,
    partial,
    planned,
    coveragePct,
    byDomain,
  };
}

/** 供外部/测试引用：注册表模块总数常量（= 十大领域子模块数） */
export const REGISTRY_V2_MODULE_COUNT = REGISTRY_V2.reduce((s, d) => s + d.modules.length, 0);

/** 供外部/测试引用：十大领域数 */
export const REGISTRY_V2_DOMAIN_COUNT = REGISTRY_V2.length;

/** 状态权重只读暴露（便于测试复算） */
export { STATUS_WEIGHT_V2 };
