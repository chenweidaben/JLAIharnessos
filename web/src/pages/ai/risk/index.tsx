/** 健澜科技 jlmedaios - AI 风险预测（M222 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, List, Progress, Row, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface PatientRisk { patient: string; fallRisk: { score: number; level: 'low' | 'medium' | 'high' }; pressureUlcer: { score: number; level: 'low' | 'medium' | 'high' }; readmission: { score: number; level: 'low' | 'medium' | 'high' } }
const colorMap = { low: 'green', medium: 'orange', high: 'red' } as const;
export default function AiRiskPredictionPage() {
  usePageTitle('AI 风险预测');
  const [list, setList] = useState<PatientRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/ai/risk/prediction').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.predictions ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="AI 风险预测">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Row gutter={16}>
          {list.map((p) => (
            <Col span={8} key={p.patient}>
              <Card title={<strong>{p.patient}</strong>} style={{ marginBottom: 16 }}>
                <List size="small">
                  <List.Item><span style={{ flex: 1 }}>跌倒风险</span><Progress percent={p.fallRisk.score} size="small" style={{ width: 100 }} /><Tag color={colorMap[p.fallRisk.level]} style={{ marginLeft: 8 }}>{p.fallRisk.level}</Tag></List.Item>
                  <List.Item><span style={{ flex: 1 }}>压疮风险</span><Progress percent={p.pressureUlcer.score} size="small" style={{ width: 100 }} /><Tag color={colorMap[p.pressureUlcer.level]} style={{ marginLeft: 8 }}>{p.pressureUlcer.level}</Tag></List.Item>
                  <List.Item><span style={{ flex: 1 }}>再入院风险</span><Progress percent={p.readmission.score} size="small" style={{ width: 100 }} /><Tag color={colorMap[p.readmission.level]} style={{ marginLeft: 8 }}>{p.readmission.level}</Tag></List.Item>
                </List>
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>
    </PageContainer>
  );
}
