/**
 * 健澜科技 jlmedaios - 整改升级链屏（M22-F）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Input, Layout, List, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useEscalationStore } from '@/store/escalationStore';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function EscalationPage() {
  const { dbUp, chain, loading, error, checkHealth, loadChain } = useEscalationStore();
  usePermission();
  const [taskId, setTaskId] = useState('');
  useEffect(() => { void checkHealth(); }, [checkHealth]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>升级链</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>整改升级链</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Input placeholder="根整改单 taskId" style={{ marginBottom: 8, maxWidth: 500 }} value={taskId} onChange={(e) => setTaskId(e.target.value)} />
        <Button type="primary" loading={loading} onClick={() => { void loadChain(taskId); }}>查升级链</Button>
        <List
          style={{ marginTop: 16 }}
          loading={loading}
          dataSource={chain}
          renderItem={(it) => (
            <List.Item>
              <List.Item.Meta
                title={<span>{it.title} <Tag color="purple">L{it.escalationLevel}</Tag> {it.title.startsWith('[ESC]') ? <Tag color="red">[升级]</Tag> : null}</span>}
                description={`状态 ${it.status} · 负责 ${it.assigneeId.slice(0, 8)}`}
              />
            </List.Item>
          )}
        />
      </Content>
    </Layout>
  );
}
