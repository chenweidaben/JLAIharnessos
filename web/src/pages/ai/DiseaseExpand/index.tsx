/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 【AI 诊断扩展——更多病种与更准诊断】M163-C
 *   POST /api/v1/ai/diagnose/expand
 *   四种模式：
 *     1. 推荐进一步检查：按病种+患者特征（年龄/红旗/已完成检查）推荐检查；
 *     2. 病种入库：新增病种提交（带医学审核校验，缺字段/重名自动拒收留痕）；
 *     3. 反馈再校准：医生采纳/驳回反馈回流，各病种准确率再校准；
 *     4. 鉴别诊断增补：为指定病种补充带鉴别要点的鉴别诊断。
 *
 * 医疗安全红线：AI 仅为教科书级辅助参考，最终诊断与处置由执业医师确认。
 * 深海蓝 VI：主色 #0B2A4A，辅助 #1B6CA8，背景 #F4F7FB。
 */
import { useState, type CSSProperties } from 'react';
import { post } from '@/api/client';

/* ------------------------------ 类型（与 BFF 对齐） ------------------------------ */
interface SuggestedExam {
  category: '实验室' | '影像' | '特殊检查';
  name: string;
  purpose: string;
  urgency: 'stat' | 'urgent' | 'routine';
  note?: string;
}
interface ExamineResult {
  diagnosis: string;
  icd10: string;
  specialty: string | null;
  exams: SuggestedExam[];
  redFlagWarnings: string[];
  disclaimer: string;
}
interface AddedDisease {
  name: string;
  icd10: string;
  specialty: string;
}
interface LibraryResult {
  library: AddedDisease[];
  added: AddedDisease[];
  rejected: Array<{ name: string; reason: string }>;
  total: number;
  disclaimer: string;
}
interface RecalibratedDisease {
  disease: string;
  priorAccuracy: number;
  accuracy: number;
  sampleCount: number;
  drift: number;
}
interface AccuracyResult {
  updated: RecalibratedDisease[];
  reviewList: string[];
  feedbackCount: number;
  disclaimer: string;
}
interface DifferentialResult {
  matched: boolean;
  entry: { name: string; icd10: string; differential: Array<{ diagnosis: string; discriminator: string }> } | null;
  skipped: Array<{ diagnosis: string; reason: string }>;
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
  width: '100%', padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 6,
  fontSize: 13, color: C.text, background: '#fff', boxSizing: 'border-box',
};
const labelStyle: CSSProperties = { fontSize: 12, color: C.muted, marginBottom: 4, display: 'block' };
const cardStyle: CSSProperties = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 };

const num = (s: string): number | undefined => {
  const n = Number(s);
  return s.trim() !== '' && Number.isFinite(n) ? n : undefined;
};
const urgencyLabel = (u: string) => (u === 'stat' ? '急诊' : u === 'urgent' ? '尽快' : '常规');
const urgencyColor = (u: string) => (u === 'stat' ? C.critical : u === 'urgent' ? C.high : C.info);

type Mode = 'examine' | 'library' | 'accuracy' | 'differential';
const MODE_TABS: Array<{ key: Mode; label: string }> = [
  { key: 'examine', label: '推荐进一步检查' },
  { key: 'library', label: '病种入库' },
  { key: 'accuracy', label: '反馈再校准' },
  { key: 'differential', label: '鉴别诊断增补' },
];

