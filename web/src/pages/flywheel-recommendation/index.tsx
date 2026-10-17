/**
 * 健澜科技 jlmedaios - 飞轮改进建议 V13 页（M306-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Rec {
  bottleneck: string;
  action: string;
  expectedGain: number;
  projectedScore: number;
}

interface Resp {
  currentScore: number;
  recommendations: Rec[];
}

export default function FlywheelRecommendationPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/flywheel-recommendation");
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
        <Title level={3} style={{ color: VI.deep }}>飞轮改进建议</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Card title={`当前分 ${data.currentScore}，按预计提升排序`}>
            <List
              dataSource={data.recommendations}
              renderItem={(it, idx) => (
                <List.Item>
                  <List.Item.Meta
                    title={`#${idx + 1} ${it.action}`}
                    description={`瓶颈：${it.bottleneck} · 预计 +${it.expectedGain} → ${it.projectedScore}`}
                  />
                  <Tag color="orange">优先级 P{idx + 1}</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
