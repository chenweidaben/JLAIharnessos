import { get } from '../request';

export interface CdsRuleRow { id: string; code: string; name: string; level: 'contraindication' | 'warning' | 'suggestion'; domain: string; trigger: string; enabled: boolean; demo?: boolean; }
export interface CdsAlertRow { id: string; ruleName: string; patient: string; dept: string; severity: 'critical' | 'high' | 'medium' | 'low'; message: string; firedAt: string; ackStatus: 'pending' | 'acked' | 'overridden'; demo?: boolean; }
export interface CdsSuggestionRow { id: string; scenario: string; dept: string; suggestedAction: string; confidence: number; issuedAt: string; status: 'pending' | 'accepted' | 'rejected'; demo?: boolean; }
export interface CdsAdherenceRow { id: string; dept: string; total: number; accepted: number; overridden: number; ignored: number; acceptanceRate: number; demo?: boolean; }

const DEMO_RULES: CdsRuleRow[] = [
  { id: 'r-1', code: 'CDS-DI-001', name: '华法林+阿司匹林联用禁忌', level: 'contraindication', domain: '药物相互作用', trigger: '同时开具华法林与阿司匹林', enabled: true, demo: true },
  { id: 'r-2', code: 'CDS-DI-002', name: 'QT 延长药物联用警告', level: 'warning', domain: '药物相互作用', trigger: 'QTc > 500ms 时开具延长药物', enabled: true, demo: true },
  { id: 'r-3', code: 'CDS-LAB-001', name: '血钾 > 6.5 紧急提示', level: 'warning', domain: '危急值', trigger: 'K+ > 6.5 mmol/L', enabled: true, demo: true },
  { id: 'r-4', code: 'CDS-DX-001', name: '高血压合并糖尿病首选 ACEI', level: 'suggestion', domain: '诊断-治疗推荐', trigger: '诊断含高血压+2型糖尿病', enabled: true, demo: true },
  { id: 'r-5', code: 'CDS-ORD-001', name: '术后抗菌药物超时提示', level: 'warning', domain: '医嘱合理用药', trigger: '抗菌药物预防使用 > 48h', enabled: true, demo: true },
];

const DEMO_ALERTS: CdsAlertRow[] = [
  { id: 'a-1', ruleName: '华法林+阿司匹林联用禁忌', patient: '张**', dept: '心内科', severity: 'critical', message: '两药联用出血风险显著升高', firedAt: '2026-10-20 10:42', ackStatus: 'pending', demo: true },
  { id: 'a-2', ruleName: '血钾危急值', patient: '李**', dept: '肾内科', severity: 'critical', message: 'K+ 6.8 mmol/L', firedAt: '2026-10-20 09:58', ackStatus: 'acked', demo: true },
  { id: 'a-3', ruleName: '术后抗菌药物超时', patient: '赵**', dept: '普外科', severity: 'medium', message: '头孢呋辛已用 72h', firedAt: '2026-10-20 08:30', ackStatus: 'overridden', demo: true },
  { id: 'a-4', ruleName: 'QT 延长药物联用警告', patient: '王**', dept: '心内科', severity: 'high', message: 'QTc 512ms', firedAt: '2026-10-20 07:15', ackStatus: 'acked', demo: true },
  { id: 'a-5', ruleName: '过敏史提示', patient: '孙**', dept: '呼吸内科', severity: 'high', message: '青霉素过敏史', firedAt: '2026-10-20 11:20', ackStatus: 'pending', demo: true },
];

const DEMO_SUGGESTIONS: CdsSuggestionRow[] = [
  { id: 's-1', scenario: '急性STEMI', dept: '心内科', suggestedAction: '双联抗血小板+急诊PCI', confidence: 94, issuedAt: '2026-10-20 09:10', status: 'accepted', demo: true },
  { id: 's-2', scenario: '2型糖尿病新诊断', dept: '内分泌科', suggestedAction: '二甲双胍起始', confidence: 88, issuedAt: '2026-10-20 09:30', status: 'pending', demo: true },
  { id: 's-3', scenario: '社区获得性肺炎', dept: '呼吸内科', suggestedAction: '住院+β-内酰胺+大环内酯', confidence: 82, issuedAt: '2026-10-20 10:05', status: 'accepted', demo: true },
  { id: 's-4', scenario: '房颤抗凝', dept: '心内科', suggestedAction: '启动NOAC', confidence: 91, issuedAt: '2026-10-20 10:20', status: 'rejected', demo: true },
];

const DEMO_ADHERENCE: CdsAdherenceRow[] = [
  { id: 'ad-1', dept: '心内科', total: 128, accepted: 102, overridden: 18, ignored: 8, acceptanceRate: 79.7, demo: true },
  { id: 'ad-2', dept: '呼吸内科', total: 86, accepted: 71, overridden: 10, ignored: 5, acceptanceRate: 82.6, demo: true },
  { id: 'ad-3', dept: '普外科', total: 64, accepted: 45, overridden: 15, ignored: 4, acceptanceRate: 70.3, demo: true },
  { id: 'ad-4', dept: '肾内科', total: 52, accepted: 44, overridden: 6, ignored: 2, acceptanceRate: 84.6, demo: true },
  { id: 'ad-5', dept: '内分泌科', total: 48, accepted: 39, overridden: 7, ignored: 2, acceptanceRate: 81.3, demo: true },
];

async function safeGet<T>(url: string, fallback: T[]): Promise<{ data: T[]; demo: boolean }> {
  try {
    const res = await get<{ items?: T[] } | T[]>(url);
    const items = Array.isArray(res) ? (res as T[]) : ((res as { items?: T[] })?.items ?? []);
    if (items.length > 0) return { data: items, demo: false };
    return { data: fallback, demo: true };
  } catch { return { data: fallback, demo: true }; }
}

export const fetchCdsRules = () => safeGet<CdsRuleRow>('/cds/rules', DEMO_RULES);
export const fetchCdsAlerts = () => safeGet<CdsAlertRow>('/cds/alerts', DEMO_ALERTS);
export const fetchCdsSuggestions = () => safeGet<CdsSuggestionRow>('/cds/suggestions', DEMO_SUGGESTIONS);
export const fetchCdsAdherence = () => safeGet<CdsAdherenceRow>('/cds/adherence', DEMO_ADHERENCE);
