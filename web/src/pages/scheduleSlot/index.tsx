/**
 * 健澜科技 jlmedaios - 号源排班选号屏（M19-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Layout, List, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useScheduleSlotStore } from '@/store/scheduleSlotStore';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function ScheduleSlotPage() {
  const { dbUp, slots, loading, error, checkHealth, load } = useScheduleSlotStore();
  usePermission();

  useEffect(() => { void checkHealth().then(() => load()); }, [checkHealth, load]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>号源排班</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}>
          <Alert type="error" showIcon message="数据库连接异常" />
        </Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>分时段预约选号</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <List
          loading={loading}
          dataSource={slots}
          renderItem={(s) => (
            <List.Item
              actions={[
                s.available
                  ? <Button size="small" type="primary">约号</Button>
                  : <Tag color="red">号满</Tag>,
              ]}
            >
              <List.Item.Meta
                title={`${new Date(s.slotStart).toLocaleString()} ~ ${new Date(s.slotEnd).toLocaleTimeString()}`}
                description={`余号 ${s.remaining}/${s.totalQuota}`}
              />
            </List.Item>
          )}
        />
      </Content>
    </Layout>
  );
}
