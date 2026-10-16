/**
 * 健澜科技 jlmedaios - 合理用药监测页（M188-B）
 *
 * 抗菌药物 DDDs / 分级管理 / 注射剂率 / 基本药物率 / 不合理处方清单。
 * 深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Layout,
  List,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  timeRange: string;
  antibioticsDDDs: number;
  antibioticTierRatio: { nonRestricted: number; restricted: number; special: number };
  injectionRateOutpatient: number;
  injectionRateInpatient: number;
  essentialDrugRate: number;
  adjuvantDrugRatio: number;
  irrationalPrescriptions: Array<{ drugName: string; issues: string[] }>;
  suggestions: string[];
}

export default function RationalDrugUsePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/drug/rational/report');
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
      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>合理用药 · 监测看板</Title>
        <Paragraph type="secondary">抗菌药物 DDDs / 分级管理 / 注射剂率 / 基本药物率 / 不合理处方</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}><Card><Statistic title="抗菌药物 DDDs/100人天" value={data.antibioticsDDDs} /></Card></Col>
              <Col span={4}><Card title="门诊注射剂率"><Progress percent={Math.round(data.injectionRateOutpatient * 100)} size="small" /></Card></Col>
              <Col span={4}><Card title="住院注射剂率"><Progress percent={Math.round(data.injectionRateInpatient * 100)} size="small" /></Card></Col>
              <Col span={4}><Card title="基本药物率"><Progress percent={Math.round(data.essentialDrugRate * 100)} size="small" status="active" /></Card></Col>
              <Col span={4}><Card title="辅助用药占比"><Progress percent={Math.round(data.adjuvantDrugRatio * 100)} size="small" status="exception" /></Card></Col>
              <Col span={4}><Card><Statistic title="不合理处方数" value={data.irrationalPrescriptions.length} valueStyle={{ color: '#cf1322' }} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>抗菌药物分级管理比例</Text>} style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Progress type="circle" percent={Math.round(data.antibioticTierRatio.nonRestricted * 100)} size="small" />
                  <Text>非限制级</Text>
                </Col>
                <Col span={8}>
                  <Progress type="circle" percent={Math.round(data.antibioticTierRatio.restricted * 100)} size="small" />
                  <Text>限制级</Text>
                </Col>
                <Col span={8}>
                  <Progress type="circle" percent={Math.round(data.antibioticTierRatio.special * 100)} size="small" status="exception" />
                  <Text>特殊使用级</Text>
                </Col>
              </Row>
            </Card>

            {data.irrationalPrescriptions.length > 0 && (
              <Card title={<Text strong style={{ color: VI.deep }}>不合理处方清单</Text>} style={{ marginBottom: 16 }}>
                <Table
                  rowKey="drugName"
                  size="small"
                  pagination={false}
                  dataSource={data.irrationalPrescriptions}
                  columns={[
                    { title: '药品', dataIndex: 'drugName', key: 'drugName' },
                    {
                      title: '问题',
                      dataIndex: 'issues',
                      key: 'issues',
                      render: (issues: string[]) => (
                        <List
                          size="small"
                          dataSource={issues}
                          renderItem={(i) => <List.Item><Tag color="red">{i}</Tag></List.Item>}
                        />
                      ),
                    },
                  ]}
                />
              </Card>
            )}

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
