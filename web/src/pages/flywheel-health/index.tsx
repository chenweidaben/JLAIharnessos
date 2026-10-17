/**
 * 健澜科技 jlmedaios - 综合学习飞轮健康度仪表盘 V13 页（M310-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Metrics {
  adoptionRate: number;
  closureRate: number;
  dualSedimentRate: number;
  milestoneRate: number;
}

interface Resp {
  score: number;
  grade: string;
  risk: string;
  metrics: Metrics;
}

export default function FlywheelHealthPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/flywheel-health");
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
        <Title level={3} style={{ color: VI.deep }}>飞轮健康度</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Statistic title="健康分" value={data.score} />
              <Tag
                color={data.grade === "绿灯" ? "green" : data.grade === "黄灯" ? "orange" : "red"}
                style={{ marginTop: 12, fontSize: 16 }}
              >
                {data.grade}
              </Tag>
              <Tag color="red" style={{ marginTop: 12, marginLeft: 8 }}>{data.risk}</Tag>
            </Card>
            <Card title="四维指标">
              <List
                dataSource={Object.entries(data.metrics)}
                renderItem={([k, v]) => (
                  <List.Item>
                    <span>{k}</span><span>{v}</span>
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
