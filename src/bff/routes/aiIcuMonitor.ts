/** 健澜科技：P2 AI 重症监护深化（M86-P）。DEMO_MODE 下 demo provider 内存模拟，预留可插拔模型接口。 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

type SepsisRisk = 'low' | 'medium' | 'high';

interface IcuBed {
  bedId: string;
  patientId: string;
  patientName: string;
  sofaScore: number;
  sepsisRisk: SepsisRisk;
  ventilatorMode: string;
  aiSuggestion: string;
  updatedAt: string;
}

interface TrendPoint {
  t: string;
  hr: number;
  bp: number;
  spo2: number;
  rr: number;
  temp: number;
}

/** 脓毒症风险因素（可解释性 Top3，按贡献降序） */
interface SepsisFactor {
  factor: string;
  /** 贡献度 0-100 */
  contribution: number;
  detail: string;
}

/** 预测输入：生命体征趋势数组 + 床信息 */
interface MonitorInput {
  bedId: string;
  patientName: string;
  sofaScore: number;
  risk: SepsisRisk;
  trends: TrendPoint[];
}

interface SepsisPrediction {
  qsofa: number;
  lac: string;
  riskScore: number;
  level: SepsisRisk;
  suggestion: string;
  /** Top3 风险因素（按贡献降序）；llm-stub 可空 */
  factors?: SepsisFactor[];
}

interface SedationSuggestion {
  rass: number;
  aiAdvised: string;
  /** 镇静建议依据；llm-stub 可空 */
  basis?: string;
}

/** 可插拔预测 provider：demo 内存模拟 / llm-stub 预留生产接入点 */
interface IPredictionProvider {
  name: string;
  predictSepsis(input: MonitorInput): SepsisPrediction;
  predictSedation(input: MonitorInput): SedationSuggestion;
}

const ventilatorModes = ['SIMV-PC', 'PSV', 'BiPAP', 'A/C VC', 'CPAP'];

const demoBeds: IcuBed[] = [
  { bedId: 'ICU-A-01', patientId: 'P-1001', patientName: '张**', sofaScore: 6, sepsisRisk: 'high', ventilatorMode: 'SIMV-PC', aiSuggestion: '脓毒症风险升高，建议复查乳酸并评估液体复苏', updatedAt: '2026-11-04 04:20' },
  { bedId: 'ICU-A-02', patientId: 'P-1002', patientName: '李**', sofaScore: 3, sepsisRisk: 'low', ventilatorMode: 'PSV', aiSuggestion: '生命体征平稳，维持现有镇静深度', updatedAt: '2026-11-04 04:21' },
  { bedId: 'ICU-B-01', patientId: 'P-1003', patientName: '王**', sofaScore: 8, sepsisRisk: 'high', ventilatorMode: 'A/C VC', aiSuggestion: 'SOFA 进行性升高，建议升级有创监测并复查感染指标', updatedAt: '2026-11-04 04:19' },
  { bedId: 'ICU-B-02', patientId: 'P-1004', patientName: '赵**', sofaScore: 2, sepsisRisk: 'low', ventilatorMode: 'CPAP', aiSuggestion: '脱机条件接近，可尝试 SBT 自主呼吸试验', updatedAt: '2026-11-04 04:22' },
  { bedId: 'ICU-C-01', patientId: 'P-1005', patientName: '刘**', sofaScore: 5, sepsisRisk: 'medium', ventilatorMode: 'BiPAP', aiSuggestion: 'RASS 偏浅，警惕躁动拔管风险，建议适度加深镇静', updatedAt: '2026-11-04 04:20' },
];

