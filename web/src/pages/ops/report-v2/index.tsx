/**
 * 健澜科技 jlmedaios - 运维管理 V2 页（M227-D）
 *
 * 服务器·存储·网络·UPS/HIS·EMR·中间件·数据库/Prometheus·Grafana·APM链路/变更·事件·问题·CMDB·SLA工单。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  timeRange: string;
  infrastructure: { servers: number; storage: number; network: boolean; ups: boolean };
  systems: { his: boolean; emr: boolean; middleware: number; database: number };
  monitoring: { prometheus: boolean; grafana: boolean; apm: number };
  change: { requests: number };
  incident: { total: number; critical: number };
  problem: { rootCaused: number };
  cmdb: { items: number };
  serviceDesk: { tickets: number; sla: number };
  suggestions: string[];
}

export default function OpsV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/ops/report-v2');
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>运维管理 V2</Title>
        <Paragraph type="secondary">服务器·存储·网络·UPS / HIS·EMR·中间件·数据库 / Prometheus·Grafana·APM / 变更·事件·问题·CMDB·SLA</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="服务器" value={data.infrastructure.servers} /></Card></Col>
              <Col span={6}><Card><Statistic title="数据库" value={data.systems.database} /></Card></Col>
              <Col span={6}><Card><Statistic title="事件工单" value={data.incident.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="SLA 达成率" value={`${data.serviceDesk.sla}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>监控与运维体系</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'prom', name: 'Prometheus', value: data.monitoring.prometheus ? '已部署' : '未部署' },
                  { key: 'grafana', name: 'Grafana', value: data.monitoring.grafana ? '已部署' : '未部署' },
                  { key: 'apm', name: 'APM 链路数', value: data.monitoring.apm },
                  { key: 'cmdb', name: 'CMDB 配置项', value: data.cmdb.items },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
                  { title: '状态', dataIndex: 'value', key: 'value' },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
