/**
 * 健澜科技 jlmedaios - 急诊预检分诊五级（M35-A）
 *
 * 上半区：分诊录入表单；下半区：分诊台实时队列（消费 BFF GET /api/v1/emergency/queue）。
 * v5.0试点扩展（浏览器bug修复）：原页面仅有录入表单、从不拉取队列，导致队列列表缺失；
 * 现挂载时拉取急诊队列并渲染，空值/失败安全降级为“暂无队列”。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';

interface ErQueueItem {
  visitId: string;
  triageNo: string;
  patientName: string;
  gender: string;
  age: string;
  chiefComplaint: string | null;
  arriveTime: string;
  level: number | null;
  levelLabel: string | null;
  emStatus: string;
  greenChannelActive: boolean;
  waitMinutes: number;
  overdue: boolean;
}

export default function ErTriagePage() {
  const [visitId, setVisitId] = useState('');
  const [cc, setCc] = useState('');
  const [sbp, setSbp] = useState<number | undefined>(undefined);
  const [hr, setHr] = useState<number | undefined>(undefined);
  const [rr, setRr] = useState<number | undefined>(undefined);
  const [spo2, setSpo2] = useState<number | undefined>(undefined);
  const [gcs, setGcs] = useState<number | undefined>(undefined);
  const [out, setOut] = useState<any>(null);

  // v5.0试点扩展（浏览器bug修复）：分诊台队列状态
  const [queue, setQueue] = useState<ErQueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);

  const levelColor: Record<string, string> = { I: 'red', II: 'orange', III: 'yellow', IV: 'green', V: 'gray' };
  // v5.0试点扩展（浏览器bug修复）：按级别数字(1-4)映射颜色，与后端 LEVEL_META 一致
  const levelNumColor = (lv: number | null): string =>
    lv === 1 ? levelColor.I : lv === 2 ? levelColor.II : lv === 3 ? levelColor.III : levelColor.IV;

  const emStatusLabel: Record<string, string> = {
    waiting_triage: '待分诊',
    triaged: '已分诊',
    resuscitation: '抢救中',
    observation: '留观',
    in_treatment: '处置中',
    admitted: '已入院',
    discharged: '已离院',
    transferred: '已转科',
    deceased: '死亡',
  };

  async function triage() {
    const r = await fetch('/api/v1/er-triage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, chiefComplaint: cc, systolicBp: sbp, heartRate: hr, respRate: rr, spo2, gcs }),
    });
    const j = await r.json();
    setOut(j?.data);
  }

  // v5.0试点扩展（浏览器bug修复）：挂载时拉取急诊分诊台队列（DEMO_MODE 下由
  // emergencyAggregator.getQueue 返回 8 条确定性演示队列）。失败/空值安全降级。
  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const r = await fetch('/api/v1/emergency/queue');
      const j = await r.json();
      const data = j?.data;
      setQueue(Array.isArray(data) ? (data as ErQueueItem[]) : []);
    } catch {
      setQueue([]);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  return (
    <div style={{ padding: 24 }}>
      <h2>急诊预检分诊五级</h2>
      <div>就诊ID <input value={visitId} onChange={e => setVisitId(e.target.value)} /></div>
      <div>主诉 <input value={cc} onChange={e => setCc(e.target.value)} /></div>
      <div>
        SBP <input type="number" value={sbp ?? ''} onChange={e => setSbp(e.target.value ? +e.target.value : undefined)} />
        HR <input type="number" value={hr ?? ''} onChange={e => setHr(e.target.value ? +e.target.value : undefined)} />
        RR <input type="number" value={rr ?? ''} onChange={e => setRr(e.target.value ? +e.target.value : undefined)} />
        SpO2 <input type="number" value={spo2 ?? ''} onChange={e => setSpo2(e.target.value ? +e.target.value : undefined)} />
        GCS <input type="number" value={gcs ?? ''} onChange={e => setGcs(e.target.value ? +e.target.value : undefined)} />
      </div>
      <button onClick={triage}>分诊</button>
      {out && (
        <div style={{ marginTop: 16 }}>
          <div>
            分级：
            <span style={{ color: levelColor[out.level] ?? 'black', fontSize: 24, fontWeight: 'bold' }}>{out.level}</span>
            {out.greenChannel && <span style={{ color: 'red', marginLeft: 12 }}>绿色通道</span>}
          </div>
        </div>
      )}

      {/* v5.0试点扩展（浏览器bug修复）：分诊台实时队列列表 */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0 }}>分诊台队列</h3>
          <button onClick={() => void loadQueue()} disabled={queueLoading}>
            {queueLoading ? '加载中…' : '刷新'}
          </button>
          <span style={{ color: '#888', fontSize: 12 }}>共 {queue.length} 人在急诊区</span>
        </div>
        <table style={{ marginTop: 12, width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f5f7fa', textAlign: 'left' }}>
              <th style={{ padding: 8, border: '1px solid #e8e8e8' }}>分诊号</th>
              <th style={{ padding: 8, border: '1px solid #e8e8e8' }}>患者</th>
              <th style={{ padding: 8, border: '1px solid #e8e8e8' }}>主诉</th>
              <th style={{ padding: 8, border: '1px solid #e8e8e8' }}>级别</th>
              <th style={{ padding: 8, border: '1px solid #e8e8e8' }}>状态</th>
              <th style={{ padding: 8, border: '1px solid #e8e8e8' }}>已等待</th>
              <th style={{ padding: 8, border: '1px solid #e8e8e8' }}>标记</th>
            </tr>
          </thead>
          <tbody>
            {queue.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 16, textAlign: 'center', color: '#999' }}>
                  暂无急诊队列
                </td>
              </tr>
            )}
            {queue.map((q) => (
              <tr key={q.visitId} style={{ opacity: q.overdue ? 0.75 : 1 }}>
                <td style={{ padding: 8, border: '1px solid #e8e8e8' }}>{q.triageNo}</td>
                <td style={{ padding: 8, border: '1px solid #e8e8e8' }}>
                  {q.patientName}（{q.gender === 'male' ? '男' : q.gender === 'female' ? '女' : '未知'}，{q.age}）
                </td>
                <td style={{ padding: 8, border: '1px solid #e8e8e8' }}>{q.chiefComplaint ?? '—'}</td>
                <td style={{ padding: 8, border: '1px solid #e8e8e8' }}>
                  <span style={{ color: levelNumColor(q.level) }}>{q.levelLabel ?? '待分诊'}</span>
                </td>
                <td style={{ padding: 8, border: '1px solid #e8e8e8' }}>{emStatusLabel[q.emStatus] ?? q.emStatus}</td>
                <td style={{ padding: 8, border: '1px solid #e8e8e8' }}>
                  {q.waitMinutes} 分钟{q.overdue && <span style={{ color: 'red' }}>（超时）</span>}
                </td>
                <td style={{ padding: 8, border: '1px solid #e8e8e8' }}>
                  {q.greenChannelActive && <span style={{ color: 'red' }}>绿色通道</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
