/**
 * 健澜科技 jlmedaios - AI 医院大脑深化页（M170-C，自学习与数字孪生）
 *
 * 在 M159-A「异常发现 + 根因 + 7 天预测」之上，把大脑洞察扩展到四大维度：
 *   医疗质量（甲级病历率/手术并发症率/院感率）
 *   运营效率（床位周转率/平均住院日/平均等待时间）
 *   患者体验（满意度/NPS/投诉率/表扬率）
 *   财务健康（收入/成本/利润/DRG 结余）
 * 并给出跨指标关联分析与可执行洞察（动作 + 量化收益，不是「建议关注」）。
 *
 * 深海蓝 VI：深色底 + 深海蓝面板 + 青色强调，与 brain/Deep 同色系。
 * 数据为演示模式，页面显式标注「演示数据」；不使用 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { get } from '@/api/client';

/** 与 BFF brainDeepAggregator 对齐的响应类型 */
interface DimensionScore {
  key: 'quality' | 'efficiency' | 'experience' | 'finance';
  label: string;
  score: number;
  status: 'excellent' | 'good' | 'warn' | 'risk';
  gap: string;
  drags: { name: string; value: number; target: string }[];
}

interface MetricTrendForecast {
  metric: string;
  horizonDays: number;
  slopePerDay: number;
  direction: 'up' | 'down' | 'flat';
  r2: number;
  series: { date: string; value: number }[];
}

interface MetricCorrelation {
  a: string;
  b: string;
  r: number;
  strength: 'strong' | 'moderate' | 'weak';
  interpretation: string;
  implication: string;
}

interface BrainInsight {
  id: string;
  dimension: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  evidence: string[];
  action: string;
  expectedImpact: string;
}

interface ExpandResponse {
  generatedAt: string;
  demo: boolean;
  hospital: { code: string; name: string };
  brainIndex: number;
  level: 'A' | 'B' | 'C' | 'D';
  dimensions: DimensionScore[];
  profitMargin: number;
  forecasts: MetricTrendForecast[];
  correlations: MetricCorrelation[];
  insights: BrainInsight[];
  highInsightCount: number;
  notice: string;
}

/** 深海蓝主题色板 */
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

const STATUS_COLOR: Record<DimensionScore['status'], string> = {
  excellent: C.low,
  good: C.accent,
  warn: C.mid,
  risk: C.high,
};
const STATUS_LABEL: Record<DimensionScore['status'], string> = {
  excellent: '优',
  good: '良',
  warn: '关注',
  risk: '风险',
};
const DIM_LABEL: Record<string, string> = {
  avgLOS: '平均住院日',
  bedTurnover: '床位周转率',
  satisfaction: '满意度',
  complaintRate: '投诉率',
  nps: 'NPS',
  praiseRate: '表扬率',
  drgSurplusWan: 'DRG 结余',
  profitWan: '月结余',
};

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

