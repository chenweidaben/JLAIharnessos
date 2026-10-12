/**
 * 健澜科技 jlmedaios - 结算下钻屏（M23-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Layout, Spin, Table, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useDrilldownStore } from '@/store/settlementDrilldownStore';

const { Header, Content } = Layout;
const { Title } = Typography;

const cols = [
  { title: '名称', dataIndex: 'label' },
  { title: '病例数', dataIndex: 'cases', sorter: (a: any, b: any) => a.cases - b.cases },
  { title: '结算总额', dataIndex: 'settlementTotal', sorter: (a: any, b: any) => a.settlementTotal - b.settlementTotal },
  { title: '超支率', dataIndex: 'overspendRate', render: (v: number) => `${(v * 100).toFixed(1)}%`, sorter: (a: any, b: any) => a.overspendRate - b.overspendRate },
  { title: '药占比', dataIndex: 'drugRatio', render: (v: number) => `${(v * 100).toFixed(1)}%`, sorter: (a: any, b: any) => a.drugRatio - b.drugRatio },
];

export default function SettlementDrilldownPage() {
  const { dbUp, result, loading, error, checkHealth, load } = useDrilldownStore();
  usePermission();
  useEffect(() => { void checkHealth().then(() => { void load('2099-10'); }); }, [checkHealth, load]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>结算下钻</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>科室/医生结算排名</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Spin spinning={loading}>
          <Title level={5}>按科室</Title>
          <Table rowKey="key" size="small" pagination={false} dataSource={result.byDepartment} columns={cols} />
          <Title level={5} style={{ marginTop: 24 }}>按医生</Title>
          <Table rowKey="key" size="small" pagination={false} dataSource={result.byDoctor} columns={cols} />
        </Spin>
      </Content>
    </Layout>
  );
}
