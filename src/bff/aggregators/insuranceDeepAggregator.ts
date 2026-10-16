/**
 * 健澜科技 jlmedaios - 【护理院感医保药事】医院医保管理深化（M179-C），纯函数。
 *
 * 医保管理要合规，不能骗保。本模块把"事后被医保经办拒付才补救"升级为
 * 「政策目录（药品/诊疗/服务设施 甲乙丙）→ 费用审核（事前/事中/事后三道防线）
 *   → 结算管理（门诊/住院/DRG/DIP）→ 拒付管理（原因/申诉/整改/追回）」的
 *   合规闭环，全部无副作用、不触库，便于单测；数据库读写由路由层负责
 *   （表结构见 deploy/postgres/init/366-insurance-deep.sql）。
 *
 * 政策口径（写死在常量里，可由医保办下发规则覆盖）：
 *  - 甲类目录：临床必需、全额纳入统筹，先行自付比例 0；
 *  - 乙类目录：可选择性使用，需个人先行自付一定比例（药品 10%、诊疗 8%、
 *    服务设施 20%）后再纳入统筹；
 *  - 丙类/目录外：营养保健、特需、VIP 等，全额自费，不纳入统筹；
 *  - 需事前审批项目（高值药品/特殊治疗）未审批即结算，是高发拒付原因；
 *  - 同日同项目重复计费、超限定频次、自费占比异常偏高，为智能审核重点规则。
 *
 * 医疗安全红线：审核结论为「建议」，由医保办人工确认后方可调整/拒付，
 *   不自动改医嘱、不自动改结算，杜绝诱导住院、挂床、分解收费等骗保行为。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

/** 目录项目类别 */
export type PolicyCategory = 'drug' | 'treatment' | 'facility';
/** 医保目录级别：甲=全额纳入；乙=先行自付后纳入；丙=目录外全自费 */
export type PolicyLevel = '甲' | '乙' | '丙';

/** 医保政策目录条目（演示基准；上线后由医保办维护，与 366-insurance-deep.sql 同口径） */
export interface PolicyItem {
  code: string;
  name: string;
  category: PolicyCategory;
  level: PolicyLevel;
  /** 先行自付比例（0~1），甲=0、乙>0、丙=1（全自费） */
  selfPayRatio: number;
  /** 是否需事前审批（高值药品/特殊治疗），未审批即结算为高发拒付原因 */
  needPriorAuth?: boolean;
}

/** 待审核费用条目录入 */
export interface ClaimItem {
  /** 项目/药品编码，用于反查目录 */
  code: string;
  name: string;
  amount: number;
  /** 是否同日同项目重复计费（事中监控信号） */
  repeated?: boolean;
}

/** 医保费用申报单（纯数据，无 I/O） */
export interface InsuranceClaim {
  claimId: string;
  visitId: string;
  dept?: string;
  /** 结算类型 */
  type: 'outpatient' | 'inpatient' | 'drg' | 'dip';
  items: ClaimItem[];
  /** 是否已完成事前审批（事中/事前审核信号） */
  hasPriorAuth?: boolean;
  /** 住院天数（住院类） */
  losDays?: number;
}

/** 审核问题项 */
export interface AuditIssue {
  /** 问题类型：目录外/缺事前审批/重复收费/自费占比偏高/超限定频次 */
  type: 'out_of_catalog' | 'missing_prior_auth' | 'duplicate_charge' | 'high_self_pay' | 'over_limit';
  severity: 'low' | 'medium' | 'high';
  message: string;
}

/** 费用审核结论 */
export interface InsuranceAuditResult {
  claimId: string;
  totalAmount: number;
  /** 统筹纳入基数（元） */
  insuranceBase: number;
  /** 自费金额（先行自付 + 目录外，元） */
  selfPayAmount: number;
  selfPayRatio: number;
  issues: AuditIssue[];
  maxSeverity: 'none' | 'low' | 'medium' | 'high';
  /** pass=可结算 / warn=提示后放行 / reject_suggest=建议退回或拒付 */
  verdict: 'pass' | 'warn' | 'reject_suggest';
}

/** 拒付风险预测结论 */
export interface RejectionRiskResult {
  claimId: string;
  /** 风险分 0~100，越高越可能被医保经办拒付 */
  riskScore: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  /** 风险因子及贡献分 */
  factors: { factor: string; points: number }[];
  advice: string;
}

