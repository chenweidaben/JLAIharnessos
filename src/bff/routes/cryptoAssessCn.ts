/** 健澜科技：P2 等保三级商用密码应用安全性评估自评（M86-O）。DEMO_MODE 下内存密评数据。 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** 密评状态枚举（与前端 Select 选项一一对应） */
type AssessStatus = 'compliant' | 'partial' | 'noncompliant' | 'not-applicable';

const ASSESS_STATUS: readonly AssessStatus[] = ['compliant', 'partial', 'noncompliant', 'not-applicable'];

/** 五大测评域（GB/T 39786-2021 / GM/T 0054-2018 商用密码应用安全性评估维度） */
type AssessDomain =
  | 'physical-environment'
  | 'network-communication'
  | 'device-computing'
  | 'application-data'
  | 'management';

const DOMAIN_LABEL: Record<AssessDomain, string> = {
  'physical-environment': '物理和环境安全',
  'network-communication': '网络和通信安全',
  'device-computing': '设备和计算安全',
  'application-data': '应用和数据安全',
  management: '管理制度',
};

/** 密评测评项 */
interface AssessItem {
  itemId: string;
  domain: AssessDomain;
  name: string;
  gmtCode: string;
  requirement: string;
  selfStatus: AssessStatus;
  evidence?: string;
}

/**
 * DEMO_MODE 内存密评台账（12 项，五域分布：物理2 / 网络2 / 设备2 / 应用3 / 管理3）。
 * 状态预置：多数 compliant，少量 partial / noncompliant，用于驱动整改面板与"不符合"总体结论演示。
 */
