/**
 * 健澜科技 jlmedaios - 成本归因屏（M22-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Input, Layout, Table, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useCostAttributionStore } from '@/store/costAttributionStore';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function CostAttributionPage() {
  const { dbUp, result, loading, error, checkHealth, load } = useCostAttributionStore();
  usePermission();
  const [visitId, setVisitId] = useState('');
  const [groupCode, setGroupCode] = useState('');
  useEffect(() => { void checkHealth(); }, [checkHealth]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>成本归因</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>超支病例成本归因</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Input.Search
          style={{ marginBottom: 16, maxWidth: 600 }}
          enterButton="归因"
          placeholder="visitId + groupCode"
          onSearch={() => { void load(visitId, groupCode); }}
        />
        <Input placeholder="visitId" style={{ marginBottom: 8 }} value={visitId} onChange={(e) => setVisitId(e.target.value)} />
        <Input placeholder="groupCode" style={{ marginBottom: 16 }} value={groupCode} onChange={(e) => setGroupCode(e.target.value)} />
        <Button type="primary" onClick={() => { void load(visitId, groupCode); }} loading={loading}>归因</Button>
        {result && (
          <Table
            style={{ marginTop: 16 }}
            rowKey="category"
            loading={loading}
            dataSource={result.rows}
            pagination={false}
            columns={[
              { title: '类别', dataIndex: 'category', render: (c: string, r: { top: boolean }) => <span>{c} {r.top ? <Tag color="red">Top</Tag> : null}</span> },
              { title: '实际', dataIndex: 'actual' },
              { title: '预算', dataIndex: 'expected' },
              { title: '差额', dataIndex: 'variance', render: (v: number) => <Tag color={v > 0 ? 'red' : 'green'}>{v}</Tag> },
              { title: '贡献度', dataIndex: 'contributionPct', render: (p: number) => `${(p * 100).toFixed(1)}%` },
            ]}
          />
        )}
      </Content>
    </Layout>
  );
}