/** 拒付案件（原因/申诉/整改/追回） */
export interface RejectionCase {
  caseId: string;
  claimId: string;
  reason: string;
  /** 拒付金额（元） */
  amount: number;
  /** 处置阶段：appeal=已申诉 / rectification=整改中 / recovered=已追回 / closed=已结案 */
  stage: 'appeal' | 'rectification' | 'recovered' | 'closed';
  appealed: boolean;
  recovered: boolean;
  note?: string;
}

// ---------------------------------------------------------------------------
// 常量（政策口径）
// ---------------------------------------------------------------------------

/** 本地医保政策目录（演示基准；药品/诊疗/服务设施三类，甲乙丙分级） */
export const INSURANCE_POLICY_CATALOG: PolicyItem[] = [
  // 甲类——全额纳入统筹
  { code: 'D-A001', name: '阿司匹林肠溶片', category: 'drug', level: '甲', selfPayRatio: 0 },
  { code: 'T-A001', name: '血常规检查', category: 'treatment', level: '甲', selfPayRatio: 0 },
  { code: 'F-A001', name: '普通病房床位费', category: 'facility', level: '甲', selfPayRatio: 0 },
  // 乙类——先行自付后纳入
  { code: 'D-B001', name: '注射用头孢克肟', category: 'drug', level: '乙', selfPayRatio: 0.1 },
  { code: 'T-B001', name: 'CT 平扫', category: 'treatment', level: '乙', selfPayRatio: 0.08 },
  { code: 'F-B001', name: '单人间病房床位费', category: 'facility', level: '乙', selfPayRatio: 0.2 },
  // 乙类且需事前审批——高值/特殊治疗
  { code: 'D-B002', name: '靶向抗肿瘤药（限制适应症）', category: 'drug', level: '乙', selfPayRatio: 0.1, needPriorAuth: true },
  { code: 'T-B002', name: '特殊治疗（血液净化）', category: 'treatment', level: '乙', selfPayRatio: 0.08, needPriorAuth: true },
  // 丙类/目录外——全额自费
  { code: 'D-C001', name: '营养保健品类', category: 'drug', level: '丙', selfPayRatio: 1 },
  { code: 'T-C001', name: '特需门诊服务', category: 'treatment', level: '丙', selfPayRatio: 1 },
  { code: 'F-C001', name: 'VIP 病房', category: 'facility', level: '丙', selfPayRatio: 1 },
];

/** 自费占比预警线：>30% 提示自费占比偏高 */
export const HIGH_SELF_PAY_RATIO = 0.3;
/** 目录外金额占比预警线 */
export const OUT_OF_CATALOG_RATIO = 0.2;
/** 高额病例阈值（元），高额申报更易被抽查 */
export const HIGH_AMOUNT_THRESHOLD = 20000;

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/** 按编码反查政策目录，未命中按丙类（目录外全自费）处理 */
export function getPolicyItem(code: string): PolicyItem {
  return (
    INSURANCE_POLICY_CATALOG.find((p) => p.code === code) ?? {
      code,
      name: '目录外项目',
      category: 'treatment',
      level: '丙',
      selfPayRatio: 1,
    }
  );
}

// ---------------------------------------------------------------------------
// 1) 医保费用审核（事前审核 + 事中监控 + 事后稽核）
// ---------------------------------------------------------------------------

/**
 * 医保费用审核：
 *  - 事前：目录匹配（甲全额/乙先行自付/丙全自费）、需审批项目校验事前审批；
 *  - 事中：重复计费监控、自费占比异常；
 *  - 事后：按规则汇总问题，给出 pass/warn/reject_suggest 建议。
 * 审核结论为建议级，需医保办人工确认；非法输入安全降级，绝不抛错。
 */
