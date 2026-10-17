/**
 * 健澜科技 jlmedaios - 安保消防与应急指挥 V5 页（M279-B）
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
  totalIncidents: number;
  majorCount: number;
  avgResponseMinutes: number;
  firePassRate: number;
}

export default function SecurityEmergencyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/security-emergency");
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
        <Title level={3} style={{ color: VI.deep }}>安保消防与应急指挥 V5</Title>
        <Paragraph type="secondary">事件分级·应急调度·消防检查·演练记录</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="事件总数" value={data.totalIncidents} /></Card></Col>
            <Col span={6}><Card><Statistic title="重大事件" value={data.majorCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="平均响应" value={`${data.avgResponseMinutes}分钟`} /></Card></Col>
            <Col span={6}><Card><Statistic title="消防合格率" value={`${data.firePassRate}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
