/**
 * 健澜科技 jlmedaios - 病历质控指标趋势预警前端页（M475-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：预警卡片（指标名/当前值/趋势箭头 ↑↓→）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TrendAlert {
  indicator: string;
  current: number;
  previous: number;
  gap: number;
  direction: "up" | "down" | "flat";
}

export default function EmrQcTrendAlertPage() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<TrendAlert[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-trend-alert", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setAlerts(data?.alerts ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const directionTag = (direction: string) => {
    if (direction === "up") return <Tag color="green">↑ 上升</Tag>;
    if (direction === "down") return <Tag color="red">↓ 下降</Tag>;
    return <Tag color="default">→ 持平</Tag>;
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控指标趋势预警</Title>
        <Spin spinning={loading}>
          <Row gutter={[16, 16]}>
            {alerts.map((a) => (
              <Col span={8} key={a.indicator}>
                <Card>
                  <Title level={4} style={{ color: VI.deep, margin: 0 }}>{a.indicator}</Title>
                  <Title level={2} style={{ color: VI.accent, margin: "8px 0" }}>{a.current}</Title>
                  <Text type="secondary">上期：{a.previous}</Text>
                  <div style={{ marginTop: 8 }}>
                    {directionTag(a.direction)}
                    <Text strong style={{ marginLeft: 8 }}>gap={a.gap}</Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Spin>
      </Content>
    </Layout>
  );
}
