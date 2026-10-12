/**
 * 健澜科技 jlmedaios - 续方流转屏（M21-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Layout, List, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useRenewalStore } from '@/store/renewalStore';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function RenewalPage() {
  const { dbUp, items, loading, error, checkHealth, load, doPay, doDispense } = useRenewalStore();
  usePermission();
  useEffect(() => { void checkHealth().then(() => load('')); }, [checkHealth, load]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>续方流转</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>我的续方处方</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <List
          loading={loading}
          dataSource={items}
          renderItem={(it) => (
            <List.Item
              actions={[
                it.status === 'approved' ? <Button size="small" type="primary" onClick={() => void doPay(it.id, '')}>支付</Button> : null,
                it.status === 'paid' ? <Button size="small" onClick={() => void doDispense(it.id, '')}>配药</Button> : null,
              ]}
            >
              <List.Item.Meta
                title={<span>{it.rxNo} <Tag color={it.status === 'ready_dispense' ? 'green' : it.status === 'paid' ? 'blue' : 'orange'}>{it.status}</Tag></span>}
                description={`金额 ${it.totalFee ?? '0'} · ${new Date(it.createdAt).toLocaleString()}`}
              />
            </List.Item>
          )}
        />
      </Content>
    </Layout>
  );
}
