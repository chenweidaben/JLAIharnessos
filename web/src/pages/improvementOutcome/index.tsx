/**
 * 健澜科技 jlmedaios - 整改效果回看屏（M22-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Layout, Spin, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useOutcomeStore } from '@/store/improvementOutcomeStore';
import { evaluate } from '@/services/api/improvementOutcome';

const { Header, Content } = Layout;
const { Title } = Typography;

const VERDICT_COLOR: Record<string, string> = { effective: 'green', partial: 'blue', no_improvement: 'orange', worse: 'red', pending: 'default' };

export default function ImprovementOutcomePage() {
  const { dbUp, review, loading, error, checkHealth, load } = useOutcomeStore();
  usePermission();
  const [taskId, setTaskId] = useState('');
  useEffect(() => { void checkHealth(); }, [checkHealth]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>效果回看</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>整改效果回看（PDCA Check）</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Input placeholder="closed 整改单 taskId" style={{ marginBottom: 8, maxWidth: 500 }} value={taskId} onChange={(e) => setTaskId(e.target.value)} />
        <Button style={{ marginRight: 8 }} onClick={() => { void load(taskId); }}>查询</Button>
        <Button type="primary" loading={loading} onClick={async () => { await evaluate(taskId, { baselineOverspendRate: 0.5, followupOverspendRate: 0.1 }); void load(taskId); }}>
          评估
        </Button>
        <Spin spinning={loading}>
          {review && (
            <Card style={{ marginTop: 16 }} title={
              <span>疗效判定 <Tag color={VERDICT_COLOR[review.verdict]}>{review.verdict}</Tag></span>
            }>
              <p>整改前超支率：{review.baselineOverspendRate}（{review.baselineVisits} 例）</p>
              <p>整改后超支率：{review.followupOverspendRate}（{review.followupVisits} 例）</p>
              <p>整改后再入院率：{review.followupReadmitRate}</p>
            </Card>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
