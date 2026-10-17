/**
 * 健澜科技 jlmedaios - MUSE 采纳率与使用度量 V5 页（M285-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  totalSessions: number;
  overallAdoptionRate: number;
  totalTimeSavedHours: number;
  topSkill: string;
}

export default function MuseValuePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/muse-value");
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
        <Title level={3} style={{ color: VI.deep }}>MUSE 价值度量</Title>
        <Paragraph type="secondary">采纳率·节省时间·技能排行</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="总会话" value={data.totalSessions} /></Card></Col>
            <Col span={6}><Card><Statistic title="采纳率" value={`${data.overallAdoptionRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="节省时间" value={`${data.totalTimeSavedHours}h`} /></Card></Col>
            <Col span={6}><Card><Statistic title="顶流技能" value={data.topSkill} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