function Badge(props: { level: 'high' | 'medium' | 'low'; text: string }) {
  const color = props.level === 'high' ? C.high : props.level === 'medium' ? C.mid : C.low;
  return (
    <span
      style={{
        color: '#06142e',
        background: color,
        fontSize: 11,
        padding: '1px 8px',
        borderRadius: 999,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {props.text}
    </span>
  );
}

export default function AIBrainDeepExpandPage() {
  const [data, setData] = useState<ExpandResponse | null>(null);
  const [error, setError] = useState<string>('');
  const timerRef = useRef<number | null>(null);

  const fetchExpand = useCallback(async () => {
    try {
      const res = await get<ExpandResponse>('/api/v1/ai-brain/expand');
      setData(res);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '大脑扩展数据获取失败');
    }
  }, []);

  useEffect(() => {
    void fetchExpand();
    timerRef.current = window.setInterval(() => void fetchExpand(), 60_000);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [fetchExpand]);

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
            🧠 AI 医院大脑深化（指标扩展 + 预测）
          </div>
          <div style={{ color: C.dim, fontSize: 13, marginTop: 4 }}>
            {data?.hospital.name ?? '杭州健澜示范医院'} · 自学习与数字孪生 · 四大维度 / 趋势预测 / 关联洞察
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

      {/* 大脑综合指数 + 四维评分 */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <div
          style={{
            background: `linear-gradient(160deg, ${C.panel} 0%, #0a1d42 100%)`,
            border: `1px solid ${C.panelBorder}`,
            borderRadius: 12,
            padding: '18px 26px',
            minWidth: 200,
          }}
        >
          <div style={{ color: C.dim, fontSize: 13 }}>大脑综合指数</div>
          <div style={{ color: C.accent, fontSize: 48, fontWeight: 700, lineHeight: 1.1 }}>
            {data?.brainIndex ?? '--'}
          </div>
          <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>
            等级 <span style={{ color: '#fff', fontWeight: 700 }}>{data?.level ?? '--'}</span>
            ・结余率 {data?.profitMargin ?? '--'}%
          </div>
        </div>

        {data?.dimensions.map((d) => (
          <div
            key={d.key}
            style={{
              background: `linear-gradient(160deg, ${C.panel} 0%, #0a1d42 100%)`,
              border: `1px solid ${C.panelBorder}`,
              borderRadius: 12,
              padding: '14px 22px',
              flex: 1,
              minWidth: 180,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: C.dim, fontSize: 13 }}>{d.label}</span>
              <Badge
                level={d.status === 'risk' ? 'high' : d.status === 'warn' ? 'medium' : 'low'}
                text={STATUS_LABEL[d.status]}
              />
            </div>
            <div style={{ color: STATUS_COLOR[d.status], fontSize: 36, fontWeight: 700, lineHeight: 1.2 }}>
              {d.score}
            </div>
            <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>{d.gap}</div>
          </div>
        ))}
      </div>

      {/* 可执行洞察（核心） */}
      <div style={{ marginBottom: 14 }}>
        <Section
          title="大脑洞察（可执行动作 + 量化收益）"
          extra={`高优先级 ${data?.highInsightCount ?? 0} 条 / 共 ${data?.insights.length ?? 0} 条`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(!data || data.insights.length === 0) && (
              <div style={{ color: C.low, fontSize: 14 }}>✅ 各维度指标健康，暂无待执行洞察。</div>
            )}
            {data?.insights.map((ins) => (
              <div
                key={ins.id}
                style={{
                  border: `1px solid ${ins.priority === 'high' ? C.high : ins.priority === 'medium' ? C.mid : C.low}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  background: 'rgba(6,20,46,0.5)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge
                    level={ins.priority}
                    text={ins.priority === 'high' ? '高' : ins.priority === 'medium' ? '中' : '低'}
                  />
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{ins.title}</span>
                </div>
                <div style={{ color: C.dim, fontSize: 12, marginTop: 6 }}>
                  {ins.evidence.map((e, i) => (
                    <div key={i}>· {e}</div>
                  ))}
                </div>
                <div style={{ color: C.accent, fontSize: 13, marginTop: 6 }}>👉 {ins.action}</div>
                <div style={{ color: C.low, fontSize: 12, marginTop: 4 }}>预期收益：{ins.expectedImpact}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* 趋势预测 + 关联分析 */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 460px' }}>
          <Section title="关键指标未来 7 天趋势预测" extra="线性外推 + R² 拟合优度">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: C.dim, textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px', fontWeight: 400 }}>指标</th>
                    <th style={{ padding: '6px 8px', fontWeight: 400 }}>方向</th>
                    <th style={{ padding: '6px 8px', fontWeight: 400 }}>斜率/天</th>
                    <th style={{ padding: '6px 8px', fontWeight: 400 }}>R²</th>
                    <th style={{ padding: '6px 8px', fontWeight: 400 }}>7 天后</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.forecasts.map((f) => {
                    const last = f.series[f.series.length - 1];
                    return (
                      <tr key={f.metric} style={{ borderTop: '1px solid rgba(30,58,138,0.4)' }}>
                        <td style={{ padding: '8px 8px', color: C.text }}>{DIM_LABEL[f.metric] ?? f.metric}</td>
                        <td style={{ padding: '8px 8px', color: f.direction === 'up' ? C.high : f.direction === 'down' ? C.low : C.dim }}>
                          {f.direction === 'up' ? '↑ 上升' : f.direction === 'down' ? '↓ 下降' : '→ 平稳'}
                        </td>
                        <td style={{ padding: '8px 8px', color: C.accent }}>{f.slopePerDay}</td>
                        <td style={{ padding: '8px 8px', color: C.dim }}>{f.r2}</td>
                        <td style={{ padding: '8px 8px', color: '#fff', fontWeight: 600 }}>
                          {last?.date} ＝ {last?.value}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        <div style={{ flex: '1 1 380px' }}>
          <Section title="跨指标关联分析" extra={`|r| ≥ 0.5，共 ${data?.correlations.length ?? 0} 组`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflow: 'auto' }}>
              {(!data || data.correlations.length === 0) && (
                <div style={{ color: C.dim, fontSize: 13 }}>窗口内无显著关联。</div>
              )}
              {data?.correlations.map((c) => (
                <div
                  key={`${c.a}-${c.b}`}
                  style={{
                    border: `1px solid ${c.strength === 'strong' ? C.high : C.panelBorder}`,
                    borderRadius: 10,
                    padding: '10px 12px',
                    background: 'rgba(6,20,46,0.5)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>
                      {DIM_LABEL[c.a] ?? c.a} ⇄ {DIM_LABEL[c.b] ?? c.b}
                    </span>
                    <span style={{ color: C.accent, fontSize: 13, fontWeight: 700 }}>r={c.r}</span>
                  </div>
                  <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>{c.interpretation}</div>
                  <div style={{ color: C.accent, fontSize: 12, marginTop: 4 }}>👉 {c.implication}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      <div style={{ marginTop: 16, color: C.dim, fontSize: 12, textAlign: 'center' }}>
        {data?.notice ?? '演示数据'} · 自学习与数字孪生 · Copyright © 2026 杭州健澜科技有限公司
      </div>
    </div>
  );
}