const demoStore: AssessItem[] = [
  // 物理和环境安全
  {
    itemId: 'CA-PE-01',
    domain: 'physical-environment',
    name: '机房出入口电子门禁身份鉴别',
    gmtCode: 'GMT_0054_PE01',
    requirement: '机房出入口应配置电子门禁系统，采用密码技术对进入人员身份进行鉴别，重要区域身份鉴别信息应采用密码技术保证完整性。',
    selfStatus: 'compliant',
    evidence: '机房双因子门禁（工卡+PIN），门禁日志按月归档。',
  },
  {
    itemId: 'CA-PE-02',
    domain: 'physical-environment',
    name: '机房区域监控记录完整性保护',
    gmtCode: 'GMT_0054_PE02',
    requirement: '机房应配置监控视频记录系统，视频记录应采用密码技术保证存储和传输过程中的完整性。',
    selfStatus: 'partial',
    evidence: '监控已部署，视频完整性保护待接入国密摘要（SM3）存证。',
  },
  // 网络和通信安全
  {
    itemId: 'CA-NC-01',
    domain: 'network-communication',
    name: '通信网络实体身份鉴别',
    gmtCode: 'GMT_0054_NC01',
    requirement: '通信实体之间应采用密码技术实现双向身份鉴别，鉴别信息在传输过程中应采用密码技术保证保密性。',
    selfStatus: 'compliant',
    evidence: 'BFF 与院内网关双向 mTLS（国密证书占位）。',
  },
  {
    itemId: 'CA-NC-02',
    domain: 'network-communication',
    name: '重要通信传输数据保密性与完整性',
    gmtCode: 'GMT_0054_NC02',
    requirement: '采用密码技术保证通信过程中重要数据的保密性和完整性，应建立安全的网络通信信道。',
    selfStatus: 'partial',
    evidence: '门诊/住院业务信道已加密；检验结果回传信道仍为 TLS1.2，待升级国密 SM2/SM3/SM4 套件。',
  },
  // 设备和计算安全
  {
    itemId: 'CA-DC-01',
    domain: 'device-computing',
    name: '操作系统登录身份鉴别',
    gmtCode: 'GMT_0054_DC01',
    requirement: '应对登录设备的用户进行身份鉴别，身份鉴别信息应采用密码技术进行加密存储和传输。',
    selfStatus: 'compliant',
    evidence: '服务器账号口令加盐哈希存储，堡垒机单点登录。',
  },
  {
    itemId: 'CA-DC-02',
    domain: 'device-computing',
    name: '远程管理通道保密性',
    gmtCode: 'GMT_0054_DC02',
    requirement: '设备远程管理通道应采用密码技术建立安全通信，防止鉴别信息被窃听。',
    selfStatus: 'noncompliant',
    evidence: '部分运维终端仍直连 SSH 22 端口，未纳入国密堡垒机代理。',
  },
  // 应用和数据安全
  {
    itemId: 'CA-AD-01',
    domain: 'application-data',
    name: '应用系统用户身份鉴别',
    gmtCode: 'GMT_0054_AD01',
    requirement: '应用系统应对登录用户进行身份鉴别，采用密码技术保护鉴别信息的保密性和完整性。',
    selfStatus: 'compliant',
    evidence: '统一认证平台签发国密证书，会话令牌 SM3 摘要校验。',
  },
  {
    itemId: 'CA-AD-02',
    domain: 'application-data',
    name: '重要数据传输保密性与完整性',
    gmtCode: 'GMT_0054_AD02',
    requirement: '应采用密码技术保证重要数据在传输过程中的保密性和完整性，包括但不限于病历、医嘱、检验结果。',
    selfStatus: 'partial',
    evidence: 'EMR 核心传输已加密；处方流转接口待补齐 SM4 通道加密。',
  },
  {
    itemId: 'CA-AD-03',
    domain: 'application-data',
    name: '重要数据存储完整性',
    gmtCode: 'GMT_0054_AD03',
    requirement: '应采用密码技术保证重要数据在存储过程中的完整性，电子病历、检验报告等关键数据应留存数字摘要。',
    selfStatus: 'noncompliant',
    evidence: '历史病历归档未做 SM3 摘要固化，存在篡改不可检出风险。',
  },
  // 管理制度
  {
    itemId: 'CA-MG-01',
    domain: 'management',
    name: '密码应用方案与审批',
    gmtCode: 'GMT_0054_MG01',
    requirement: '应建立密码应用方案编制、评审与审批制度，定期开展商用密码应用安全性评估。',
    selfStatus: 'compliant',
    evidence: '已编制《医院商用密码应用方案 V2026》并经信息安全委员会审批。',
  },
  {
    itemId: 'CA-MG-02',
    domain: 'management',
    name: '密钥全生命周期管理',
    gmtCode: 'GMT_0054_MG02',
    requirement: '应建立密钥生成、分发、存储、使用、更新、归档、销毁的全生命周期管理制度，密钥应与系统分离管理。',
    selfStatus: 'partial',
    evidence: '密钥管理制度已发布，但密钥轮换周期（12 个月）待缩短至 6 个月。',
  },
  {
    itemId: 'CA-MG-03',
    domain: 'management',
    name: '密码应用人员培训与考核',
    gmtCode: 'GMT_0054_MG03',
    requirement: '应对从事密码相关工作的人员进行保密教育、密码政策培训与考核，关键岗位人员应签署保密协议。',
    selfStatus: 'not-applicable',
    evidence: '当前项目阶段不涉及专职密码管理员岗位，待密评整改期补训。',
  },
];

/** 非合规项（partial / noncompliant）的整改建议模板 */
const GAP_ADVICE: Partial<Record<AssessDomain, string>> = {
  'network-communication': '将老旧 TLS1.2 信道升级为国密 SSL VPN（SM2/SM3/SM4 套件），并在边界部署国密证书。',
  'device-computing': '全部运维通道收敛至国密堡垒机，关闭直连 SSH 22，启用双因子鉴别。',
  'application-data': '对历史病历与处方补做 SM3 摘要固化，新归档病历实时上链存证。',
  'physical-environment': '监控视频接入国密摘要存证服务，按月核对哈希台账。',
  management: '缩短密钥轮换周期至 6 个月，并对关键岗位人员补签保密协议。',
};

