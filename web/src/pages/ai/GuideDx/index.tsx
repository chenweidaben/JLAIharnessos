/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 【AI辅助诊断深化】M160-C：临床指南对齐页
 *   POST /api/v1/ai/diagnose/guide
 *   录入症状/病史/检验体征后，按四部权威指南硬阈值输出四病种诊断对齐结果，
 *   并可对治疗方案做指南核查与偏离分析。
 *
 * 医疗安全红线：AI 仅做指南对齐辅助，最终由执业医师确认；页面底部固定 disclaimer。
 * 深海蓝 VI：主色 #0B2A4A，辅助 #1B6CA8，背景 #F4F7FB。
 * 【远期路线图】指南阈值后续迁移至可热更新的指南知识库。
 */
import { useState, type CSSProperties } from 'react';
import { post } from '@/api/client';

/* ------------------------------ 类型（与 BFF 对齐） ------------------------------ */
interface ConditionAssessment {
  condition: string;
  label: string;
  icd10: string;
  guideline: string;
  diagnosed: boolean;
  severity: string;
  thresholdNote: string;
  observed: Record<string, number | string | boolean>;
}
interface GuideDiagnosisResult {
  assessments: ConditionAssessment[];
  primary: ConditionAssessment | null;
  disclaimer: string;
}
interface TreatmentCheck {
  condition: string;
  guideline: string;
  compliant: boolean;
  requiredFirstLine: string[];
  issues: Array<{ level: 'error' | 'warning' | 'info'; message: string }>;
  score: number;
}
interface DeviationAnalysis {
  condition: string;
  deviations: Array<{ type: string; item: string; severity: string; message: string }>;
  deviationCount: number;
  overallAlignment: 'aligned' | 'minor' | 'major';
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
  padding: '7px 10px',
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  fontSize: 13,
  color: C.text,
  background: '#fff',
  boxSizing: 'border-box',
};
const labelStyle: CSSProperties = { fontSize: 12, color: C.muted, marginBottom: 4, display: 'block' };

const num = (s: string): number | undefined => {
  const n = Number(s);
  return s.trim() !== '' && Number.isFinite(n) ? n : undefined;
};

