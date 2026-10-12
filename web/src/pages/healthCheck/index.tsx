import { useEffect, useState } from 'react';

export default function HealthCheckPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [order, setOrder] = useState<any>(null);

  async function loadPkgs() {
    const r = await fetch('/api/v1/healthcheck/packages');
    const j = await r.json();
    setPackages(j?.data ?? []);
  }
  useEffect(() => { loadPkgs(); }, []);

  async function openOrder(pkgId: string, patientId: string) {
    const r = await fetch('/api/v1/healthcheck/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: pkgId, patientId, appointmentDate: '2026-10-14' }),
    });
    const j = await r.json();
    setOrder(j?.data);
  }
  void openOrder;

  async function complete(orderId: string, item: string) {
    const r = await fetch(`/api/v1/healthcheck/orders/${orderId}/items/${encodeURIComponent(item)}/complete`, { method: 'POST' });
    const j = await r.json();
    setOrder(j?.data);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>体检中心</h2>
      <h3>套餐</h3>
      <ul>
        {packages.map(p => (
          <li key={p.id}>{p.name} ({p.items.join(', ')}) - ¥{(p.priceCents / 100).toFixed(0)}</li>
        ))}
      </ul>
      {order && (
        <div>
          <h3>体检单进度：{order.progress}%</h3>
          {order.items.map((it: any) => (
            <div key={it.id}>
              <span style={{ color: it.completed ? 'green' : 'black' }}>{it.itemName}</span>
              {!it.completed && <button onClick={() => complete(order.order.id, it.itemName)}>完成</button>}
            </div>
          ))}
          {order.reportPushed && <div style={{ color: 'green' }}>报告已推送</div>}
        </div>
      )}
    </div>
  );
}
