/**
 * 健澜科技 jlmedaios - 病历质控指标体系大屏前端页（M468-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：大屏卡片（总病历数/通过率/缺陷率）+ 趋势图。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Dashboard {
  passRate: number;
  defectRate: number;
  totalRecords: number;
}

interface Trend {
  change: number;
  direction: string;
}

export default function EmrQcDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [trend, setTrend] = useState<Trend | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-dashboard", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setDashboard(data?.dashboard ?? null);
            setTrend(data?.trend ?? null);
          }
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控指标体系大屏</Title>
        <Spin spinning={loading}>
          <Row gutter={16}>
            <Col span={8}>
              <Card title="总病历数" headStyle={{ background: VI.deep, color: "#fff" }}>
                <Statistic value={dashboard?.totalRecords ?? 0} />
              </Card>
            </Col>
            <Col span={8}>
              <Card title="通过率" headStyle={{ background: VI.mid, color: "#fff" }}>
                <Statistic value={dashboard?.passRate ?? 0} suffix="%" />
                {trend && (
                  <Tag color={trend.direction === "up" ? "green" : "red"}>
                    {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.change}%
                  </Tag>
                )}
              </Card>
            </Col>
            <Col span={8}>
              <Card title="缺陷率" headStyle={{ background: VI.accent, color: "#fff" }}>
                <Statistic value={dashboard?.defectRate ?? 0} suffix="%" />
              </Card>
            </Col>
          </Row>
        </Spin>
      </Content>
    </Layout>
  );
}
