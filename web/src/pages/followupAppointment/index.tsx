/**
 * 健澜科技 jlmedaios - 复诊号源预约页（M62-A）
 * 出院计划卡片 -> 推荐号源列表 -> 一键预约。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Layout, List, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useFollowupStore } from '@/store/followupApptStore';
import { STATUS_COLOR, STATUS_LABEL } from '@/utils/followupAppt';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function FollowupAppointmentPage() {
  const { dbUp, options, suggested, items, loading, error, checkHealth, setVisit, book, cancel } = useFollowupStore();
  usePermission();
  const qs = new URLSearchParams(window.location.search);
  const visitId = qs.get('visitId') ?? '';
  const planId = qs.get('planId') ?? '';
  useEffect(() => { void checkHealth().then(() => setVisit(visitId, planId)); }, [checkHealth, setVisit, visitId, planId]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>复诊预约</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>复诊号源预约</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card title="推荐号源" style={{ marginBottom: 16 }}>
          <List
            loading={loading}
            dataSource={options}
            locale={{ emptyText: '暂无可用号源' }}
            renderItem={(opt) => (
              <List.Item
                extra={<Button size="small" type={suggested?.scheduleId === opt.scheduleId ? 'primary' : 'default'} onClick={() => book(opt)}>预约</Button>}
              >
                <span>{opt.appointmentDate} · {opt.department} · 余 {opt.remaining}</span>
                {suggested?.scheduleId === opt.scheduleId && <Tag color="blue">推荐</Tag>}
              </List.Item>
            )}
          />
        </Card>
        <Card title="我的复诊预约">
          <List
            dataSource={items}
            renderItem={(it) => (
              <List.Item
                actions={it.status === 'booked'
                  ? [<Button key="c" size="small" onClick={() => cancel(it.id)}>取消</Button>]
                  : []}
              >
                <span>
                  {it.appointmentDate} · {it.department}
                  <Tag color={STATUS_COLOR[it.status]}>{STATUS_LABEL[it.status]}</Tag>
                </span>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
