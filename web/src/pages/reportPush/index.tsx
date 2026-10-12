/**
 * 健澜科技 jlmedaios - 我的报告推送屏（M19-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Badge, Layout, List, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useReportPushStore } from '@/store/reportPushStore';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function ReportPushPage() {
  const { dbUp, items, unread, loading, error, checkHealth, load, view } = useReportPushStore();
  usePermission();
  useEffect(() => { void checkHealth().then(() => load('')); }, [checkHealth, load]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>我的报告</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>我的报告 <Badge count={unread} /></Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <List
          loading={loading}
          dataSource={items}
          renderItem={(it) => (
            <List.Item onClick={() => { if (it.status === 'pushed') void view(it.id, ''); }} style={{ cursor: it.status === 'pushed' ? 'pointer' : 'default' }}>
              <List.Item.Meta
                title={<span>{it.reportType === 'lab' ? '检验报告' : '影像报告'} {it.status === 'pushed' ? <Tag color="red">未读</Tag> : <Tag color="green">已读×{it.viewCount}</Tag>}</span>}
                description={new Date(it.pushedAt).toLocaleString()}
              />
            </List.Item>
          )}
        />
      </Content>
    </Layout>
  );
}
