/**
 * 健澜科技数智医院智能体 - security/compliance/ComplianceChecker.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 等保三级合规检查器
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件实现网络安全等级保护三级（等保2.0）合规检查，
 * 覆盖技术与管理两大类共10个控制域，逐项执行检查、汇总结果并给出整改建议。
 * 检查依据：GB/T 22239-2019《信息安全技术 网络安全等级保护基本要求》。
 *
 * @module security/compliance/ComplianceChecker
 */

import { SecurityError } from '../types';

/**
 * 等保三级控制域
 */
export enum ComplianceFamily {
  /** 安全物理环境 */
  PHYSICAL_ENVIRONMENT = '安全物理环境',
  /** 安全通信网络 */
  COMMUNICATION_NETWORK = '安全通信网络',
  /** 安全区域边界 */
  REGION_BOUNDARY = '安全区域边界',
  /** 安全计算环境 */
  COMPUTING_ENVIRONMENT = '安全计算环境',
  /** 安全管理中心 */
  MANAGEMENT_CENTER = '安全管理中心',
  /** 安全管理制度 */
  SECURITY_POLICY = '安全管理制度',
  /** 安全管理机构 */
  SECURITY_ORGANIZATION = '安全管理机构',
  /** 安全管理人员 */
  SECURITY_PERSONNEL = '安全管理人员',
  /** 安全建设管理 */
  SECURITY_CONSTRUCTION = '安全建设管理',
  /** 安全运维管理 */
  SECURITY_OPERATION = '安全运维管理',
}

/**
 * 检查项状态
 */
export type ComplianceStatus = 'pass' | 'fail' | 'partial' | 'not_applicable';

/**
 * 单条合规检查项
 */
export interface ComplianceCheckItem {
  /** 检查项编号（如 TC01.1） */
  id: string;
  /** 所属控制域 */
  family: ComplianceFamily;
  /** 检查项名称 */
  name: string;
  /** 等保要求描述 */
  requirement: string;
  /** 是否为关键项（一票否决） */
  critical: boolean;
}

/**
 * 单条检查结果
 */
export interface ComplianceCheckResult {
  item: ComplianceCheckItem;
  status: ComplianceStatus;
  /** 证据/说明 */
  evidence?: string;
  /** 整改建议 */
  remediation?: string;
}

/**
 * 合规检查报告
 */
export interface ComplianceReport {
  /** 报告生成时间 */
  generatedAt: string;
  /** 系统名称 */
  systemName: string;
  /** 各检查项结果 */
  results: ComplianceCheckResult[];
  /** 汇总 */
  summary: {
    total: number;
    pass: number;
    fail: number;
    partial: number;
    notApplicable: number;
    /** 通过率（百分比） */
    passRate: number;
    /** 是否整体符合等保三级 */
    compliant: boolean;
  };
  /** 各控制域达标情况 */
  familyBreakdown: {
    family: ComplianceFamily;
    total: number;
    pass: number;
    fail: number;
    passRate: number;
  }[];
  /** 不合规项 */
  nonCompliantItems: ComplianceCheckResult[];
}

/**
 * 检查项基线（等保三级要求）
 */
