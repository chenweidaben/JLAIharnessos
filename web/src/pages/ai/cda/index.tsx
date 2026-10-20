/**
 * 健澜科技 jlmedaios - AI 病历书写辅助（M222 对接真实 API）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, List, Row, Spin, Tag, Typography } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

const { Paragraph, Text } = Typography;

interface CdaResponse {
  input: { chiefComplaint: string; presentIllness: string };
  diagnosis: { primary: string; differential: string[] };
  medication: string[];
  timestamp: string;
}

export default function AiCdaSuggestPage() {
  usePageTitle('AI 病历书写辅助');
  const [data, setData] = useState<CdaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/v1/ai/cda/suggest')
      .then((r) => r.json())
      .then((j) => {
        if (alive) setData(j.data as CdaResponse);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <PageContainer title="AI 病历书写辅助">
        <Spin spinning={loading}>
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
          {data && (
            <Row gutter={16}>
              <Col span={12}>
                <Card title="主诉与现病史" style={{ marginBottom: 16 }}>
                  <Paragraph><Text strong>主诉：</Text>{data.input.chiefComplaint}</Paragraph>
                  <Paragraph type="secondary">{data.input.presentIllness}</Paragraph>
                </Card>
                <Card title="诊断建议">
                  <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                    {data.diagnosis.primary}
                  </Tag>
                  <div style={{ marginTop: 12 }}>
                    <Text strong>鉴别诊断：</Text>
                    {data.diagnosis.differential.map((d) => (
                      <Tag key={d} style={{ margin: '4px 4px 0 0' }}>{d}</Tag>
                    ))}
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="用药建议（医嘱草稿）">
                  <List
                    size="small"
                    dataSource={data.medication}
                    renderItem={(item) => <List.Item><Text code>{item}</Text></List.Item>}
                  />
                </Card>
              </Col>
            </Row>
          )}
        </Spin>
    </PageContainer>
  );
}
