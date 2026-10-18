/**
 * 健澜科技 jlmedaios - 质控科室考核评分前端页（M501-D，V14，EMR 深化四模块，M501 收官）
 *
 * 深海蓝VI：科室考核评分表（科室/评分/排名）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DeptAssess {
  dept: string;
  score: number;
  rank: number;
}

interface Aggregate {
  avgScore: number;
  topDept: string;
}

export default function EmrQcDeptAssessScorePage() {
  const [assesses, setAssesses] = useState<DeptAssess[]>([]);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-dept-assess-score", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setAssesses(data?.data?.assesses ?? []);
          setAggregate(data?.data?.aggregate ?? null);
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
      render: (score: number) => (
        <Tag color={score >= 90 ? "green" : score >= 80 ? "orange" : "red"}>
          {score}
        </Tag>
      ),
    },
    {
      title: "排名",
      dataIndex: "rank",
      key: "rank",
      render: (rank: number) => (
        <Tag color={rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "default"}>
          第 {rank} 名
        </Tag>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>科室考核评分</Title>
        {aggregate && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="考核概览">
            <Text strong>全院平均分：</Text>
            <Tag color={VI.accent} style={{ marginLeft: 8 }}>{aggregate.avgScore.toFixed(1)} 分</Tag>
            <Text strong style={{ marginLeft: 24 }}>最高分科室：</Text>
            <Tag color="green" style={{ marginLeft: 8 }}>{aggregate.topDept}</Tag>
          </Card>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="科室考核明细">
          <Table columns={columns} dataSource={assesses} rowKey="dept" pagination={false} size="small" />
        </Card>
      </Content>
    </Layout>
  );
}
