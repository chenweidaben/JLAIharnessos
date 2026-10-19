/**
 * 健澜科技 jlmedaios - 质控指标看板前端页（M484-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：看板卡片网格（核心指标大数字）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Dashboard {
  title: string;
  metrics: { name: string; value: number }[];
}

interface Aggregate {
  count: number;
  avgValue: number;
}

export default function EmrQcMetricDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-metric-dashboard", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setDashboard(data?.dashboard ?? null);
            setAggregate(data?.aggregate ?? null);
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
        <Title level={3} style={{ color: VI.deep }}>{dashboard?.title ?? "质控指标看板"}</Title>
        <Spin spinning={loading}>
          <Row gutter={[16, 16]}>
            {(dashboard?.metrics ?? []).map((m) => (
              <Col span={8} key={m.name}>
                <Card headStyle={{ background: VI.mid, color: "#fff" }} title={m.name}>
                  <Statistic title={m.name} value={m.value} precision={1} suffix="%" />
                </Card>
              </Col>
            ))}
          </Row>
          {aggregate && (
            <Card style={{ marginTop: 16 }}>
              <Statistic title="指标总数" value={aggregate.count} />
              <Statistic title="平均值" value={aggregate.avgValue} precision={1} suffix="%" style={{ marginTop: 12 }} />
            </Card>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
