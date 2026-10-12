/**
 * 健澜科技 jlmedaios - 护理出入量 PDA 录入屏（M17-E）
 *
 * 健康门禁：db!=='up' 显式红 Alert + 水印，不渲染业务数据。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, InputNumber, Layout, Row, Select, Statistic, Table, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useNursingIoStore } from '@/store/nursingIoStore';
import { balanceColor, categoryLabel, shiftLabel } from '@/utils/nursingIo';
import type { IoCategory, IoDirection } from '@/types/nursingIo';

const { Header, Content } = Layout;
const { Title } = Typography;

const INTAKE_CATS: IoCategory[] = ['oral', 'tube_feed', 'iv', 'blood_product'];
const OUTPUT_CATS: IoCategory[] = ['urine', 'stool', 'drain', 'vomit', 'sweat', 'other'];

export default function NursingIoPage() {
  const { dbUp, health, records, balance, loading, error, checkHealth, submit } = useNursingIoStore();
  usePermission();
  const [direction, setDirection] = useState<IoDirection>('intake');
  const [category, setCategory] = useState<IoCategory>('oral');
  const [amount, setAmount] = useState<number>(0);

  useEffect(() => { void checkHealth(); }, [checkHealth]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>出入量记录</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}>
          <Alert type="error" showIcon message="数据库连接异常" description={error || `db=${health?.db ?? '?'}`} />
        </Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  const cats = direction === 'intake' ? INTAKE_CATS : OUTPUT_CATS;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>出入量记录闭环 (I&O)</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card title="录入">
          <Select value={direction} onChange={setDirection} style={{ width: 120, marginRight: 12 }}
            options={[{ value: 'intake', label: '入量' }, { value: 'output', label: '出量' }]} />
          <Select value={category} onChange={setCategory} style={{ width: 160, marginRight: 12 }}
            options={cats.map((c) => ({ value: c, label: categoryLabel(c) }))} />
          <InputNumber value={amount} onChange={(v) => setAmount(v ?? 0)} addonAfter="ml" style={{ marginRight: 12 }} />
          <Button type="primary" onClick={async () => { await submit({ visitId: '00000000-0000-0000-0000-000000000000', direction, category, amountMl: amount }); }}>录入</Button>
        </Card>

        {balance && (
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={8}><Statistic title="24h 入量(ml)" value={balance.last24h.intakeTotal} /></Col>
            <Col span={8}><Statistic title="24h 出量(ml)" value={balance.last24h.outputTotal} /></Col>
            <Col span={8}><Statistic title="24h 平衡(ml)" value={balance.last24h.balance} valueStyle={{ color: balanceColor(balance.last24h.balance) }} /></Col>
          </Row>
        )}

        <Table rowKey="id" loading={loading} dataSource={records} pagination={{ pageSize: 8 }}
          columns={[
            { title: '方向', dataIndex: 'direction', render: (d) => (d === 'intake' ? '入' : '出') },
            { title: '分类', dataIndex: 'category', render: (c: IoCategory) => categoryLabel(c) },
            { title: 'ml', dataIndex: 'amountMl' },
            { title: '时间', dataIndex: 'recordTime', render: (v) => new Date(v).toLocaleString() },
          ]} />
        <p style={{ marginTop: 8 }}>班次汇总：{balance ? Object.entries(balance.byShift).map(([s, b]) => `${shiftLabel(s as keyof typeof balance.byShift)}=${b.balance}`).join(' / ') : '—'}</p>
      </Content>
    </Layout>
  );
}