export function auditInsuranceClaim(claim: InsuranceClaim): InsuranceAuditResult {
  const items = Array.isArray(claim.items) ? claim.items : [];
  const issues: AuditIssue[] = [];

  let totalAmount = 0;
  let insuranceBase = 0;
  let selfPayAmount = 0;
  let outOfCatalogAmount = 0;

  for (const it of items) {
    const amt = Number(it.amount) || 0;
    totalAmount += amt;
    const policy = getPolicyItem(it.code);

    if (policy.level === '甲') {
      insuranceBase += amt;
    } else if (policy.level === '乙') {
      selfPayAmount += round2(amt * policy.selfPayRatio);
      insuranceBase += round2(amt * (1 - policy.selfPayRatio));
      // 事前审核：需审批项目未完成事前审批
      if (policy.needPriorAuth && !claim.hasPriorAuth) {
        issues.push({
          type: 'missing_prior_auth',
          severity: 'high',
          message: `「${policy.name}」属需事前审批项目，本单未见事前审批（${claim.claimId}），建议退回补办或人工核定适应症`,
        });
      }
    } else {
      // 丙类/目录外
      selfPayAmount += amt;
      outOfCatalogAmount += amt;
      issues.push({
        type: 'out_of_catalog',
        severity: 'low',
        message: `「${it.name || policy.name}」不在医保目录内，全额自费，已告知患者并留痕`,
      });
    }

    // 事中监控：同日同项目重复计费
    if (it.repeated) {
      issues.push({
        type: 'duplicate_charge',
        severity: 'medium',
        message: `「${it.name || policy.name}」疑似同日重复计费，需核对是否分解收费`,
      });
    }
  }

  totalAmount = round2(totalAmount);
  selfPayAmount = round2(selfPayAmount);
  insuranceBase = round2(totalAmount - selfPayAmount);
  const selfPayRatio = totalAmount > 0 ? round3(selfPayAmount / totalAmount) : 0;

  // 事后稽核：自费占比异常
  if (selfPayRatio > HIGH_SELF_PAY_RATIO) {
    issues.push({
      type: 'high_self_pay',
      severity: 'medium',
      message: `自费占比 ${(selfPayRatio * 100).toFixed(1)}%，超过 ${(HIGH_SELF_PAY_RATIO * 100).toFixed(0)}% 预警线，需复核目录外项目与知情同意`,
    });
  }
  // 事后稽核：目录外金额占比异常高
  const outRatio = totalAmount > 0 ? outOfCatalogAmount / totalAmount : 0;
  if (outRatio > OUT_OF_CATALOG_RATIO) {
    issues.push({
      type: 'over_limit',
      severity: 'medium',
      message: `目录外金额占比 ${(outRatio * 100).toFixed(1)}%，可能存在超限定范围收费，转事后稽核`,
    });
  }

  const maxSeverity: InsuranceAuditResult['maxSeverity'] = issues.some((i) => i.severity === 'high')
    ? 'high'
    : issues.some((i) => i.severity === 'medium')
      ? 'medium'
      : issues.some((i) => i.severity === 'low')
        ? 'low'
        : 'none';

  const verdict: InsuranceAuditResult['verdict'] =
    maxSeverity === 'high' ? 'reject_suggest' : maxSeverity === 'medium' ? 'warn' : 'pass';

  return {
    claimId: claim.claimId,
    totalAmount,
    insuranceBase,
    selfPayAmount,
    selfPayRatio,
    issues,
    maxSeverity,
    verdict,
  };
}

// ---------------------------------------------------------------------------
// 2) 拒付风险预测
// ---------------------------------------------------------------------------

/**
 * 拒付风险预测：基于目录外占比、重复收费、缺事前审批、高额、乙类占比等
 * 可解释因子加权打分（0~100），输出风险等级与处置建议，纯函数、不自动拒付。
 */
export function predictRejectionRisk(claim: InsuranceClaim): RejectionRiskResult {
  const audit = auditInsuranceClaim(claim);
  const items = Array.isArray(claim.items) ? claim.items : [];
  const factors: RejectionRiskResult['factors'] = [];

  // 因子1：目录外金额占比 > 20%
  const outOfCatalogAmount = items
    .filter((it) => getPolicyItem(it.code).level === '丙')
    .reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const outRatio = audit.totalAmount > 0 ? outOfCatalogAmount / audit.totalAmount : 0;
  if (outRatio > OUT_OF_CATALOG_RATIO) {
    factors.push({ factor: `目录外金额占比 ${(outRatio * 100).toFixed(0)}% 偏高`, points: 30 });
  }

  // 因子2：重复收费信号
  if (items.some((it) => it.repeated)) {
    factors.push({ factor: '存在同日同项目重复计费信号', points: 25 });
  }

  // 因子3：需审批但缺事前审批
  if (items.some((it) => getPolicyItem(it.code).needPriorAuth && !claim.hasPriorAuth)) {
    factors.push({ factor: '高值/特殊治疗项目缺事前审批', points: 30 });
  }

  // 因子4：高额申报易被抽查
  if (audit.totalAmount > HIGH_AMOUNT_THRESHOLD) {
    factors.push({ factor: `高额申报 ${audit.totalAmount} 元，易被医保抽查`, points: 10 });
  }

  // 因子5：自费占比偏高
  if (audit.selfPayRatio > HIGH_SELF_PAY_RATIO) {
    factors.push({ factor: `自费占比 ${(audit.selfPayRatio * 100).toFixed(0)}% 偏高`, points: 10 });
  }

  const riskScore = Math.min(100, factors.reduce((s, f) => s + f.points, 0));
  const level: RejectionRiskResult['level'] =
    riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low';

  const advice =
    level === 'low'
      ? '规则内合规，按正常流程结算并留痕'
      : level === 'medium'
        ? '结算前由医保办人工复核疑点项，补齐知情同意与台账'
        : level === 'high'
          ? '建议暂缓结算，先补办事前审批/病案佐证，避免事后拒付'
          : '高风险申报，必须医保办逐项审核、准备申诉材料后再结算';

  return { claimId: claim.claimId, riskScore, level, factors, advice };
}