function genTrends(baseHr: number, baseBp: number, baseSpo2: number, baseRr: number, baseTemp: number): TrendPoint[] {
  const points: TrendPoint[] = [];
  const now = Date.now();
  for (let i = 11; i >= 0; i--) {
    const ts = new Date(now - i * 15 * 60 * 1000);
    const hh = String(ts.getHours()).padStart(2, '0');
    const mm = String(ts.getMinutes()).padStart(2, '0');
    points.push({
      t: `${hh}:${mm}`,
      hr: Math.round(baseHr + Math.sin(i / 2) * 6),
      bp: Math.round(baseBp + Math.cos(i / 3) * 8),
      spo2: Math.min(100, Math.round(baseSpo2 + Math.sin(i / 4) * 2)),
      rr: Math.round(baseRr + Math.cos(i / 2) * 2),
      temp: Math.round((baseTemp + Math.sin(i / 5) * 0.3) * 10) / 10,
    });
  }
  return points;
}

const bedDetailMap: Record<string, { qsofa: number; lac: string; riskScore: number; suggestion: string; rass: number; aiAdvised: string }> = {
  'ICU-A-01': { qsofa: 3, lac: '4.2 mmol/L', riskScore: 82, suggestion: '符合脓毒症筛查阳性，建议 1h 内启动集束化治疗', rass: -3, aiAdvised: '维持中度镇静（RASS -3），避免谵妄' },
  'ICU-A-02': { qsofa: 1, lac: '1.1 mmol/L', riskScore: 18, suggestion: '脓毒症风险低，常规监测即可', rass: -1, aiAdvised: '浅镇静目标 RASS -1，促进早期活动' },
  'ICU-B-01': { qsofa: 3, lac: '5.8 mmol/L', riskScore: 91, suggestion: '高度怀疑脓毒性休克，建议立即补液+血管活性药', rass: -4, aiAdvised: '深镇静 RASS -4，配合机械通气' },
  'ICU-B-02': { qsofa: 0, lac: '0.9 mmol/L', riskScore: 9, suggestion: '无脓毒症征象，可评估脱机', rass: 0, aiAdvised: '暂停镇静，保持清醒合作 RASS 0' },
  'ICU-C-01': { qsofa: 2, lac: '2.6 mmol/L', riskScore: 47, suggestion: '脓毒症风险中等，建议 2h 内复测乳酸', rass: 0, aiAdvised: '当前 RASS 0 偏浅，建议加用小剂量镇静至 -2' },
};

const trendSeeds: Record<string, { hr: number; bp: number; spo2: number; rr: number; temp: number }> = {
  'ICU-A-01': { hr: 118, bp: 88, spo2: 92, rr: 24, temp: 38.6 },
  'ICU-A-02': { hr: 78, bp: 118, spo2: 98, rr: 16, temp: 36.8 },
  'ICU-B-01': { hr: 132, bp: 76, spo2: 90, rr: 28, temp: 39.1 },
  'ICU-B-02': { hr: 72, bp: 122, spo2: 99, rr: 14, temp: 36.6 },
  'ICU-C-01': { hr: 96, bp: 105, spo2: 95, rr: 20, temp: 37.8 },
};

/** demo provider：DEMO_MODE 下基于内存床旁数据与生命体征趋势的规则化模拟 */
const demoProvider: IPredictionProvider = {
  name: 'demo',
  predictSepsis(input: MonitorInput): SepsisPrediction {
    const screen = bedDetailMap[input.bedId] ?? bedDetailMap['ICU-A-02'];
    const lacValue = parseFloat(screen.lac) || 0;
    const latestHr = input.trends[input.trends.length - 1]?.hr ?? 0;
    const factors: SepsisFactor[] = [];
    if (screen.qsofa >= 2) {
      factors.push({ factor: 'qSOFA≥2', contribution: Math.min(60, 20 + screen.qsofa * 12), detail: `qSOFA=${screen.qsofa}，呼吸/意识/收缩压三项阳性达 ${screen.qsofa} 项` });
    }
    if (lacValue >= 2.0) {
      factors.push({ factor: '乳酸升高', contribution: Math.min(55, 15 + Math.round((lacValue - 1.0) * 10)), detail: `血乳酸 ${screen.lac}（>2.0 mmol/L 提示组织灌注不足）` });
    }
    if (latestHr >= 100) {
      factors.push({ factor: '心率增快', contribution: Math.min(45, 10 + Math.round((latestHr - 90) * 1.2)), detail: `当前 HR=${latestHr} bpm，窦性心动过速代偿` });
    }
    if (factors.length < 3) {
      factors.push({ factor: 'SOFA 升高', contribution: Math.min(40, 8 + input.sofaScore * 4), detail: `SOFA=${input.sofaScore}，多器官功能受累` });
    }
    factors.sort((a, b) => b.contribution - a.contribution);
    return {
      qsofa: screen.qsofa,
      lac: screen.lac,
      riskScore: screen.riskScore,
      level: input.risk,
      suggestion: screen.suggestion,
      factors: factors.slice(0, 3),
    };
  },
  predictSedation(input: MonitorInput): SedationSuggestion {
    const screen = bedDetailMap[input.bedId] ?? bedDetailMap['ICU-A-02'];
    const latestHr = input.trends[input.trends.length - 1]?.hr ?? 0;
    const mode = demoBeds.find((b) => b.bedId === input.bedId)?.ventilatorMode ?? 'PSV';
    return {
      rass: screen.rass,
      aiAdvised: screen.aiAdvised,
      basis: `基于 RASS=${screen.rass} 趋势与镇静药物浓度建议，结合最新 HR=${latestHr} bpm 与呼吸机模式 ${mode} 综合判定`,
    };
  },
};

