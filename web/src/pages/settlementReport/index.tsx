/**
 * 健澜科技 jlmedaios - 月度结算报表屏（M23-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Layout, Spin, Table, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useReportStore } from '@/store/settlementReportStore';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function SettlementReportPage() {
  const { dbUp, rows, loading, error, checkHealth, load } = useReportStore();
  usePermission();
  useEffect(() => { void checkHealth().then(() => { void load(); }); }, [checkHealth, load]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>结算报表</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>月度结算对账报表</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Spin spinning={loading}>
          <Table
            rowKey="id" size="small" pagination={false} dataSource={rows}
            columns={[
              { title: '期间', dataIndex: 'period' },
              { title: 'DRG病例', dataIndex: 'drgCases' },
              { title: 'DIP病例', dataIndex: 'dipCases' },
              { title: '总分值', dataIndex: 'totalScore' },
              { title: '点值', dataIndex: 'pointValue' },
              { title: '医保结算', dataIndex: 'insuranceSettlement' },
              { title: '自付', dataIndex: 'patientOutOfPocket' },
            ]}
          />
        </Spin>
      </Content>
    </Layout>
  );
}
