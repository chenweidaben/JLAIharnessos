/**
 * 健澜科技 jlmedaios - 合理用药统计看板页（M77-A）
 * 月度指标录入 + 科室排名表 + 超阈值标红。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Layout, Table, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useAmDashStore } from '@/store/amDashboardStore';
import { isOverDddsThreshold } from '@/utils/amDashboard';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function AmDashboardPage() {
  const { dbUp, rows, loading, error, checkHealth, setMonth, submit } = useAmDashStore();
  const [month, setMonthInput] = useState('2026-07');
  const [department, setDepartment] = useState('');
  const [ddds, setDdds] = useState(0);
  const [days, setDays] = useState(0);
  usePermission();
  useEffect(() => { void checkHealth(); }, [checkHealth]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>合理用药看板</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  const columns = [
    { title: '科室', dataIndex: 'department', key: 'department' },
    { title: 'DDDs/百人天', dataIndex: 'dddsPer100', key: 'dddsPer100',
      render: (v: number) => isOverDddsThreshold(v) ? <Tag color="red">{v}</Tag> : v },
    { title: '抗菌药使用率%', dataIndex: 'antibioticRate', key: 'antibioticRate' },
    { title: '特殊级占比%', dataIndex: 'specialClassRate', key: 'specialClassRate' },
    { title: '围术期预防合理率%', dataIndex: 'prophylaxisRate', key: 'prophylaxisRate' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>合理用药统计看板</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card title="月度指标录入" style={{ marginBottom: 16 }}>
          <Input placeholder="月份 YYYY-MM" value={month} onChange={(e) => setMonthInput(e.target.value)} style={{ marginBottom: 8, width: 160 }} />
          <Input placeholder="科室" value={department} onChange={(e) => setDepartment(e.target.value)} style={{ marginBottom: 8, width: 160, marginLeft: 8 }} />
          <Input placeholder="DDDs 总量" type="number" value={ddds} onChange={(e) => setDdds(Number(e.target.value))} style={{ marginBottom: 8, width: 140, marginLeft: 8 }} />
          <Input placeholder="出院床日数" type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ marginBottom: 8, width: 140, marginLeft: 8 }} />
          <Button type="primary" loading={loading} onClick={() => setMonth(month)}>查询</Button>
          <Button style={{ marginLeft: 8 }} loading={loading}
            onClick={() => submit({ month, department, dddsTotal: ddds, inpatientDays: days })}>
            提交指标
          </Button>
        </Card>
        <Card title="科室排名（按 DDDs 降序）">
          <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={false} size="small" />
        </Card>
      </Content>
    </Layout>
  );
}
