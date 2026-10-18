/**
 * 健澜科技 jlmedaios - 质控专家绩效统计前端页（M502-D，V14，EMR 深化四模块，M502 收官）
 *
 * 深海蓝VI：专家绩效统计表格（专家姓名/评审数/平均分）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Statistic, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ExpertPerformance {
  expert: string;
  reviewedCount: number;
  avgScore: number;
}

interface Aggregate {
  totalReviews: number;
  avgScore: number;
}

export default function EmrQcExpertPerformancePage() {
  const [perf, setPerf] = useState<ExpertPerformance[]>([]);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-expert-performance", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setPerf(data?.data?.perf ?? []);
          setAggregate(data?.data?.aggregate ?? null);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const columns = [
    { title: "专家姓名", dataIndex: "expert", key: "expert" },
    {
      title: "评审数",
      dataIndex: "reviewedCount",
      key: "reviewedCount",
      render: (count: number) => <Tag color={VI.accent}>{count} 份</Tag>,
    },
    {
      title: "平均分",
      dataIndex: "avgScore",
      key: "avgScore",
      render: (score: number) => (
        <Tag color={score >= 90 ? "green" : score >= 85 ? "orange" : "red"}>
          {score.toFixed(1)} 分
        </Tag>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>专家绩效统计</Title>
        {aggregate && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="全院概览">
            <Statistic
              title="总评审数"
              value={aggregate.totalReviews}
              suffix="份"
              style={{ display: "inline-block", marginRight: 48 }}
            />
            <Statistic
              title="全院平均分"
              value={aggregate.avgScore}
              precision={1}
              suffix="分"
              style={{ display: "inline-block" }}
            />
          </Card>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="专家绩效明细">
          <Table columns={columns} dataSource={perf} rowKey="expert" pagination={false} size="small" />
        </Card>
      </Content>
    </Layout>
  );
}
