/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 【AI治疗方案推荐·个体化用药】M161-C
 *   POST /api/v1/ai/treatment/plan
 *   录入诊断与患者特征（年龄/体重/肝肾功能/孕哺/在用用药），输出按个体调整的
 *   一线方案、备选替代、药物相互作用冲突、疗程与复查安排。
 *
 * 医疗安全红线：AI 仅做指南对齐辅助，最终由执业医师确认；页面底部固定 disclaimer。
 * 深海蓝 VI：主色 #0B2A4A，辅助 #1B6CA8，背景 #F4F7FB。
 * 【远期深化】指南阈值/剂量系数后续迁移至可热更新的指南与药学知识库。
 */
import { useState, type CSSProperties } from 'react';
import { post } from '@/api/client';

/* ------------------------------ 类型（与 BFF 对齐） ------------------------------ */
interface AdjustedDose {
  drug: string;
  originalPerDoseMg: number;
  adjustedPerDoseMg: number;
  dosesPerDay: number;
  factor: number;
  contraindicated: boolean;
  reasons: string[];
}
interface InteractionFinding {
  level: 'high' | 'medium' | 'low';
  drugA: string;
  drugB: string;
  title: string;
  advice: string;
}
interface AlternativeGroup {
  reason: string;
  drugs: AdjustedDose[];
}
interface TreatmentPlanResult {
  patientId: string;
  diagnosis: string;
  matched: boolean;
  guideline: string | null;
  icd10: string | null;
  firstLine: AdjustedDose[];
  alternatives: AlternativeGroup[];
  interactions: InteractionFinding[];
  courseWeeks: number | null;
  followUpWeeks: number | null;
  followUpItems: string[];
  disclaimer: string;
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

const levelColor = (lv: string): string =>
  lv === 'high' ? C.critical : lv === 'medium' ? C.high : C.info;
const levelBg = (lv: string): string =>
  lv === 'high' ? '#FDECEA' : lv === 'medium' ? '#FEF3E6' : '#EAF4FB';

export default function TreatmentPlanPage() {
  const [patientId, setPatientId] = useState('P-2026-0001');
  const [diagnosis, setDiagnosis] = useState('2型糖尿病');
  const [age, setAge] = useState('78');
  const [weight, setWeight] = useState('46');
  const [egfr, setEgfr] = useState('42');
  const [hepatic, setHepatic] = useState('0');
  const [pregnant, setPregnant] = useState(false);
  const [allergies, setAllergies] = useState('');
  const [currentMeds, setCurrentMeds] = useState('华法林');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TreatmentPlanResult | null>(null);

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await post<TreatmentPlanResult>('/api/v1/ai/treatment/plan', {
        patientId: patientId.trim() || 'P-0',
        diagnosis: diagnosis.trim(),
        patientFeatures: {
          age: num(age),
          weightKg: num(weight),
          egfr: num(egfr),
          hepaticImpairment: (num(hepatic) ?? 0) as 0 | 1 | 2 | 3,
          pregnant,
          allergies: allergies.split(/[,，、\n]/).map((s) => s.trim()).filter(Boolean),
        },
        currentMeds: currentMeds.split(/[,，、\n]/).map((s) => s.trim()).filter(Boolean),
      });
      setResult(resp);
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
        <div style={{ fontSize: 18, fontWeight: 600 }}>AI 治疗方案推荐 · 个体化用药 M161-C</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
          一线首选 / 备选替代 / 按年龄体重肝肾功能调剂量 / 相互作用冲突 / 疗程复查
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
        {/* 录入表单 */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 12 }}>患者与诊断录入</div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>患者 ID</label>
            <input style={inputStyle} value={patientId} onChange={(e) => setPatientId(e.target.value)} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>诊断（高血压 / 2型糖尿病 / 肺炎 / 冠心病）</label>
            <input style={inputStyle} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div><label style={labelStyle}>年龄</label><input style={inputStyle} value={age} onChange={(e) => setAge(e.target.value)} /></div>
            <div><label style={labelStyle}>体重 kg</label><input style={inputStyle} value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
            <div><label style={labelStyle}>eGFR</label><input style={inputStyle} value={egfr} onChange={(e) => setEgfr(e.target.value)} /></div>
            <div>
              <label style={labelStyle}>肝功分级 0-3</label>
              <input style={inputStyle} value={hepatic} onChange={(e) => setHepatic(e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={pregnant} onChange={(e) => setPregnant(e.target.checked)} />
            <span style={{ fontSize: 13 }}>妊娠/哺乳</span>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>过敏药物（逗号分隔）</label>
            <input style={inputStyle} value={allergies} onChange={(e) => setAllergies(e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>当前在用用药（逗号分隔）</label>
            <input style={inputStyle} value={currentMeds} onChange={(e) => setCurrentMeds(e.target.value)} />
          </div>

          <button onClick={run} disabled={loading} style={{
            width: '100%', padding: '9px', background: loading ? C.muted : C.primary, color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
          }}>{loading ? '生成中…' : '生成个体化治疗方案'}</button>

          {error && <div style={{ marginTop: 10, color: C.critical, fontSize: 12 }}>{error}</div>}
        </div>

        {/* 结果区 */}
        <div>
          {!result && (
            <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 10, padding: 40, textAlign: 'center', color: C.muted, fontSize: 13 }}>
              录入左侧信息后点击「生成个体化治疗方案」，系统将按患者特征给出一线、备选、剂量与相互作用提示。
            </div>
          )}

          {result && !result.matched && (
            <div style={{ background: '#FFF8E6', border: '1px solid #E8D9A0', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#7A5C00' }}>
              暂未在内置指南库中命中「{result.diagnosis}」。【远期深化】接入完整指南知识库后可覆盖更多病种。
            </div>
          )}

          {result && result.matched && (
            <>
              {/* 方案头 */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.primary }}>
                  {result.diagnosis}
                  {result.icd10 && <span style={{ marginLeft: 8, fontSize: 12, color: C.muted, fontWeight: 40 }}>{result.icd10}</span>}
                </div>
                <div style={{ fontSize: 12, color: C.primarySoft, marginTop: 4 }}>指南依据：{result.guideline}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  疗程 {result.courseWeeks} 周 · 首次复查 {result.followUpWeeks} 周后
                </div>
              </div>

              {/* 一线治疗 + 个体化剂量 */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 10 }}>一线治疗（已个体化调剂量）</div>
                {result.firstLine.map((d) => (
                  <div key={d.drug} style={{ borderBottom: `1px solid ${C.border}`, padding: '8px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: d.contraindicated ? C.critical : C.text }}>{d.drug}</span>
                      {d.contraindicated ? (
                        <span style={{ background: C.critical, color: '#fff', borderRadius: 4, padding: '1px 8px', fontSize: 11 }}>禁用</span>
                      ) : (
                        <span style={{ background: C.ok, color: '#fff', borderRadius: 4, padding: '1px 8px', fontSize: 11 }}>
                          {d.adjustedPerDoseMg}mg × {d.dosesPerDay}/日
                        </span>
                      )}
                      {d.factor !== 1 && !d.contraindicated && (
                        <span style={{ fontSize: 11, color: C.high }}>调整系数 ×{d.factor}（原 {d.originalPerDoseMg}mg）</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{d.reasons.join('；')}</div>
                  </div>
                ))}
              </div>

              {/* 备选方案 */}
              {result.alternatives.length > 0 && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 8 }}>备选方案（不耐受/禁忌替代）</div>
                  {result.alternatives.map((a, i) => (
                    <div key={i} style={{ padding: '6px 0', borderBottom: `1px dashed ${C.border}` }}>
                      <div style={{ fontSize: 12, color: C.high, marginBottom: 2 }}>触发：{a.reason}</div>
                      <div style={{ fontSize: 13, color: C.text }}>
                        {a.drugs.map((d) => d.contraindicated ? `${d.drug}（禁用）` : `${d.drug} ${d.adjustedPerDoseMg}mg×${d.dosesPerDay}`).join('；')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 相互作用冲突 */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 8 }}>
                  药物相互作用检查
                  <span style={{ marginLeft: 8, fontSize: 12, color: result.interactions.length ? C.critical : C.ok, fontWeight: 400 }}>
                    {result.interactions.length ? `发现 ${result.interactions.length} 项冲突` : '未发现已知冲突'}
                  </span>
                </div>
                {result.interactions.length === 0 && <div style={{ fontSize: 12, color: C.ok }}>当前在用用药与拟用方案之间无内置规则命中的相互作用。</div>}
                {result.interactions.map((it, i) => (
                  <div key={i} style={{
                    fontSize: 12, padding: '6px 10px', marginBottom: 6, borderRadius: 6,
                    background: levelBg(it.level), color: levelColor(it.level),
                  }}>
                    <div style={{ fontWeight: 600 }}>{it.title}</div>
                    <div style={{ marginTop: 2 }}>{it.advice}</div>
                  </div>
                ))}
              </div>

              {/* 疗程与复查 */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 8 }}>疗程与复查</div>
                <div style={{ fontSize: 13, color: C.text, marginBottom: 6 }}>
                  建议疗程 {result.courseWeeks} 周，首次复查安排在 {result.followUpWeeks} 周后。
                </div>
                {result.followUpItems.map((s, i) => (
                  <div key={i} style={{ fontSize: 12, color: C.muted }}>· {s}</div>
                ))}
              </div>

              {/* 安全免责 */}
              <div style={{ background: '#FFF8E6', border: '1px solid #E8D9A0', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#7A5C00' }}>
                ⚠ {result.disclaimer}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