export default function DiseaseExpandPage() {
  const [mode, setMode] = useState<Mode>('examine');

  // examine 表单
  const [dx, setDx] = useState('脑卒中');
  const [age, setAge] = useState('72');
  const [redFlag, setRedFlag] = useState(true);
  const [completed, setCompleted] = useState('');

  // library 表单
  const [newName, setNewName] = useState('');
  const [newIcd, setNewIcd] = useState('');
  const [newSpecialty, setNewSpecialty] = useState<'神经' | '泌尿' | '血液' | '风湿免疫'>('神经');
  const [newSymptoms, setNewSymptoms] = useState('');

  // accuracy 表单
  const [feedbackRaw, setFeedbackRaw] = useState('脑卒中|true|脑卒中\n癫痫|false|晕厥');

  // differential 表单
  const [diffDx, setDiffDx] = useState('脑卒中');
  const [diffList, setDiffList] = useState('低血糖脑病|补糖后迅速缓解');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [examine, setExamine] = useState<ExamineResult | null>(null);
  const [library, setLibrary] = useState<LibraryResult | null>(null);
  const [accuracy, setAccuracy] = useState<AccuracyResult | null>(null);
  const [differential, setDifferential] = useState<DifferentialResult | null>(null);

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'examine') {
        const resp = await post<ExamineResult>('/api/v1/ai/diagnose/expand', {
          mode: 'examine',
          diagnosis: dx.trim(),
          patientFeatures: {
            age: num(age),
            hasRedFlag: redFlag,
            completedExams: completed.split(/[,，、\n]/).map((s) => s.trim()).filter(Boolean),
          },
        });
        setExamine(resp);
      } else if (mode === 'library') {
        const resp = await post<LibraryResult>('/api/v1/ai/diagnose/expand', {
          mode: 'library',
          newDiseases: [
            {
              name: newName.trim(),
              icd10: newIcd.trim(),
              specialty: newSpecialty,
              typicalSymptoms: newSymptoms.split(/[,，、\n]/).map((s) => s.trim()).filter(Boolean),
            },
          ],
        });
        setLibrary(resp);
      } else if (mode === 'accuracy') {
        const feedback = feedbackRaw
          .split(/\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [disease, correct, doctorFinalDiagnosis] = line.split('|');
            return { disease: (disease ?? '').trim(), correct: correct?.trim() === 'true', doctorFinalDiagnosis };
          });
        const resp = await post<AccuracyResult>('/api/v1/ai/diagnose/expand', {
          mode: 'accuracy',
          currentModel: [],
          feedback,
        });
        setAccuracy(resp);
      } else {
        const differential = diffList
          .split(/\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [diagnosis, discriminator] = line.split('|');
            return { diagnosis: (diagnosis ?? '').trim(), discriminator: (discriminator ?? '').trim() };
          });
        const resp = await post<DifferentialResult>('/api/v1/ai/diagnose/expand', {
          mode: 'differential',
          disease: diffDx.trim(),
          differential,
        });
        setDifferential(resp);
      }
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
        <div style={{ fontSize: 18, fontWeight: 600 }}>AI 诊断扩展 · 病种深化 M163-C</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
          神经 / 泌尿 / 血液 / 风湿免疫 共 16 个新病种 · 检查推荐 · 病种入库审核 · 反馈再校准 · 鉴别诊断增补
        </div>
      </div>

      {/* 模式页签 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {MODE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setMode(t.key)}
            style={{
              padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
              border: `1px solid ${mode === t.key ? C.primary : C.border}`,
              background: mode === t.key ? C.primary : C.card,
              color: mode === t.key ? '#fff' : C.text,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
        {/* 录入区 */}
        <div style={cardStyle}>
          {mode === 'examine' && (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 12 }}>诊断与患者特征</div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>病种（脑卒中/癫痫/贫血/类风湿关节炎…）</label>
                <input style={inputStyle} value={dx} onChange={(e) => setDx(e.target.value)} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>年龄</label>
                <input style={inputStyle} value={age} onChange={(e) => setAge(e.target.value)} />
              </div>
              <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={redFlag} onChange={(e) => setRedFlag(e.target.checked)} />
                <span style={{ fontSize: 13 }}>存在红旗症状（自动提升检查紧急度）</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>已完成检查（逗号分隔，自动剔除不重复开单）</label>
                <input style={inputStyle} value={completed} onChange={(e) => setCompleted(e.target.value)} />
              </div>
            </>
          )}

          {mode === 'library' && (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 12 }}>新增病种提交</div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>病名</label>
                <input style={inputStyle} value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>ICD-10 编码</label>
                <input style={inputStyle} value={newIcd} onChange={(e) => setNewIcd(e.target.value)} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>所属专科</label>
                <select style={inputStyle} value={newSpecialty} onChange={(e) => setNewSpecialty(e.target.value as typeof newSpecialty)}>
                  <option value="神经">神经</option>
                  <option value="泌尿">泌尿</option>
                  <option value="血液">血液</option>
                  <option value="风湿免疫">风湿免疫</option>
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>典型症状（逗号分隔，至少 1 条）</label>
                <textarea style={{ ...inputStyle, minHeight: 60 }} value={newSymptoms} onChange={(e) => setNewSymptoms(e.target.value)} />
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                【安全与运营】缺病名/ICD/症状或与库内重名将被拒收并留痕，新病种须经医学委员会审核后上线。
              </div>
            </>
          )}

          {mode === 'accuracy' && (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 12 }}>医生反馈回流</div>
              <div style={{ marginBottom: 8, fontSize: 12, color: C.muted }}>
                每行一条：病种|true/false|医生最终诊断
              </div>
              <textarea style={{ ...inputStyle, minHeight: 120 }} value={feedbackRaw} onChange={(e) => setFeedbackRaw(e.target.value)} />
            </>
          )}

          {mode === 'differential' && (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 12 }}>增补鉴别诊断</div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>主诊断病种</label>
                <input style={inputStyle} value={diffDx} onChange={(e) => setDiffDx(e.target.value)} />
              </div>
              <div style={{ marginBottom: 8, fontSize: 12, color: C.muted }}>
                每行一条：待鉴别病名|鉴别要点（如何区分）
              </div>
              <textarea style={{ ...inputStyle, minHeight: 90 }} value={diffList} onChange={(e) => setDiffList(e.target.value)} />
            </>
          )}

          <button onClick={run} disabled={loading} style={{
            width: '100%', padding: '9px', background: loading ? C.muted : C.primary, color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
          }}>{loading ? '处理中…' : '执行'}</button>
          {error && <div style={{ marginTop: 10, color: C.critical, fontSize: 12 }}>{error}</div>}
        </div>

        {/* 结果区 */}
        <div>
          {mode === 'examine' && examine && (
            <>
              <div style={{ ...cardStyle, marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.primary }}>
                  {examine.diagnosis}
                  <span style={{ marginLeft: 8, fontSize: 12, color: C.muted, fontWeight: 400 }}>
                    {examine.icd10} · {examine.specialty}
                  </span>
                </div>
                {examine.redFlagWarnings.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {examine.redFlagWarnings.map((w, i) => (
                      <div key={i} style={{ fontSize: 12, color: C.critical, marginBottom: 2 }}>⚠ {w}</div>
                    ))}
                  </div>
                )}
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 10 }}>推荐进一步检查（按紧急度排序）</div>
                {examine.exams.map((ex, i) => (
                  <div key={i} style={{ borderBottom: `1px solid ${C.border}`, padding: '8px 0' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: urgencyColor(ex.urgency), border: `1px solid ${urgencyColor(ex.urgency)}`, borderRadius: 4, padding: '0 6px' }}>
                        {urgencyLabel(ex.urgency)}
                      </span>
                      <span style={{ fontSize: 11, color: C.muted }}>{ex.category}</span>
                      <span style={{ fontWeight: 600, color: C.text }}>{ex.name}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>目的：{ex.purpose}{ex.note ? `（${ex.note}）` : ''}</div>
                  </div>
                ))}
              </div>
              <div style={{ ...cardStyle, marginTop: 12, background: '#FFF8E6', border: '1px solid #E8D9A0', fontSize: 12, color: '#7A5C00' }}>
                ⚠ {examine.disclaimer}
              </div>
            </>
          )}

          {mode === 'library' && library && (
            <div style={cardStyle}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 10 }}>
                入库结果（库内现共 {library.total} 个病种）
              </div>
              {library.added.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: C.ok, marginBottom: 4 }}>✓ 成功入库：</div>
                  {library.added.map((d, i) => (
                    <div key={i} style={{ fontSize: 13, color: C.text }}>{d.name}（{d.icd10} · {d.specialty}）</div>
                  ))}
                </div>
              )}
              {library.rejected.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: C.critical, marginBottom: 4 }}>✗ 被拒收（留痕待医学审核）：</div>
                  {library.rejected.map((r, i) => (
                    <div key={i} style={{ fontSize: 12, color: C.critical }}>{r.name} —— {r.reason}</div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 12, color: C.muted }}>{library.disclaimer}</div>
            </div>
          )}

          {mode === 'accuracy' && accuracy && (
            <div style={cardStyle}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 10 }}>
                再校准结果（本次纳入 {accuracy.feedbackCount} 条反馈）
              </div>
              {accuracy.reviewList.length > 0 && (
                <div style={{ background: '#FDECEA', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: C.critical }}>
                  【安全与运营】准确率低于 0.6 需人工复核：{accuracy.reviewList.join('、')}
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: C.muted, textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}` }}>病种</th>
                    <th style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}` }}>校准前</th>
                    <th style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}` }}>校准后</th>
                    <th style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}` }}>漂移</th>
                    <th style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}` }}>样本量</th>
                  </tr>
                </thead>
                <tbody>
                  {accuracy.updated.map((u, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}` }}>{u.disease}</td>
                      <td style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}`, color: C.muted }}>{(u.priorAccuracy * 100).toFixed(1)}%</td>
                      <td style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{(u.accuracy * 100).toFixed(1)}%</td>
                      <td style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}`, color: u.drift >= 0 ? C.ok : C.critical }}>
                        {u.drift >= 0 ? '+' : ''}{(u.drift * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}` }}>{u.sampleCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{accuracy.disclaimer}</div>
            </div>
          )}

          {mode === 'differential' && differential && (
            <div style={cardStyle}>
              {!differential.matched && (
                <div style={{ fontSize: 13, color: C.high }}>{differential.disclaimer}</div>
              )}
              {differential.matched && differential.entry && (
                <>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.primary, marginBottom: 10 }}>
                    {differential.entry.name}
                    <span style={{ marginLeft: 8, fontSize: 12, color: C.muted, fontWeight: 400 }}>{differential.entry.icd10}</span>
                  </div>
                  {differential.entry.differential.map((d, i) => (
                    <div key={i} style={{ borderBottom: `1px solid ${C.border}`, padding: '8px 0' }}>
                      <div style={{ fontWeight: 600, color: C.text }}>{d.diagnosis}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>鉴别要点：{d.discriminator}</div>
                    </div>
                  ))}
                  {differential.skipped.length > 0 && (
                    <div style={{ marginTop: 10, fontSize: 12, color: C.high }}>
                      跳过：{differential.skipped.map((s) => `${s.diagnosis}（${s.reason}）`).join('；')}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{differential.disclaimer}</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
