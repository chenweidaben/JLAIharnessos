/**
 * 健澜科技 jlmedaios - 满意度提醒页（M64-A）
 * 患者待填问卷入口卡片 + 管理员触发扫描按钮。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Layout, List, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useReminderStore } from '@/store/satisfactionReminderStore';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function SatisfactionReminderPage() {
  const { dbUp, items, loading, error, checkHealth, loadPending, scan } = useReminderStore();
  usePermission();
  useEffect(() => { void checkHealth().then(() => loadPending()); }, [checkHealth, loadPending]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>满意度提醒</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>待填满意度问卷</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card
          title="我的待填问卷"
          extra={<Button size="small" onClick={() => scan()}>触发扫描推送</Button>}
        >
          <List
            loading={loading}
            dataSource={items}
            locale={{ emptyText: '暂无待填问卷通知' }}
            renderItem={(it) => <List.Item><span>{it.title}：{it.body}</span></List.Item>}
          />
        </Card>
      </Content>
    </Layout>
  );
}
