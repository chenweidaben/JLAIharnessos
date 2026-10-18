/**
 * 健澜科技 jlmedaios - 质控指标分析前端页（M483-D，M483 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：分析报告卡片（指标名/当前值/上期值/变化率/趋势箭头）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from "@ant-design/icons";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AnalysisReport {
  metricName: string;
  currentValue: number;
  previousValue: number;
  change: number;
  direction: "up" | "down" | "flat";
}

export default function EmrQcMetricAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<AnalysisReport[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-metric-analysis", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setReports(data?.reports ?? []);
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
        <Title level={3} style={{ color: VI.deep }}>质控指标分析</Title>
        <Spin spinning={loading}>
          <Row gutter={[16, 16]}>
            {reports.map((r) => (
              <Col span={8} key={r.metricName}>
                <Card headStyle={{ background: VI.mid, color: "#fff" }} title={r.metricName}>
                  <Statistic title="当前值" value={r.currentValue} precision={1} suffix="%" />
                  <Statistic title="上期值" value={r.previousValue} precision={1} suffix="%" style={{ marginTop: 12 }} />
                  <div style={{ marginTop: 12 }}>
                    {r.direction === "up" && (
                      <Tag color="green" icon={<ArrowUpOutlined />}>上升 {r.change}</Tag>
                    )}
                    {r.direction === "down" && (
                      <Tag color="red" icon={<ArrowDownOutlined />}>下降 {r.change}</Tag>
                    )}
                    {r.direction === "flat" && (
                      <Tag color="default" icon={<MinusOutlined />}>持平</Tag>
                    )}
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
