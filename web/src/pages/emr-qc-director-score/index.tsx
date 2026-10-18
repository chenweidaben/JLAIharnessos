/**
 * 健澜科技 jlmedaios - 质控科室主任评分前端页（M494-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：科室主任质控评分 Table（主任/科室/评分）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DirectorScore {
  director: string;
  dept: string;
  score: number;
}

interface DirectorScoreAggregate {
  count: number;
  avgScore: number;
  maxScore: number;
}

const columns = [
  { title: "主任", dataIndex: "director", key: "director" },
  { title: "科室", dataIndex: "dept", key: "dept" },
  {
    title: "评分",
    dataIndex: "score",
    key: "score",
    render: (score: number) => {
      const color = score >= 90 ? "green" : score >= 80 ? "gold" : "red";
      return <Tag color={color}>{score}</Tag>;
    },
  },
];

export default function EmrQcDirectorScorePage() {
  const [scores, setScores] = useState<DirectorScore[]>([]);
  const [aggregate, setAggregate] = useState<DirectorScoreAggregate>({ count: 0, avgScore: 0, maxScore: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-director-score", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setScores(data?.data?.scores ?? []);
          setAggregate(data?.data?.aggregate ?? { count: 0, avgScore: 0, maxScore: 0 });
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
        <Title level={3} style={{ color: VI.deep }}>质控科室主任评分</Title>
        <Card style={{ marginBottom: 16 }}>
          <Text strong>人数：{aggregate.count}</Text>
          <Text style={{ marginLeft: 24 }}>平均分：{aggregate.avgScore}</Text>
          <Text style={{ marginLeft: 24 }}>最高分：{aggregate.maxScore}</Text>
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="主任评分列表">
          <Table columns={columns} dataSource={scores} rowKey="director" pagination={false} />
        </Card>
      </Content>
    </Layout>
  );
}
