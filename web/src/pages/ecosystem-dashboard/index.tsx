/**
 * 健澜科技 jlmedaios - 知识贡献生态总览 V13 页（M298-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Dashboard {
  totalContributors: number;
  monthlyStars: number;
  activeMentorPairs: number;
  newDoctorCount: number;
  healthScore: number;
  gap: string;
}

export default function EcosystemDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Dashboard | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Dashboard>("/api/v1/ecosystem-dashboard");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>知识分享生态总览</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16}>
              <Col span={6}>
                <Card><Statistic title="贡献者总数" value={data.totalContributors} /></Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="月度之星" value={data.monthlyStars} /></Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="活跃师徒对" value={data.activeMentorPairs} /></Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="新医生数" value={data.newDoctorCount} /></Card>
              </Col>
            </Row>
            <Card style={{ marginTop: 16 }}>
              <Statistic title="生态健康分" value={data.healthScore} />
              {data.gap
                ? <Tag color="red" style={{ marginTop: 12 }}>{data.gap}</Tag>
                : <Tag color="green" style={{ marginTop: 12 }}>生态健康</Tag>}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
