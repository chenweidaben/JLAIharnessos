/**
 * 健澜科技 jlmedaios - 退役经验存档与复用 V13 页（M305-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Archived {
  experienceId: string;
  title: string;
  status: string;
  retireReason: string;
  version: number;
}

interface Resp {
  totalArchived: number;
  results: Archived[];
}

export default function ArchivedExperiencePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>(`/api/v1/archived-experience?q=${encodeURIComponent(q)}`);
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [q]);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>归档经验库</Title>
        <Input.Search
          placeholder="搜索归档经验（如：华法林）"
          onSearch={(v) => setQ(v)}
          style={{ marginBottom: 16 }}
        />
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Card title={`共 ${data.totalArchived} 条归档，命中 ${data.results.length} 条`}>
            <List
              dataSource={data.results}
              renderItem={(it) => (
                <List.Item
                  actions={[<Button key="r" size="small">复活</Button>]}
                >
                  <List.Item.Meta
                    title={it.title}
                    description={`${it.retireReason} · v${it.version}`}
                  />
                  <Tag color="default">archived</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
