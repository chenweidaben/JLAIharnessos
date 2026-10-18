/**
 * 健澜科技 jlmedaios - 科室病历质控评分排名前端页（M461-D，V14，EMR 深化四模块，M461 收官）
 *
 * 深海蓝VI：排名表（名次/科室/评分）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Tag, Typography } from "antd";
import type { DeptQcRankV14 } from "@/bff/aggregators/emrQcRankingV14Aggregator";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

const RANK_COLOR: Record<number, string> = {
  1: "gold",
  2: "silver",
  3: "bronze",
};

export default function EmrQcRankingPage() {
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<DeptQcRankV14[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-ranking", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setRanking(data?.ranking ?? []);
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
      title: "名次",
      dataIndex: "rank",
      key: "rank",
      render: (rank: number) => <Tag color={RANK_COLOR[rank] ?? "default"}>第 {rank} 名</Tag>,
    },
    { title: "科室", dataIndex: "dept", key: "dept" },
    {
      title: "评分",
      dataIndex: "score",
      key: "score",
      render: (score: number) => <span style={{ color: VI.accent, fontWeight: "bold" }}>{score}</span>,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>科室病历质控评分排名</Title>
        <Card title="排名列表" headStyle={{ background: VI.deep, color: "#fff" }} loading={loading}>
          <Table rowKey="rank" columns={columns} dataSource={ranking} pagination={false} size="small" />
        </Card>
      </Content>
    </Layout>
  );
}
