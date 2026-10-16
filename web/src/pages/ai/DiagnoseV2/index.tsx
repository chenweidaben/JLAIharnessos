/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 【持续优化与新场景】M174-C：AI 诊断 V2 页面
 *   POST /api/v1/ai/diagnose/expand-v2
 *   覆盖：16 病种库（神经/泌尿/血液/风湿免疫）+ 鉴别诊断深化
 *        + 治疗方案推荐。
 *
 * 医疗安全红线：AI 只是辅助，最终由医生确认；页面底部固定展示 disclaimer。
 * 深海蓝 VI：主色 #0B2A4A，辅助 #1B6CA8，背景 #F4F7FB。
 */
import { useState, type CSSProperties } from 'react';
import { post } from '@/api/client';

/* ------------------------------ 类型（与 BFF 对齐） ------------------------------ */
interface LibraryMeta {
  diagnosis: string;
  icd10: string;
  specialty: string;
}
interface ExpandedLibrary {
  total: number;
  bySpecialty: Record<string, number>;
  diseases: LibraryMeta[];
  added: number;
  disclaimer: string;
}
interface DiffCandidate {
  rank: number;
  diagnosis: string;
  icd10: string;
  specialty: string;
  likelihood: number;
  evidence: string[];
  labEvidence: string[];
  discriminators: Array<{ with: string; how: string }>;
}
interface DiffResult {
  candidates: DiffCandidate[];
  alerts: string[];
  disclaimer: string;
}
interface TreatmentMed {
  name: string;
  role: '一线' | '备选' | '对症';
  note: string;
}
interface TreatmentResult {
  diagnosis: string;
  icd10: string;
  meds: TreatmentMed[];
  lifestyle: string[];
  monitoring: string[];
  specialPopulation: string;
  personalizedNotes: string[];
  disclaimer: string;
}
interface ApiResponse {
  builtinCount: number;
  library: ExpandedLibrary | null;
  differential: DiffResult | null;
  treatment: TreatmentResult | null;
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

const cardStyle: CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: 16,
  marginBottom: 12,
};

