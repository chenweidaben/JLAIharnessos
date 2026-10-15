/**
 * 健澜科技 jlmedaios - 患者端慢病管理助手页（M131-B）
 *
 * 【AI能力深化】聚合展示高血压 / 糖尿病 / 冠心病三类慢病的：
 *   1. 指标趋势折线图（手写 SVG，无第三方图表依赖）；
 *   2. 当前值 vs 指南目标值对比（达标 / 超标徽章 + 超出幅度）；
 *   3. AI 风险趋势预测（方向、风险分、置信度、7 天后外推值）。
 *
 * 视觉遵循深海蓝 VI：主色 #0b4f8a，浅底 #eaf3fb。
 * 三态原则：loading / error / empty。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';

// ---- 与后端 chronicDiseaseAggregator.ChronicOverview 对齐 ----
interface MetricComparison {
  key: string;
  label: string;
  unit: string;
  current: number | null;
  target: number;
  atTarget: boolean;
  delta: number | null;
}
interface DiseaseSummary {
  disease: string;
  diseaseName: string;
  latestAt: string | null;
  status: 'controlled' | 'abnormal' | 'critical';
  metrics: MetricComparison[];
}
interface MetricTrend {
  key: string;
  label: string;
  unit: string;
  target: number;
  points: { at: string; value: number }[];
  slopePerDay: number | null;
  predictedNext: { at: string; value: number } | null;
  direction: 'improving' | 'worsening' | 'stable';
}
interface ChronicOverviewData {
  patientId: string;
  overallRisk: 'controlled' | 'abnormal' | 'critical' | 'unknown';
  riskScore: number;
  diseases: DiseaseSummary[];
  trend: {
    direction: 'improving' | 'worsening' | 'stable';
    riskScore: number;
    riskLevel: 'low' | 'moderate' | 'high' | 'critical';
    confidence: 'low' | 'medium' | 'high';
    metrics: MetricTrend[];
  };
  recordCount: number;
  generatedAt: string;
}

// 深海蓝 VI 色板
const VI = {
  primary: '#0b4f8a',
  primaryDark: '#083a66',
  lightBg: '#eaf3fb',
  controlled: '#2e7d32',
  controlledBg: '#e8f5e9',
  abnormal: '#e65100',
  abnormalBg: '#fff4e5',
  critical: '#c62828',
  criticalBg: '#fdecea',
  text: '#222',
  muted: '#888',
};

const STATUS_META: Record<DiseaseSummary['status'], { label: string; color: string; bg: string }> = {
  controlled: { label: '达标', color: VI.controlled, bg: VI.controlledBg },
  abnormal: { label: '超标', color: VI.abnormal, bg: VI.abnormalBg },
  critical: { label: '危急', color: VI.critical, bg: VI.criticalBg },
};

const RISK_META: Record<string, { label: string; color: string; bg: string }> = {
  controlled: { label: '控制良好', color: VI.controlled, bg: VI.controlledBg },
  abnormal: { label: '需关注', color: VI.abnormal, bg: VI.abnormalBg },
  critical: { label: '高风险', color: VI.critical, bg: VI.criticalBg },
  unknown: { label: '暂无数据', color: VI.muted, bg: '#f0f0f0' },
};

const DIRECTION_META: Record<string, { label: string; color: string }> = {
  improving: { label: '↘ 向好', color: VI.controlled },
  worsening: { label: '↗ 恶化', color: VI.critical },
  stable: { label: '→ 平稳', color: VI.abnormal },
};

/** 手写 SVG 指标趋势图：折线 + 目标值虚线 */
function TrendChart({ m }: { m: MetricTrend }) {
  const W = 320;
  const H = 120;
  const pad = 24;
  const pts = m.points;
  if (pts.length === 0) {
    return <div style={{ fontSize: 14, color: VI.muted, padding: '12px 0'}}>暂无可视化数据</div>;
  }
  const values = pts.map((p) => p.value);
  const allVals = [...values, m.target];
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const span = max - min || 1;
  const x = (i: number) => (pts.length === 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (pts.length - 1));
  const y = (v: number) => H - pad - ((v - min) / span) * (H - 2 * pad);

  const line = pts.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');
  const targetY = y(m.target);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', marginTop: 8 }}>
      {/* 目标值虚线 */}
      <line x1={pad} y1={targetY} x2={W - pad} y2={targetY} stroke={VI.primary} strokeWidth={1.5} strokeDasharray="5,4" />
      <text x={W - pad} y={targetY - 4} textAnchor="end" fontSize={10} fill={VI.primary}>
        目标 {m.target} {m.unit}
      </text>
      {/* 趋势折线 */}
      <polyline points={line} fill="none" stroke={VI.primary} strokeWidth={2} />
      {pts.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={3} fill={VI.primaryDark} />
      ))}
    </svg>
  );
}

