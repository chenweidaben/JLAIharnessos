/**
 * 健澜科技 jlmedaios - 病组双轨选择屏（M23-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Layout, Spin, Table, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useSelectionStore } from '@/store/paymentSelectionStore';

const { Header, Content } = Layout;
const { Title } = Typography;

const PATH_COLOR: Record<string, string> = { auto_drg: 'blue', auto_dip: 'green', manual: 'orange' };

export default function PaymentSelectionPage() {
  const { dbUp, rows, loading, error, checkHealth, load } = useSelectionStore();
  usePermission();
  useEffect(() => { void checkHealth().then(() => { void load(); }); }, [checkHealth, load]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>病组选择</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>DRG/DIP 双轨病组选择</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Spin spinning={loading}>
          <Table
            rowKey="id" size="small" pagination={false} dataSource={rows}
            columns={[
              { title: '就诊', dataIndex: 'visitId', render: (v: string) => v.slice(0, 8) },
              { title: 'DRG', dataIndex: 'drgExpectedPayment' },
              { title: 'DIP', dataIndex: 'dipPayment' },
              { title: '路径', dataIndex: 'selectedPath', render: (v: string) => <Tag color={PATH_COLOR[v]}>{v}</Tag> },
              { title: '依据', dataIndex: 'rationale' },
            ]}
          />
        </Spin>
      </Content>
    </Layout>
  );
}