function isAssessStatus(v: unknown): v is AssessStatus {
  return typeof v === 'string' && (ASSESS_STATUS as readonly string[]).includes(v);
}

function isAssessDomain(v: unknown): v is AssessDomain {
  return typeof v === 'string' && (Object.keys(DOMAIN_LABEL) as string[]).includes(v);
}

function recomputeSummary() {
  const domainStatus = (Object.keys(DOMAIN_LABEL) as AssessDomain[]).map((domain) => {
    const items = demoStore.filter((i) => i.domain === domain);
    const compliant = items.filter(
      (i) => i.selfStatus === 'compliant' || i.selfStatus === 'not-applicable',
    ).length;
    return {
      domain,
      domainLabel: DOMAIN_LABEL[domain],
      compliant,
      total: items.length,
    };
  });
  const gaps = demoStore
    .filter((i) => i.selfStatus === 'partial' || i.selfStatus === 'noncompliant')
    .map((i) => ({
      itemId: i.itemId,
      domain: i.domain,
      domainLabel: DOMAIN_LABEL[i.domain],
      name: i.name,
      gmtCode: i.gmtCode,
      selfStatus: i.selfStatus,
      advice: GAP_ADVICE[i.domain] ?? '按密评整改要求限期闭环',
    }));
  const total = demoStore.length;
  const compliantTotal = demoStore.filter(
    (i) => i.selfStatus === 'compliant' || i.selfStatus === 'not-applicable',
  ).length;
  const overall: '基本符合' | '不符合' =
    gaps.length === 0 && total > 0 ? '基本符合' : '不符合';
  return { domainStatus, overall, compliantTotal, total, gaps };
}

export const cryptoAssessCnRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/crypto-assess/items',
    auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ items: [], total: 0 }));
      return json(ok({ items: demoStore, total: demoStore.length }));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/crypto-assess/items/:itemId/status',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const { itemId } = c.params;
      if (!itemId) return json(fail(ErrorCode.BAD_REQUEST, 'itemId 必填'), 400);
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      const { status, evidence } = body as { status?: unknown; evidence?: unknown };
      if (!isAssessStatus(status)) {
        return json(
          fail(ErrorCode.BAD_REQUEST, 'status 必须为 compliant|partial|noncompliant|not-applicable'),
          400,
        );
      }
      if (evidence !== undefined && typeof evidence !== 'string') {
        return json(fail(ErrorCode.BAD_REQUEST, 'evidence 必须为字符串'), 400);
      }
      if (!isDemo) return json(ok({ updated: true, itemId, status }));
      const rec = demoStore.find((r) => r.itemId === itemId);
      if (!rec) return json(fail(ErrorCode.NOT_FOUND, `itemId=${itemId} 未找到`), 404);
      rec.selfStatus = status;
      if (typeof evidence === 'string') rec.evidence = evidence;
      return json(ok({ updated: true, item: rec, summary: recomputeSummary() }));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/crypto-assess/summary',
    auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (!isDemo) {
        return json(
          ok({
            domainStatus: (Object.keys(DOMAIN_LABEL) as AssessDomain[]).map((d) => ({
              domain: d,
              domainLabel: DOMAIN_LABEL[d],
              compliant: 0,
              total: 0,
            })),
            overall: '不符合' as const,
            compliantTotal: 0,
            total: 0,
            gaps: [],
          }),
        );
      }
      return json(ok(recomputeSummary()));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/crypto-assess/export',
    auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      // DEMO 阶段：返回报告占位 ID；后续接入真实密评报告生成（PDF/Word）。
      const reportId = `CA-RPT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;
      return json(ok({ demo: true, reportId, generatedAt: new Date().toISOString() }));
    },
  },
];
