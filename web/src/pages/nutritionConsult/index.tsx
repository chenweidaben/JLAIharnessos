/**
 * 健澜科技 jlmedaios - 营养科会诊页（M58-A）
 * 会诊记录 / 方案分级 / 随访。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Layout, List, Statistic, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useNutritionStore } from '@/store/nutritionConsultStore';
import { STATUS_LABEL, TIER_COLOR, TIER_LABEL } from '@/utils/nutritionConsult';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function NutritionConsultPage() {
  const { dbUp, items, loading, error, checkHealth, setVisit, followup } = useNutritionStore();
  usePermission();
  const visitId = new URLSearchParams(window.location.search).get('visitId') ?? '';
  useEffect(() => { void checkHealth().then(() => setVisit(visitId)); }, [checkHealth, setVisit, visitId]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>营养科会诊</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>营养科会诊执行</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card title="会诊记录" style={{ marginBottom: 16 }}>
          <List
            loading={loading}
            dataSource={items}
            renderItem={(it) => (
              <List.Item
                actions={it.status === 'consulted'
                  ? [<Button key="fu" size="small" onClick={() => followup(it.id)}>记录随访</Button>]
                  : []}
              >
                <List.Item.Meta
                  title={
                    <span>
                      <Tag color={TIER_COLOR[it.caloriesPerDay < 1500 ? 'low' : it.caloriesPerDay > 2500 ? 'high' : 'normal']}>
                        {TIER_LABEL[it.caloriesPerDay < 1500 ? 'low' : it.caloriesPerDay > 2500 ? 'high' : 'normal']}
                      </Tag>
                      {STATUS_LABEL[it.status]}
                      {it.needsFollowup ? <Tag color="orange">随访到期</Tag> : null}
                    </span>
                  }
                  description={
                    <span>
                      {it.nutritionDiagnosis} · {it.plan} · {it.caloriesPerDay} kcal/日
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
        {items[0] && (
          <Card title="最新方案">
            <Statistic title="每日能量" value={items[0].caloriesPerDay} suffix="kcal" />
            <Statistic title="随访间隔" value={items[0].followupDays} suffix="天" />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
