/**
 * 健澜科技 jlmedaios - 患者在线问诊页（M143-A · 互联网医院与远程医疗）
 *
 * 【互联网医院与远程医疗】患者侧在线问诊：
 *   - 选择问诊模式（文字咨询 / 图文咨询 / 视频咨询）、填写科室与主诉，发起问诊；
 *   - 问诊单状态可视化：待接单 → 咨询中 → 已结束 / 已取消；
 *   - 咨询中按 BFF 返回的 deadlineAt 本地倒计时（30 分钟红线），
 *     归零即提示「超时自动结束」——不触碰 WebSocket，纯本地计时 + 动作后刷新。
 *
 * 深海蓝 VI：主色 #0b4f8a（深海蓝），辅助浅蓝底 #e8f1fa，强调按钮实心深海蓝。
 * 内联样式零额外依赖；三态 loading / error / empty。
 * 本页面仅承载咨询发起与状态查看，不替代医师诊疗判断。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/* 与 BFF 聚合结果对齐的类型                                            */
/* ------------------------------------------------------------------ */

type ConsultMode = 'text' | 'image' | 'video';
type ConsultStatus = 'pending' | 'ongoing' | 'ended' | 'cancelled';

interface Consult {
  id: string;
  patientId: string;
  doctorId: string | null;
  dept: string;
  symptoms: string;
  mode: ConsultMode;
  status: ConsultStatus;
  endReason: 'completed' | 'timeout' | null;
  summary: string | null;
  createdAt: string;
  acceptedAt: string | null;
  endedAt: string | null;
  deadlineAt: string | null;
  durationSec: number | null;
}

/* ------------------------------------------------------------------ */
/* 深海蓝 VI 色板                                                      */
/* ------------------------------------------------------------------ */

const SEA_BLUE = '#0b4f8a';
const SEA_BLUE_DEEP = '#083a66';
const SEA_BLUE_BG = '#e8f1fa';
const DANGER = '#b71c1c';
const OK = '#2e7d32';
const WARN = '#bf360c';

const MODE_OPTIONS: ReadonlyArray<{ value: ConsultMode; label: string; hint: string }> = [
  { value: 'text', label: '文字咨询', hint: '图文消息往来，适合轻症咨询' },
  { value: 'image', label: '图文咨询', hint: '可上传检查报告 / 患处照片' },
  { value: 'video', label: '视频咨询', hint: '实时视频问诊，需预约时段' },
];

const STATUS_LABEL: Record<ConsultStatus, { text: string; color: string; bg: string }> = {
  pending: { text: '待接单', color: WARN, bg: '#fff3e0' },
  ongoing: { text: '咨询中', color: SEA_BLUE, bg: SEA_BLUE_BG },
  ended: { text: '已结束', color: OK, bg: '#e8f5e9' },
  cancelled: { text: '已取消', color: '#666', bg: '#eceff1' },
};

