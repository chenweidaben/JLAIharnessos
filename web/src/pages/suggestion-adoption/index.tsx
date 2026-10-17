/**
 * 健澜科技 jlmedaios - 改进建议采纳率追踪 V13 页（M309-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Statistic, Table, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Stats {
  adopted: number;
  rejected: number;
  implemented: number;
  total: number;
}

interface Resp {
  stats: Stats;
  adoptionRate: number;
  byDeptQuarter: Record<string, Record<string, number>>;
}

export default function SuggestionAdoptionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/suggestion-adoption?dept=cardio");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>建议采纳率追踪</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Statistic title="采纳率" value={`${data.adoptionRate}%`} />
              <Tag color="green" style={{ marginTop: 12 }}>已采纳 {data.stats.adopted}</Tag>
              <Tag color="red" style={{ marginTop: 12, marginLeft: 8 }}>已驳回 {data.stats.rejected}</Tag>
              <Tag color="blue" style={{ marginTop: 12, marginLeft: 8 }}>已落地 {data.stats.implemented}</Tag>
            </Card>
            <Card title="按科室+季度分组">
              <Table
                size="small"
                pagination={false}
                dataSource={Object.entries(data.byDeptQuarter).map(([dept, quarters]) => ({
                  dept,
                  ...quarters,
                }))}
                columns={[
                  { title: "科室", dataIndex: "dept", key: "dept" },
                  { title: "Q3", dataIndex: "Q3", key: "Q3" },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
