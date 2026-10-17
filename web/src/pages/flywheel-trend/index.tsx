/**
 * 健澜科技 jlmedaios - 飞轮季度演进趋势 V13 页（M306-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Quarter {
  quarter: string;
  score: number;
}

interface Resp {
  trend: Quarter[];
  qoqGrowth: number;
  momentum: string;
}

export default function FlywheelTrendPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/flywheel-trend");
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
        <Title level={3} style={{ color: VI.deep }}>飞轮季度趋势</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Tag
                color={data.momentum === "飞轮加速" ? "green" : data.momentum === "飞轮失速" ? "red" : "orange"}
                style={{ fontSize: 16 }}
              >
                {data.momentum}（本季环比 {data.qoqGrowth >= 0 ? "+" : ""}{data.qoqGrowth} pp）
              </Tag>
            </Card>
            <Card title="季度得分">
              <List
                dataSource={data.trend}
                renderItem={(it) => (
                  <List.Item>
                    <span>{it.quarter}</span><span>{it.score}</span>
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
