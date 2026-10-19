/**
 * 健澜科技 jlmedaios - AI 医院大脑实时大屏（M156-B，集团与科研）
 *
 * 深色主题 + 深海蓝 + 大字：门诊 / 住院 / 手术 / 预警 / AI 建议五区实时刷新。
 * 「实时，不能静态」：每 5 秒轮询 GET /api/v1/ai-brain/realtime，
 *   不使用 WebSocket（任务红线）；数据为演示模式，页面显式标注「演示数据」。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { get } from '@/api/client';

/** 与 BFF aiBrainAggregator 对齐的响应类型 */
interface BrainResponse {
  generatedAt: string;
  demo: boolean;
  dataSource: 'demo' | 'live';
  hospital: { code: string; name: string };
  outpatient: { inWaiting: number; todayRegistered: number; todayVisited: number };
  inpatient: {
    inHospital: number;
    todayAdmitted: number;
    todayDischarged: number;
    totalBeds: number;
    bedRate: number;
  };
  surgery: { inProgress: number; completedToday: number; tomorrowScheduled: number };
  warnings: { criticalValues: number; infection: number; drugStock: number; equipmentFault: number };
  warningTotal: number;
  highSuggestionCount: number;
  suggestions: Array<{
    id: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    message: string;
    actions: string[];
  }>;
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

const PRIORITY_COLOR: Record<string, string> = {
  high: C.high,
  medium: C.mid,
  low: C.low,
};

/** 单个指标卡 */
function MetricCard(props: { label: string; value: number | string; unit?: string; tone?: string }) {
  return (
    <div
      style={{
        background: `linear-gradient(160deg, ${C.panel} 0%, #0a1d42 100%)`,
        border: `1px solid ${C.panelBorder}`,
        borderRadius: 12,
        padding: '18px 22px',
        flex: 1,
        minWidth: 150,
      }}
    >
      <div style={{ color: C.dim, fontSize: 14, marginBottom: 8 }}>{props.label}</div>
      <div style={{ color: props.tone ?? C.accent, fontSize: 44, fontWeight: 700, lineHeight: 1.1 }}>
        {props.value}
        {props.unit && (
          <span style={{ fontSize: 16, color: C.dim, marginLeft: 6, fontWeight: 400 }}>{props.unit}</span>
        )}
      </div>
    </div>
  );
}

/** 分区面板容器 */
function Section(props: { title: string; children: React.ReactNode }) {
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
          color: C.text,
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 14,
          borderLeft: `4px solid ${C.accent}`,
          paddingLeft: 10,
        }}
      >
        {props.title}
      </div>
      {props.children}
    </div>
  );
}

