import { useEffect, useState } from 'react';

export default function PatientChronicPage() {
  const [data, setData] = useState<any>(null);

  async function load() {
    const r = await fetch('/api/v1/patient/chronic');
    const j = await r.json();
    setData(j?.data);
  }
  useEffect(() => { load(); }, []);

  if (!data) return <div>加载中...</div>;
  return (
    <div style={{ padding: 24 }}>
      <h2>我的慢病随访</h2>
      <div>随访计划数：{data.planCount}</div>
      <div>测量记录数：{data.vitalsCount}</div>
      {data.nextFollowupAt && (
        <div>
          下次随访：{data.nextFollowupAt}（{data.daysToFollowup} 天后）
          {data.dueSoon && <span style={{ color: 'red', marginLeft: 8 }}>临近随访</span>}
        </div>
      )}
      {data.latestVitals && (
        <div>
          <h3>最新测量</h3>
          <div>SBP/DBP: {data.latestVitals.sbp ?? '-'}/{data.latestVitals.dbp ?? '-'}</div>
          <div>空腹血糖: {data.latestVitals.fastingGlucose ?? '-'}</div>
          <div>HbA1c: {data.latestVitals.hba1c ?? '-'}</div>
        </div>
      )}
    </div>
  );
}
