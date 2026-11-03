/**
 * 健澜AI原生医院操作系统OS - 术后镇痛随访
 * 待随访列表（术后2h/6h/24h/48h/72h）+ VAS疼痛评分滑块 + Ramsay镇静评分 + 副作用记录
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Descriptions, Form, InputNumber, Modal, Select, Slider, Spin, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

interface FupRow {
  id: string;
  patientName: string;
  surgeryName: string;
  dept: string;
  surgeryEndAt: string;
  window: '2h' | '6h' | '24h' | '48h' | '72h';
  pca: boolean;
  status: string;
}

const demoRows: FupRow[] = [
  { id: 'FUP-20261104-001', patientName: '张**', surgeryName: '腹腔镜胆囊切除术', dept: '普外科', surgeryEndAt: '2026-11-04 11:30', window: '2h', pca: true, status: 'pending' },
  { id: 'FUP-20261104-002', patientName: '李**', surgeryName: '全髋关节置换术', dept: '骨科', surgeryEndAt: '2026-11-03 16:00', window: '24h', pca: true, status: 'pending' },
  { id: 'FUP-20261104-003', patientName: '王**', surgeryName: '经尿道前列腺电切术', dept: '泌尿外科', surgeryEndAt: '2026-11-03 18:00', window: '48h', pca: false, status: 'pending' },
  { id: 'FUP-20261104-004', patientName: '赵**', surgeryName: '甲状腺次全切除术', dept: '普外科', surgeryEndAt: '2026-11-02 15:00', window: '72h', pca: false, status: 'pending' },
];

const windowColor: Record<string, string> = { '2h': 'red', '6h': 'orange', '24h': 'blue', '48h': 'cyan', '72h': 'default' };

const sideEffectOptions = ['恶心呕吐', '皮肤瘙痒', '尿潴留', '呼吸抑制', '嗜睡'].map((v) => ({ label: v, value: v }));

const ramsayOptions = [
  { value: 1, label: '1级 焦虑躁动' },
  { value: 2, label: '2级 合作定向好' },
  { value: 3, label: '3级 仅对指令反应' },
  { value: 4, label: '4级 入睡、眉间反射敏感' },
  { value: 5, label: '5级 入睡、反应迟钝' },
  { value: 6, label: '6级 深睡、无反应' },
];

export default function PostopAnalgesiaPage() {
  usePageTitle('术后镇痛随访');
  const [list, setList] = useState<FupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<FupRow | null>(null);
  const [vas, setVas] = useState(3);
  const [ramsay, setRamsay] = useState(2);
  const [sideEffects, setSideEffects] = useState<string[]>([]);
  const [pcaCount, setPcaCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/v1/postop/analgesia/pending')
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const data = j.data?.items ?? [];
        setList(Array.isArray(data) && data.length > 0 ? data : demoRows);
      })
      .catch((e: Error) => { if (!alive) return; setError(e.message); setList(demoRows); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const openFup = (row: FupRow) => {
    setCurrent(row);
    setVas(3); setRamsay(2); setSideEffects([]); setPcaCount(0);
    setOpen(true);
  };

  const onSubmit = async () => {
    if (!current) return;
    setSubmitting(true);
    try {
      await fetch(`/api/v1/postop/analgesia/${current.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vas, ramsay, sideEffects, pcaPressCount: pcaCount }),
      });
      message.success(`患者 ${current.patientName} 随访记录已提交`);
      setList((prev) => prev.filter((r) => r.id !== current.id));
      setOpen(false);
    } catch {
      message.error('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<FupRow> = [
    { title: '随访单号', dataIndex: 'id', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patientName', width: 80 },
    { title: '手术', dataIndex: 'surgeryName' },
    { title: '科室', dataIndex: 'dept', width: 110 },
    {
      title: '随访时点', dataIndex: 'window', width: 100,
      render: (v: string) => <Tag color={windowColor[v] ?? 'default'}>术后{v}</Tag>,
    },
    { title: 'PCA泵', dataIndex: 'pca', width: 80, render: (v: boolean) => (v ? <Tag color="blue">有</Tag> : <Tag>无</Tag>) },
    { title: '手术结束', dataIndex: 'surgeryEndAt', width: 160 },
    {
      title: '操作', key: 'action', width: 110,
      render: (_, row) => <Button size="small" type="primary" onClick={() => openFup(row)}>随访</Button>,
    },
  ];

  return (
    <PageContainer title="术后镇痛随访" description="按术后2h/6h/24h/48h/72h时点随访，记录VAS疼痛、Ramsay镇静、副作用与PCA按压次数">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table rowKey="id" columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="middle" />
        </Card>
      </Spin>
      <Modal
        title={`镇痛随访 - ${current?.patientName ?? ''}（术后${current?.window ?? ''}）`}
        open={open}
        width={640}
        onOk={() => void onSubmit()}
        onCancel={() => setOpen(false)}
        okText="提交随访"
        confirmLoading={submitting}
      >
        <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="手术">{current?.surgeryName}</Descriptions.Item>
        </Descriptions>
        <Form layout="vertical">
          <Form.Item label={`VAS 疼痛评分：${vas} 分（0无痛 ~ 10剧痛）`}>
            <Slider min={0} max={10} value={vas} onChange={(v) => setVas(v)} marks={{ 0: '0', 3: '3', 7: '7', 10: '10' }} />
          </Form.Item>
          <Form.Item label="Ramsay 镇静评分">
            <Select value={ramsay} options={ramsayOptions} onChange={(v) => setRamsay(v)} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="不良反应">
            <Checkbox.Group options={sideEffectOptions} value={sideEffects} onChange={(v) => setSideEffects(v as string[])} />
          </Form.Item>
          {current?.pca && (
            <Form.Item label="PCA 按压次数">
              <InputNumber min={0} value={pcaCount} onChange={(v) => setPcaCount(v ?? 0)} style={{ width: 160 }} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </PageContainer>
  );
}
