/**
 * 健澜科技 jlmedaios - 数据治理 V2 页（M227-B）
 *
 * 数据标准·六维质量/分类分级·脱敏加密/ODS·DW·数据湖·资产目录/数据Owner·数据API大屏。深海蓝 VI。
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
  standards: { defined: number };
  quality: { dimensions: number };
  security: { classified: number; masked: boolean };
  architecture: { ods: boolean; dw: boolean; lake: boolean };
  asset: { catalog: number };
  lifecycle: { archived: number };
  org: { owner: number };
  service: { api: number; dashboard: number };
  suggestions: string[];
}

export default function DataGovernanceV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/data-governance/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>数据治理 V2</Title>
        <Paragraph type="secondary">数据标准·六维质量 / 分类分级·脱敏加密 / ODS·DW·数据湖·资产目录 / 数据 Owner·API 大屏</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="数据标准" value={data.standards.defined} /></Card></Col>
              <Col span={6}><Card><Statistic title="已分类分级" value={data.security.classified} /></Card></Col>
              <Col span={6}><Card><Statistic title="资产目录" value={data.asset.catalog} /></Card></Col>
              <Col span={6}><Card><Statistic title="数据 Owner" value={data.org.owner} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>数据架构与服务</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'ods', name: 'ODS 贴源层', value: data.architecture.ods ? '已建' : '未建' },
                  { key: 'dw', name: 'DW 数仓', value: data.architecture.dw ? '已建' : '未建' },
                  { key: 'lake', name: '数据湖', value: data.architecture.lake ? '已建' : '未建' },
                  { key: 'api', name: '数据 API', value: data.service.api },
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
