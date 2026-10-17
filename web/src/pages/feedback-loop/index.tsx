/**
 * 健澜科技 jlmedaios - 反馈闭环总览 V12 页（M294-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Dashboard {
  overallAdoptionRate: number;
  totalRetrainTasks: number;
  urgentRetrainTasks: number;
  criticalAgentCount: number;
  avgHealthScore: number;
  bottlenecks: string[];
}

export default function FeedbackLoopPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Dashboard | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Dashboard>("/api/v1/feedback-loop-dashboard");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>AI 越用越聪明 · 闭环总览</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16}>
              <Col span={5}><Card><Statistic title="采纳率" value={`${data.overallAdoptionRate}%`} /></Card></Col>
              <Col span={5}><Card><Statistic title="复训任务" value={data.totalRetrainTasks} /></Card></Col>
              <Col span={5}><Card><Statistic title="紧急复训" value={data.urgentRetrainTasks} /></Card></Col>
              <Col span={5}><Card><Statistic title="critical 角色" value={data.criticalAgentCount} /></Card></Col>
              <Col span={4}><Card><Statistic title="平均健康分" value={data.avgHealthScore} /></Card></Col>
            </Row>
            <Card title="瓶颈红黄灯" style={{ marginTop: 16 }}>
              {data.bottlenecks.length === 0 && <Tag color="green">无瓶颈</Tag>}
              <List
                dataSource={data.bottlenecks}
                renderItem={(b) => (
                  <List.Item><Tag color="red">{b}</Tag></List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
