/**
 * 健澜科技 jlmedaios - AI 医院大脑深化页（M159-A，中期路线图）
 *
 * 在实时大屏之上回答「为什么异常、该怎么办、接下来会怎样」：
 *   智能预警（异常自动发现 + 根因候选）/ 决策建议（可执行动作）
 *   / 未来 7 天趋势预测 / 根因分析（结论 + 证据链 + 置信度）。
 * 深海蓝 VI：深色底 + 深海蓝面板 + 青色强调，与 brain/Realtime 同色系。
 * 数据为演示模式，页面显式标注「演示数据」；不使用 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { get } from '@/api/client';

/** 与 BFF brainDeepAggregator 对齐的响应类型 */
interface DeepAlert {
  id: string;
  metric: 'outpatient' | 'bedRate' | 'surgery';
  severity: 'high' | 'medium' | 'low';
  title: string;
  observed: number;
  expected: number;
  deviationPct: number;
  summary: string;
  likelyCauses: string[];
}

interface DeepRecommendation {
  id: string;
  metric: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  suggestedAction: string;
  expectedBenefit: string;
}

interface ForecastPoint {
  date: string;
  outpatient: number;
  bedRate: number;
  surgery: number;
}

interface RootCause {
  metric: string;
  deviationPct: number;
  diagnosis: string;
  evidence: string[];
  confidence: number;
}

interface DeepBrainResponse {
  generatedAt: string;
  demo: boolean;
  hospital: { code: string; name: string };
  alerts: DeepAlert[];
  recommendations: DeepRecommendation[];
  forecast: { horizonDays: number; series: ForecastPoint[] };
  rootCauses: RootCause[];
  highAlertCount: number;
  highRecommendationCount: number;
  notice: string;
}

/** 深海蓝主题色板（与 brain/Realtime 一致） */
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

const SEV_COLOR: Record<string, string> = { high: C.high, medium: C.mid, low: C.low };
const METRIC_LABEL: Record<string, string> = { outpatient: '门诊量', bedRate: '床位率', surgery: '手术量' };

/** 分区面板容器 */
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

