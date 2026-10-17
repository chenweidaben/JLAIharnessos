/**
 * 健澜科技 jlmedaios - 病历知识自动关联 V13 页（M319-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface CaseRow {
  caseId: string;
  diagnosis: string;
}

interface SopRow {
  sopId: string;
  title: string;
  keywords: string[];
}

interface Resp {
  caseId: string;
  similarCases: CaseRow[];
  relatedSOPs: SopRow[];
  hitRate: number;
}

export default function KnowledgeLinkPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/knowledge-link?caseId=c1");
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
        <Title level={3} style={{ color: VI.deep }}>病历知识自动关联</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="关联命中率" style={{ marginBottom: 16 }}>
              <Statistic title="命中率" value={data.hitRate} suffix="%" />
            </Card>
            <Card title="相似历史病例" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.similarCases}
                renderItem={(c) => (
                  <List.Item>
                    <span>{c.caseId} · {c.diagnosis}</span>
                    <Tag color="blue">相似</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="相关 SOP">
              <List
                dataSource={data.relatedSOPs}
                renderItem={(s) => (
                  <List.Item>
                    <span>{s.sopId} · {s.title}</span>
                    <Tag color="green">SOP</Tag>
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
