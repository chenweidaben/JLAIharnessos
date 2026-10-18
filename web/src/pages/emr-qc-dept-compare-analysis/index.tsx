/**
 * 健澜科技 jlmedaios - 质控科室对比分析前端页（M501-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：科室对比分析表格（科室A/评分A/科室B/评分B/差距）。
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
  scoreA: number;
  deptB: string;
  scoreB: number;
}

interface Aggregate {
  better: string;
  gap: number;
}

export default function EmrQcDeptCompareAnalysisPage() {
  const [pairs, setPairs] = useState<DeptCompare[]>([]);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-dept-compare-analysis", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setPairs(data?.data?.pairs ?? []);
          setAggregate(data?.data?.aggregate ?? null);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const columns = [
    { title: "科室A", dataIndex: "deptA", key: "deptA" },
    { title: "评分A", dataIndex: "scoreA", key: "scoreA" },
    { title: "科室B", dataIndex: "deptB", key: "deptB" },
    { title: "评分B", dataIndex: "scoreB", key: "scoreB" },
    {
      title: "差距",
      key: "gap",
      render: (_: unknown, record: DeptCompare) => {
        const gap = Math.abs(record.scoreA - record.scoreB);
        return <Tag color={gap > 5 ? "red" : "green"}>{gap} 分</Tag>;
      },
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>科室对比分析</Title>
        {aggregate && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="对比概览">
            <Text strong>最优科室：</Text>
            <Tag color="green" style={{ marginLeft: 8 }}>{aggregate.better}</Tag>
            <Text strong style={{ marginLeft: 24 }}>最大差距：</Text>
            <Tag color="red" style={{ marginLeft: 8 }}>{aggregate.gap} 分</Tag>
          </Card>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="科室对比明细">
          <Table columns={columns} dataSource={pairs} rowKey={(record) => `${record.deptA}-${record.deptB}`} pagination={false} size="small" />
        </Card>
      </Content>
    </Layout>
  );
}
