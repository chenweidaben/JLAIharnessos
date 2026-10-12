/**
 * 健澜科技 jlmedaios - DIP 屏（M23-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Layout, Spin, Table, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useDipStore } from '@/store/dipStore';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function DipPage() {
  const { dbUp, packets, points, loading, error, checkHealth, load } = useDipStore();
  usePermission();
  useEffect(() => { void checkHealth().then(() => { void load(); }); }, [checkHealth, load]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>DIP</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>DIP 分值点值体系</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Spin spinning={loading}>
          <Title level={5}>病种分值库</Title>
          <Table
            rowKey="id" size="small" pagination={false} dataSource={packets}
            columns={[
              { title: '编码', dataIndex: 'packetCode' },
              { title: '名称', dataIndex: 'packetName' },
              { title: '分值', dataIndex: 'score' },
              { title: '版本', dataIndex: 'version', render: (v: string) => <Tag>{v}</Tag> },
            ]}
          />
          <Title level={5} style={{ marginTop: 24 }}>月度点值</Title>
          <Table
            rowKey="id" size="small" pagination={false} dataSource={points}
            columns={[
              { title: '周期', dataIndex: 'period' },
              { title: '基金池', dataIndex: 'fundPool' },
              { title: '总分值', dataIndex: 'totalScore' },
              { title: '点值', dataIndex: 'pointValue' },
            ]}
          />
        </Spin>
      </Content>
    </Layout>
  );
}
