/**
 * 健澜科技 jlmedaios - 经验时间衰减与新鲜度 V13 页（M296-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Row {
  experienceId: string;
  title: string;
  monthsAgo: number;
  score: number;
  bucket: "fresh" | "aging" | "stale" | "archive";
}

interface Resp {
  role: string;
  count: number;
  rows: Row[];
}

const bucketColor: Record<string, string> = {
  fresh: "green",
  aging: "blue",
  stale: "orange",
  archive: "red",
};

export default function ExperienceFreshnessPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/experience-freshness?role=doctor");
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
        <Title level={3} style={{ color: VI.deep }}>经验新鲜度时间轴</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Card title={`共 ${data.count} 条经验`}>
            <List
              dataSource={data.rows}
              renderItem={(r) => (
                <List.Item>
                  <List.Item.Meta title={r.title} description={`${r.monthsAgo} 月前，新鲜度 ${r.score}`} />
                  <Tag color={bucketColor[r.bucket]}>{r.bucket}</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