export default function ChronicManagementPage() {
  const [data, setData] = useState<ChronicOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/patient/chronic/overview');
      const json = await res.json();
      if (json?.code !== 0) throw new Error(json?.message || '加载失败');
      setData(json.data as ChronicOverviewData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div style={{ padding: 32, fontSize: 20, color: VI.muted }}>加载中，请稍候…</div>;
  }
  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 20, color: VI.critical }}>{error}</div>
        <button onClick={load} style={{ marginTop: 16, fontSize: 18, padding: '10px 28px', borderRadius: 8 }}>
          重新加载
        </button>
      </div>
    );
  }

  const risk = RISK_META[data?.overallRisk ?? 'unknown'];
  const dir = DIRECTION_META[data?.trend.direction ?? 'stable'];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 24 }}>
      {/* 头部：总体风险 + 风险分 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 26, margin: 0, color: VI.primaryDark }}>我的慢病管理</h2>
          <div style={{ fontSize: 14, color: VI.muted, marginTop: 4 }}>
            共 {data?.recordCount ?? 0} 条测量记录 · AI 风险趋势预测
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ background: risk.bg, color: risk.color, padding: '8px 16px', borderRadius: 20, fontSize: 16, fontWeight: 700 }}>
            {risk.label}
          </span>
          <span style={{ background: VI.primary, color: '#fff', padding: '8px 16px', borderRadius: 20, fontSize: 16, fontWeight: 700 }}>
            风险分 {data?.riskScore ?? 0} · {dir.label}
          </span>
        </div>
      </div>

      {(!data || data.diseases.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: VI.muted }}>
          <div style={{ fontSize: 22 }}>暂无慢病测量记录</div>
          <div style={{ fontSize: 16, marginTop: 8 }}>请先到社区或门诊完成首次血压 / 血糖 / 血脂测量</div>
        </div>
      ) : (
        <>
          {/* 病种卡片：当前值 vs 目标值对比 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
            {data.diseases.map((d) => {
              const s = STATUS_META[d.status];
              return (
                <div key={d.disease} style={{ background: '#fff', border: `1px solid ${VI.lightBg}`, borderTop: `4px solid ${s.color}`, borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(11,79,138,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: VI.primaryDark }}>{d.diseaseName}</span>
                    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>{s.label}</span>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    {d.metrics.map((m) => (
                      <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: '1px dashed #eef2f7' }}>
                        <span style={{ fontSize: 15, color: VI.text }}>{m.label}</span>
                        <span style={{ fontSize: 15 }}>
                          <span style={{ fontWeight: 700, color: m.atTarget ? VI.controlled : VI.abnormal }}>
                            {m.current == null ? '—' : m.current}
                          </span>
                          <span style={{ color: VI.muted, fontSize: 13 }}> {m.unit} </span>
                          <span style={{ color: VI.muted, fontSize: 13 }}>
                            / 目标 &lt;{m.target}
                            {m.delta != null && !m.atTarget ? ` (超 +${m.delta})` : ''}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 指标趋势图 */}
          <h3 style={{ fontSize: 20, color: VI.primaryDark, margin: '0 0 12px' }}>指标趋势（虚线为控制目标）</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {data.trend.metrics.map((m) => {
              const md = DIRECTION_META[m.direction];
              return (
                <div key={m.key} style={{ background: VI.lightBg, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: VI.primaryDark }}>{m.label}（{m.unit}）</span>
                    <span style={{ fontSize: 13, color: md.color, fontWeight: 700 }}>{md.label}</span>
                  </div>
                  <TrendChart m={m} />
                  {m.predictedNext && (
                    <div style={{ fontSize: 13, color: VI.muted, marginTop: 4 }}>
                      预测 7 天后：<span style={{ fontWeight: 700, color: VI.primary }}>{m.predictedNext.value} {m.unit}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 12, color: VI.muted, marginTop: 20, textAlign: 'center' }}>
            数据更新于 {new Date(data.generatedAt).toLocaleString('zh-CN', { hour12: false })} · 本页预测仅供健康管理参考，诊疗请遵医嘱
          </div>
        </>
      )}
    </div>
  );
}
