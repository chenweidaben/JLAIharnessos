/** 健澜科技 jlmedaios - 会话管理（M263 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data {
  current: { user: string; sessionId: string; loginTime: string };
  expireAt: string;
  refreshToken: { status: string; rotated: boolean; nextRotatesAt: string };
}
export default function AuthSessionPage() {
  usePageTitle('会话管理');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/auth/session').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="当前会话">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="用户" span={2}><Tag color="purple">{data.current.user}</Tag></Descriptions.Item>
              <Descriptions.Item label="Session ID"><code>{data.current.sessionId}</code></Descriptions.Item>
              <Descriptions.Item label="登录时间">{data.current.loginTime}</Descriptions.Item>
              <Descriptions.Item label="过期时间" span={2}>{data.expireAt}</Descriptions.Item>
              <Descriptions.Item label="Refresh Token"><Tag color="green">{data.refreshToken.status}</Tag> {data.refreshToken.rotated ? '（已轮换）' : ''}</Descriptions.Item>
              <Descriptions.Item label="下次轮换">{data.refreshToken.nextRotatesAt}</Descriptions.Item>
            </Descriptions>
          </Card>
        ) : <Card><Empty description="暂无会话" /></Card>}
      </Spin>
    </PageContainer>
  );
}
