/**
 * 健澜科技 jlmedaios - 康复治疗执行页（M51-A）
 * 治疗单列表、签到按钮、疗效评定。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Layout, List, Select, Space, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useRehabStore } from '@/store/rehabTreatmentStore';
import { EFFICACY_LABEL, MODALITY_LABEL, STATUS_COLOR, STATUS_LABEL } from '@/utils/rehabTreatment';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function RehabTreatmentPage() {
  const { dbUp, items, loading, error, checkHealth, setVisit, sign, complete } = useRehabStore();
  usePermission();
  const visitId = new URLSearchParams(window.location.search).get('visitId') ?? '';
  useEffect(() => { void checkHealth().then(() => setVisit(visitId)); }, [checkHealth, setVisit, visitId]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>康复治疗</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>康复治疗执行</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card title="治疗单列表">
          <List
            loading={loading}
            dataSource={items}
            renderItem={(it) => (
              <List.Item
                actions={[
                  it.status === 'prescribed'
                    ? <Button size="small" type="primary" onClick={() => void sign(it.id)}>签到执行</Button>
                    : null,
                  it.status === 'signed'
                    ? (
                      <Select
                        size="small"
                        placeholder="填疗效完成"
                        style={{ width: 110 }}
                        onChange={(v: string) => void complete(it.id, v)}
                        options={Object.entries(EFFICACY_LABEL).map(([value, label]) => ({ value, label }))}
                      />
                    )
                    : null,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{MODALITY_LABEL[it.modality] ?? it.modality}</span>
                      <Tag color={STATUS_COLOR[it.status]}>{STATUS_LABEL[it.status]}</Tag>
                    </Space>
                  }
                  description={
                    <span>
                      计划 {it.scheduledDate}
                      {it.efficacy ? ` · 疗效 ${EFFICACY_LABEL[it.efficacy]}` : ''}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