export default function AIBrainRealtimePage() {
  const [data, setData] = useState<BrainResponse | null>(null);
  const [error, setError] = useState<string>('');
  const timerRef = useRef<number | null>(null);

  const fetchBrain = useCallback(async () => {
    try {
      const res = await get<BrainResponse>('/api/v1/ai-brain/realtime');
      setData(res);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '实时数据获取失败');
    }
  }, []);

  useEffect(() => {
    void fetchBrain();
    timerRef.current = window.setInterval(() => void fetchBrain(), 5000);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [fetchBrain]);

  const updatedAt = data ? new Date(data.generatedAt).toLocaleTimeString('zh-CN') : '--:--:--';

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
            🧠 AI 医院大脑实时大屏
          </div>
          <div style={{ color: C.dim, fontSize: 13, marginTop: 4 }}>
            {data?.hospital.name ?? '杭州健澜示范医院'} · 集团与科研
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, color: C.accent, fontWeight: 600 }}>{updatedAt}</div>
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

      {error && (
        <div style={{ color: C.high, marginBottom: 12, fontSize: 14 }}>⚠ {error}</div>
      )}

      {/* 门诊 / 住院 / 手术 三行指标 */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <MetricCard label="候诊中" value={data?.outpatient.inWaiting ?? '--'} unit="人" />
        <MetricCard label="今日挂号" value={data?.outpatient.todayRegistered ?? '--'} unit="人次" tone="#a5b4fc" />
        <MetricCard label="今日就诊" value={data?.outpatient.todayVisited ?? '--'} unit="人次" tone="#a5b4fc" />
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <MetricCard label="在院人数" value={data?.inpatient.inHospital ?? '--'} unit="人" tone={C.low} />
        <MetricCard label="今日入院" value={data?.inpatient.todayAdmitted ?? '--'} unit="人" tone={C.low} />
        <MetricCard label="今日出院" value={data?.inpatient.todayDischarged ?? '--'} unit="人" tone={C.low} />
        <MetricCard
          label="床位使用率"
          value={data?.inpatient.bedRate ?? '--'}
          unit="%"
          tone={(data?.inpatient.bedRate ?? 0) >= 90 ? C.high : C.accent}
        />
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <MetricCard label="手术进行中" value={data?.surgery.inProgress ?? '--'} unit="间" tone={C.mid} />
        <MetricCard label="今日已完成" value={data?.surgery.completedToday ?? '--'} unit="台" tone={C.mid} />
        <MetricCard label="明日排程" value={data?.surgery.tomorrowScheduled ?? '--'} unit="台" tone="#a5b4fc" />
      </div>

      {/* 预警 + AI 建议 */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 380px' }}>
          <Section title="实时预警">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: '危急值待处理', v: data?.warnings.criticalValues ?? 0, tone: C.high },
                { label: '院感预警', v: data?.warnings.infection ?? 0, tone: C.high },
                { label: '药品库存预警', v: data?.warnings.drugStock ?? 0, tone: C.mid },
                { label: '设备故障', v: data?.warnings.equipmentFault ?? 0, tone: C.mid },
              ].map((it) => (
                <div
                  key={it.label}
                  style={{
                    border: `1px solid ${C.panelBorder}`,
                    borderRadius: 10,
                    padding: '14px 16px',
                    background: 'rgba(6,20,46,0.5)',
                  }}
                >
                  <div style={{ color: C.dim, fontSize: 13 }}>{it.label}</div>
                  <div style={{ color: it.tone, fontSize: 34, fontWeight: 700 }}>{it.v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, color: C.dim, fontSize: 13 }}>
              待处置合计：<span style={{ color: C.high, fontWeight: 600 }}>{data?.warningTotal ?? 0}</span> 条
            </div>
          </Section>
        </div>

        <div style={{ flex: '2 1 480px' }}>
          <Section title={`AI 建议（高优先级 ${data?.highSuggestionCount ?? 0}）`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflow: 'auto' }}>
              {(!data || (data?.suggestions?.length ?? 0) === 0) && (
                <div style={{ color: C.low, fontSize: 14 }}>✅ 各项运行平稳，暂无高优先级建议。</div>
              )}
              {(data?.suggestions ?? []).map((s) => (
                <div
                  key={s.id}
                  style={{
                    border: `1px solid ${PRIORITY_COLOR[s.priority]}`,
                    borderRadius: 10,
                    padding: '10px 14px',
                    background: 'rgba(6,20,46,0.5)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        color: '#06142e',
                        background: PRIORITY_COLOR[s.priority],
                        fontSize: 11,
                        padding: '1px 8px',
                        borderRadius: 999,
                        fontWeight: 700,
                      }}
                    >
                      {s.priority === 'high' ? '高' : s.priority === 'medium' ? '中' : '低'}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{s.title}</span>
                  </div>
                  <div style={{ color: C.dim, fontSize: 13, marginTop: 6 }}>{s.message}</div>
                  <div style={{ color: C.accent, fontSize: 12, marginTop: 6 }}>
                    建议：{s.actions.join('；')}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      <div style={{ marginTop: 16, color: C.dim, fontSize: 12, textAlign: 'center' }}>
        {data?.notice ?? '演示数据'} · Copyright © 2026 杭州健澜科技有限公司
      </div>
    </div>
  );
}
