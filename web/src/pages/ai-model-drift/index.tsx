/**
 * 健澜科技 jlmedaios - AI 模型漂移监控 V13 页（M325-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  klValue: number;
  alert: "green" | "red";
}

export default function AiModelDriftPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/ai-model-drift");
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
        <Title level={3} style={{ color: VI.deep }}>AI 模型漂移监控</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Card>
            <Statistic title="KL 散度" value={data.klValue} precision={2} />
            {data.alert === "red" ? (
              <Tag color="red" style={{ fontSize: 14, padding: "4px 12px", marginTop: 16 }}>预警</Tag>
            ) : (
              <Tag color="green" style={{ fontSize: 14, padding: "4px 12px", marginTop: 16 }}>正常</Tag>
            )}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
