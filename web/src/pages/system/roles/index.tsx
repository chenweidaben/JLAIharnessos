/** 健澜科技 jlmedaios - 角色权限（M223 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, List, Row, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface RoleRow { id: string; name: string; permissionCount: number; userCount: number; description: string }
export default function SystemRolesPage() {
  usePageTitle('角色权限');
  const [list, setList] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/system/roles').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.roles ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="角色权限">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Row gutter={16}>
          {list.map((r) => (
            <Col span={8} key={r.id}>
              <Card title={<strong>{r.name}</strong>} style={{ marginBottom: 16 }}>
                <List size="small">
                  <List.Item><span style={{ flex: 1 }}>权限数</span><Tag color="blue">{r.permissionCount}</Tag></List.Item>
                  <List.Item><span style={{ flex: 1 }}>用户数</span><Tag color="green">{r.userCount}</Tag></List.Item>
                  <List.Item><span className="ant-typography-secondary">{r.description}</span></List.Item>
                </List>
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>
    </PageContainer>
  );
}
