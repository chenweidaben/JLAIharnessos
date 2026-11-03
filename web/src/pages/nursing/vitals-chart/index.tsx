/**
 * 健澜AI原生医院操作系统OS - 体温单
 * 体温/脉搏/呼吸曲线 + 血压/体重/入出量表格 + 体温录入
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, InputNumber, Row, Select, Spin, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

interface VitalRow {
  id: string;
  time: string;
  temperature: number;
  pulse: number;
  respiration: number;
  systolic: number;
  diastolic: number;
  weight: number;
  intake: number;
  output: number;
  note: string;
}

const demoRows: VitalRow[] = [
  { id: '1', time: '2026-11-03 06:00', temperature: 36.5, pulse: 78, respiration: 18, systolic: 120, diastolic: 80, weight: 65.5, intake: 0, output: 0, note: '' },
  { id: '2', time: '2026-11-03 10:00', temperature: 36.8, pulse: 82, respiration: 19, systolic: 125, diastolic: 82, weight: 0, intake: 500, output: 300, note: '早餐后' },
  { id: '3', time: '2026-11-03 14:00', temperature: 37.2, pulse: 88, respiration: 20, systolic: 128, diastolic: 85, weight: 0, intake: 400, output: 450, note: '' },
  { id: '4', time: '2026-11-03 18:00', temperature: 36.9, pulse: 80, respiration: 18, systolic: 122, diastolic: 78, weight: 0, intake: 600, output: 500, note: '晚餐后' },
];

export default function VitalsChartPage() {
  usePageTitle('体温单');
  const [list, setList] = useState<VitalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/v1/vitals/P001')
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const data = j.data?.list ?? j.data?.vitals ?? [];
        setList(Array.isArray(data) && data.length > 0 ? data : demoRows);
      })
      .catch((e: Error) => {
        if (!alive) return;
        setError(e.message);
        setList(demoRows);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const onSubmit = async () => {
    const vals = await form.validateFields();
    try {
      await fetch('/api/v1/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vals),
      });
      message.success('体温记录已录入');
      form.resetFields();
    } catch {
      message.error('录入失败');
    }
  };

  const columns: ColumnsType<VitalRow> = [
    { title: '时间', dataIndex: 'time', width: 150 },
    { title: '体温(℃)', dataIndex: 'temperature', width: 90 },
    { title: '脉搏(次/分)', dataIndex: 'pulse', width: 100 },
    { title: '呼吸(次/分)', dataIndex: 'respiration', width: 100 },
    { title: '收缩压(mmHg)', dataIndex: 'systolic', width: 110 },
    { title: '舒张压(mmHg)', dataIndex: 'diastolic', width: 110 },
    { title: '体重(kg)', dataIndex: 'weight', width: 90 },
    { title: '入量(ml)', dataIndex: 'intake', width: 90 },
    { title: '出量(ml)', dataIndex: 'output', width: 90 },
    { title: '备注', dataIndex: 'note' },
  ];

  // 简易 SVG 折线图
  const renderChart = () => {
    const w = 600, h = 200, pad = 30;
    const temps = list.map((r) => r.temperature);
    const maxT = Math.max(...temps, 38);
    const minT = Math.min(...temps, 36);
    const rangeT = maxT - minT || 1;
    const points = list.map((r, i) => {
      const x = pad + (i * (w - pad * 2)) / Math.max(list.length - 1, 1);
      const y = h - pad - ((r.temperature - minT) / rangeT) * (h - pad * 2);
      return `${x},${y}`;
    }).join(' ');
    return (
      <svg width={w} height={h} style={{ background: '#fafafa', borderRadius: 4 }}>
        <polyline points={points} fill="none" stroke="#cf1322" strokeWidth="2" />
        {list.map((r, i) => {
          const x = pad + (i * (w - pad * 2)) / Math.max(list.length - 1, 1);
          const y = h - pad - ((r.temperature - minT) / rangeT) * (h - pad * 2);
          return <circle key={r.id} cx={x} cy={y} r="3" fill="#cf1322" />;
        })}
        <text x={10} y={20} fontSize="12" fill="#666">体温曲线(℃) 范围:{minT.toFixed(1)}-{maxT.toFixed(1)}</text>
      </svg>
    );
  };

  return (
    <PageContainer title="体温单" description="患者体温/脉搏/呼吸/血压/体重/入出量记录">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Row gutter={16}>
          <Col span={16}>
            <Card title="体温脉搏曲线" style={{ marginBottom: 16 }}>
              {renderChart()}
            </Card>
            <Card title="生命体征记录列表">
              <Table rowKey="id" columns={columns} dataSource={list} pagination={false} size="small" />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="体温录入">
              <Form form={form} layout="vertical" onFinish={() => void onSubmit()}>
                <Form.Item name="temperature" label="体温(℃)" rules={[{ required: true }]}>
                  <InputNumber min={35} max={42} step={0.1} style={{ width: '100%' }} placeholder="如 36.5" />
                </Form.Item>
                <Form.Item name="pulse" label="脉搏(次/分)" rules={[{ required: true }]}>
                  <InputNumber min={30} max={200} style={{ width: '100%' }} placeholder="如 78" />
                </Form.Item>
                <Form.Item name="respiration" label="呼吸(次/分)" rules={[{ required: true }]}>
                  <InputNumber min={5} max={60} style={{ width: '100%' }} placeholder="如 18" />
                </Form.Item>
                <Row gutter={8}>
                  <Col span={12}>
                    <Form.Item name="systolic" label="收缩压">
                      <InputNumber min={60} max={250} style={{ width: '100%' }} placeholder="120" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="diastolic" label="舒张压">
                      <InputNumber min={40} max={150} style={{ width: '100%' }} placeholder="80" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="weight" label="体重(kg)">
                  <InputNumber min={0} max={300} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="note" label="备注">
                  <Select
                    placeholder="选择备注"
                    options={[{ value: '', label: '无' }, { value: '早餐后', label: '早餐后' }, { value: '晚餐后', label: '晚餐后' }, { value: '物理降温', label: '物理降温' }]}
                  />
                </Form.Item>
                <Button type="primary" htmlType="submit" block>录入体温</Button>
              </Form>
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  );
}
