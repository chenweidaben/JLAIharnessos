/**
 * 健澜AI原生医院操作系统OS - PACU 复苏评分
 * Steward 三项评分（清醒/呼吸/肢体活动 各0-2）+ 出室判定（≥4分）+ 历史记录
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Modal, Radio, Space, Spin, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

interface PacuRow {
  id: string;
  patientName: string;
  surgeryName: string;
  anesthesiaMethod: string;
  inPacuAt: string;
  status: string;
}

interface HistoryRow {
  id: string;
  patientName: string;
  consciousness: number;
  breathing: number;
  movement: number;
  total: number;
  outcome: string;
  scoredAt: string;
}

const demoRows: PacuRow[] = [
  { id: 'PACU-20261104-001', patientName: '张**', surgeryName: '腹腔镜胆囊切除术', anesthesiaMethod: '全麻', inPacuAt: '2026-11-04 14:50', status: 'in-pacu' },
  { id: 'PACU-20261104-002', patientName: '李**', surgeryName: '全髋关节置换术', anesthesiaMethod: '全麻', inPacuAt: '2026-11-04 15:10', status: 'in-pacu' },
  { id: 'PACU-20261104-003', patientName: '王**', surgeryName: '经尿道前列腺电切术', anesthesiaMethod: '腰硬联合', inPacuAt: '2026-11-04 15:40', status: 'in-pacu' },
];

const demoHistory: HistoryRow[] = [
  { id: 'PACU-H-001', patientName: '张**', consciousness: 2, breathing: 2, movement: 2, total: 6, outcome: '出室回病房', scoredAt: '2026-11-04 15:20' },
  { id: 'PACU-H-002', patientName: '李**', consciousness: 1, breathing: 2, movement: 1, total: 4, outcome: '出室回病房', scoredAt: '2026-11-04 15:40' },
];

function scoreOptions(label: string) {
  return [
    { value: 0, label: `0 - ${label}` },
    { value: 1, label: `1 - ${label}` },
    { value: 2, label: `2 - ${label}` },
  ];
}

export default function PacuScorePage() {
  usePageTitle('PACU 复苏评分');
  const [list, setList] = useState<PacuRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<PacuRow | null>(null);
  const [consciousness, setConsciousness] = useState(1);
  const [breathing, setBreathing] = useState(1);
  const [movement, setMovement] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      fetch('/api/v1/pacu/pending').then((r) => r.json()),
      fetch('/api/v1/pacu/PACU-20261104-001/history').then((r) => r.json()).catch(() => ({ data: {} })),
    ])
      .then(([pj, hj]) => {
        if (!alive) return;
        const data = pj.data?.items ?? [];
        setList(Array.isArray(data) && data.length > 0 ? data : demoRows);
        const h = hj.data?.items ?? [];
        setHistory(Array.isArray(h) && h.length > 0 ? h : demoHistory);
      })
      .catch((e: Error) => { if (!alive) return; setError(e.message); setList(demoRows); setHistory(demoHistory); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const total = consciousness + breathing + movement;
  const canDischarge = total >= 4;

  const openScore = (row: PacuRow) => {
    setCurrent(row);
    setConsciousness(1); setBreathing(1); setMovement(1);
    setOpen(true);
  };

  const onSubmit = async () => {
    if (!current) return;
    setSubmitting(true);
    try {
      const resp = await fetch(`/api/v1/pacu/${current.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consciousness, breathing, movement }),
      }).then((r) => r.json());
      const d = resp.data ?? {};
      message.success(`评分完成：总分 ${d.total ?? total} 分，${d.outcome ?? (canDischarge ? '达到出室标准' : '继续观察')}`);
      setList((prev) => prev.filter((r) => r.id !== current.id));
      setOpen(false);
    } catch {
      message.error('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<PacuRow> = [
    { title: 'PACU单号', dataIndex: 'id', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patientName', width: 80 },
    { title: '手术', dataIndex: 'surgeryName' },
    { title: '麻醉方式', dataIndex: 'anesthesiaMethod', width: 110 },
    { title: '入PACU时间', dataIndex: 'inPacuAt', width: 160 },
    {
      title: '操作', key: 'action', width: 130,
      render: (_, row) => <Button size="small" type="primary" onClick={() => openScore(row)}>Steward评分</Button>,
    },
  ];

  const historyColumns: ColumnsType<HistoryRow> = [
    { title: '患者', dataIndex: 'patientName', width: 90 },
    { title: '清醒', dataIndex: 'consciousness', width: 70 },
    { title: '呼吸', dataIndex: 'breathing', width: 70 },
    { title: '肢体活动', dataIndex: 'movement', width: 90 },
    {
      title: '总分', dataIndex: 'total', width: 80,
      render: (v: number) => <Tag color={v >= 4 ? 'green' : 'orange'}>{v} 分</Tag>,
    },
    { title: '转归', dataIndex: 'outcome' },
    { title: '评分时间', dataIndex: 'scoredAt', width: 160 },
  ];

  return (
    <PageContainer title="PACU 复苏评分" description="Steward 评分：清醒/呼吸/肢体活动各0-2分，总分≥4分达到出室标准">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card title="待复苏患者" style={{ marginBottom: 16 }}>
          <Table rowKey="id" columns={columns} dataSource={list} pagination={false} size="middle" />
        </Card>
        <Card title="评分历史">
          <Table rowKey="id" columns={historyColumns} dataSource={history} pagination={false} size="small" />
        </Card>
      </Spin>
      <Modal
        title={`Steward 评分 - ${current?.patientName ?? ''}`}
        open={open}
        width={640}
        onOk={() => void onSubmit()}
        onCancel={() => setOpen(false)}
        okText="提交评分"
        confirmLoading={submitting}
      >
        <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="手术">{current?.surgeryName}</Descriptions.Item>
        </Descriptions>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <div style={{ marginBottom: 4 }}>清醒程度</div>
            <Radio.Group optionType="button" buttonStyle="solid" value={consciousness} onChange={(e) => setConsciousness(e.target.value)} options={scoreOptions('分')} />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>呼吸道通畅程度</div>
            <Radio.Group optionType="button" buttonStyle="solid" value={breathing} onChange={(e) => setBreathing(e.target.value)} options={scoreOptions('分')} />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>肢体活动</div>
            <Radio.Group optionType="button" buttonStyle="solid" value={movement} onChange={(e) => setMovement(e.target.value)} options={scoreOptions('分')} />
          </div>
          <Alert
            type={canDischarge ? 'success' : 'warning'}
            showIcon
            message={`当前总分 ${total} 分（满分6），${canDischarge ? '≥4分，达到出室标准，可转回病房' : '<4分，需继续复苏观察'}`}
          />
        </Space>
      </Modal>
    </PageContainer>
  );
}
