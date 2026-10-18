/**
 * 健澜科技 jlmedaios - 质控标杆管理前端页（M504-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：标杆管理表格（科室/评分/标杆值/差距/达标状态）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface BenchmarkReport {
  dept: string;
  score: number;
  benchmark: number;
  gap: number;
  achieved: boolean;
}

export default function EmrQcBenchmarkingPage() {
  const [reports, setReports] = useState<BenchmarkReport[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-benchmarking", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setReports(data?.data?.reports ?? []);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const columns = [
    { title: "科室", dataIndex: "dept", key: "dept" },
    {
      title: "评分",
      dataIndex: "score",
      key: "score",
      render: (score: number) => <Tag color={VI.accent}>{score}</Tag>,
    },
    {
      title: "标杆值",
      dataIndex: "benchmark",
      key: "benchmark",
      render: (benchmark: number) => <Tag color="default">{benchmark}</Tag>,
    },
    {
      title: "差距",
      dataIndex: "gap",
      key: "gap",
      render: (gap: number) => (
        <Tag color={gap >= 0 ? "green" : "red"}>{gap >= 0 ? `+${gap}` : gap}</Tag>
      ),
    },
    {
      title: "达标状态",
      dataIndex: "achieved",
      key: "achieved",
      render: (achieved: boolean) => (
        <Tag color={achieved ? "green" : "red"}>{achieved ? "达标" : "未达标"}</Tag>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>标杆管理</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="科室标杆对比">
          <Table columns={columns} dataSource={reports} rowKey="dept" pagination={false} size="small" />
        </Card>
      </Content>
    </Layout>
  );
}