export default function DiagnoseV2Page() {
  const [age, setAge] = useState('62');
  const [gender, setGender] = useState<'male' | 'female' | ''>('male');
  const [symptoms, setSymptoms] = useState('偏瘫, 口角歪斜, 言语不清, 突发');
  const [history, setHistory] = useState('高血压, 心房颤动');
  const [labs, setLabs] = useState('ct low');
  const [targetDiagnosis, setTargetDiagnosis] = useState('');
  const [pregnant, setPregnant] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ApiResponse | null>(null);

  const num = (s: string): number | undefined => {
    const n = Number(s);
    return s.trim() !== '' && Number.isFinite(n) ? n : undefined;
  };

  const parseList = (s: string) =>
    s.split(/[,，、\n]/).map((x) => x.trim()).filter(Boolean);

  const parseLabs = (s: string) =>
    s.split(/[,，;\n]/).map((x) => x.trim()).filter(Boolean).map((chunk) => {
      const parts = chunk.split(/\s+/);
      const abnormal = (parts.pop() ?? '').toLowerCase();
      const name = parts.join(' ');
      const allowed = ['high', 'low', 'normal', 'positive', 'negative'];
      return { name, abnormal: (allowed.includes(abnormal) ? abnormal : 'normal') as const };
    });

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await post<ApiResponse>('/api/v1/ai/diagnose/expand-v2', {
        symptoms: parseList(symptoms).map((name) => ({ name })),
        history: parseList(history),
        labResults: parseLabs(labs),
        patientFeatures: {
          age: num(age),
          gender,
          pregnant,
        },
        mode: 'all',
        targetDiagnosis: targetDiagnosis.trim() || undefined,
      });
      setResult(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const lib = result?.library ?? null;
  const diff = result?.differential ?? null;
  const treat = result?.treatment ?? null;

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
        <div style={{ fontSize: 18, fontWeight: 600 }}>AI 诊断 V2 · M174-C</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
          16 病种库（神经/泌尿/血液/风湿免疫）· 鉴别诊断深化 · 治疗方案推荐
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
        {/* 录入表单 */}
        <div style={cardStyle}>
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

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>症状（逗号分隔）</label>
            <textarea style={{ ...inputStyle, minHeight: 56 }} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>既往病史（逗号分隔）</label>
            <input style={inputStyle} value={history} onChange={(e) => setHistory(e.target.value)} />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>化验结果（格式：名称 high/low/normal/positive/negative）</label>
            <textarea style={{ ...inputStyle, minHeight: 56 }} value={labs} onChange={(e) => setLabs(e.target.value)} />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>已下诊断（用于治疗推荐，可选）</label>
            <input style={inputStyle} value={targetDiagnosis} onChange={(e) => setTargetDiagnosis(e.target.value)} placeholder="如：脑梗死 / 类风湿关节炎 / 慢性肾病" />
          </div>

          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={pregnant} onChange={(e) => setPregnant(e.target.checked)} />
            <span style={{ fontSize: 13, color: C.text }}>妊娠/哺乳期</span>
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
            {loading ? 'AI 分析中…' : '开始 AI 诊断 V2'}
          </button>

          {error && (
            <div style={{ marginTop: 10, color: C.critical, fontSize: 12 }}>{error}</div>
          )}
        </div>

        {/* 结果区 */}
        <div>
          {!result && (
            <div style={{ ...cardStyle, borderStyle: 'dashed', padding: 40, textAlign: 'center', color: C.muted, fontSize: 13 }}>
              录入左侧患者信息后点击「开始 AI 诊断 V2」，系统将给出鉴别诊断与治疗方案推荐。
            </div>
          )}

          {result && (
            <>
              {/* 病种库规模 */}
              {lib && (
                <div style={cardStyle}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 10 }}>
                    病种库规模 <span style={{ fontSize: 11, color: C.muted, fontWeight: 40 }}>（内置 {result.builtinCount} 种{lib.added > 0 ? ` + 追加 ${lib.added} 种` : ''}）</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {Object.entries(lib.bySpecialty).map(([sp, n]) => (
                      <span key={sp} style={{
                        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6,
                        padding: '6px 12px', fontSize: 12, color: C.text,
                      }}>
                        {sp}：<b style={{ color: C.primarySoft }}>{n}</b> 种
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 鉴别诊断 */}
              {diff && (
                <div style={cardStyle}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 10 }}>鉴别诊断深化</div>
                  {diff.alerts.map((a, i) => (
                    <div key={i} style={{
                      fontSize: 12, padding: '6px 10px', marginBottom: 6, borderRadius: 6,
                      background: a.includes('警惕') ? '#FDECEA' : '#EAF4FB',
                      color: a.includes('警惕') ? C.critical : C.info,
                    }}>⚠ {a}</div>
                  ))}
                  {diff.candidates.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>未命中候选，请补充症状/化验。</div>}
                  {diff.candidates.map((d) => (
                    <div key={d.rank} style={{ padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          background: d.rank === 1 ? C.primary : C.primarySoft,
                          color: '#fff', borderRadius: 4, padding: '1px 8px', fontSize: 12,
                        }}>#{d.rank}</span>
                        <span style={{ fontWeight: 600, color: C.text }}>{d.diagnosis}</span>
                        <span style={{ fontSize: 11, color: C.muted }}>{d.icd10}</span>
                        <span style={{
                          fontSize: 11, color: C.primarySoft, border: `1px solid ${C.primarySoft}`,
                          borderRadius: 4, padding: '0 6px',
                        }}>{d.specialty}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.ok }}>可能性 {(d.likelihood * 100).toFixed(0)}%</span>
                      </div>
                      <div style={{ background: C.bg, borderRadius: 4, height: 6, marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${(d.likelihood * 100).toFixed(0)}%`, height: '100%', background: C.primarySoft }} />
                      </div>
                      {d.evidence.length > 0 && (
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>症状依据：{d.evidence.join('；')}</div>
                      )}
                      {d.labEvidence.length > 0 && (
                        <div style={{ fontSize: 12, color: C.high, marginTop: 2 }}>化验依据：{d.labEvidence.join('；')}</div>
                      )}
                      {d.discriminators.length > 0 && (
                        <div style={{ fontSize: 12, color: C.info, marginTop: 2 }}>
                          鉴别：{d.discriminators.map((x) => `与${x.with}鉴别——${x.how}`).join('；')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 治疗方案 */}
              {treat && (
                <div style={cardStyle}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 10 }}>
                    治疗方案推荐 <span style={{ fontSize: 11, color: C.muted, fontWeight: 40 }}>（{treat.diagnosis} · {treat.icd10}）</span>
                  </div>
                  {treat.meds.length === 0 && treat.lifestyle.length === 0 && (
                    <div style={{ fontSize: 12, color: C.muted }}>未在 V2 病种库匹配到治疗方案。</div>
                  )}
                  {treat.meds.length > 0 && (
                    <>
                      <div style={{ fontSize: 12, color: C.muted, margin: '6px 0 4px' }}>药物（方向提示）</div>
                      {treat.meds.map((m) => (
                        <div key={m.name} style={{ fontSize: 12, padding: '4px 0' }}>
                          <span style={{
                            color: m.role === '一线' ? C.critical : m.role === '备选' ? C.high : C.info,
                            fontWeight: 600,
                          }}>[{m.role}]</span>
                          <span style={{ color: C.text, marginLeft: 6 }}>{m.name}</span>
                          <div style={{ color: C.muted }}>{m.note}</div>
                        </div>
                      ))}
                    </>
                  )}
                  {treat.lifestyle.length > 0 && (
                    <>
                      <div style={{ fontSize: 12, color: C.muted, margin: '6px 0 4px' }}>生活方式</div>
                      <div style={{ fontSize: 12, color: C.text }}>{treat.lifestyle.map((x) => `· ${x}`).join('　')}</div>
                    </>
                  )}
                  {treat.monitoring.length > 0 && (
                    <>
                      <div style={{ fontSize: 12, color: C.muted, margin: '6px 0 4px' }}>监测与复查</div>
                      <div style={{ fontSize: 12, color: C.text }}>{treat.monitoring.map((x) => `· ${x}`).join('　')}</div>
                    </>
                  )}
                  <div style={{ fontSize: 12, color: C.info, marginTop: 8 }}>特殊人群：{treat.specialPopulation}</div>
                  {treat.personalizedNotes.map((n, i) => (
                    <div key={i} style={{ fontSize: 12, color: C.high, marginTop: 2 }}>· {n}</div>
                  ))}
                </div>
              )}

              {/* Disclaimer */}
              <div style={{
                background: '#FFF8E6', border: `1px solid #E8D9A0`, borderRadius: 10,
                padding: '12px 16px', fontSize: 12, color: '#7A5C00',
              }}>
                ⚠ {result?.differential?.disclaimer || '辅助诊断，最终由医生确认。'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
