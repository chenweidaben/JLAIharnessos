/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 【AI深化与运营预测】M154-A：AI 深度诊断建议页
 *   POST /api/v1/ai/diagnose/deep
 *   录入患者特征/症状/病史后，输出 Top5 可能诊断（带置信度）、鉴别诊断、
 *   建议检验与影像、红旗风险提示。
 *
 * 医疗安全红线：AI 只是辅助，最终由医生确认；页面底部固定展示 disclaimer。
 * 深海蓝 VI：主色 #0B2A4A，辅助 #1B6CA8，背景 #F4F7FB。
 */
import { useState, type CSSProperties } from 'react';
import { post } from '@/api/client';

/* ------------------------------ 类型（与 BFF 对齐） ------------------------------ */
interface DeepCandidate {
  rank: number;
  diagnosis: string;
  icd10: string;
  specialty: string;
  confidence: number;
  evidence: string[];
}
interface DiffItem {
  rank: number;
  diagnosis: string;
  icd10: string;
  specialty: string;
  discriminator: string;
  likelihood: number;
}
interface LabItem {
  name: string;
  priority: 'urgent' | 'routine';
  rationale: string;
}
interface ImagingItem {
  modality: string;
  bodyPart: string;
  urgency: 'stat' | 'urgent' | 'routine';
  rationale: string;
}
interface RiskItem {
  level: 'critical' | 'high' | 'info';
  title: string;
  detail: string;
}
interface Diagnosis {
  deepId: string;
  topCandidates: DeepCandidate[];
  differential: DiffItem[];
  labTests: LabItem[];
  imaging: ImagingItem[];
  riskWarnings: RiskItem[];
  disclaimer: string;
}
interface DeepResponse {
  diagnosis: Diagnosis;
  differential: DiffItem[];
  lookup: unknown;
}

/* --------------------------------- 深海蓝 VI --------------------------------- */
const C = {
  primary: '#0B2A4A',
  primarySoft: '#1B6CA8',
  bg: '#F4F7FB',
  card: '#FFFFFF',
  text: '#1A2B3C',
  muted: '#5B6B7C',
  border: '#E1E8F0',
  critical: '#C0392B',
  high: '#D9822B',
  info: '#2E8BC0',
  ok: '#2E8B57',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  fontSize: 13,
  color: C.text,
  background: '#fff',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: C.muted,
  marginBottom: 4,
  display: 'block',
};