const COMPLIANCE_BASELINE: ComplianceCheckItem[] = [
  // 安全物理环境
  {
    id: 'TC-PHY-01',
    family: ComplianceFamily.PHYSICAL_ENVIRONMENT,
    name: '机房选址与访问控制',
    requirement: '机房场地应避开易发生火灾、水灾的区域，出入口应安装电子门禁系统',
    critical: false,
  },
  {
    id: 'TC-PHY-02',
    family: ComplianceFamily.PHYSICAL_ENVIRONMENT,
    name: '防火防水防潮',
    requirement: '机房应设置火灾自动消防系统，防水防潮检测装置',
    critical: false,
  },
  // 安全通信网络
  {
    id: 'TC-NET-01',
    family: ComplianceFamily.COMMUNICATION_NETWORK,
    name: '网络传输加密',
    requirement: '重要数据传输应采用加密或其他有效措施防止传输过程中被窃听、篡改',
    critical: true,
  },
  {
    id: 'TC-NET-02',
    family: ComplianceFamily.COMMUNICATION_NETWORK,
    name: '网络架构隔离',
    requirement: '应保证网络设备业务部署在其工作区内，重要设备/系统有冗余',
    critical: false,
  },
  // 安全区域边界
  {
    id: 'TC-BND-01',
    family: ComplianceFamily.REGION_BOUNDARY,
    name: '边界访问控制',
    requirement: '应在网络边界根据访问控制策略设置访问控制规则',
    critical: true,
  },
  {
    id: 'TC-BND-02',
    family: ComplianceFamily.REGION_BOUNDARY,
    name: '边界入侵防范',
    requirement: '应在关键网络节点检测、防止或限制从外部发起的网络攻击行为',
    critical: true,
  },
  {
    id: 'TC-BND-03',
    family: ComplianceFamily.REGION_BOUNDARY,
    name: '边界安全审计',
    requirement: '应在网络边界对进出网络的行为进行审计和分析',
    critical: false,
  },
  // 安全计算环境
  {
    id: 'TC-CMP-01',
    family: ComplianceFamily.COMPUTING_ENVIRONMENT,
    name: '身份鉴别',
    requirement: '应对登录用户进行身份标识和鉴别，采用口令/密码技术或生物技术',
    critical: true,
  },
  {
    id: 'TC-CMP-02',
    family: ComplianceFamily.COMPUTING_ENVIRONMENT,
    name: '访问控制',
    requirement: '应对登录的用户分配账户和权限，按最小权限原则管理',
    critical: true,
  },
  {
    id: 'TC-CMP-03',
    family: ComplianceFamily.COMPUTING_ENVIRONMENT,
    name: '安全审计',
    requirement: '应启用安全审计功能，审计覆盖到每个用户，记录重要行为',
    critical: true,
  },
  {
    id: 'TC-CMP-04',
    family: ComplianceFamily.COMPUTING_ENVIRONMENT,
    name: '数据完整性',
    requirement: '应采用校验技术保证重要数据在传输和存储过程中的完整性',
    critical: true,
  },
  {
    id: 'TC-CMP-05',
    family: ComplianceFamily.COMPUTING_ENVIRONMENT,
    name: '数据保密性',
    requirement: '应采用加密技术保证重要数据在传输和存储过程中的保密性',
    critical: true,
  },
  {
    id: 'TC-CMP-06',
    family: ComplianceFamily.COMPUTING_ENVIRONMENT,
    name: '个人信息保护',
    requirement: '应仅采集和保存业务必需的用户个人信息，禁止未授权访问和非法使用',
    critical: true,
  },
  {
    id: 'TC-CMP-07',
    family: ComplianceFamily.COMPUTING_ENVIRONMENT,
    name: '入侵防范',
    requirement: '应通过设定终端接入方式或网络地址范围对访问进行控制',
    critical: false,
  },
  // 安全管理中心
  {
    id: 'TC-MGT-01',
    family: ComplianceFamily.MANAGEMENT_CENTER,
    name: '系统管理',
    requirement: '应对系统管理员进行身份鉴别，通过系统管理中心进行管理',
    critical: false,
  },
  {
    id: 'TC-MGT-02',
    family: ComplianceFamily.MANAGEMENT_CENTER,
    name: '审计管理',
    requirement: '应对审计记录进行保护，定期备份，避免受到未预期的删除、修改或覆盖',
    critical: true,
  },
  {
    id: 'TC-MGT-03',
    family: ComplianceFamily.MANAGEMENT_CENTER,
    name: '安全管理',
    requirement: '应划分特定的系统管理用户，对安全管理员操作进行审计',
    critical: false,
  },
  // 安全管理制度
  {
    id: 'TM-POL-01',
    family: ComplianceFamily.SECURITY_POLICY,
    name: '安全管理制度制定',
    requirement: '应建立包含总体方针、安全策略、管理制度、操作规程等的安全制度体系',
    critical: true,
  },
  {
    id: 'TM-POL-02',
    family: ComplianceFamily.SECURITY_POLICY,
    name: '制度发布与评审',
    requirement: '安全管理制度应发布、评审和定期更新',
    critical: false,
  },
  // 安全管理机构
  {
    id: 'TM-ORG-01',
    family: ComplianceFamily.SECURITY_ORGANIZATION,
    name: '岗位设置与人员配备',
    requirement: '应成立指导和管理网络安全工作的委员会或领导小组',
    critical: true,
  },
  {
    id: 'TM-ORG-02',
    family: ComplianceFamily.SECURITY_ORGANIZATION,
    name: '授权和审批',
    requirement: '应根据业务部门与职能部门的职责分工划分安全管理责任',
    critical: false,
  },
  // 安全管理人员
  {
    id: 'TM-PER-01',
    family: ComplianceFamily.SECURITY_PERSONNEL,
    name: '人员录用与离岗',
    requirement: '应与敏感岗位人员签署保密协议，离岗时收回所有访问权限',
    critical: true,
  },
  {
    id: 'TM-PER-02',
    family: ComplianceFamily.SECURITY_PERSONNEL,
    name: '安全培训',
    requirement: '应制定安全教育培训计划，定期对各类人员进行安全意识培训',
    critical: false,
  },
  // 安全建设管理
  {
    id: 'TM-CST-01',
    family: ComplianceFamily.SECURITY_CONSTRUCTION,
    name: '等级测评',
    requirement: '应定期进行等级测评，发现不符合项及时整改',
    critical: true,
  },
  {
    id: 'TM-CST-02',
    family: ComplianceFamily.SECURITY_CONSTRUCTION,
    name: '产品采购与使用',
    requirement: '应确保采购的安全产品符合国家规定要求，使用经认证的产品',
    critical: false,
  },
  // 安全运维管理
  {
    id: 'TM-OPS-01',
    family: ComplianceFamily.SECURITY_OPERATION,
    name: '环境与资产管理',
    requirement: '应编制资产清单，明确资产责任人',
    critical: false,
  },
  {
    id: 'TM-OPS-02',
    family: ComplianceFamily.SECURITY_OPERATION,
    name: '漏洞与风险管理',
    requirement: '应定期进行漏洞扫描和风险评估，对发现的问题及时修补',
    critical: true,
  },
  {
    id: 'TM-OPS-03',
    family: ComplianceFamily.SECURITY_OPERATION,
    name: '备份与恢复',
    requirement: '应提供重要数据的本地数据备份与恢复功能',
    critical: true,
  },
];

