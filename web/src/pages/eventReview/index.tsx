/**
 * 健澜科技 jlmedaios - 不良事件后结构化评估工作站（M17-D）
 *
 * 健康门禁：db!=='up' 显式红 Alert + 水印，不渲染业务数据。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Card, Layout, List, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useEventReviewStore } from '@/store/eventReviewStore';
import { eventTypeLabel, riskLevelLabel } from '@/utils/eventReview';
import type { EventType } from '@/types/eventReview';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function EventReviewPage() {
  const { dbUp, health, events, reviews, metrics, loading, error, checkHealth, load } = useEventReviewStore();
  usePermission();

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);
  useEffect(() => {
    if (dbUp === true) void load();
  }, [dbUp, load]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>不良事件评估</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}>
          <Alert type="error" showIcon message="数据库连接异常" description={error || `db=${health?.db ?? '?'}`} />
        </Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>不良事件后结构化评估闭环</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Tabs
          defaultActiveKey="events"
          items={[
            {
              key: 'events',
              label: '不良事件',
              children: (
                <Table
                  rowKey="id"
                  loading={loading}
                  dataSource={events}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: '类型', dataIndex: 'eventType', render: (t: EventType) => <Tag>{eventTypeLabel(t)}</Tag> },
                    { title: '描述', dataIndex: 'description', render: (v) => v || '—' },
                    { title: '发生时间', dataIndex: 'occurredAt', render: (v) => new Date(v).toLocaleString() },
                  ]}
                />
              ),
            },
            {
              key: 'reviews',
              label: '结构化评估',
              children: (
                <List
                  loading={loading}
                  dataSource={reviews}
                  renderItem={(r) => (
                    <List.Item>
                      <List.Item.Meta
                        title={`发生地点：${r.location || '—'}`}
                        description={
                          <span>
                            经过：{r.circumstances || '—'}；伤情：{r.injuries || '—'}；
                            家属告知：{r.familyNotified ? '是' : '否'}；
                            风险复评：{riskLevelLabel(r.riskRescoreLevel)}
                          </span>
                        }
                      />
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: 'metric',
              label: 'NQI 指标',
              children: metrics && (
                <Card>
                  <Statistic title="压疮发生率 (%)" value={metrics.metrics.pressureInjuryRate} precision={2} suffix="%" />
                  <Statistic title="跌倒发生率 (%)" value={metrics.metrics.fallRate} precision={2} suffix="%" style={{ marginTop: 16 }} />
                  <p style={{ marginTop: 12 }}>
                    在院就诊数（分母）= {metrics.inpatientVisits}；
                    压疮分子={metrics.metrics.fractions.pressureInjury.numerator}；
                    跌倒分子={metrics.metrics.fractions.fall.numerator}
                  </p>
                </Card>
              ),
            },
          ]}
        />
      </Content>
    </Layout>
  );
}