// ---------------------------------------------------------------------------
// 3) 深度医保管理总装（政策/审核/结算/拒付四维）
// ---------------------------------------------------------------------------

export interface DeepInsuranceMgmtInput {
  claims?: InsuranceClaim[];
  rejections?: RejectionCase[];
}

export interface DeepInsuranceMgmt {
  /** 维度一：医保政策目录（药品/诊疗/服务设施 × 甲乙丙） */
  policy: {
    drug: number;
    treatment: number;
    facility: number;
    levelA: number;
    levelB: number;
    levelC: number;
  };
  /** 维度二：费用审核（三道防线结果汇总） */
  audit: {
    totalClaims: number;
    pass: number;
    warn: number;
    rejectSuggest: number;
    totalIssues: number;
    highSeverityIssues: number;
  };
  /** 维度三：结算管理（门诊/住院/DRG/DIP 与基金收支） */
  settlement: {
    outpatient: number;
    inpatient: number;
    drg: number;
    dip: number;
    totalAmount: number;
    insuranceBase: number;
    selfPay: number;
    selfPayRatio: number;
  };
  /** 维度四：拒付管理（原因/申诉/整改/追回） */
  rejection: {
    total: number;
    totalAmount: number;
    appealed: number;
    recovered: number;
    openCases: number;
  };
  /** 综合合规率 =（pass 单 / 总申报单） */
  complianceRate: number;
}

/**
 * 深度医保管理总装：政策目录覆盖 + 费用审核 + 结算结构 + 拒付处置。
 * 纯函数，空输入安全降级为零基线，不虚构数字。
 */
export function buildDeepInsuranceMgmt(input: DeepInsuranceMgmtInput = {}): DeepInsuranceMgmt {
  const claims = Array.isArray(input.claims) ? input.claims : [];
  const rejections = Array.isArray(input.rejections) ? input.rejections : [];

  // 维度一：政策目录盘点
  const policy = {
    drug: INSURANCE_POLICY_CATALOG.filter((p) => p.category === 'drug').length,
    treatment: INSURANCE_POLICY_CATALOG.filter((p) => p.category === 'treatment').length,
    facility: INSURANCE_POLICY_CATALOG.filter((p) => p.category === 'facility').length,
    levelA: INSURANCE_POLICY_CATALOG.filter((p) => p.level === '甲').length,
    levelB: INSURANCE_POLICY_CATALOG.filter((p) => p.level === '乙').length,
    levelC: INSURANCE_POLICY_CATALOG.filter((p) => p.level === '丙').length,
  };

  // 维度二：逐单审核
  const audits = claims.map((c) => auditInsuranceClaim(c));
  const totalIssues = audits.reduce((s, a) => s + a.issues.length, 0);
  const highSeverityIssues = audits.reduce(
    (s, a) => s + a.issues.filter((i) => i.severity === 'high').length,
    0,
  );

  // 维度三：结算结构
  let totalAmount = 0;
  let insuranceBase = 0;
  let selfPay = 0;
  for (const a of audits) {
    totalAmount += a.totalAmount;
    insuranceBase += a.insuranceBase;
    selfPay += a.selfPayAmount;
  }
  const settlement = {
    outpatient: claims.filter((c) => c.type === 'outpatient').length,
    inpatient: claims.filter((c) => c.type === 'inpatient').length,
    drg: claims.filter((c) => c.type === 'drg').length,
    dip: claims.filter((c) => c.type === 'dip').length,
    totalAmount: round2(totalAmount),
    insuranceBase: round2(insuranceBase),
    selfPay: round2(selfPay),
    selfPayRatio: totalAmount > 0 ? round3(selfPay / totalAmount) : 0,
  };

  // 维度四：拒付案件
  const rejection = {
    total: rejections.length,
    totalAmount: round2(rejections.reduce((s, r) => s + (Number(r.amount) || 0), 0)),
    appealed: rejections.filter((r) => r.appealed).length,
    recovered: rejections.filter((r) => r.recovered).length,
    openCases: rejections.filter((r) => r.stage === 'appeal' || r.stage === 'rectification').length,
  };

  return {
    policy,
    audit: {
      totalClaims: audits.length,
      pass: audits.filter((a) => a.verdict === 'pass').length,
      warn: audits.filter((a) => a.verdict === 'warn').length,
      rejectSuggest: audits.filter((a) => a.verdict === 'reject_suggest').length,
      totalIssues,
      highSeverityIssues,
    },
    settlement,
    rejection,
    complianceRate: audits.length > 0 ? round3(audits.filter((a) => a.verdict === 'pass').length / audits.length) : 0,
  };
}

