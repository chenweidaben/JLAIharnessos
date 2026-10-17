/**
 * 健澜科技 jlmedaios - 多科室横向对标 V13 页（M310-B）
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
  deptId: string;
  deptName: string;
  closureRate: number;
  sopCount: number;
  adoptionRate: number;
  compositeScore: number;
}

interface Resp {
  ranked: Row[];
  benchmark: Row | null;
  lagging: Row | null;
}

export default function DeptBenchmarkPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/dept-benchmark");
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
        <Title level={3} style={{ color: VI.deep }}>科室横向对标</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Card title="对标排行">
            <List
              dataSource={data.ranked}
              renderItem={(it, idx) => (
                <List.Item>
                  <List.Item.Meta
                    title={`#${idx + 1} ${it.deptName}`}
                    description={`闭环 ${it.closureRate}% · SOP ${it.sopCount} · 采纳 ${it.adoptionRate}%`}
                  />
                  <Tag color={idx === 0 ? "gold" : idx === data.ranked.length - 1 ? "red" : "default"}>
                    {idx === 0 ? "标杆" : idx === data.ranked.length - 1 ? "落后" : `${it.compositeScore}`}
                  </Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
