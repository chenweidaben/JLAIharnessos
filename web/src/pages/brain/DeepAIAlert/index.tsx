/**
 * 健澜科技 jlmedaios - AI 医院大脑 · 深度智能预警页（M175-B，质量与新场景）
 *
 * 「AI 预警要真有用，不能只说建议关注」：
 *   - 每条预警带证据链（当前值 vs 警戒线 / 偏离幅度 / 口径）；
 *   - 每条预警给出可落地处置（具体措施 / 责任岗 / SLA / 量化目标 / 第一步动作）；
 *   - 四大类（医疗质量 / 运营效率 / 安全合规 / 财务经营）按优先级降序排列。
 *
 * 深海蓝 VI：深色底 + 深海蓝面板 + 青色强调，与 brain/BrainDeep 同色系。
 * 数据为演示模式，页面显式标注「演示数据」；不使用 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { get } from '@/api/client';

type AlertCategory = 'quality' | 'operations' | 'safety' | 'finance';
type AlertSeverity = 'critical' | 'warning' | 'info';

interface DeepAIAlert {
  id: string;
  code: string;
  title: string;
  category: AlertCategory;
  severity: AlertSeverity;
  unit: string;
  current: number;
  threshold: number;
  direction: 'lower_better' | 'higher_better';
  deviation: number;
  deviationPct: number;
  evidence: string[];
  score: number;
  status: 'open';
  detectedAt: string;
}

interface AIAlertAction {
  alertId: string;
  code: string;
  measure: string;
  owner: string;
  slaHours: number;
  target: string;
  firstStep: string;
}

interface DeepAIAlertResponse {
  alerts: DeepAIAlert[];
  actions: AIAlertAction[];
  summary: Record<AlertCategory, number>;
  criticalCount: number;
  generatedAt: string;
  demo: boolean;
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

const CATEGORY_LABEL: Record<AlertCategory, string> = {
  quality: '医疗质量',
  operations: '运营效率',
  safety: '安全合规',
  finance: '财务经营',
};

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: '红线',
  warning: '黄线',
  info: '提示',
};

function severityColor(s: AlertSeverity): string {
  return s === 'critical' ? C.high : s === 'warning' ? C.mid : C.low;
}

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

function Badge(props: { level: AlertSeverity | 'high' | 'medium' | 'low'; text: string }) {
  const color =
    props.level === 'critical' || props.level === 'high'
      ? C.high
      : props.level === 'warning' || props.level === 'medium'
        ? C.mid
        : C.low;
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

export default function DeepAIAlertPage() {
  const [data, setData] = useState<DeepAIAlertResponse | null>(null);
  const [error, setError] = useState<string>('');
  const timerRef = useRef<number | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await get<DeepAIAlertResponse>('/api/v1/ai-brain/deep-alert');
      setData(res);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 深度预警数据获取失败');
    }
  }, []);

  useEffect(() => {
    void fetchAlerts();
    timerRef.current = window.setInterval(() => void fetchAlerts(), 60_000);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [fetchAlerts]);

  const actionMap = new Map((data?.actions ?? []).map((a) => [a.alertId, a]));
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
            🚨 AI 深度智能预警（证据链 + 可落地处置）
          </div>
          <div style={{ color: C.dim, fontSize: 13, marginTop: 4 }}>
            杭州健澜示范医院 · 医疗质量 / 运营效率 / 安全合规 / 财务经营 四类 12 阈值
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
              background: 'rgba(248,113,113,0.15)',
              color: C.high,
              fontSize: 12,
            }}
          >
            {data?.demo ? '演示数据' : '实时数据'}
          </div>
        </div>
      </div>

      {error && <div style={{ color: C.high, marginBottom: 12, fontSize: 14 }}>⚠ {error}</div>}

      {/* 顶部统计卡片 */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <div
          style={{
            background: `linear-gradient(160deg, ${C.panel} 0%, #0a1d42 100%)`,
            border: `1px solid ${C.panelBorder}`,
            borderRadius: 12,
            padding: '18px 26px',
            minWidth: 180,
          }}
        >
          <div style={{ color: C.dim, fontSize: 13 }}>开放预警总数</div>
          <div style={{ color: C.accent, fontSize: 44, fontWeight: 700, lineHeight: 1.1 }}>
            {data?.alerts.length ?? 0}
          </div>
          <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>按优先级降序</div>
        </div>
        <div
          style={{
            background: `linear-gradient(160deg, ${C.panel} 0%, #0a1d42 100%)`,
            border: `1px solid ${C.panelBorder}`,
            borderRadius: 12,
            padding: '18px 26px',
            minWidth: 180,
          }}
        >
          <div style={{ color: C.dim, fontSize: 13 }}>红线预警（需 2h 内处置）</div>
          <div style={{ color: C.high, fontSize: 44, fontWeight: 700, lineHeight: 1.1 }}>
            {data?.criticalCount ?? 0}
          </div>
          <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>SLA 2 小时</div>
        </div>
        {(Object.keys(CATEGORY_LABEL) as AlertCategory[]).map((cat) => (
          <div
            key={cat}
            style={{
              background: `linear-gradient(160deg, ${C.panel} 0%, #0a1d42 100%)`,
              border: `1px solid ${C.panelBorder}`,
              borderRadius: 12,
              padding: '14px 22px',
              flex: 1,
              minWidth: 140,
            }}
          >
            <div style={{ color: C.dim, fontSize: 13 }}>{CATEGORY_LABEL[cat]}</div>
            <div style={{ color: '#fff', fontSize: 34, fontWeight: 700, lineHeight: 1.2 }}>
              {data?.summary[cat] ?? 0}
            </div>
            <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>条预警</div>
          </div>
        ))}
      </div>

      {/* 预警列表（核心：证据链 + 处置） */}
      <Section
        title="预警清单（按优先级排序）"
        extra={`共 ${data?.alerts.length ?? 0} 条 / 红线 ${data?.criticalCount ?? 0} 条`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(!data || data.alerts.length === 0) && (
            <div style={{ color: C.low, fontSize: 14 }}>✅ 各项指标均在警戒线内，暂无开放预警。</div>
          )}
          {data?.alerts.map((a) => {
            const act = actionMap.get(a.id);
            return (
              <div
                key={a.id}
                style={{
                  border: `1px solid ${severityColor(a.severity)}`,
                  borderRadius: 10,
                  padding: '14px 16px',
                  background: 'rgba(6,20,46,0.5)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Badge level={a.severity} text={SEVERITY_LABEL[a.severity]} />
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{a.title}</span>
                  <span style={{ color: C.dim, fontSize: 12 }}>[{CATEGORY_LABEL[a.category]}]</span>
                  <span style={{ marginLeft: 'auto', color: C.accent, fontSize: 13, fontWeight: 700 }}>
                    优先级 {a.score}
                  </span>
                </div>

                {/* 证据链 */}
                <div style={{ color: C.dim, fontSize: 12, marginTop: 8 }}>
                  {a.evidence.map((e, i) => (
                    <div key={i}>· {e}</div>
                  ))}
                </div>

                {/* 处置建议（可落地） */}
                {act && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: 'rgba(56,189,248,0.08)',
                      border: '1px solid rgba(56,189,248,0.25)',
                    }}
                  >
                    <div style={{ color: C.accent, fontSize: 13 }}>
                      👉 处置：{act.measure}
                    </div>
                    <div style={{ color: C.text, fontSize: 12, marginTop: 6 }}>
                      责任岗：<span style={{ color: '#fff' }}>{act.owner}</span>
                      　·　SLA：<span style={{ color: C.high }}>{act.slaHours}h</span>
                      　·　目标：<span style={{ color: C.low }}>{act.target}</span>
                    </div>
                    <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>
                      第一步（30 分钟内）：{act.firstStep}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <div style={{ marginTop: 16, color: C.dim, fontSize: 12, textAlign: 'center' }}>
        {data?.notice ?? '演示数据'} · 预警为管理辅助，不替代临床诊疗与院感流调 · Copyright © 2026 杭州健澜科技有限公司
      </div>
    </div>
  );
}
