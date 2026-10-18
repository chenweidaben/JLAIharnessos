/**
 * 健澜科技 jlmedaios - 质控科室对比前端页（M493-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：多科室质控对比表格 + 差距标记（绿优红劣）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DeptCompare {
  deptA: string;
  deptB: string;
  scoreA: number;
  scoreB: number;
}

interface DeptMetricCompare {
  gap: number;
  better: string;
}

const columns = [
  { title: "科室A", dataIndex: "deptA", key: "deptA" },
  { title: "科室A评分", dataIndex: "scoreA", key: "scoreA" },
  { title: "科室B", dataIndex: "deptB", key: "deptB" },
  { title: "科室B评分", dataIndex: "scoreB", key: "scoreB" },
  {
    title: "差距",
    key: "gap",
    render: (_: unknown, row: DeptCompare) => {
      const gap = row.scoreA - row.scoreB;
      const color = gap > 0 ? "green" : gap < 0 ? "red" : "default";
      const text = gap > 0 ? `A 领先 ${gap}` : gap < 0 ? `B 领先 ${-gap}` : "持平";
      return <Tag color={color}>{text}</Tag>;
    },
  },
];

export default function EmrQcDeptComparePage() {
  const [compare, setCompare] = useState<DeptCompare | null>(null);
  const [metricCompare, setMetricCompare] = useState<DeptMetricCompare | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-dept-compare", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setCompare(data?.data?.compare ?? null);
          setMetricCompare(data?.data?.metricCompare ?? null);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const dataSource = compare ? [compare] : [];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控科室对比</Title>
        {metricCompare && (
          <Card style={{ marginBottom: 16 }}>
            <Text strong>差距：{metricCompare.gap}</Text>
            <Text style={{ marginLeft: 24 }}>领先科室：{metricCompare.better}</Text>
          </Card>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="科室对比表">
          <Table columns={columns} dataSource={dataSource} rowKey="deptA" pagination={false} />
        </Card>
      </Content>
    </Layout>
  );
}
