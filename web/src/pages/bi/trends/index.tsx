/** 健澜科技 jlmedaios - 运营趋势分析（M222 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, List, Row, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface TrendPoint { month: string; outpatient: number; inpatient: number; surgery: number; revenue: number; yoyGrowth: number }
const W = 720, H = 280, PAD = 40;
function line(points: TrendPoint[], key: keyof TrendPoint) {
  if (points.length < 2) return '';
  const vals = points.map((p) => Number(p[key]) || 0);
  const min = Math.min(...vals); const max = Math.max(...vals);
  const scale = max === min ? 1 : (H - PAD * 2) / (max - min);
  return points.map((p, i) => {
    const x = PAD + (i * (W - PAD * 2)) / (points.length - 1);
    const y = H - PAD - ((Number(p[key]) || 0) - min) * scale;
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
}
export default function BiTrendsPage() {
  usePageTitle('运营趋势分析');
  const [list, setList] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/bi/trends').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.trends ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="运营趋势分析（近 12 个月）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <svg width={W} height={H} style={{ background: '#fafafa' }}>
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#ccc" />
            <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#ccc" />
            <path d={line(list, 'outpatient')} stroke="#1E5F8C" fill="none" strokeWidth="2" />
            <path d={line(list, 'inpatient')} stroke="#13C2C2" fill="none" strokeWidth="2" />
            <path d={line(list, 'surgery')} stroke="#FAAD14" fill="none" strokeWidth="2" />
            {list.map((p, i) => (
              <text key={p.month} x={PAD + (i * (W - PAD * 2)) / Math.max(list.length - 1, 1)} y={H - 20} fontSize="10" textAnchor="middle" fill="#888">{p.month.slice(5)}</text>
            ))}
          </svg>
          <div style={{ marginTop: 8 }}>
            <Tag color="#1E5F8C">门诊</Tag><Tag color="#13C2C2">住院</Tag><Tag color="#FAAD14">手术</Tag>
          </div>
        </Card>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Card title="月度明细" size="small">
              <List size="small" dataSource={list.slice(-6)} renderItem={(p) => <List.Item>{p.month} · 门诊 {p.outpatient} · 住院 {p.inpatient} · 手术 {p.surgery}</List.Item>} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="同比增长" size="small">
              <List size="small" dataSource={list.slice(-6)} renderItem={(p) => <List.Item>{p.month} · 收入 {p.revenue} 万 · YoY <Tag color={p.yoyGrowth >= 5 ? 'green' : 'default'}>{p.yoyGrowth}%</Tag></List.Item>} />
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  );
}
