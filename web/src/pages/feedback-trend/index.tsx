/**
 * 健澜科技 jlmedaios - 反馈信号看板与趋势 V13 页（M301-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Week {
  weekLabel: string;
  adoptionRate: number;
  modificationRate: number;
  rejectionRate: number;
}

interface Trend {
  adoptionDelta: number;
  modificationDelta: number;
  rejectionDelta: number;
}

interface Resp {
  weekly: Week[];
  trend: Trend;
  risk: string;
}

export default function FeedbackTrendPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/feedback-trend?role=doctor");
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
        <Title level={3} style={{ color: VI.deep }}>MUSE 反馈趋势</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="按周三率" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.weekly}
                renderItem={(w) => (
                  <List.Item>
                    <List.Item.Meta
                      title={w.weekLabel}
                      description={`采纳 ${w.adoptionRate}% · 修改 ${w.modificationRate}% · 驳回 ${w.rejectionRate}%`}
                    />
                  </List.Item>
                )}
              />
            </Card>
            <Card>
              {data.risk
                ? <Tag color="red" style={{ fontSize: 16 }}>{data.risk}</Tag>
                : <Tag color="green" style={{ fontSize: 16 }}>趋势健康</Tag>}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
