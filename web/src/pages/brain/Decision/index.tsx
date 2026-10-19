/**
 * 健澜科技 jlmedaios - AI 医院大脑深化：智能决策支持页（M164-B）
 *
 * 不只说「建议关注」：每个方案都给出具体动作、量化收益、成本与风险、见效时间，
 * 并按收益/成本/风险/见效四维排序，第一名推荐方案附 ROI 影响评估；
 * 支持一键「上报实际结果」看预测 vs 实际的闭环结论。
 * 深海蓝 VI：深色底 + 深海蓝面板 + 青色强调，与 brain/Deep、brain/Realtime 同色系。
 * 数据为演示模式，页面显式标注「演示数据」；不使用 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import { post } from '@/api/client';

/** 与 BFF aiDecisionAggregator 对齐的响应类型 */
interface ExpectedBenefit {
  waitReductionMin?: number;
  bedRelief?: number;
  stockDaysRestored?: number;
  qcDeductionDrop?: number;
  satisfactionGain?: number;
}

interface RankedOption {
  optionId: string;
  title: string;
  action: string;
  rationale: string;
  costPerRun: number;
  benefit: ExpectedBenefit;
  benefitScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskNote: string;
  effort: 'low' | 'medium' | 'high';
  timeToEffectMin: number;
  totalScore: number;
  rank: number;
  recommended: boolean;
}

interface DecisionImpact {
  optionId: string;
  title: string;
  estimatedCost: number;
  estimatedBenefitValue: number;
  roi: number | null;
  benefit: ExpectedBenefit;
  confidence: number;
  caveats: string[];
}

interface DecisionSupportResponse {
  generatedAt: string;
  demo: boolean;
  hospital: { code: string; name: string };
  scenario: string;
  scenarioLabel: string;
  triggerFacts: string[];
  options: RankedOption[];
  recommended: RankedOption;
  impact: DecisionImpact;
  notice: string;
}

interface OutcomeResult {
  decisionId: string;
  metric: string;
  expected: number;
  actual: number;
  achievedRatio: number;
  deviationPct: number;
  verdict: 'achieved' | 'partial' | 'missed';
  costDeviationPct: number | null;
  learning: string;
  nextAction: string;
}

/** 深海蓝主题色板（与 brain/Deep 一致） */
const C = {
  bg: '#06142e',
  panel: '#0d2550',
  panelBorder: '#1e3a8a',
  accent: '#38bdf8',
  accentDeep: '#1e40af',
  text: '#e2e8f0',
  dim: '#94a3b8',
  high: '#f87171',
  mid: '#fbbf24',
  low: '#34d399',
};

const LEVEL_COLOR: Record<string, string> = { low: C.low, medium: C.mid, high: C.high };
const LEVEL_TEXT: Record<string, string> = { low: '低', medium: '中', high: '高' };
const VERDICT_COLOR: Record<string, string> = { achieved: C.low, partial: C.mid, missed: C.high };

/** 收益字段的可读标签 */
function benefitText(b?: ExpectedBenefit | null): string {
  if (!b) return '—';
  const parts: string[] = [];
  if (b.waitReductionMin) parts.push(`候诊↓${b.waitReductionMin}分钟`);
  if (b.bedRelief) parts.push(`释放床位${b.bedRelief}张`);
  if (b.stockDaysRestored) parts.push(`库存恢复+${b.stockDaysRestored}天`);
  if (b.qcDeductionDrop) parts.push(`质控扣分↓${b.qcDeductionDrop}`);
  if (b.satisfactionGain) parts.push(`满意度+${b.satisfactionGain}`);
  return parts.length ? parts.join(' · ') : '—';
}

/** 面板容器 */
function Section(props: { title: string; extra?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: `linear-gradient(160deg, ${C.panel} 0%, #0a1d42 100%)`,
        border: `1px solid ${C.panelBorder}`,
        borderRadius: 12,
        padding: 18,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            color: C.text,
            fontSize: 18,
            fontWeight: 600,
            borderLeft: `4px solid ${C.accent}`,
            paddingLeft: 10,
          }}
        >
          {props.title}
        </div>
        {props.extra && <div style={{ color: C.dim, fontSize: 12 }}>{props.extra}</div>}
      </div>
      {props.children}
    </div>
  );
}