// ---------------------------------------------------------------------------
// 4) 医保报告（按期汇总）
// ---------------------------------------------------------------------------

export interface InsuranceReport {
  period: string;
  claimCount: number;
  totalAmount: number;
  insuranceBase: number;
  selfPay: number;
  selfPayRatio: number;
  complianceRate: number;
  rejectionRate: number;
  rejectionAmount: number;
  /** 高频问题类型 TOP */
  topIssueTypes: { type: AuditIssue['type']; count: number }[];
  /** 合规改进建议 */
  recommendations: string[];
}

/**
 * 生成按期医保管理报告：汇总审核/结算/拒付，输出高频问题与整改建议。
 * 纯函数；period 为统计周期（如 2026-09）。时间戳由路由层补充，保证可单测。
 */
export function generateInsuranceReport(
  period: string,
  input: DeepInsuranceMgmtInput = {},
): InsuranceReport {
  const claims = Array.isArray(input.claims) ? input.claims : [];
  const rejections = Array.isArray(input.rejections) ? input.rejections : [];
  const mgmt = buildDeepInsuranceMgmt({ claims, rejections });
  const audits = claims.map((c) => auditInsuranceClaim(c));

  // 高频问题类型统计
  const typeCounter = new Map<AuditIssue['type'], number>();
  for (const a of audits) {
    for (const i of a.issues) {
      typeCounter.set(i.type, (typeCounter.get(i.type) ?? 0) + 1);
    }
  }
  const topIssueTypes = [...typeCounter.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((x, y) => y.count - x.count)
    .slice(0, 5);

  const recommendations: string[] = [];
  if (mgmt.audit.highSeverityIssues > 0) {
    recommendations.push(`存在 ${mgmt.audit.highSeverityIssues} 项高危审核问题（多为缺事前审批），立即补办事前审批与适应症留痕`);
  }
  if (mgmt.rejection.openCases > 0) {
    recommendations.push(`尚有 ${mgmt.rejection.openCases} 件拒付未结案（申诉/整改中），逐件跟踪并在医保经办时限内完成举证`);
  }
  if (mgmt.settlement.selfPayRatio > HIGH_SELF_PAY_RATIO) {
    recommendations.push(`自费占比 ${(mgmt.settlement.selfPayRatio * 100).toFixed(1)}% 偏高，加强目录外项目知情同意与合理用药审核`);
  }
  if (recommendations.length === 0) {
    recommendations.push('本期医保合规指标平稳，维持事前/事中/事后三道防线，按季复盘政策目录更新');
  }

  return {
    period,
    claimCount: audits.length,
    totalAmount: mgmt.settlement.totalAmount,
    insuranceBase: mgmt.settlement.insuranceBase,
    selfPay: mgmt.settlement.selfPay,
    selfPayRatio: mgmt.settlement.selfPayRatio,
    complianceRate: mgmt.complianceRate,
    rejectionRate: audits.length > 0 ? round3(rejections.length / audits.length) : 0,
    rejectionAmount: mgmt.rejection.totalAmount,
    topIssueTypes,
    recommendations,
  };
}