export default function DeepDiagnosePage() {
  const [age, setAge] = useState('55');
  const [gender, setGender] = useState<'male' | 'female' | ''>('male');
  const [temp, setTemp] = useState('');
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [hr, setHr] = useState('');
  const [spo2, setSpo2] = useState('');
  const [symptoms, setSymptoms] = useState('胸痛, 压榨样, 向左肩背放射');
  const [chronic, setChronic] = useState('高血压, 糖尿病');
  const [smoking, setSmoking] = useState(false);
  const [durationHours, setDurationHours] = useState('2');
  const [severity, setSeverity] = useState(2);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DeepResponse | null>(null);

  const num = (s: string): number | undefined => {
    const n = Number(s);
    return s.trim() !== '' && Number.isFinite(n) ? n : undefined;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await post<DeepResponse>('/api/v1/ai/diagnose/deep', {
        features: {
          age: num(age),
          gender,
          vitals: {
            temperature: num(temp),
            systolic: num(sys),
            diastolic: num(dia),
            heartRate: num(hr),
            spo2: num(spo2),
          },
        },
        symptoms: symptoms
          .split(/[,，、\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name) => ({ name })),
        history: {
          chronicDiseases: chronic
            .split(/[,，、\n]/)
            .map((s) => s.trim())
            .filter(Boolean),
          smoking,
        },
        durationHours: num(durationHours) ?? 0,
        severity,
      });
      setResult(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const diag = result?.diagnosis ?? null;
  const diff = result?.differential ?? diag?.differential ?? [];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '20px 24px', boxSizing: 'border-box' }}>
      {/* 头部 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primarySoft} 100%)`,
          color: '#fff',
          padding: '18px 22px',
          borderRadius: 10,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600 }}>AI 深度诊断建议 · M154-A</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
          16 病种库（呼吸 / 消化 / 心血管 / 内分泌）· Top5 可能诊断 · 鉴别诊断 · 检验影像建议
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
        {/* 录入表单 */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 12 }}>患者信息</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>年龄</label>
              <input style={inputStyle} value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>性别</label>
              <select style={inputStyle} value={gender} onChange={(e) => setGender(e.target.value as typeof gender)}>
                <option value="male">男</option>
                <option value="female">女</option>
                <option value="">未知</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div><label style={labelStyle}>体温℃</label><input style={inputStyle} value={temp} onChange={(e) => setTemp(e.target.value)} /></div>
            <div><label style={labelStyle}>收缩压</label><input style={inputStyle} value={sys} onChange={(e) => setSys(e.target.value)} /></div>
            <div><label style={labelStyle}>舒张压</label><input style={inputStyle} value={dia} onChange={(e) => setDia(e.target.value)} /></div>
            <div><label style={labelStyle}>心率</label><input style={inputStyle} value={hr} onChange={(e) => setHr(e.target.value)} /></div>
            <div><label style={labelStyle}>SpO₂%</label><input style={inputStyle} value={spo2} onChange={(e) => setSpo2(e.target.value)} /></div>
            <div><label style={labelStyle}>病程(h)</label><input style={inputStyle} value={durationHours} onChange={(e) => setDurationHours(e.target.value)} /></div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>症状（逗号分隔）</label>
            <textarea style={{ ...inputStyle, minHeight: 56 }} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>既往慢性病（逗号分隔）</label>
            <input style={inputStyle} value={chronic} onChange={(e) => setChronic(e.target.value)} />
          </div>

          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={smoking} onChange={(e) => setSmoking(e.target.checked)} />
            <span style={{ fontSize: 13, color: C.text }}>吸烟</span>
            <span style={{ marginLeft: 16, fontSize: 12, color: C.muted }}>严重度</span>
            <select style={{ ...inputStyle, width: 80 }} value={severity} onChange={(e) => setSeverity(Number(e.target.value))}>
              <option value={0}>0</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              background: loading ? C.muted : C.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'AI 分析中…' : '开始 AI 深度诊断'}
          </button>

          {error && (
            <div style={{ marginTop: 10, color: C.critical, fontSize: 12 }}>{error}</div>
          )}
        </div>

        {/* 结果区 */}
        <div>
          {!diag && (
            <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 10, padding: 40, textAlign: 'center', color: C.muted, fontSize: 13 }}>
              录入左侧患者信息后点击「开始 AI 深度诊断」，系统将给出 Top5 可能诊断与鉴别/检查建议。
            </div>
          )}

          {diag && (
            <>
              {/* Top5 */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 10 }}>
                  Top5 可能诊断 <span style={{ fontSize: 11, color: C.muted, fontWeight: 40 }}>（{diag.deepId}）</span>
                </div>
                {diag.topCandidates.map((c) => (
                  <div key={c.rank} style={{ borderBottom: `1px solid ${C.border}`, padding: '8px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        background: c.rank === 1 ? C.primary : C.primarySoft,
                        color: '#fff', borderRadius: 4, padding: '1px 8px', fontSize: 12,
                      }}>#{c.rank}</span>
                      <span style={{ fontWeight: 600, color: C.text }}>{c.diagnosis}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{c.icd10}</span>
                      <span style={{
                        fontSize: 11, color: C.primarySoft, border: `1px solid ${C.primarySoft}`,
                        borderRadius: 4, padding: '0 6px',
                      }}>{c.specialty}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: C.ok }}>置信度 {(c.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ background: C.bg, borderRadius: 4, height: 6, marginTop: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${(c.confidence * 100).toFixed(0)}%`, height: '100%', background: C.primarySoft }} />
                    </div>
                    {c.evidence.length > 0 && (
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>依据：{c.evidence.join('；')}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* 鉴别诊断 */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 10 }}>鉴别诊断</div>
                {diff.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>暂无</div>}
                {diff.map((d) => (
                  <div key={d.rank} style={{ padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 13, color: C.text }}>
                      <b>{d.diagnosis}</b>
                      <span style={{ color: C.muted, fontSize: 11, marginLeft: 6 }}>{d.icd10} · {d.specialty} · 可能性 {(d.likelihood * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>鉴别要点：{d.discriminator}</div>
                  </div>
                ))}
              </div>

              {/* 检验 + 影像 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 8 }}>建议检验</div>
                  {diag.labTests.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>无特殊检验要求</div>}
                  {diag.labTests.map((l) => (
                    <div key={l.name} style={{ fontSize: 12, padding: '4px 0' }}>
                      <span style={{ color: l.priority === 'urgent' ? C.critical : C.info, fontWeight: 600 }}>
                        {l.priority === 'urgent' ? '急' : '常规'}
                      </span>
                      <span style={{ color: C.text, marginLeft: 6 }}>{l.name}</span>
                      <div style={{ color: C.muted, marginLeft: 0 }}>{l.rationale}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 8 }}>建议影像</div>
                  {diag.imaging.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>无特殊影像要求</div>}
                  {diag.imaging.map((im, i) => (
                    <div key={`${im.modality}-${i}`} style={{ fontSize: 12, padding: '4px 0' }}>
                      <span style={{ color: im.urgency === 'stat' ? C.critical : im.urgency === 'urgent' ? C.high : C.info, fontWeight: 600 }}>
                        {im.urgency === 'stat' ? 'STAT' : im.urgency === 'urgent' ? '急' : '常规'}
                      </span>
                      <span style={{ color: C.text, marginLeft: 6 }}>{im.modality}（{im.bodyPart}）</span>
                      <div style={{ color: C.muted }}>{im.rationale}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 风险提示 */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 8 }}>风险提示</div>
                {diag.riskWarnings.map((r, i) => (
                  <div key={i} style={{
                    fontSize: 12, padding: '6px 10px', marginBottom: 6, borderRadius: 6,
                    background: r.level === 'critical' ? '#FDECEA' : r.level === 'high' ? '#FEF3E6' : '#EAF4FB',
                    color: r.level === 'critical' ? C.critical : r.level === 'high' ? C.high : C.info,
                  }}>
                    <b>{r.title}</b>：{r.detail}
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <div style={{
                background: '#FFF8E6', border: `1px solid #E8D9A0`, borderRadius: 10,
                padding: '12px 16px', fontSize: 12, color: '#7A5C00',
              }}>
                ⚠ {diag.disclaimer || '辅助诊断，最终由医生确认。'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
