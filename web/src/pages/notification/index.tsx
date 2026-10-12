/**
 * 健澜科技 jlmedaios - 患者通知中心屏（M20-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Badge, Button, Layout, List, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useNotificationStore } from '@/store/notificationStore';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function NotificationPage() {
  const { dbUp, items, unread, loading, error, checkHealth, load, read, readAll } = useNotificationStore();
  usePermission();
  useEffect(() => { void checkHealth().then(() => load('')); }, [checkHealth, load]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>通知中心</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header>
        <Title level={4} style={{ color: '#fff' }}>
          通知中心 <Badge count={unread} />
        </Title>
      </Header>
      <Content style={{ padding: 24 }}>
        <Button onClick={() => void readAll('')} style={{ marginBottom: 16 }}>全部已读</Button>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <List
          loading={loading}
          dataSource={items}
          renderItem={(it) => (
            <List.Item onClick={() => { if (it.readAt == null) void read(it.id, ''); }} style={{ cursor: it.readAt == null ? 'pointer' : 'default' }}>
              <List.Item.Meta
                title={<span>{it.title} {it.readAt == null ? <Tag color="red">未读</Tag> : <Tag color="green">已读</Tag>}</span>}
                description={it.body}
              />
            </List.Item>
          )}
        />
      </Content>
    </Layout>
  );
}
