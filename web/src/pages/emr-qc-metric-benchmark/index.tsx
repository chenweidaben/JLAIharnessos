/**
 * 健澜科技 jlmedaios - 质控指标对标前端页（M484-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：对标表格（指标名/本院值/标杆值/差距/状态绿优于红劣于）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Benchmark {
  metricName: string;
  ourValue: number;
  benchmarkValue: number;
}

interface Gap {
  gap: number;
  status: "above" | "below" | "equal";
}

export default function EmrQcMetricBenchmarkPage() {
  const [loading, setLoading] = useState(true);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-metric-benchmark", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setBenchmarks(data?.benchmarks ?? []);
            setGaps(data?.gaps ?? []);
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

  const columns = [
    { title: "指标名", dataIndex: "metricName", key: "metricName" },
    { title: "本院值", dataIndex: "ourValue", key: "ourValue" },
    { title: "标杆值", dataIndex: "benchmarkValue", key: "benchmarkValue" },
    {
      title: "差距",
      dataIndex: "metricName",
      key: "gap",
      render: (name: string) => {
        const i = benchmarks.findIndex((b) => b.metricName === name);
        const g = gaps[i];
        return g ? g.gap : 0;
      },
    },
    {
      title: "状态",
      dataIndex: "metricName",
      key: "status",
      render: (name: string) => {
        const i = benchmarks.findIndex((b) => b.metricName === name);
        const g = gaps[i];
        if (!g) return "-";
        if (g.status === "above") return <Tag color="green">优于标杆</Tag>;
        if (g.status === "below") return <Tag color="red">劣于标杆</Tag>;
        return <Tag color="default">持平</Tag>;
      },
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控指标对标</Title>
        <Spin spinning={loading}>
          <Card headStyle={{ background: VI.mid, color: "#fff" }}>
            <Table dataSource={benchmarks} columns={columns} rowKey="metricName" pagination={false} />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
