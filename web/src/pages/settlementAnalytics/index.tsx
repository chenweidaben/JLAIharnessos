/**
 * 健澜科技 jlmedaios - 医保驾驶舱屏（M23-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Layout, Spin, Table, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useAnalyticsStore } from '@/store/settlementAnalyticsStore';

const { Header, Content } = Layout;
const { Title } = Typography;

const TREND_COLOR: Record<string, string> = { up: 'red', down: 'green', flat: 'default', na: 'default' };

export default function SettlementAnalyticsPage() {
  const { dbUp, points, loading, error, checkHealth, load } = useAnalyticsStore();
  usePermission();
  useEffect(() => { void checkHealth().then(() => { void load(); }); }, [checkHealth, load]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>驾驶舱</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>医保驾驶舱（结算同比环比）</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Spin spinning={loading}>
          <Table
            rowKey="period" size="small" pagination={false} dataSource={points}
            columns={[
              { title: '期间', dataIndex: 'period' },
              { title: '环比', dataIndex: 'settlementMoM', render: (v: number | null) => v == null ? '-' : `${(v * 100).toFixed(1)}%` },
              { title: '趋势', dataIndex: 'settlementTrend', render: (v: string) => <Tag color={TREND_COLOR[v]}>{v}</Tag> },
              { title: 'DRG占比', dataIndex: 'drgRatio', render: (v: number) => `${(v * 100).toFixed(1)}%` },
              { title: 'DIP占比', dataIndex: 'dipRatio', render: (v: number) => `${(v * 100).toFixed(1)}%` },
            ]}
          />
        </Spin>
      </Content>
    </Layout>
  );
}
