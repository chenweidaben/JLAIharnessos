/** 健澜科技 jlmedaios - 电子签名验证（M265 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { signatureId: string; mrn: string; signer: string; certInfo: string; timestamp: string; hash: string }
export default function EmrSignaturePage() {
  usePageTitle('电子签名验证');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emr/signature').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="电子签名验证">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="签名 ID"><Tag color="purple">{data.signatureId}</Tag></Descriptions.Item>
              <Descriptions.Item label="病历号">{data.mrn}</Descriptions.Item>
              <Descriptions.Item label="签名人">{data.signer}</Descriptions.Item>
              <Descriptions.Item label="证书信息">{data.certInfo}</Descriptions.Item>
              <Descriptions.Item label="时间戳">{data.timestamp}</Descriptions.Item>
              <Descriptions.Item label="内容哈希"><code style={{ fontSize: 12 }}>{data.hash}</code></Descriptions.Item>
            </Descriptions>
          </Card>
        ) : <Card><Empty description="暂无签名" /></Card>}
      </Spin>
    </PageContainer>
  );
}
