/**
 * 健澜科技 jlmedaios - 健教材料推送统计 V13 页（M316-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface MaterialCount {
  disease: string;
  count: number;
}

interface Resp {
  disease: string;
  materialCounts: MaterialCount[];
  readRate: number;
  feedbackRate: number;
}

export default function HealthEducationPushPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/health-education-push?disease=all");
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
        <Title level={3} style={{ color: VI.deep }}>健教材料推送统计</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="按病种材料数" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.materialCounts}
                renderItem={(m) => (
                  <List.Item>
                    <span>{m.disease}</span>
                    <Tag color="blue">{m.count}</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="阅读率 / 反馈率">
              <Statistic title="阅读率" value={data.readRate} suffix="%" style={{ marginRight: 48 }} />
              <Statistic title="反馈率" value={data.feedbackRate} suffix="%" />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
