/**
 * 健澜科技 jlmedaios - 病历科室质控对比分析前端页（M469-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：对比表（科室名/得分/排名/与平均分偏差）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface CompareResult {
  name: string;
  score: number;
  rank: number;
  diffFromAvg: number;
}

export default function EmrDeptComparePage() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<CompareResult[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-dept-compare", {
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
    { title: "科室名", dataIndex: "name", key: "name" },
    { title: "得分", dataIndex: "score", key: "score" },
    {
      title: "排名",
      dataIndex: "rank",
      key: "rank",
      render: (v: number) => (
        <Tag color={v === 1 ? "gold" : v === 2 ? "silver" : v === 3 ? "orange" : "default"}>
          第 {v} 名
        </Tag>
      ),
    },
    {
      title: "与平均分偏差",
      dataIndex: "diffFromAvg",
      key: "diffFromAvg",
      render: (v: number) => (
        <Tag color={v > 0 ? "green" : v < 0 ? "red" : "default"}>
          {v > 0 ? "+" : ""}{v}
        </Tag>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历科室质控对比分析</Title>
        <Card title="科室得分对比（降序）" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Spin spinning={loading}>
            <Table dataSource={results} columns={columns} rowKey="name" pagination={false} />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