function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export default function OnlineConsultPage() {
  const [patientId] = useState('P10086');
  const [dept, setDept] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [mode, setMode] = useState<ConsultMode>('text');

  const [consult, setConsult] = useState<Consult | null>(null);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const timerRef = useRef<number | null>(null);

  // 咨询中本地倒计时：每秒 tick，仅用于展示剩余时长（不触碰 WebSocket）
  useEffect(() => {
    if (consult?.status === 'ongoing' && consult.deadlineAt) {
      timerRef.current = window.setInterval(() => setNowMs(Date.now()), 1000);
      return () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
      };
    }
    return undefined;
  }, [consult?.status, consult?.deadlineAt]);

  const create = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/consult/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, dept, symptoms, mode }),
      });
      const json = await res.json();
      if (json?.code !== 0) throw new Error(json?.message || '提交失败');
      setConsult(json.data.consult as Consult);
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [patientId, dept, symptoms, mode]);

  const end = useCallback(async () => {
    if (!consult) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/consult/${consult.id}/end`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });
      const json = await res.json();
      if (json?.code !== 0) throw new Error(json?.message || '结束失败');
      setConsult(json.data.consult as Consult);
    } catch (e) {
      setError(e instanceof Error ? e.message : '结束失败');
    } finally {
      setLoading(false);
    }
  }, [consult, summary]);

  const remainingSec =
    consult?.status === 'ongoing' && consult.deadlineAt
      ? Math.round((new Date(consult.deadlineAt).getTime() - nowMs) / 1000)
      : null;

  const s = consult ? STATUS_LABEL[consult.status] : null;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 48px', background: '#f5f7fa', minHeight: '100vh' }}>
      {/* 深海蓝顶部横幅 */}
      <header
        style={{
          background: `linear-gradient(135deg, ${SEA_BLUE_DEEP}, ${SEA_BLUE})`,
          borderRadius: 16,
          padding: '22px 20px',
          color: '#fff',
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 800 }}>互联网医院 · 在线问诊</div>
        <div style={{ fontSize: 14, opacity: 0.85, marginTop: 6 }}>
          文字 / 图文 / 视频三种模式 · 接单后 30 分钟内完成，超时自动关单
        </div>
      </header>

      {/* 未问诊：发起表单 */}
      {!consult && (
        <section style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(11,79,138,0.08)' }}>
          <h2 style={{ fontSize: 18, color: SEA_BLUE, margin: '0 0 14px' }}>选择问诊模式</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
            {MODE_OPTIONS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                style={{
                  padding: '12px 8px',
                  borderRadius: 12,
                  border: mode === m.value ? `2px solid ${SEA_BLUE}` : '2px solid #d8e4f0',
                  background: mode === m.value ? SEA_BLUE_BG : '#fff',
                  color: mode === m.value ? SEA_BLUE : '#555',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title={m.hint}
              >
                {m.label}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 14, color: '#666' }}>就诊科室</label>
          <input
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            placeholder="如：全科医学科 / 呼吸内科"
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #cdd9e5', fontSize: 16, margin: '6px 0 14px' }}
          />

          <label style={{ fontSize: 14, color: '#666' }}>症状描述</label>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="请简要描述不适部位、持续时间与已用药情况…"
            rows={4}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #cdd9e5', fontSize: 16, margin: '6px 0 14px', resize: 'vertical' }}
          />

          {error && <div style={{ color: DANGER, fontSize: 14, marginBottom: 10 }}>{error}</div>}

          <button
            onClick={create}
            disabled={loading}
            style={{
              width: '100%',
              minHeight: 48,
              borderRadius: 12,
              border: 'none',
              background: SEA_BLUE,
              color: '#fff',
              fontSize: 17,
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? '提交中…' : '发起问诊'}
          </button>
        </section>
      )}

      {/* 问诊单状态卡片 */}
      {consult && s && (
        <section style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(11,79,138,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: '#999' }}>单号 {consult.id.slice(0, 8)}…</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: s.color, background: s.bg, padding: '4px 12px', borderRadius: 999 }}>
              {s.text}
              {consult.endReason === 'timeout' ? '（超时自动结束）' : ''}
            </span>
          </div>

          <div style={{ fontSize: 16, color: '#222', lineHeight: 1.8 }}>
            <div>科室：<b>{consult.dept}</b></div>
            <div>模式：{MODE_OPTIONS.find((m) => m.value === consult.mode)?.label}</div>
            <div>主诉：{consult.symptoms}</div>
            {consult.doctorId && <div>接诊医师：{consult.doctorId}</div>}
          </div>

          {/* 咨询中：深海蓝倒计时条 */}
          {consult.status === 'ongoing' && remainingSec != null && (
            <div style={{ marginTop: 16, background: SEA_BLUE_BG, borderLeft: `6px solid ${SEA_BLUE}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 14, color: SEA_BLUE }}>问诊剩余时长（30 分钟红线）</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: remainingSec <= 300 ? DANGER : SEA_BLUE_DEEP, fontVariantNumeric: 'tabular-nums' }}>
                {fmtClock(remainingSec)}
              </div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                超时未结束系统将自动关单，请尽快完成交流。
              </div>
            </div>
          )}

          {/* 待接单提示 */}
          {consult.status === 'pending' && (
            <div style={{ marginTop: 16, fontSize: 15, color: WARN, background: '#fff3e0', borderRadius: 10, padding: '12px 14px' }}>
              已进入候诊池，等待医师接单…
            </div>
          )}

          {/* 已结束：展示小结与时长 */}
          {consult.status === 'ended' && (
            <div style={{ marginTop: 16 }}>
              {consult.summary && (
                <div style={{ background: '#f5f9fd', borderRadius: 10, padding: '12px 14px', fontSize: 15, color: '#333', lineHeight: 1.7 }}>
                  <b style={{ color: SEA_BLUE }}>诊疗小结：</b>
                  {consult.summary}
                </div>
              )}
              {consult.durationSec != null && (
                <div style={{ marginTop: 8, fontSize: 13, color: '#999' }}>
                  本次问诊用时 {Math.round(consult.durationSec / 60)} 分钟
                </div>
              )}
            </div>
          )}

          {/* 咨询中：患者侧结束（演示入口；真实环境由医师结束） */}
          {consult.status === 'ongoing' && (
            <div style={{ marginTop: 16 }}>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="诊疗小结 / 医嘱建议（结束必填）"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #cdd9e5', fontSize: 15, resize: 'vertical' }}
              />
              {error && <div style={{ color: DANGER, fontSize: 14, margin: '8px 0' }}>{error}</div>}
              <button
                onClick={end}
                disabled={loading}
                style={{ marginTop: 10, width: '100%', minHeight: 46, borderRadius: 12, border: 'none', background: SEA_BLUE_DEEP, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
              >
                {loading ? '提交中…' : '结束问诊'}
              </button>
            </div>
          )}
        </section>
      )}

      <footer style={{ textAlign: 'center', fontSize: 13, color: '#bbb', marginTop: 28 }}>
        杭州健澜科技有限公司 · 在线问诊不替代急诊与面诊
      </footer>
    </div>
  );
}
