/**
 * 健澜科技 jlmedaios - 信息化页（M213-C）
 *
 * 基础设施/应用矩阵/数据中心/等保三级/ITIL运维/集成平台/移动化/三年规划。深海蓝 VI。
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
  infrastructure: { servers: number; bandwidth: number };
  applications: { his: boolean; emr: boolean; lIS: boolean; pacs: boolean };
  dataCenter: { cdr: number; odr: number; warehouse: boolean };
  security: { mlps3: boolean; firewall: number };
  itOps: { incidents: number; changes: number };
  integration: { esb: boolean };
  mobile: { apps: number };
  plan: { threeYear: boolean };
  suggestions: string[];
}

export default function InformatizationPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/informatization/report');
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
        <Title level={3} style={{ color: VI.deep }}>医院信息化建设</Title>
        <Paragraph type="secondary">基础设施 / 应用系统矩阵 / CDR·ODR / 等保三级 / ITIL 运维 / 集成平台</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="服务器" value={data.infrastructure.servers} /></Card></Col>
              <Col span={6}><Card><Statistic title="带宽（Mbps）" value={data.infrastructure.bandwidth} /></Card></Col>
              <Col span={6}><Card><Statistic title="等保三级" value={data.security.mlps3 ? '已过' : '未过'} /></Card></Col>
              <Col span={6}><Card><Statistic title="移动应用" value={data.mobile.apps} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>应用系统矩阵</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'his', name: 'HIS', value: data.applications.his ? '已上线' : '未上线' },
                  { key: 'emr', name: 'EMR', value: data.applications.emr ? '已上线' : '未上线' },
                  { key: 'lis', name: 'LIS', value: data.applications.lIS ? '已上线' : '未上线' },
                  { key: 'pacs', name: 'PACS', value: data.applications.pacs ? '已上线' : '未上线' },
                ]}
                columns={[
                  { title: '系统', dataIndex: 'name', key: 'name' },
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
