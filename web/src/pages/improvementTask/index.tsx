/**
 * 健澜科技 jlmedaios - 改进任务屏（M22-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Layout, List, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useImprovementStore } from '@/store/improvementTaskStore';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function ImprovementTaskPage() {
  const { dbUp, tasks, loading, error, checkHealth, load, act } = useImprovementStore();
  usePermission();
  useEffect(() => { void checkHealth().then(() => load()); }, [checkHealth, load]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>整改任务</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>我的待整改任务</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <List
          loading={loading}
          dataSource={tasks}
          renderItem={(it) => (
            <List.Item
              actions={[
                <Button size="small" onClick={() => void act(it.id, 'accepted')}>认领</Button>,
                <Button size="small" onClick={() => void act(it.id, 'resolved', '已整改')}>提交解决</Button>,
              ]}
            >
              <List.Item.Meta
                title={<span>{it.title} <Tag>{it.status}</Tag></span>}
                description={`${it.finding} · ${new Date(it.createdAt).toLocaleString()}`}
              />
            </List.Item>
          )}
        />
      </Content>
    </Layout>
  );
}
