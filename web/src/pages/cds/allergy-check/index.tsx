/** 健澜科技 jlmedaios - 过敏药物审查（M276 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { triggered: boolean; level: string; message: string; allergy: string; drug: string; recommendation: string; patientId: string }
export default function CdsAllergyCheckPage() {
  usePageTitle('过敏药物审查');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/cds/allergy-check').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="过敏药物审查">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card>
            {data.triggered && <Alert type="error" showIcon message={data.message} style={{ marginBottom: 16 }} />}
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="患者 ID"><Tag color="purple">{data.patientId}</Tag></Descriptions.Item>
              <Descriptions.Item label="过敏原"><Tag color="red">{data.allergy}</Tag></Descriptions.Item>
              <Descriptions.Item label="冲突药物"><Tag color="red">{data.drug}</Tag></Descriptions.Item>
              <Descriptions.Item label="等级"><Tag color={data.level}>{data.level}</Tag></Descriptions.Item>
              <Descriptions.Item label="建议">{data.recommendation}</Descriptions.Item>
            </Descriptions>
          </Card>
        ) : <Card><Empty description="暂无审查" /></Card>}
      </Spin>
    </PageContainer>
  );
}
