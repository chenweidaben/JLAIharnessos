import { useState } from 'react';

export default function PreopAssessmentPage() {
  const [visitId, setVisitId] = useState('');
  const [asa, setAsa] = useState('II');
  const [npo, setNpo] = useState(false);
  const [allergy, setAllergy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [list, setList] = useState<any[]>([]);

  async function submit() {
    await fetch('/api/v1/preop-assessments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, asaGrade: asa, npoConfirmed: npo, allergyChecked: allergy, consentSigned: consent }),
    });
    refresh();
  }
  async function refresh() {
    if (!visitId) return;
    const r = await fetch(`/api/v1/preop-assessments?visitId=${visitId}`);
    const j = await r.json();
    setList(j?.data ?? []);
  }

  const complete = npo && allergy && consent;
  return (
    <div style={{ padding: 24 }}>
      <h2>术前访视 ASA 分级</h2>
      <div>就诊ID <input value={visitId} onChange={e => setVisitId(e.target.value)} /></div>
      <div style={{ margin: 8 }}>ASA
        <select value={asa} onChange={e => setAsa(e.target.value)}>
          {['I','II','III','IV','V','VI'].map(g => <option key={g}>{g}</option>)}
        </select>
        {['III','IV','V','VI'].includes(asa) && <span style={{ color: 'red', marginLeft: 8 }}>高风险</span>}
      </div>
      <label><input type="checkbox" checked={npo} onChange={e => setNpo(e.target.checked)} /> 禁食水确认</label><br />
      <label><input type="checkbox" checked={allergy} onChange={e => setAllergy(e.target.checked)} /> 过敏史核对</label><br />
      <label><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> 知情同意签署</label>
      <div style={{ color: complete ? 'green' : 'red', margin: 8 }}>
        {complete ? '三项齐全，术前评估完整' : '待补：' + [!npo && '禁食水', !allergy && '过敏史', !consent && '知情同意'].filter(Boolean).join('、')}
      </div>
      <button onClick={submit}>提交访视</button>
      <ul>{list.map((s: any) => <li key={s.id}>{s.createdAt} ASA={s.asaGrade}</li>)}</ul>
    </div>
  );
}
