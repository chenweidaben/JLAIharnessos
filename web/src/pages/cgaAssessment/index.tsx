/**
 * 健澜科技 jlmedaios - 老年综合评估 CGA 页（M56-A）
 * 六维评分录入 + risk_level 分级 + flags 展示。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Card, Col, Layout, List, Row, Statistic, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useCgaStore } from '@/store/cgaStore';
import { FLAG_LABEL, RISK_COLOR, RISK_LABEL } from '@/utils/cga';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function CgaPage() {
  const { dbUp, items, loading, error, checkHealth, setVisit } = useCgaStore();
  usePermission();
  const visitId = new URLSearchParams(window.location.search).get('visitId') ?? '';
  useEffect(() => { void checkHealth().then(() => setVisit(visitId)); }, [checkHealth, setVisit, visitId]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>老年综合评估</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  const latest = items[0];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>老年综合评估 CGA</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        {latest && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={4}><Card><Statistic title="ADL" value={latest.adlScore} /></Card></Col>
            <Col span={4}><Card><Statistic title="IADL" value={latest.iadlScore} /></Card></Col>
            <Col span={4}><Card><Statistic title="MMSE" value={latest.mmseScore} /></Card></Col>
            <Col span={4}><Card><Statistic title="MNA" value={latest.mnaScore} /></Card></Col>
            <Col span={4}><Card><Statistic title="GDS" value={latest.gdsScore} /></Card></Col>
            <Col span={4}>
              <Card title="风险分级">
                <Tag color={RISK_COLOR[latest.riskLevel]}>{RISK_LABEL[latest.riskLevel]}</Tag>
                {latest.fallRisk ? <Tag color="red">跌倒</Tag> : null}
              </Card>
            </Col>
          </Row>
        )}
        <Card title="评估记录">
          <List
            loading={loading}
            dataSource={items}
            renderItem={(it) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <span>
                      <Tag color={RISK_COLOR[it.riskLevel]}>{RISK_LABEL[it.riskLevel]}</Tag>
                      ADL {it.adlScore} · IADL {it.iadlScore} · MMSE {it.mmseScore}
                    </span>
                  }
                  description={
                    <span>
                      MNA {it.mnaScore} · GDS {it.gdsScore}
                      {it.fallRisk ? ' · 跌倒风险' : ''}
                      {(['adl_dependent', 'cognitive_impairment', 'fall_risk', 'malnutrition', 'depression_screen'] as const)
                        .filter((f) => (it.riskLevel === 'high') && ['adl_dependent', 'cognitive_impairment', 'fall_risk', 'malnutrition', 'depression_screen'].includes(f))
                        .map((f) => <Tag key={f} color="red">{FLAG_LABEL[f]}</Tag>)}
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
