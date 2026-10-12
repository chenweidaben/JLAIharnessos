import { useState } from 'react';

export default function HealthCheckReferralPage() {
  const [orderId, setOrderId] = useState('');
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    const r = await fetch(`/api/v1/healthcheck-referrals?orderId=${orderId}`);
    const j = await r.json();
    setItems(j?.data ?? []);
  }

  async function dismiss(id: string) {
    await fetch(`/api/v1/healthcheck-referrals/${id}/dismiss`, { method: 'POST' });
    load();
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>体检异常转诊</h2>
      <div>体检单ID <input value={orderId} onChange={e => setOrderId(e.target.value)} /> <button onClick={load}>查询</button></div>
      <ul>
        {items.map(it => (
          <li key={it.id}>
            {it.abnormalItem} → 建议科室：<b>{it.suggestedDepartment}</b>
            {it.appointmentStatus === 'recommended' && (
              <>
                <button onClick={() => dismiss(it.id)}>忽略</button>
                <a href={`/schedule?dept=${encodeURIComponent(it.suggestedDepartment)}`}>去预约</a>
              </>
            )}
            {it.appointmentStatus === 'dismissed' && <span style={{ color: 'gray' }}>已忽略</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
