/**
 * 健澜科技 jlmedaios - 质控指标预警前端页（M483-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：预警规则表格（指标名/阈值/方向/触发状态）+ 触发记录红色。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AlertRule {
  metricName: string;
  threshold: number;
  direction: "below" | "above";
}

interface AlertResult {
  rule: AlertRule;
  trigger: { triggered: boolean; message: string };
}

export default function EmrQcMetricAlertPage() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<AlertResult[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-metric-alert", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setResults(data?.results ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const columns = [
    {
      title: "指标名",
      dataIndex: ["rule", "metricName"],
      key: "metricName",
    },
    {
      title: "阈值",
      dataIndex: ["rule", "threshold"],
      key: "threshold",
    },
    {
      title: "方向",
      dataIndex: ["rule", "direction"],
      key: "direction",
      render: (d: string) => (d === "below" ? <Tag color="blue">低于</Tag> : <Tag color="orange">高于</Tag>),
    },
    {
      title: "触发状态",
      dataIndex: "trigger",
      key: "triggered",
      render: (t: { triggered: boolean; message: string }) =>
        t.triggered ? <Tag color="red">{t.message}</Tag> : <Tag color="green">正常</Tag>,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控指标预警</Title>
        <Spin spinning={loading}>
          <Card headStyle={{ background: VI.mid, color: "#fff" }}>
            <Table dataSource={results} columns={columns} rowKey={(r) => r.rule.metricName} pagination={false} />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
