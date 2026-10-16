/**
 * 健澜科技 jlmedaios - 病案管理 V2 页（M225-D）
 *
 * 病案回收·整理·归档/ICD-10·ICD-9-CM-3编码/运行终末质控·甲级率/病案复印·数字化·统计。深海蓝 VI。
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
  retrieval: { collected: number };
  filing: { archived: number };
  coding: { icd10: number; icd9: number };
  quality: { running: number; terminal: number; gradeA: number };
  copy: { requests: number };
  statistics: { reports: number };
  digitization: { scanned: number };
  management: { satisfaction: number };
  suggestions: string[];
}

export default function MedRecordMgmtV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/medical-record/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>病案管理 V2</Title>
        <Paragraph type="secondary">病案回收·整理·归档 / ICD-10·ICD-9-CM-3 编码 / 运行终末质控·甲级率 / 病案复印·数字化·统计</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="回收病案" value={data.retrieval.collected} /></Card></Col>
              <Col span={6}><Card><Statistic title="归档病案" value={data.filing.archived} /></Card></Col>
              <Col span={6}><Card><Statistic title="甲级病案" value={`${Math.round((data.quality.gradeA / data.quality.terminal) * 100)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="数字化扫描" value={data.digitization.scanned} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>编码与质控明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'icd10', name: 'ICD-10 编码', value: data.coding.icd10 },
                  { key: 'icd9', name: 'ICD-9-CM-3 编码', value: data.coding.icd9 },
                  { key: 'running', name: '运行质控', value: data.quality.running },
                  { key: 'copy', name: '病案复印', value: data.copy.requests },
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
