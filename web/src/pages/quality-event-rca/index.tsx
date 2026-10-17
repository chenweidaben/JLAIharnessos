/**
 * 健澜科技 jlmedaios - 不良事件根因分析 RCA 辅助 V13 页（M311-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Similar {
  id: string;
  eventType: string;
  description: string;
}

interface Template {
  eventId: string;
  description: string;
  why: string[];
}

interface Resp {
  eventType: string;
  similarCount: number;
  similar: Similar[];
  template: Template | null;
}

export default function QualityEventRcaPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/quality-event-rca?eventType=fall");
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
        <Title level={3} style={{ color: VI.deep }}>RCA 根因分析</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Tag color="blue">类型 {data.eventType}</Tag>
              <Tag color="red" style={{ marginLeft: 8 }}>同类事件 {data.similarCount}</Tag>
            </Card>
            <Card title="同类事件聚类" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.similar}
                renderItem={(it) => <List.Item>{it.description}</List.Item>}
              />
            </Card>
            <Card title="5Why 模板">
              {data.template ? (
                <List
                  dataSource={data.template.why}
                  renderItem={(w, idx) => (
                    <List.Item>Why {idx + 1}: {w || "（待填写）"}</List.Item>
                  )}
                />
              ) : <Typography.Text>无同类事件</Typography.Text>}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
