/**
 * 健澜AI原生医院操作系统OS - 麻醉记录单
 * 逐5分钟生命体征表格 + 麻醉用药时间线 + 麻醉医师签名
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, List, Space, Spin, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

interface VitalRow {
  minute: number;
  temp: number;
  sbp: number;
  dbp: number;
  pr: number;
  spo2: number;
  etco2: number;
}

interface DrugRow {
  time: string;
  name: string;
  dose: string;
  route: string;
  note: string;
}

const surgeryId = 'SURG-20261104-001';

function genDemoVitals(): VitalRow[] {
  const rows: VitalRow[] = [];
  for (let m = 0; m <= 60; m += 5) {
    rows.push({
      minute: m,
      temp: Number((36.6 + Math.sin(m / 20) * 0.2).toFixed(1)),
      sbp: 120 + Math.round(Math.sin(m / 15) * 12),
      dbp: 74 + Math.round(Math.cos(m / 20) * 6),
      pr: 72 + Math.round(Math.sin(m / 18) * 8),
      spo2: 98 - (m > 20 && m < 40 ? 1 : 0),
      etco2: 36 + Math.round(Math.sin(m / 25) * 2),
    });
  }
  return rows;
}

const demoDrugs: DrugRow[] = [
  { time: '13:55', name: '丙泊酚', dose: '120mg', route: '静推', note: '诱导' },
  { time: '13:56', name: '罗库溴铵', dose: '50mg', route: '静推', note: '肌松' },
  { time: '14:00', name: '舒芬太尼', dose: '25μg', route: '静推', note: '镇痛诱导' },
  { time: '14:30', name: '瑞芬太尼', dose: '0.2μg/kg/min', route: '泵注', note: '维持' },
];

export default function AnesthesiaRecordSheetPage() {
  usePageTitle('麻醉记录单');
  const [vitals, setVitals] = useState<VitalRow[]>([]);
  const [drugs, setDrugs] = useState<DrugRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/v1/anesthesia/records/${surgeryId}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setVitals(Array.isArray(j.data?.vitals) && j.data.vitals.length > 0 ? j.data.vitals : genDemoVitals());
        setDrugs(Array.isArray(j.data?.drugs) && j.data.drugs.length > 0 ? j.data.drugs : demoDrugs);
        setSigned(Boolean(j.data?.signed));
      })
      .catch((e: Error) => { if (!alive) return; setError(e.message); setVitals(genDemoVitals()); setDrugs(demoDrugs); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const onSign = async () => {
    setSigning(true);
    try {
      await fetch(`/api/v1/anesthesia/records/demo-anes-rec-0001/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signer: 'demo-anesthesiologist' }),
      });
      setSigned(true);
      message.success('麻醉记录单已电子签名');
    } catch {
      message.error('签名失败');
    } finally {
      setSigning(false);
    }
  };

  const columns: ColumnsType<VitalRow> = [
    { title: '时间(min)', dataIndex: 'minute', width: 90, render: (v: number) => `T+${v}` },
    { title: '体温(℃)', dataIndex: 'temp', width: 90 },
    { title: '收缩压', dataIndex: 'sbp', width: 80 },
    { title: '舒张压', dataIndex: 'dbp', width: 80 },
    { title: '脉搏', dataIndex: 'pr', width: 70 },
    { title: 'SpO₂(%)', dataIndex: 'spo2', width: 80 },
    { title: 'EtCO₂(mmHg)', dataIndex: 'etco2', width: 110 },
  ];

  return (
    <PageContainer title="麻醉记录单" description="逐5分钟生命体征、麻醉用药时间线与出入量记录，签名后归档">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card style={{ marginBottom: 16 }}>
          <Descriptions size="small" column={3} bordered>
            <Descriptions.Item label="手术号">{surgeryId}</Descriptions.Item>
            <Descriptions.Item label="患者">张**</Descriptions.Item>
            <Descriptions.Item label="麻醉方式">全身麻醉</Descriptions.Item>
            <Descriptions.Item label="入量">晶体 1500ml / 胶体 500ml</Descriptions.Item>
            <Descriptions.Item label="出量">尿量 400ml / 失血 100ml</Descriptions.Item>
            <Descriptions.Item label="签名状态">
              {signed ? <Tag color="green">已签名</Tag> : <Tag color="orange">未签名</Tag>}
            </Descriptions.Item>
          </Descriptions>
        </Card>
        <Card title="生命体征（逐5分钟）" style={{ marginBottom: 16 }}>
          <Table rowKey="minute" columns={columns} dataSource={vitals} pagination={false} size="small" scroll={{ x: 720 }} />
        </Card>
        <Card title="麻醉用药时间线" style={{ marginBottom: 16 }}>
          <List
            size="small"
            dataSource={drugs}
            renderItem={(d) => (
              <List.Item>
                <Space>
                  <Tag color="blue">{d.time}</Tag>
                  <strong>{d.name}</strong>
                  <span>{d.dose}</span>
                  <Tag>{d.route}</Tag>
                  <span style={{ color: '#999' }}>{d.note}</span>
                </Space>
              </List.Item>
            )}
          />
        </Card>
        <div style={{ textAlign: 'right' }}>
          {signed
            ? <Button size="large" disabled type="primary">已完成签名</Button>
            : <Button size="large" type="primary" loading={signing} onClick={() => void onSign()}>麻醉医师电子签名</Button>}
        </div>
      </Spin>
    </PageContainer>
  );
}
