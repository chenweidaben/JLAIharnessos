/**
 * 健澜科技 jlmedaios - STOP-BANG 筛查页（M59-A）
 * 8 项 0/1 勾选 + 总分 + risk_level。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Layout, List, Statistic, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useStopbangStore } from '@/store/stopbangStore';
import { ITEMS, RISK_COLOR, RISK_LABEL } from '@/utils/stopbang';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function StopbangPage() {
  const { dbUp, items, loading, error, checkHealth, setVisit, assess } = useStopbangStore();
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  usePermission();
  const visitId = new URLSearchParams(window.location.search).get('visitId') ?? '';
  useEffect(() => { void checkHealth().then(() => setVisit(visitId)); }, [checkHealth, setVisit, visitId]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>STOP-BANG筛查</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>STOP-BANG 睡眠呼吸暂停筛查</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card title="8 项勾选" style={{ marginBottom: 16 }}>
          {ITEMS.map((it) => (
            <Checkbox
              key={it.key}
              checked={Boolean(flags[it.key])}
              onChange={(e) => setFlags((f) => ({ ...f, [it.key]: e.target.checked }))}
              style={{ display: 'block', marginBottom: 8 }}
            >
              {it.label}
            </Checkbox>
          ))}
          <Button type="primary" onClick={() => assess(flags)}>提交筛查</Button>
        </Card>
        {items[0] && (
          <Card title="最新筛查">
            <Statistic title="总分" value={items[0].score} suffix="/8" />
            <Tag color={RISK_COLOR[items[0].riskLevel]}>{RISK_LABEL[items[0].riskLevel]}</Tag>
            {items[0].riskLevel === 'high' && <Tag color="red">建议睡眠监测</Tag>}
          </Card>
        )}
        <Card title="历史" style={{ marginTop: 16 }}>
          <List
            loading={loading}
            dataSource={items}
            renderItem={(it) => (
              <List.Item>
                <span>{it.createdAt.slice(0, 10)} · {it.score}/8</span>
                <Tag color={RISK_COLOR[it.riskLevel]}>{RISK_LABEL[it.riskLevel]}</Tag>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