export default function GuideDxPage() {
  // 诊断录入
  const [symptoms, setSymptoms] = useState('胸痛, 压榨样, 向左肩背放射');
  const [chronic, setChronic] = useState('高血压, 糖尿病');
  const [smoking, setSmoking] = useState(true);
  const [sys, setSys] = useState('158');
  const [dia, setDia] = useState('96');
  const [fpg, setFpg] = useState('');
  const [hba1c, setHba1c] = useState('');
  const [age, setAge] = useState('58');
  const [infiltrate, setInfiltrate] = useState(false);
  const [rr, setRr] = useState('');

  // 治疗核查
  const [checkDiag, setCheckDiag] = useState('冠心病');
  const [drugs, setDrugs] = useState('阿司匹林, 替格瑞洛, 阿托伐他汀');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [diag, setDiag] = useState<GuideDiagnosisResult | null>(null);
  const [check, setCheck] = useState<TreatmentCheck | null>(null);
  const [dev, setDev] = useState<DeviationAnalysis | null>(null);

  const runDiagnose = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await post<GuideDiagnosisResult>('/api/v1/ai/diagnose/guide', {
        mode: 'diagnose',
        symptoms: symptoms.split(/[,，、\n]/).map((s) => s.trim()).filter(Boolean).map((name) => ({ name })),
        history: {
          chronicDiseases: chronic.split(/[,，、\n]/).map((s) => s.trim()).filter(Boolean),
          smoking,
        },
        labResults: {
          systolic: num(sys),
          diastolic: num(dia),
          fastingGlucose: num(fpg),
          hba1c: num(hba1c),
          age: num(age),
          newInfiltrate: infiltrate,
          respiratoryRate: num(rr),
        },
      });
      setDiag(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const runCheck = async () => {
    setLoading(true);
    setError('');
    try {
      const drugList = drugs.split(/[,，、\n]/).map((s) => s.trim()).filter(Boolean);
      const [ck, dv] = await Promise.all([
        post<TreatmentCheck>('/api/v1/ai/diagnose/guide', {
          mode: 'treatment',
          diagnosis: checkDiag,
          treatment: { drugs: drugList },
        }),
        post<DeviationAnalysis>('/api/v1/ai/diagnose/guide', {
          mode: 'deviation',
          diagnosis: checkDiag,
          actualTreatment: drugList,
          guidelineTreatment: [],
        }),
      ]);
      setCheck(ck);
      setDev(dv);
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '20px 24px', boxSizing: 'border-box' }}>
      {/* 头部 */}
      <div style={{
        background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primarySoft} 100%)`,
        color: '#fff', padding: '18px 22px', borderRadius: 10, marginBottom: 16,
      }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>临床指南对齐 · M160-C</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
          高血压(中国指南2024) · 糖尿病(CDS 2024) · 冠心病(ESC 2024) · 肺炎(IDSA/ATS 2019)
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
        {/* 录入表单 */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 12 }}>诊断对齐录入</div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>症状（逗号分隔）</label>
            <textarea style={{ ...inputStyle, minHeight: 48 }} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>既往慢性病（逗号分隔）</label>
            <input style={inputStyle} value={chronic} onChange={(e) => setChronic(e.target.value)} />
          </div>
          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={smoking} onChange={(e) => setSmoking(e.target.checked)} />
            <span style={{ fontSize: 13 }}>吸烟</span>
            <input type="checkbox" checked={infiltrate} onChange={(e) => setInfiltrate(e.target.checked)} style={{ marginLeft: 12 }} />
            <span style={{ fontSize: 13 }}>影像新发浸润影</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div><label style={labelStyle}>收缩压</label><input style={inputStyle} value={sys} onChange={(e) => setSys(e.target.value)} /></div>
            <div><label style={labelStyle}>舒张压</label><input style={inputStyle} value={dia} onChange={(e) => setDia(e.target.value)} /></div>
            <div><label style={labelStyle}>空腹血糖</label><input style={inputStyle} value={fpg} onChange={(e) => setFpg(e.target.value)} /></div>
            <div><label style={labelStyle}>HbA1c%</label><input style={inputStyle} value={hba1c} onChange={(e) => setHba1c(e.target.value)} /></div>
            <div><label style={labelStyle}>年龄</label><input style={inputStyle} value={age} onChange={(e) => setAge(e.target.value)} /></div>
            <div><label style={labelStyle}>呼吸频率</label><input style={inputStyle} value={rr} onChange={(e) => setRr(e.target.value)} /></div>
          </div>

          <button onClick={runDiagnose} disabled={loading} style={{
            width: '100%', padding: '9px', background: loading ? C.muted : C.primary, color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
          }}>{loading ? '分析中…' : '指南对齐诊断'}</button>

          <div style={{ borderTop: `1px dashed ${C.border}`, margin: '14px 0' }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: C.primary, marginBottom: 8 }}>治疗方案核查</div>
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>诊断</label>
            <input style={inputStyle} value={checkDiag} onChange={(e) => setCheckDiag(e.target.value)} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>实际用药（逗号分隔）</label>
            <input style={inputStyle} value={drugs} onChange={(e) => setDrugs(e.target.value)} />
          </div>
          <button onClick={runCheck} disabled={loading} style={{
            width: '100%', padding: '9px', background: C.primarySoft, color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer',
          }}>核查治疗与偏离</button>

          {error && <div style={{ marginTop: 10, color: C.critical, fontSize: 12 }}>{error}</div>}
        </div>

        {/* 结果区 */}
        <div>
          {!diag && !check && (
            <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 10, padding: 40, textAlign: 'center', color: C.muted, fontSize: 13 }}>
              录入左侧信息后点击「指南对齐诊断」，系统将按四部权威指南硬阈值评估四病种。
            </div>
          )}

          {diag && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 10 }}>
                指南对齐诊断
                {diag.primary && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: C.critical, fontWeight: 40 }}>
                    首要：{diag.primary.label}（{diag.primary.guideline}）
                  </span>
                )}
              </div>
              {diag.assessments.map((a) => (
                <div key={a.condition} style={{ borderBottom: `1px solid ${C.border}`, padding: '8px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      background: a.diagnosed ? C.critical : C.ok, color: '#fff', borderRadius: 4,
                      padding: '1px 8px', fontSize: 11,
                    }}>{a.diagnosed ? '符合' : '未达'}</span>
                    <span style={{ fontWeight: 600, color: C.text }}>{a.label}</span>
                    <span style={{ fontSize: 11, color: C.muted }}>{a.icd10}</span>
                    <span style={{ fontSize: 11, color: C.primarySoft }}>{a.guideline}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.text, marginTop: 3 }}>{a.severity}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{a.thresholdNote}</div>
                </div>
              ))}
            </div>
          )}

          {check && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 8 }}>
                治疗指南核查
                <span style={{ marginLeft: 8, fontSize: 12, color: check.compliant ? C.ok : C.critical, fontWeight: 40 }}>
                  符合度 {check.score} 分（{check.compliant ? '符合指南' : '需调整'}）
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>指南：{check.guideline}</div>
              {check.issues.map((it, i) => (
                <div key={i} style={{
                  fontSize: 12, padding: '5px 10px', marginBottom: 5, borderRadius: 6,
                  background: it.level === 'error' ? '#FDECEA' : it.level === 'warning' ? '#FEF3E6' : '#EAF4FB',
                  color: it.level === 'error' ? C.critical : it.level === 'warning' ? C.high : C.info,
                }}>{it.message}</div>
              ))}
            </div>
          )}

          {dev && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 8 }}>
                指南偏离分析
                <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: dev.overallAlignment === 'aligned' ? C.ok : dev.overallAlignment === 'minor' ? C.high : C.critical }}>
                  整体：{dev.overallAlignment === 'aligned' ? '基本对齐' : dev.overallAlignment === 'minor' ? '轻度偏离' : '显著偏离'}
                  （{dev.deviationCount} 项）
                </span>
              </div>
              {dev.deviations.length === 0 && <div style={{ fontSize: 12, color: C.ok }}>未发现显著偏离。</div>}
              {dev.deviations.map((d, i) => (
                <div key={i} style={{ fontSize: 12, padding: '4px 0', color: C.text }}>· {d.message}</div>
              ))}
            </div>
          )}

          {diag?.disclaimer && (
            <div style={{ background: '#FFF8E6', border: `1px solid #E8D9A0`, borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#7A5C00' }}>
              ⚠ {diag.disclaimer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
