/**
 * 健澜科技 jlmedaios - 管路护理工作站（M17-C）
 *
 * 健康门禁：db!=='up' 显式红 Alert + 水印，不渲染业务数据。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Card, Layout, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useTubeCareStore } from '@/store/tubeCareStore';
import {
  isHighRiskTube, removalTypeLabel, tubeStatusLabel, tubeTypeLabel,
} from '@/utils/tubeCare';
import type { TubeType } from '@/types/tubeCare';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function TubeCarePage() {
  const { dbUp, health, tubes, metrics, loading, error, checkHealth, loadTubes, loadMetrics } = useTubeCareStore();
  usePermission();

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);
  useEffect(() => {
    if (dbUp === true) {
      void loadTubes();
      void loadMetrics();
    }
  }, [dbUp, loadTubes, loadMetrics]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>管路护理</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}>
          <Alert type="error" showIcon message="数据库连接异常" description={error || `db=${health?.db ?? '?'}`} />
        </Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>管路护理 · 非计划拔管闭环</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Tabs
          defaultActiveKey="list"
          items={[
            {
              key: 'list',
              label: '在院管路清单',
              children: (
                <Table
                  rowKey="id"
                  loading={loading}
                  dataSource={tubes}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: '类型', dataIndex: 'tubeType', render: (t: TubeType) => <span>{tubeTypeLabel(t)} {isHighRiskTube(t) && <Tag color="red">高危</Tag>}</span> },
                    { title: '部位', dataIndex: 'site', render: (v) => v || '—' },
                    { title: '置入时间', dataIndex: 'insertedAt', render: (v) => new Date(v).toLocaleString() },
                    { title: '状态', dataIndex: 'status', render: (s) => <Tag color={s === 'in_place' ? 'green' : 'default'}>{tubeStatusLabel(s)}</Tag> },
                    { title: '拔管分类', dataIndex: 'removalType', render: (r) => removalTypeLabel(r) },
                  ]}
                />
              ),
            },
            {
              key: 'metric',
              label: '非计划拔管率',
              children: metrics && (
                <Card>
                  <Statistic title="非计划拔管率 (%)" value={metrics.metrics.rate} precision={2} suffix="%" />
                  <p style={{ marginTop: 12 }}>
                    分子(非计划拔管例数) = {metrics.metrics.fractions.rate.numerator}；
                    分母(留置管路患者数) = {metrics.metrics.fractions.rate.denominator}
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
