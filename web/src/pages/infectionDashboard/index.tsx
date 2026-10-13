/**
 * 健澜科技 jlmedaios - 院感监测看板页（M76-A）
 * 月度指标录入 + 科室排名表 + 超阈值标红。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Layout, Table, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useInfectionDashStore } from '@/store/infectionDashboardStore';
import { isOverDeviceThreshold } from '@/utils/infectionDashboard';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function InfectionDashboardPage() {
  const { dbUp, rows, loading, error, checkHealth, setMonth, submit } = useInfectionDashStore();
  const [month, setMonthInput] = useState('2026-07');
  const [department, setDepartment] = useState('');
  const [hho, setHho] = useState(0);
  const [hhc, setHhc] = useState(0);
  usePermission();
  useEffect(() => { void checkHealth(); }, [checkHealth]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>院感监测看板</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  const columns = [
    { title: '科室', dataIndex: 'department', key: 'department' },
    { title: '手卫生依从率%', dataIndex: 'handHygieneRate', key: 'handHygieneRate' },
    { title: 'CAUTI‰日', dataIndex: 'cautiRate', key: 'cautiRate',
      render: (v: number) => isOverDeviceThreshold(v) ? <Tag color="red">{v}</Tag> : v },
    { title: 'VAP‰日', dataIndex: 'vapRate', key: 'vapRate',
      render: (v: number) => isOverDeviceThreshold(v) ? <Tag color="red">{v}</Tag> : v },
    { title: 'CLABSI‰日', dataIndex: 'clabsiRate', key: 'clabsiRate',
      render: (v: number) => isOverDeviceThreshold(v) ? <Tag color="red">{v}</Tag> : v },
    { title: 'SSI%', dataIndex: 'ssiRate', key: 'ssiRate' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>院内感染监测看板</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card title="月度指标录入" style={{ marginBottom: 16 }}>
          <Input placeholder="月份 YYYY-MM" value={month} onChange={(e) => setMonthInput(e.target.value)} style={{ marginBottom: 8, width: 160 }} />
          <Input placeholder="科室" value={department} onChange={(e) => setDepartment(e.target.value)} style={{ marginBottom: 8, width: 160, marginLeft: 8 }} />
          <Input placeholder="手卫生观察数" type="number" value={hho} onChange={(e) => setHho(Number(e.target.value))} style={{ marginBottom: 8, width: 140, marginLeft: 8 }} />
          <Input placeholder="手卫生合规数" type="number" value={hhc} onChange={(e) => setHhc(Number(e.target.value))} style={{ marginBottom: 8, width: 140, marginLeft: 8 }} />
          <Button type="primary" loading={loading} onClick={() => setMonth(month)}>查询</Button>
          <Button style={{ marginLeft: 8 }} loading={loading}
            onClick={() => submit({ month, department, handHygieneObservations: hho, handHygieneCompliant: hhc })}>
            提交指标
          </Button>
        </Card>
        <Card title="科室排名（按感染率降序）">
          <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={false} size="small" />
        </Card>
      </Content>
    </Layout>
  );
}