/** 优先级 / 严重度小徽标 */
function Badge(props: { level: 'high' | 'medium' | 'low'; text: string }) {
  return (
    <span
      style={{
        color: '#06142e',
        background: SEV_COLOR[props.level],
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

export default function AIBrainDeepPage() {
  const [data, setData] = useState<DeepBrainResponse | null>(null);
  const [error, setError] = useState<string>('');
  const timerRef = useRef<number | null>(null);

  const fetchDeep = useCallback(async () => {
    try {
      const res = await get<DeepBrainResponse>('/api/v1/ai-brain/deep');
      setData(res);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '深化分析数据获取失败');
    }
  }, []);

  useEffect(() => {
    void fetchDeep();
    // 深化页非高频大屏：60s 刷新一次即可，不触碰 WebSocket
    timerRef.current = window.setInterval(() => void fetchDeep(), 60_000);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [fetchDeep]);

  const updatedAt = data ? new Date(data.generatedAt).toLocaleString('zh-CN') : '--';
  const maxOutpatient = Math.max(1, ...(data?.forecast.series.map((p) => p.outpatient) ?? [1]));

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
            🧠 AI 医院大脑深化分析
          </div>
          <div style={{ color: C.dim, fontSize: 13, marginTop: 4 }}>
            {data?.hospital.name ?? '杭州健澜示范医院'} · 中期路线图 · 异常发现 / 决策建议 / 趋势预测 / 根因分析
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

      {/* 概览角标 */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { label: '异常预警', v: data?.alerts?.length ?? '--', tone: C.high },
          { label: '其中高严重度', v: data?.highAlertCount ?? 0, tone: C.high },
          { label: '决策建议', v: data?.recommendations?.length ?? '--', tone: C.accent },
          { label: '根因分析项', v: data?.rootCauses?.length ?? '--', tone: C.mid },
        ].map((it) => (
          <div
            key={it.label}
            style={{
              background: `linear-gradient(160deg, ${C.panel} 0%, #0a1d42 100%)`,
              border: `1px solid ${C.panelBorder}`,
              borderRadius: 12,
              padding: '14px 22px',
              flex: 1,
              minWidth: 140,
            }}
          >
            <div style={{ color: C.dim, fontSize: 13 }}>{it.label}</div>
            <div style={{ color: it.tone, fontSize: 36, fontWeight: 700, lineHeight: 1.15 }}>{it.v}</div>
          </div>
        ))}
      </div>

      {/* 智能预警 + 根因分析 */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 420px' }}>
          <Section title="智能预警（异常自动发现）" extra={`共 ${data?.alerts?.length ?? 0} 条`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflow: 'auto' }}>
              {(!data || (data?.alerts?.length ?? 0) === 0) && (
                <div style={{ color: C.low, fontSize: 14 }}>✅ 各项指标平稳，未发现异常偏离。</div>
              )}
              {(data?.alerts ?? []).map((a) => (
                <div
                  key={a.id}
                  style={{
                    border: `1px solid ${SEV_COLOR[a.severity]}`,
                    borderRadius: 10,
                    padding: '10px 14px',
                    background: 'rgba(6,20,46,0.5)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge level={a.severity} text={a.severity === 'high' ? '高' : a.severity === 'medium' ? '中' : '低'} />
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{a.title}</span>
                  </div>
                  <div style={{ color: C.dim, fontSize: 13, marginTop: 6 }}>{a.summary}</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: C.accent }}>
                    疑似原因：
                    {(a.likelyCauses ?? []).map((c, i) => (
                      <div key={i} style={{ color: C.dim, marginTop: 2, paddingLeft: 8 }}>
                        · {c}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div style={{ flex: '1 1 380px' }}>
          <Section title="根因分析" extra={`置信度 0~1`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 420, overflow: 'auto' }}>
              {(!data || (data?.rootCauses?.length ?? 0) === 0) && (
                <div style={{ color: C.low, fontSize: 14 }}>✅ 无显著偏离，暂无需根因分析。</div>
              )}
              {(data?.rootCauses ?? []).map((r) => (
                <div
                  key={r.metric}
                  style={{
                    border: `1px solid ${C.panelBorder}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    background: 'rgba(6,20,46,0.5)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        color: '#06142e',
                        background: C.accent,
                        fontSize: 11,
                        padding: '1px 8px',
                        borderRadius: 999,
                        fontWeight: 700,
                      }}
                    >
                      {METRIC_LABEL[r.metric] ?? r.metric}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{r.diagnosis}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: C.dim }}>
                    {(r.evidence ?? []).map((e, i) => (
                      <div key={i}>· {e}</div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ color: C.dim, fontSize: 11, marginBottom: 3 }}>
                      置信度 {Math.round(r.confidence * 100)}%
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(148,163,184,0.2)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.round(r.confidence * 100)}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${C.accentDeep}, ${C.accent})`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      {/* 决策建议 */}
      <div style={{ marginBottom: 14 }}>
        <Section title="决策建议（可执行动作）" extra={`高优先级 ${data?.highRecommendationCount ?? 0} 条`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(!data || (data?.recommendations?.length ?? 0) === 0) && (
              <div style={{ color: C.low, fontSize: 14 }}>✅ 运行平稳，暂无待决事项。</div>
            )}
            {(data?.recommendations ?? []).map((r) => (
              <div
                key={r.id}
                style={{
                  border: `1px solid ${SEV_COLOR[r.priority]}`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  background: 'rgba(6,20,46,0.5)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge level={r.priority} text={r.priority === 'high' ? '高' : r.priority === 'medium' ? '中' : '低'} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{r.title}</span>
                </div>
                <div style={{ color: C.dim, fontSize: 13, marginTop: 6 }}>{r.message}</div>
                <div style={{ color: C.accent, fontSize: 13, marginTop: 6 }}>👉 {r.suggestedAction}</div>
                <div style={{ color: C.low, fontSize: 12, marginTop: 4 }}>预期收益：{r.expectedBenefit}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* 未来 7 天趋势预测 */}
      <div style={{ marginBottom: 14 }}>
        <Section title={`未来 ${data?.forecast.horizonDays ?? 7} 天趋势预测`} extra="门诊量 / 床位率 / 手术量（线性外推，演示）">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: C.dim, textAlign: 'left' }}>
                  <th style={{ padding: '6px 10px', fontWeight: 400 }}>日期</th>
                  <th style={{ padding: '6px 10px', fontWeight: 400 }}>预测门诊量（人次）</th>
                  <th style={{ padding: '6px 10px', fontWeight: 400 }}>趋势条</th>
                  <th style={{ padding: '6px 10px', fontWeight: 400 }}>床位使用率</th>
                  <th style={{ padding: '6px 10px', fontWeight: 400 }}>预测手术（台）</th>
                </tr>
              </thead>
              <tbody>
                {data?.forecast.series.map((p) => (
                  <tr key={p.date} style={{ borderTop: '1px solid rgba(30,58,138,0.4)' }}>
                    <td style={{ padding: '8px 10px', color: C.text }}>{p.date}</td>
                    <td style={{ padding: '8px 10px', color: C.accent, fontWeight: 600 }}>{p.outpatient}</td>
                    <td style={{ padding: '8px 10px', width: '32%' }}>
                      <div
                        style={{
                          height: 8,
                          borderRadius: 4,
                          background: `linear-gradient(90deg, ${C.accentDeep}, ${C.accent})`,
                          width: `${Math.round((p.outpatient / maxOutpatient) * 100)}%`,
                        }}
                      />
                    </td>
                    <td style={{ padding: '8px 10px', color: p.bedRate >= 90 ? C.high : C.low }}>{p.bedRate}%</td>
                    <td style={{ padding: '8px 10px', color: '#a5b4fc' }}>{p.surgery}</td>
                  </tr>
                ))}
                {(!data || data.forecast.series.length === 0) && (
                  <tr>
                    <td colSpan={5} style={{ padding: 12, color: C.dim }}>
                      --
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <div style={{ marginTop: 16, color: C.dim, fontSize: 12, textAlign: 'center' }}>
        {data?.notice ?? '演示数据'} · 中期路线图 · Copyright © 2026 杭州健澜科技有限公司
      </div>
    </div>
  );
}
