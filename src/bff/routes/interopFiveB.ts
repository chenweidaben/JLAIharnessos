/** 健澜科技：P2 互联互通标准化成熟度五级乙等自评（M86-N）。DEMO_MODE 下内存自评数据。 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** 测评域：数据资源标准化 / 互联互通 / 基础设施建设 / 应用效果 */
type Domain = 'data-resource' | 'interoperability' | 'infrastructure' | 'application-effect';

interface ItemRow {
  itemId: string;
  domain: Domain;
  name: string;
  /** 满分权重（合计 100） */
  maxScore: number;
  /** 当前自评分（0-100 百分比） */
  selfScore: number;
  /** 证据/整改说明 */
  evidence?: string;
  updatedAt: string;
}

const DOMAIN_LABEL: Record<Domain, string> = {
  'data-resource': '数据资源标准化',
  'interoperability': '互联互通',
  'infrastructure': '基础设施建设',
  'application-effect': '应用效果',
};

/** DEMO 内存自评台账：14 项，四域分布 4/4/3/3，权重合计 100 */
const demoStore: ItemRow[] = [
  // —— 数据资源标准化（权重 35）——
  { itemId: 'DR-01', domain: 'data-resource', name: '数据集标准化（患者/就诊/医嘱等核心数据集符合国标）', maxScore: 10, selfScore: 92, evidence: '已按 WS 363/364/365 映射核心数据集', updatedAt: '2026-11-01T10:00:00+08:00' },
  { itemId: 'DR-02', domain: 'data-resource', name: '字典标准化（ICD-10/ICD-9-CM3/LOINC 对照率）', maxScore: 10, selfScore: 88, evidence: '诊断 ICD-10 对照率 96%，手术 ICD-9-CM3 对照率 91%', updatedAt: '2026-11-01T10:05:00+08:00' },
  { itemId: 'DR-03', domain: 'data-resource', name: 'EMPI 主索引治理（跨院患者唯一标识合并准确率）', maxScore: 8, selfScore: 78, evidence: 'EMPI 去重准确率约 92%，仍需优化同名同人合并规则', updatedAt: '2026-11-02T09:30:00+08:00' },
  { itemId: 'DR-04', domain: 'data-resource', name: '数据元与值域标准化（HL7 FHIR R4 资源覆盖）', maxScore: 7, selfScore: 85, evidence: 'FHIR R4 网关已覆盖 Patient/Observation/Encounter 等 18 类资源', updatedAt: '2026-11-02T11:20:00+08:00' },
  // —— 互联互通（权重 30）——
  { itemId: 'IO-01', domain: 'interoperability', name: '院内系统接口标准化（HL7 v2 / FHIR 接口占比）', maxScore: 9, selfScore: 90, evidence: 'HIS/EMR/LIS/PACS 核心接口 FHIR R4 覆盖率 85%', updatedAt: '2026-11-01T14:00:00+08:00' },
  { itemId: 'IO-02', domain: 'interoperability', name: '区域平台对接（与省/市健康云平台数据上传）', maxScore: 8, selfScore: 72, evidence: '已对接省级健康云，上传时延 P95 约 4h，未达实时要求', updatedAt: '2026-11-02T15:10:00+08:00' },
  { itemId: 'IO-03', domain: 'interoperability', name: '医联体/医共体数据共享（双向转诊、检查检验互认）', maxScore: 7, selfScore: 80, evidence: '已与 3 家紧密型医共体单位实现检查检验结果互认', updatedAt: '2026-11-03T09:00:00+08:00' },
  { itemId: 'IO-04', domain: 'interoperability', name: '接口运行监控（成功率/时延/异常告警闭环）', maxScore: 6, selfScore: 86, evidence: '接口成功率 99.2%，P95 时延 320ms，告警 30min 内闭环', updatedAt: '2026-11-03T10:30:00+08:00' },
  // —— 基础设施建设（权重 15）——
  { itemId: 'IN-01', domain: 'infrastructure', name: '集成平台/ESB 建设（企业服务总线 + 主数据管理）', maxScore: 6, selfScore: 84, evidence: '已建成全院集成平台，统一接入 22 个业务系统', updatedAt: '2026-11-01T16:00:00+08:00' },
  { itemId: 'IN-02', domain: 'infrastructure', name: '信息安全基础设施（等保三级 + 国密改造 + 备份容灾）', maxScore: 5, selfScore: 75, evidence: '等保三级已过测评，国密 SM2/SM3 签名留痕已上线，异地容灾 RPO≤15min', updatedAt: '2026-11-03T14:00:00+08:00' },
  { itemId: 'IN-03', domain: 'infrastructure', name: '运维监控与日志审计（统一日志、审计留存 6 个月+）', maxScore: 4, selfScore: 82, evidence: '统一日志平台已接入 30+ 系统，审计日志留存 12 个月', updatedAt: '2026-11-03T16:00:00+08:00' },
  // —— 应用效果（权重 20）——
  { itemId: 'AE-01', domain: 'application-effect', name: '患者服务应用效果（预约/缴费/报告查询互联网+覆盖）', maxScore: 7, selfScore: 91, evidence: '互联网医院服务覆盖门诊预约、移动支付、报告查询全场景', updatedAt: '2026-11-02T10:00:00+08:00' },
  { itemId: 'AE-02', domain: 'application-effect', name: '临床业务应用效果（移动医护/护理闭环/合理用药）', maxScore: 7, selfScore: 87, evidence: '移动护理 PDA 闭环率 93%，合理用药审方覆盖门诊+住院', updatedAt: '2026-11-02T11:00:00+08:00' },
  { itemId: 'AE-03', domain: 'application-effect', name: '管理决策应用效果（运营 BI / 主 Index 看板 / 数据治理）', maxScore: 6, selfScore: 70, evidence: '运营 BI 已上线，但 DRG 病种分析与实时指挥中心尚在建设期', updatedAt: '2026-11-03T17:00:00+08:00' },
];

