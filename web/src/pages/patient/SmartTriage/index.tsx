/**
 * 健澜科技 jlmedaios - 患者端 · 智能导诊页（M164-C · 患者服务深化）
 *
 * 【安全第一】描述症状后由规则引擎分流：
 *  - 红旗症状（胸痛/呼吸困难/卒中/大出血等）→ 红色警示，直接建议急诊/120；
 *  - 急症 → 今天就诊；慢病 → 预约专科；轻症 → 社区医院/在线咨询。
 *
 * 结果仅为「就医路径建议」，不构成诊断；最终诊疗由医师确认。
 *
 * 深海蓝 VI（#0b4f8a 主色），三态 loading / error / empty，内联样式零额外
 * 依赖，最小触控目标 44px，不触碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useState } from 'react';

/* ------------------------------------------------------------------ */
/* 与 BFF 聚合结果对齐的类型                                            */
/* ------------------------------------------------------------------ */

type TriageLevel = 'emergency' | 'urgent' | 'chronic' | 'mild';

interface RedFlagHit {
  keyword: string;
  reason: string;
}

interface SmartTriageResult {
  level: TriageLevel;
  levelLabel: string;
  matchedRedFlags: RedFlagHit[];
  symptoms: string;
  durationDays: number;
  severity: number;
  recommendedDept: string;
  action: string;
  safetyNotice: string;
  disambiguation: string[];
}

/* ------------------------------------------------------------------ */
/* 深海蓝 VI 色板                                                       */
/* ------------------------------------------------------------------ */

const DEEP_SEA = '#0b4f8a';
const DEEP_SEA_DARK = '#083d6b';
const BG = '#f5f7fa';
const CARD = '#ffffff';
const RED = '#b71c1c';
const RED_BG = '#fdecea';
const ORANGE = '#bf360c';
const ORANGE_BG = '#fff3e0';
const OK = '#1b5e20';
const OK_BG = '#e8f5e9';

const CARD_STYLE: React.CSSProperties = {
  background: CARD,
  borderRadius: 12,
  padding: '16px',
  marginBottom: 12,
  boxShadow: '0 1px 3px rgba(11,79,138,0.08)',
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: DEEP_SEA,
  margin: '0 0 10px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const BUTTON: React.CSSProperties = {
  minHeight: 44,
  fontSize: 15,
  fontWeight: 600,
  borderRadius: 10,
  border: 'none',
  padding: '10px 16px',
  cursor: 'pointer',
};

const INPUT: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  border: '1px solid #cfd8e3',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  boxSizing: 'border-box',
};

/** 分级配色：急诊红 / 急症橙 / 慢病蓝 / 轻症绿。 */
const LEVEL_STYLE: Record<TriageLevel, { bg: string; color: string; border: string }> = {
  emergency: { bg: RED_BG, color: RED, border: `2px solid ${RED}` },
  urgent: { bg: ORANGE_BG, color: ORANGE, border: `2px solid ${ORANGE}` },
  chronic: { bg: '#e8f1fa', color: DEEP_SEA, border: `2px solid ${DEEP_SEA}` },
  mild: { bg: OK_BG, color: OK, border: `2px solid ${OK}` },
};

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: '2', label: '轻微' },
  { value: '3', label: '中等' },
  { value: '4', label: '较重' },
  { value: '5', label: '很重' },
];

/* ------------------------------------------------------------------ */
/* 组件                                                                */
/* ------------------------------------------------------------------ */