// TODO(生产接入点): 替换为院内大模型 API 或脓毒症/镇静评分模型服务。
// 传入 MonitorInput（生命体征趋势 + 床旁信息），由真实模型返回 riskScore/qsofa/lac/level/suggestion
// 及解释性因素（sepsisFactors），并保持本接口签名不变以实现热插拔。
const llmProviderStub: IPredictionProvider = {
  name: 'llm-stub',
  predictSepsis(): SepsisPrediction {
    throw new Error('LLM/评分模型 provider stub：需接入真实大模型 API 或院内脓毒症评分模型服务');
  },
  predictSedation(): SedationSuggestion {
    throw new Error('LLM/评分模型 provider stub：需接入真实大模型 API 或院内镇静评分模型服务');
  },
};

const predictionProviders: Record<string, IPredictionProvider> = {
  demo: demoProvider,
  'llm-stub': llmProviderStub,
};

function resolveProvider(c: Ctx): IPredictionProvider | { badRequest: Response } {
  const name = c.query.get('provider') || 'demo';
  const provider = predictionProviders[name];
  if (!provider) {
    return { badRequest: json(fail(ErrorCode.BAD_REQUEST, `未知预测 provider: ${name}，可选 demo / llm-stub`), 400) };
  }
  return provider;
}

export const aiIcuMonitorRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/ai-icu/beds', auth: true,
    handle: async (): Promise<Response> => {
      if (isDemo) return json(ok({ demo: true, items: demoBeds, total: demoBeds.length }));
      return json(ok({ items: [], total: 0 }));
    } },
  { method: 'GET', path: '/api/v1/ai-icu/beds/:bedId/monitor', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const bedId = c.params.bedId;
      const resolved = resolveProvider(c);
      if ('badRequest' in resolved) return resolved.badRequest;
      const provider: IPredictionProvider = resolved;
      if (!isDemo) return json(ok({ bedId, provider: provider.name, trends: [], sepsisScreen: null, sedation: null, explainability: null }));
      const seed = trendSeeds[bedId] ?? trendSeeds['ICU-A-02'];
      const trends = genTrends(seed.hr, seed.bp, seed.spo2, seed.rr, seed.temp);
      const bed = demoBeds.find((b) => b.bedId === bedId);
      const input: MonitorInput = {
        bedId,
        patientName: bed?.patientName ?? '张**',
        sofaScore: bed?.sofaScore ?? 0,
        risk: bed?.sepsisRisk ?? 'low',
        trends,
      };
      let sepsis: SepsisPrediction;
      let sedation: SedationSuggestion;
      try {
        sepsis = provider.predictSepsis(input);
        sedation = provider.predictSedation(input);
      } catch {
        return json(ok({
          demo: true,
          bedId,
          provider: provider.name,
          stub: true,
          message: '需接入真实模型服务',
          trends,
          sepsisScreen: null,
          sedation: null,
          explainability: null,
        }));
      }
      return json(ok({
        demo: true,
        bedId,
        provider: provider.name,
        trends,
        sepsisScreen: {
          qsofa: sepsis.qsofa,
          lac: sepsis.lac,
          riskScore: sepsis.riskScore,
          suggestion: sepsis.suggestion,
        },
        sedation: {
          rass: sedation.rass,
          aiAdvised: sedation.aiAdvised,
        },
        explainability: {
          sepsisFactors: sepsis.factors ?? [],
          sedationBasis: sedation.basis ?? '',
        },
      }));
    } },
  { method: 'POST', path: '/api/v1/ai-icu/beds/:bedId/alerts', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const bedId = c.params.bedId;
      await c.body().catch(() => ({} as Record<string, unknown>));
      const resolved = resolveProvider(c);
      if ('badRequest' in resolved) return resolved.badRequest;
      const provider: IPredictionProvider = resolved;
      if (!isDemo) return json(ok({ bedId, alertId: `ALT-${Date.now()}`, level: 'info' as const, message: 'ok', suggestedAction: '', explain: null }));
      const bed = demoBeds.find((b) => b.bedId === bedId);
      if (!bed) return json(fail(ErrorCode.NOT_FOUND, `床位 ${bedId} 不存在`), 404);
      if (provider.name === 'llm-stub') {
        return json(ok({
          demo: true,
          bedId,
          provider: provider.name,
          stub: true,
          message: '需接入真实模型服务',
          alertId: `ALT-${bedId}-${Date.now().toString(36)}`,
          level: 'info' as const,
          suggestedAction: '',
          explain: null,
        }));
      }
      const level: 'info' | 'warning' | 'critical' =
        bed.sepsisRisk === 'high' ? 'critical' : bed.sepsisRisk === 'medium' ? 'warning' : 'info';
      const message =
        bed.sepsisRisk === 'high'
          ? `${bed.patientName} 床脓毒症风险高（SOFA ${bed.sofaScore}），生命体征出现恶化趋势`
          : bed.sepsisRisk === 'medium'
            ? `${bed.patientName} 床 SOFA ${bed.sofaScore}，需关注病情变化`
            : `${bed.patientName} 床生命体征平稳，暂无紧急预警`;
      const suggestedAction =
        bed.sepsisRisk === 'high'
          ? '立即床旁评估，复查血气/乳酸，启动脓毒症集束化治疗并通知上级医师'
          : bed.sepsisRisk === 'medium'
            ? '加密监测频次，2h 内复查感染指标与乳酸'
            : '维持现有监护与治疗方案';
      const screen = bedDetailMap[bedId] ?? bedDetailMap['ICU-A-02'];
      const contributingFactors: string[] = [];
      if (bed.sepsisRisk !== 'low') contributingFactors.push(`SOFA=${bed.sofaScore}`);
      if (bed.sofaScore >= 6) contributingFactors.push('SOFA≥6 提示多器官功能障碍');
      if (screen.qsofa >= 2) contributingFactors.push(`qSOFA=${screen.qsofa}≥2`);
      if (parseFloat(screen.lac) >= 2.0) contributingFactors.push(`血乳酸 ${screen.lac} 升高`);
      const reason = level === 'critical'
        ? `${bed.patientName} 床脓毒症高危，qSOFA=${screen.qsofa} 且乳酸 ${screen.lac}，满足危急预警阈值`
        : level === 'warning'
          ? `${bed.patientName} 床 SOFA=${bed.sofaScore} 达中危区间，病情有恶化趋势`
          : `${bed.patientName} 床生命体征平稳，未触发危急阈值`;
      return json(ok({
        demo: true,
        alertId: `ALT-${bedId}-${Date.now().toString(36)}`,
        level,
        message,
        suggestedAction,
        triggeredAt: new Date().toISOString(),
        explain: {
          reason,
          contributingFactors,
        },
      }));
    } },
];
