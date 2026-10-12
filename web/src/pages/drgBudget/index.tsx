/**
 * 健澜科技 jlmedaios - DRG 预算预警屏（M22-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Layout, List, Table, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useDrgBudgetStore } from '@/store/drgBudgetStore';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function DrgBudgetPage() {
  const { dbUp, budgets, alerts, loading, error, checkHealth, load, ack } = useDrgBudgetStore();
  usePermission();
  useEffect(() => { void checkHealth().then(() => load()); }, [checkHealth, load]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>DRG 预算预警</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>DRG 病组预算与超支预警</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Title level={5}>超支告警（未确认）</Title>
        <List
          loading={loading}
          dataSource={alerts}
          style={{ marginBottom: 24 }}
          renderItem={(it) => (
            <List.Item actions={[<Button size="small" onClick={() => void ack(it.id)}>确认</Button>]}>
              <List.Item.Meta
                title={<span>{it.groupCode} <Tag color={it.level === 'over' ? 'red' : 'orange'}>{it.level}</Tag></span>}
                description={`实际 ${it.actualCost ?? '-'} / 预算比 ${it.ratio ?? '-'} · ${new Date(it.createdAt).toLocaleString()}`}
              />
            </List.Item>
          )}
        />
        <Title level={5}>病组预算</Title>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={budgets}
          pagination={false}
          columns={[
            { title: '病组', dataIndex: 'groupCode' },
            { title: '版本', dataIndex: 'version' },
            { title: '预算', dataIndex: 'expectedCost' },
            { title: '预警比', dataIndex: 'warningRatio' },
          ]}
        />
      </Content>
    </Layout>
  );
}