export default function SmartTriagePage(): React.JSX.Element {
  const [symptoms, setSymptoms] = useState('');
  const [duration, setDuration] = useState('3天');
  const [severity, setSeverity] = useState('3');
  const [result, setResult] = useState<SmartTriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTriage = useCallback(async () => {
    if (!symptoms.trim()) {
      setError('请先描述您的不适症状');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ symptoms, duration, severity });
      const res = await fetch(`/api/v1/patient/smart-triage?${params.toString()}`);
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message || '导诊失败');
      setResult(json.data as SmartTriageResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : '导诊失败，请稍后重试');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [symptoms, duration, severity]);

  const lv = result ? LEVEL_STYLE[result.level] : null;

  return (
    <PageShell>
      {/* 头部 */}
      <div
        style={{
          ...CARD_STYLE,
          background: `linear-gradient(135deg, ${DEEP_SEA}, ${DEEP_SEA_DARK})`,
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>智能导诊</div>
        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
          描述症状，AI 大脑为您推荐最合适的就医路径
        </div>
      </div>

      {/* 输入区 */}
      <div style={CARD_STYLE}>
        <div style={SECTION_TITLE}>✍️ 症状描述</div>
        <textarea
          style={{ ...INPUT, minHeight: 80, resize: 'vertical' }}
          placeholder="例如：胸痛伴大汗、咳嗽发热3天、头晕反复发作……"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
        />

        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>持续时间</div>
            <select style={INPUT} value={duration} onChange={(e) => setDuration(e.target.value)}>
              <option value="2小时">数小时</option>
              <option value="1天">1天内</option>
              <option value="3天">3天</option>
              <option value="1周">1周</option>
              <option value="1个月">1个月以上</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>严重程度</div>
            <select style={INPUT} value={severity} onChange={(e) => setSeverity(e.target.value)}>
              {SEVERITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          style={{ ...BUTTON, background: DEEP_SEA, color: '#fff', width: '100%', marginTop: 14 }}
          disabled={loading}
          onClick={() => void runTriage()}
        >
          {loading ? '正在分析…' : '开始智能导诊'}
        </button>
      </div>

      {/* 错误态 */}
      {error && (
        <div style={{ ...CARD_STYLE, background: RED_BG, color: RED }}>{error}</div>
      )}

      {/* 结果区 */}
      {result && lv && (
        <>
          {/* 分级结论 */}
          <div style={{ ...CARD_STYLE, background: lv.bg, border: lv.border }}>
            <div style={{ fontSize: 13, color: '#666' }}>导诊建议</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: lv.color, marginTop: 4 }}>
              {result.level === 'emergency' && '🚨 '}
              {result.levelLabel}
            </div>
            <div style={{ fontSize: 14, color: '#333', marginTop: 8 }}>
              推荐科室：<b>{result.recommendedDept}</b>
            </div>
            <div style={{ fontSize: 13, color: '#444', marginTop: 6, lineHeight: 1.6 }}>
              {result.action}
            </div>
          </div>

          {/* 红旗症状命中（高危） */}
          {result.matchedRedFlags.length > 0 && (
            <div style={{ ...CARD_STYLE, border: `1px solid ${RED}`, background: RED_BG }}>
              <div style={{ ...SECTION_TITLE, color: RED }}>
                ⚠️ 识别到高危红旗症状
              </div>
              {result.matchedRedFlags.map((f) => (
                <div key={f.keyword} style={{ fontSize: 13, marginBottom: 6 }}>
                  <b style={{ color: RED }}>「{f.keyword}」</b>
                  <span style={{ color: '#555' }}> — {f.reason}，请立即急诊/拨打120</span>
                </div>
              ))}
            </div>
          )}

          {/* 补充信息 */}
          <div style={CARD_STYLE}>
            <div style={SECTION_TITLE}>📋 建议补充</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#555' }}>
              {result.disambiguation.map((d) => (
                <li key={d} style={{ marginBottom: 4 }}>{d}</li>
              ))}
            </ul>
            <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
              病程约 {result.durationDays} 天 · 严重度 {result.severity}/5
            </div>
          </div>

          {/* 安全声明 */}
          <div style={{ ...CARD_STYLE, background: '#f0f4f8', fontSize: 12, color: '#666' }}>
            {result.safetyNotice}
          </div>
        </>
      )}

      {/* 空态提示 */}
      {!result && !error && !loading && (
        <div style={{ ...CARD_STYLE, textAlign: 'center', color: '#888', fontSize: 13 }}>
          输入症状后点击「开始智能导诊」，我们会为您推荐最合适的就医路径。
        </div>
      )}
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* 辅助小组件                                                           */
/* ------------------------------------------------------------------ */

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', background: BG, minHeight: '100vh', padding: 12 }}>
      {children}
    </div>
  );
}
