/**
 * 健澜科技 jlmedaios - 病案 V3 页（M205-B）
 *
 * 病案回收/ICD编码/质量/复印/DRG分组。深海蓝 VI。
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
  retrieval: { total: number; retrieved: number; onTimeRate: number; missingRate: number };
  coding: { icd10Accuracy: number; icd9Cm3Accuracy: number };
  quality: { gradeA: number; gradeB: number; gradeC: number; defectRate: number };
  copying: { requests: number; fulfilled: number };
  storage: { digitalRate: number; disasterRecovery: boolean };
  statistics: { reports: number };
  drgDip: { groupingRate: number; mainDxSelectionRate: number };
  utilization: { researchUse: number; legalUse: number };
  suggestions: string[];
}

export default function MedicalRecordV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/medical-record/report-v3');
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
        <Title level={3} style={{ color: VI.deep }}>病案管理与统计 V2 深化</Title>
        <Paragraph type="secondary">病案回收 / ICD-10·ICD-9-CM-3 编码 / 甲乙丙级 / 复印 / DRG-DIP 分组</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="病案总数" value={data.retrieval.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="甲级病案" value={data.quality.gradeA} /></Card></Col>
              <Col span={6}><Card><Statistic title="ICD-10 准确率" value={`${(data.coding.icd10Accuracy * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="DRG 入组率" value={`${(data.drgDip.groupingRate * 100).toFixed(0)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>病案质量分布</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'a', name: '甲级', value: data.quality.gradeA },
                  { key: 'b', name: '乙级', value: data.quality.gradeB },
                  { key: 'c', name: '丙级', value: data.quality.gradeC },
                ]}
                columns={[
                  { title: '等级', dataIndex: 'name', key: 'name' },
                  { title: '份数', dataIndex: 'value', key: 'value' },
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