function clampScore(v: number): number {
  if (Number.isNaN(v) || !Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return Math.round(v);
}

function findItem(itemId: string): ItemRow | undefined {
  return demoStore.find((r) => r.itemId === itemId);
}

interface DomainScore {
  domain: Domain;
  domainName: string;
  weight: number;
  got: number;
  rate: number;
}

function computeSummary() {
  const domains: Domain[] = ['data-resource', 'interoperability', 'infrastructure', 'application-effect'];
  const domainScores: DomainScore[] = domains.map((d) => {
    const rows = demoStore.filter((r) => r.domain === d);
    const weight = rows.reduce((s, r) => s + r.maxScore, 0);
    const got = rows.reduce((s, r) => s + (r.selfScore / 100) * r.maxScore, 0);
    return {
      domain: d,
      domainName: DOMAIN_LABEL[d],
      weight,
      got: Math.round(got * 100) / 100,
      rate: weight > 0 ? Math.round((got / weight) * 10000) / 100 : 0,
    };
  });
  const totalMax = demoStore.reduce((s, r) => s + r.maxScore, 0);
  const totalScore = Math.round(domainScores.reduce((s, d) => s + d.got, 0) * 100) / 100;
  const totalRate = totalMax > 0 ? Math.round((totalScore / totalMax) * 10000) / 100 : 0;
  const minRate = Math.min(...domainScores.map((d) => d.rate));
  const gaps = [...demoStore]
    .map((r) => ({
      itemId: r.itemId,
      name: r.name,
      domain: r.domain,
      domainName: DOMAIN_LABEL[r.domain],
      selfScore: r.selfScore,
      maxScore: r.maxScore,
      gap: 100 - r.selfScore,
      suggestion:
        r.selfScore >= 90
          ? '保持现状，纳入常态化运行监测'
          : r.selfScore >= 80
            ? '针对薄弱子项补齐证据材料，开展专项整改'
            : '列为重点整改项，明确责任人与整改时限，建议下月复评',
    }))
    .sort((a, b) => a.selfScore - b.selfScore)
    .slice(0, 3);
  const passed = totalRate >= 90 && minRate >= 80;
  return {
    domainScores,
    totalScore,
    totalMax,
    totalRate,
    minRate,
    passed,
    levelHint: '国家医疗健康信息互联互通标准化成熟度（五级乙等）要求：总分得分率 ≥ 90%，且各测评域得分率均 ≥ 80%。',
    gaps,
    generatedAt: new Date().toISOString(),
  };
}

export const interopFiveBRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/interop-five-b/items',
    auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ items: [], total: 0 }));
      return json(ok({ items: demoStore, total: demoStore.length, domainLabel: DOMAIN_LABEL }));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/interop-five-b/items/:itemId/score',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const { itemId } = c.params;
      const body = await c.body().catch(() => ({} as Record<string, unknown>));
      const { score, evidence } = body as { score?: unknown; evidence?: unknown };
      if (typeof score !== 'number' || Number.isNaN(score)) {
        return json(fail(ErrorCode.BAD_REQUEST, 'score 必填且为数字（0-100）'), 400);
      }
      const row = findItem(itemId);
      if (!row) return json(fail(ErrorCode.NOT_FOUND, `未找到测评项 ${itemId}`), 404);
      row.selfScore = clampScore(score);
      if (typeof evidence === 'string' && evidence.trim()) {
        row.evidence = evidence.trim().slice(0, 500);
      }
      row.updatedAt = new Date().toISOString();
      return json(ok({ ...row, summary: computeSummary() }));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/interop-five-b/summary',
    auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({}));
      return json(ok(computeSummary()));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/interop-five-b/export',
    auth: true,
    handle: async (_c: Ctx): Promise<Response> => {
      if (!isDemo) return json(ok({ demo: true, reportId: '', sections: [] }));
      const summary = computeSummary();
      const reportId = `INTEROP5B-${Date.now().toString(36).toUpperCase()}`;
      const sections = [
        { title: '一、自评概况', bullets: [
          `自评总分：${summary.totalScore} / ${summary.totalMax}（得分率 ${summary.totalRate}%）`,
          `达标状态：${summary.passed ? '达标（总分≥90% 且各域≥80%）' : '未达标'}`,
          `各域最低得分率：${summary.minRate}%`,
        ] },
        { title: '二、四域得分', bullets: summary.domainScores.map((d) =>
          `${d.domainName}：${d.got} / ${d.weight}（${d.rate}%）`) },
        { title: '三、差距与整改建议', bullets: summary.gaps.map((g) =>
          `[${g.domainName}] ${g.name}：当前自评分 ${g.selfScore}% —— ${g.suggestion}`) },
        { title: '四、口径说明', bullets: [summary.levelHint] },
      ];
      return json(ok({ demo: true, reportId, sections, generatedAt: summary.generatedAt }));
    },
  },
];
