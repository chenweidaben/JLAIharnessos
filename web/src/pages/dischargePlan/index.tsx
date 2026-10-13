/**
 * 健澜科技 jlmedaios - 出院计划页（M61-A）
 * 出院计划表单 + 推送按钮 + 复诊建议。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Layout, List, Statistic, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useDischargeStore } from '@/store/dischargePlanStore';
import { STATUS_COLOR, STATUS_LABEL } from '@/utils/dischargePlan';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function DischargePlanPage() {
  const { dbUp, items, suggestedDate, loading, error, checkHealth, setVisit, create, push } = useDischargeStore();
  const [meds, setMeds] = useState('');
  usePermission();
  const visitId = new URLSearchParams(window.location.search).get('visitId') ?? '';
  useEffect(() => { void checkHealth().then(() => setVisit(visitId)); }, [checkHealth, setVisit, visitId]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>出院计划</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>出院计划与随访</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card title="生成出院计划" style={{ marginBottom: 16 }}>
          <input
            placeholder="用药摘要（如 二甲双胍 0.5g bid）"
            value={meds}
            onChange={(e) => setMeds(e.target.value)}
            style={{ width: '100%', marginBottom: 12, padding: 8 }}
          />
          <Button type="primary" onClick={() => create({ medicationSummary: meds })}>生成计划</Button>
          {suggestedDate && <Tag color="blue" style={{ marginLeft: 12 }}>建议复诊 {suggestedDate}</Tag>}
        </Card>
        <Card title="出院计划">
          <List
            loading={loading}
            dataSource={items}
            renderItem={(it) => (
              <List.Item
                actions={it.status === 'planned'
                  ? [<Button key="p" size="small" type="primary" onClick={() => push(it.id)}>推送患者端</Button>]
                  : []}
              >
                <List.Item.Meta
                  title={
                    <span>
                      <Tag color={STATUS_COLOR[it.status]}>{STATUS_LABEL[it.status]}</Tag>
                      复诊 {it.followupDate} · {it.followupDepartment}
                    </span>
                  }
                  description={
                    <span>
                      用药：{it.medicationSummary}
                      <br />
                      指导：{it.dischargeGuidance}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
        {items[0] && (
          <Card title="最新计划" style={{ marginTop: 16 }}>
            <Statistic title="复诊日期" value={items[0].followupDate} />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
