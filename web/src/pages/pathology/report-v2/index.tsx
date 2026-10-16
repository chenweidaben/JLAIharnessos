/**
 * 健澜科技 jlmedaios - 病理中心 V2 页（M223-C）
 *
 * 标本接收·取材固定/组织HE·细胞TCT/IHC·FISH·分子伴随诊断/术中冰冻30分钟/蜡块归档。深海蓝 VI。
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
  accessioning: { specimens: number };
  histology: { he: number };
  cytology: { tct: number };
  ihc: { stains: number };
  molecular: { fish: number; companion: number };
  frozen: { intraop: number; within30min: number };
  reporting: { blocks: number };
  management: { satisfaction: number };
  suggestions: string[];
}

export default function PathologyV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/pathology/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>病理中心 V2</Title>
        <Paragraph type="secondary">标本接收 / 组织 HE·细胞 TCT / IHC·FISH·分子伴随诊断 / 术中冰冻 30 分钟 / 蜡块归档</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="标本接收" value={data.accessioning.specimens} /></Card></Col>
              <Col span={6}><Card><Statistic title="HE 切片" value={data.histology.he} /></Card></Col>
              <Col span={6}><Card><Statistic title="IHC 染色" value={data.ihc.stains} /></Card></Col>
              <Col span={6}><Card><Statistic title="术中冰冻" value={data.frozen.intraop} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>分子病理</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'fish', name: 'FISH 检测', value: data.molecular.fish },
                  { key: 'comp', name: '伴随诊断', value: data.molecular.companion },
                  { key: 'tct', name: 'TCT 细胞学', value: data.cytology.tct },
                  { key: 'block', name: '蜡块归档', value: data.reporting.blocks },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
                  { title: '数值', dataIndex: 'value', key: 'value' },
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
