/**
 * 健澜科技 jlmedaios - 质控科室看板前端页（M493-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：科室质控看板卡片网格（核心指标大数字）。
 *
 * v5.0试点扩展（M184空壳崩溃修复）：dashboard.dept / dashboard.metrics
 * 均经 `dashboard?.dept` 与 `dashboard?.metrics ?? []` 空值防护，BFF 未返回时不白屏。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Statistic, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DeptMetric {
  name: string;
  value: number;
}

interface DeptDashboard {
  dept: string;
  metrics: DeptMetric[];
}

interface DeptMetricAggregate {
  count: number;
  avgValue: number;
}

export default function EmrQcDeptDashboardPage() {
  const [dashboard, setDashboard] = useState<DeptDashboard | null>(null);
  const [aggregate, setAggregate] = useState<DeptMetricAggregate>({ count: 0, avgValue: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-dept-dashboard", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setDashboard(data?.data?.dashboard ?? null);
          setAggregate(data?.data?.aggregate ?? { count: 0, avgValue: 0 });
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>
          质控科室看板{dashboard?.dept ? ` - ${dashboard.dept}` : ""}
        </Title>
        <Card style={{ marginBottom: 16 }}>
          <Text strong>指标数：{aggregate.count}</Text>
          <Text style={{ marginLeft: 24 }}>平均分：{aggregate.avgValue}</Text>
        </Card>
        <Row gutter={16}>
          {(dashboard?.metrics ?? []).map((m) => (
            <Col span={8} key={m.name}>
              <Card>
                <Statistic
                  title={m.name}
                  value={m.value}
                  suffix="%"
                  valueStyle={{ color: VI.accent }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Content>
    </Layout>
  );
}
