/**
 * 健澜科技 jlmedaios - 手术量分级 V13 页（M339-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface GradeItem {
  grade: string;
  count: number;
  percent: number;
}

interface Resp {
  distribution: GradeItem[];
}

export default function SurgeryVolumePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/surgery-volume");
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
        <Title level={3} style={{ color: VI.deep }}>手术量分级</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Card title="一/二/三/四级手术占比">
            <List
              dataSource={data.distribution}
              renderItem={(item) => (
                <List.Item>
                  {item.grade}手术：
                  <Tag color={VI.mid} style={{ marginLeft: 8 }}>
                    {item.count} 台（{item.percent}%）
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
