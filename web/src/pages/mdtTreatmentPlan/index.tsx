/**
 * 健澜科技 jlmedaios - MDT 治疗方案页（M67-A）
 * 方案草稿卡片 + 确认按钮 + 排程。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Layout, List, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useTreatmentPlanStore } from '@/store/mdtTreatmentPlanStore';
import { PLAN_STATUS_COLOR, PLAN_STATUS_LABEL, PLAN_TYPE_LABEL } from '@/utils/mdtTreatmentPlan';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function MdtTreatmentPlanPage() {
  const { dbUp, items, loading, error, checkHealth, setVisit, create, confirm } = useTreatmentPlanStore();
  const [consultId, setConsultId] = useState('');
  usePermission();
  const qs = new URLSearchParams(window.location.search);
  const visitId = qs.get('visitId') ?? '';
  useEffect(() => { void checkHealth().then(() => setVisit(visitId)); }, [checkHealth, setVisit, visitId]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>MDT 治疗方案</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>MDT 结论转治疗方案</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card title="生成方案草稿" style={{ marginBottom: 16 }}>
          <input placeholder="MDT 会诊 ID" value={consultId} onChange={(e) => setConsultId(e.target.value)} style={{ marginBottom: 8, width: '100%' }} />
          <Button type="primary" loading={loading} onClick={() => create({ mdtConsultId: consultId, departments: [], conclusion: '综合治疗' })}>生成草稿</Button>
        </Card>
        <Card title="治疗方案">
          <List
            loading={loading}
            dataSource={items}
            renderItem={(it) => (
              <List.Item
                actions={it.status === 'draft'
                  ? [<Button key="c" size="small" type="primary" onClick={() => confirm(it.id, new Date().toISOString())}>确认+排程</Button>]
                  : []}
              >
                <span>
                  <Tag color="blue">{PLAN_TYPE_LABEL[it.planType]}</Tag>
                  <Tag color={PLAN_STATUS_COLOR[it.status]}>{PLAN_STATUS_LABEL[it.status]}</Tag>
                  <span style={{ marginLeft: 8 }}>{it.draft}</span>
                </span>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
