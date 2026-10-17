/**
 * 健澜科技 jlmedaios - 扩散网络图谱 V13 页（M304-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Node {
  deptId: string;
  deptName: string;
}

interface Edge {
  source: string;
  target: string;
  count: number;
}

interface Influence {
  deptId: string;
  influence: number;
}

interface Resp {
  nodes: Node[];
  edges: Edge[];
  influenceByDept: Influence[];
  isolated: Node[];
}

export default function DiffusionGraphPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/diffusion-graph");
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
        <Title level={3} style={{ color: VI.deep }}>扩散网络图谱</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="科室影响力（输出边数）" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.influenceByDept}
                renderItem={(it) => (
                  <List.Item>
                    <span>{it.deptId}</span>
                    <Tag color="blue">影响力 {it.influence}</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="孤岛科室">
              {data.isolated.length === 0
                ? <Tag color="green">全院互联互通</Tag>
                : data.isolated.map((n) => <Tag key={n.deptId} color="orange">{n.deptId}</Tag>)}
            </Card>
            <Card title="边数" style={{ marginTop: 16 }}>
              <Statistic title="扩散边" value={data.edges.length} />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