export default function AIDecisionPage() {
  const [data, setData] = useState<DecisionSupportResponse | null>(null);
  const [outcome, setOutcome] = useState<OutcomeResult | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchDecision = useCallback(async () => {
    setLoading(true);
    try {
      const res = await post<DecisionSupportResponse>('/api/v1/ai-brain/decision', {});
      setData(res);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 决策数据获取失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDecision();
  }, [fetchDecision]);

  /** 演示：上报推荐方案的「实际结果」，看预测 vs 实际闭环 */
  const trackOutcome = useCallback(async () => {
    if (!data || !data.recommended || !data.impact) return;
    const rec = data.recommended;
    const impact = data.impact;
    const expected =
      rec.benefit?.waitReductionMin ??
      rec.benefit?.bedRelief ??
      rec.benefit?.stockDaysRestored ??
      rec.benefit?.qcDeductionDrop ??
      10;
    try {
      const res = await post<OutcomeResult>('/api/v1/ai-brain/decision', {
        track: {
          decisionId: rec.optionId,
          outcome: {
            metric: 'effect',
            expected,
            actual: Math.round(expected * 0.85), // 演示：达成约 85%
            costPlanned: impact.estimatedCost,
            costActual: Math.round(impact.estimatedCost * 1.05),
            executedAt: new Date().toISOString(),
          },
        },
      });
      setOutcome(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '效果跟踪上报失败');
    }
  }, [data]);

  const updatedAt = data ? new Date(data.generatedAt).toLocaleString('zh-CN') : '--';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `radial-gradient(1200px 600px at 50% -10%, #12336f 0%, ${C.bg} 60%)`,
        color: C.text,
        padding: 20,
        fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
      }}
    >
      {/* 顶部标题栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          padding: '0 8px',
        }}
      >
        <div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#fff' }}>
            🧠 AI 智能决策支持
          </div>
          <div style={{ color: C.dim, fontSize: 13, marginTop: 4 }}>
            {data?.hospital.name ?? '杭州健澜示范医院'} · 数据中台与AI大脑 · 不只「建议关注」，给出可执行方案
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, color: C.dim }}>{updatedAt}</div>
          <div
            style={{
              display: 'inline-block',
              marginTop: 4,
              padding: '2px 10px',
              borderRadius: 999,
              background: 'rgba(251,191,36,0.15)',
              color: C.mid,
              fontSize: 12,
            }}
          >
            演示数据
          </div>
        </div>
      </div>

      {error && <div style={{ color: C.high, marginBottom: 12, fontSize: 14 }}>⚠ {error}</div>}

      {/* 触发事实 + 概览角标 */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 420px' }}>
          <Section title={`当前场景：${data?.scenarioLabel ?? '--'}`} extra="数据中台触发口径">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(data?.triggerFacts ?? []).map((f, i) => (
                <div key={i} style={{ color: C.text, fontSize: 14 }}>
                  · {f}
                </div>
              ))}
              {!data && <div style={{ color: C.dim, fontSize: 13 }}>{loading ? '加载中…' : '—'}</div>}
            </div>
          </Section>
        </div>
        {[
          { label: '候选方案', v: data?.options?.length ?? '--', tone: C.accent },
          { label: '推荐方案', v: `#${data?.recommended?.rank ?? '--'}`, tone: C.low },
          { label: '预估投入', v: data ? `¥${(data?.impact?.estimatedCost ?? 0).toLocaleString()}` : '--', tone: C.mid },
          { label: '预估收益', v: data ? `¥${(data?.impact?.estimatedBenefitValue ?? 0).toLocaleString()}` : '--', tone: C.low },
          { label: 'ROI', v: data?.impact?.roi != null ? `${data.impact.roi}x` : '成本0', tone: C.accent },
        ].map((it) => (
          <div
            key={it.label}
            style={{
              background: `linear-gradient(160deg, ${C.panel} 0%, #0a1d42 100%)`,
              border: `1px solid ${C.panelBorder}`,
              borderRadius: 12,
              padding: '14px 18px',
              flex: 1,
              minWidth: 130,
            }}
          >
            <div style={{ color: C.dim, fontSize: 13 }}>{it.label}</div>
            <div style={{ color: it.tone, fontSize: 30, fontWeight: 700, lineHeight: 1.2 }}>{it.v}</div>
          </div>
        ))}
      </div>

      {/* 推荐方案（第一名） */}
      {/* v5.0试点扩展：空值防护 recommended/impact 缺失时不白屏 */}
      {data && data.recommended && (
        <div style={{ marginBottom: 14 }}>
          <Section title="🏆 推荐方案（四维加权第一名）" extra={`综合得分 ${data.recommended?.totalScore ?? 0}`}>
            <div style={{ border: `1px solid ${C.low}`, borderRadius: 10, padding: '14px 16px', background: 'rgba(6,20,46,0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{data.recommended?.title ?? '—'}</span>
                <span style={{ color: '#06142e', background: C.low, fontSize: 11, padding: '1px 8px', borderRadius: 999, fontWeight: 700 }}>
                  风险 {LEVEL_TEXT[data.recommended?.riskLevel ?? 'unknown'] ?? '—'}
                </span>
                <span style={{ color: C.dim, fontSize: 12 }}>见效约 {Math.round((data.recommended?.timeToEffectMin ?? 0) / 60)} 小时</span>
              </div>
              <div style={{ color: C.accent, fontSize: 14, marginTop: 8 }}>▶ {data.recommended?.action ?? '—'}</div>
              <div style={{ color: C.dim, fontSize: 13, marginTop: 6 }}>依据：{data.recommended?.rationale ?? '—'}</div>
              <div style={{ color: C.text, fontSize: 13, marginTop: 6 }}>
                预期收益：<span style={{ color: C.low }}>{benefitText(data.recommended?.benefit)}</span>
                ｜ 预估投入 ¥{(data.recommended?.costPerRun ?? 0).toLocaleString()}
                ｜ 置信度 {Math.round((data.impact?.confidence ?? 0) * 100)}%
              </div>
              <div style={{ color: C.mid, fontSize: 12, marginTop: 6 }}>⚠ {data.recommended?.riskNote ?? '—'}</div>
            </div>
          </Section>
        </div>
      )}

      {/* 全部候选方案排序 */}
      <div style={{ marginBottom: 14 }}>
        <Section title="候选方案四维排序" extra="收益 40% / 成本 25% / 风险 20% / 速度 15%">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data?.options ?? []).map((o) => (
              <div
                key={o.optionId}
                style={{
                  border: `1px solid ${o.recommended ? C.low : C.panelBorder}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  background: 'rgba(6,20,46,0.5)',
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: o.recommended ? C.low : C.accentDeep,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  {o.rank}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{o.title}</span>
                    <span style={{ color: '#06142e', background: LEVEL_COLOR[o.riskLevel], fontSize: 11, padding: '1px 8px', borderRadius: 999, fontWeight: 700 }}>
                      风险{LEVEL_TEXT[o.riskLevel]}
                    </span>
                    <span style={{ color: C.dim, fontSize: 12 }}>综合 {o.totalScore} 分</span>
                  </div>
                  <div style={{ color: C.accent, fontSize: 13, marginTop: 4 }}>{o.action}</div>
                  <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>
                    {benefitText(o.benefit)} ｜ 投入 ¥{o.costPerRun.toLocaleString()} ｜ 见效 {Math.round(o.timeToEffectMin / 60)}h
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* 效果跟踪闭环 */}
      <div style={{ marginBottom: 14 }}>
        <Section title="效果跟踪（预测 vs 实际）" extra="事后闭环，反哺下一次建议">
          {!outcome ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={trackOutcome}
                disabled={!data}
                style={{
                  background: C.accentDeep,
                  color: '#fff',
                  border: `1px solid ${C.accent}`,
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 14,
                  cursor: data ? 'pointer' : 'not-allowed',
                }}
              >
                上报本次推荐方案的实际结果（演示）
              </button>
              <span style={{ color: C.dim, fontSize: 12 }}>
                执行一段时间后回填实际收益与实际投入，系统自动判断达成率并沉淀经验。
              </span>
            </div>
          ) : (
            <div style={{ border: `1px solid ${VERDICT_COLOR[outcome.verdict]}`, borderRadius: 10, padding: 14, background: 'rgba(6,20,46,0.5)' }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: '#06142e', background: VERDICT_COLOR[outcome.verdict], fontSize: 12, padding: '2px 10px', borderRadius: 999, fontWeight: 700 }}>
                  {outcome.verdict === 'achieved' ? '达成' : outcome.verdict === 'partial' ? '部分达成' : '未达成'}
                </span>
                <span style={{ color: C.text, fontSize: 14 }}>
                  达成率 {Math.round(outcome.achievedRatio * 100)}%（实际 {outcome.actual} / 预测 {outcome.expected}，偏差 {outcome.deviationPct}%）
                </span>
                {outcome.costDeviationPct !== null && (
                  <span style={{ color: C.dim, fontSize: 13 }}>成本偏差 {outcome.costDeviationPct}%</span>
                )}
              </div>
              <div style={{ color: C.dim, fontSize: 13, marginTop: 8 }}>经验：{outcome.learning}</div>
              <div style={{ color: C.accent, fontSize: 13, marginTop: 4 }}>下一步：{outcome.nextAction}</div>
            </div>
          )}
        </Section>
      </div>

      {data?.notice && (
        <div style={{ color: C.dim, fontSize: 12, padding: '0 8px' }}>ℹ {data.notice}</div>
      )}
    </div>
  );
}
