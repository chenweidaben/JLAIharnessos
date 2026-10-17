/**
 * 健澜科技 jlmedaios - 医院 AI 学习飞轮成熟度 V13 页（M306-A）
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
  qualityScore: number;
  adoptionRate: number;
  feedbackLoopRate: number;
  pushCtr: number;
  crossDeptDiffusionRate: number;
  assetHealthScore: number;
}

interface Resp {
  score: number;
  grade: string;
  bottleneck: string;
  metrics: Metrics;
}

export default function FlywheelScorePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/flywheel-score");
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
        <Title level={3} style={{ color: VI.deep }}>学习飞轮成熟度</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Statistic title="飞轮总分" value={data.score} />
              <Tag color="blue" style={{ marginTop: 12 }}>等级：{data.grade}</Tag>
              <Tag color="orange" style={{ marginTop: 12, marginLeft: 8 }}>瓶颈：{data.bottleneck}</Tag>
            </Card>
            <Card title="六维指标">
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
