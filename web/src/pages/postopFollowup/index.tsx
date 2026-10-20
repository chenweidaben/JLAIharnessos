/**
 * 健澜科技 jlmedaios - 术后镇痛随访页
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from 'react';
import { Button, Input, Select, Table, Empty, Card, Typography, Alert, Space } from 'antd';

// v5.0试点扩展（M200遗留修复）：空列表加 antd Empty 占位 + 字段美化
const { Title } = Typography;

export default function PostopFollowupPage() {
  const [visitId, setVisitId] = useState('');
  const [list, setList] = useState<any[]>([]);
  const [tp, setTp] = useState('6h');
  const [score, setScore] = useState(3);

  async function schedule() {
    await fetch('/api/v1/postop-followups/schedule', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, surgeryEndAt: new Date().toISOString() }),
    });
    refresh();
  }
  async function complete() {
    await fetch('/api/v1/postop-followups/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, timepoint: tp, score }),
    });
    refresh();
  }
  async function refresh() {
    if (!visitId) return;
    const r = await fetch(`/api/v1/postop-followups?visitId=${visitId}`);
    const j = await r.json();
    setList(j?.data ?? []);
  }

  const columns = [
    { title: '时间点', dataIndex: 'timepoint', key: 'timepoint' },
    { title: '应随访时间', dataIndex: 'dueAt', key: 'dueAt' },
    { title: '完成时间', dataIndex: 'completedAt', key: 'completedAt', render: (v: string) => v ?? '—' },
    { title: 'NRS 评分', dataIndex: 'painScore', key: 'painScore', render: (v: number) => v ?? '—' },
    { title: '镇痛工单', dataIndex: 'workOrderId', key: 'workOrderId', render: (v: string) => v ? '已建工单' : '—' },
  ];

  return (
    <Card style={{ margin: 16 }}>
      <Title level={4}>术后镇痛随访 6h / 24h / 48h</Title>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space wrap>
          <span>就诊ID</span>
          <Input value={visitId} onChange={(e) => setVisitId(e.target.value)} style={{ width: 240 }} placeholder="输入就诊ID" />
          <Button type="primary" onClick={schedule}>生成随访计划</Button>
        </Space>
        <Space wrap>
          <span>时间点</span>
          <Select value={tp} onChange={(v) => setTp(v)} style={{ width: 100 }}
            options={[{ value: '6h', label: '6h' }, { value: '24h', label: '24h' }, { value: '48h', label: '48h' }]} />
          <span>NRS 评分</span>
          <Input type="number" min={0} max={10} value={score} onChange={(e) => setScore(+e.target.value)} style={{ width: 80 }} />
          {score >= 4 && <Alert type="warning" showIcon message="≥4 将触发镇痛工单" />}
          <Button onClick={complete}>完成随访</Button>
        </Space>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={list}
          pagination={false}
          locale={{ emptyText: <Empty description="暂无术后随访记录" /> }}
        />
      </Space>
    </Card>
  );
}