/**
 * 检查器配置
 */
export interface ComplianceCheckerConfig {
  systemName?: string;
}

/**
 * 合规检查器
 *
 * 接收各检查项的实施证据（已实现/部分实现/未实现），
 * 依据等保三级基线逐项判定，汇总生成合规报告与整改建议。
 *
 * @example
 * const checker = new ComplianceChecker();
 * const report = checker.run({
 *   'TC-CMP-03': { status: 'pass', evidence: '审计日志已启用' },
 * });
 */
export class ComplianceChecker {
  private readonly systemName: string;

  constructor(config?: ComplianceCheckerConfig) {
    this.systemName = config?.systemName ?? '健澜科技数智医院智能体';
  }

  /**
   * 获取检查项基线
   *
   * @returns 全部检查项
   */
  public getBaseline(): ComplianceCheckItem[] {
    return COMPLIANCE_BASELINE.map((i) => ({ ...i }));
  }

  /**
   * 执行合规检查
   *
   * @param evidenceMap - 检查项ID到实施状态的映射
   * @returns 合规检查报告
   */
  public run(
    evidenceMap: Record<string, { status: ComplianceStatus; evidence?: string }>,
  ): ComplianceReport {
    const results: ComplianceCheckResult[] = COMPLIANCE_BASELINE.map((item) => {
      const evidence = evidenceMap[item.id];
      const status: ComplianceStatus = evidence?.status ?? 'fail';
      return {
        item,
        status,
        evidence: evidence?.evidence,
        remediation:
          status === 'fail' || status === 'partial' ? this.buildRemediation(item) : undefined,
      };
    });

    return this.buildReport(results);
  }

  /**
   * 构建报告
   */
  private buildReport(results: ComplianceCheckResult[]): ComplianceReport {
    const pass = results.filter((r) => r.status === 'pass').length;
    const fail = results.filter((r) => r.status === 'fail').length;
    const partial = results.filter((r) => r.status === 'partial').length;
    const notApplicable = results.filter((r) => r.status === 'not_applicable').length;
    const applicable = results.length - notApplicable;
    // 部分实现按半分计
    const scored = pass + partial * 0.5;
    const passRate = applicable > 0 ? Math.round((scored / applicable) * 100) : 100;

    // 关键项任一不通过则整体不合规
    const criticalFail = results.some(
      (r) => r.item.critical && (r.status === 'fail' || r.status === 'partial'),
    );

    const families = Array.from(new Set(COMPLIANCE_BASELINE.map((i) => i.family)));
    const familyBreakdown = families.map((family) => {
      const items = results.filter((r) => r.item.family === family);
      const fPass = items.filter((r) => r.status === 'pass' || r.status === 'partial').length;
      const fApplicable = items.filter((r) => r.status !== 'not_applicable').length;
      return {
        family,
        total: items.length,
        pass: fPass,
        fail: items.filter((r) => r.status === 'fail').length,
        passRate: fApplicable > 0 ? Math.round((fPass / fApplicable) * 100) : 100,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      systemName: this.systemName,
      results,
      summary: {
        total: results.length,
        pass,
        fail,
        partial,
        notApplicable,
        passRate,
        compliant: !criticalFail && passRate >= 80,
      },
      familyBreakdown,
      nonCompliantItems: results.filter((r) => r.status === 'fail' || r.status === 'partial'),
    };
  }

  /**
   * 生成整改建议
   */
  private buildRemediation(item: ComplianceCheckItem): string {
    switch (item.family) {
      case ComplianceFamily.COMPUTING_ENVIRONMENT:
        return `落实"${item.name}"：${item.requirement}，建议在计算环境层面对${item.id}配置相应控制措施并留存证据。`;
      case ComplianceFamily.REGION_BOUNDARY:
        return `在网络边界部署相应控制措施，满足"${item.requirement}"。`;
      case ComplianceFamily.MANAGEMENT_CENTER:
        return `完善安全管理中心的${item.name}能力，集中审计并保护审计记录。`;
      default:
        return `依据等保三级要求补全"${item.name}"：${item.requirement}`;
    }
  }

  /**
   * 校验检查项ID是否有效
   */
  public assertValidItemIds(ids: string[]): void {
    const validIds = new Set(COMPLIANCE_BASELINE.map((i) => i.id));
    const invalid = ids.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new SecurityError(
        'INVALID_COMPLIANCE_ITEM',
        `未知的合规检查项: ${invalid.join(', ')}`,
        { invalidIds: invalid },
      );
    }
  }
}
