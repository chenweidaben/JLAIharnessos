/**
 * 健澜科技 jlmedaios - 收入结构 V13 页（M329-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RevenueShareItem {
  category: string;
  share: number;
}

interface Resp {
  total: number;
  share: RevenueShareItem[];
}

export default function RevenueStructurePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/revenue-structure");
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
        <Title level={3} style={{ color: VI.deep }}>收入结构</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Card>
                  <Statistic title="总收入" value={data.total} suffix="万元" />
                </Card>
              </Col>
            </Row>
            <Card title="四类收入占比">
              <List
                dataSource={data.share}
                renderItem={(item) => (
                  <List.Item>
                    <Tag color="blue" style={{ marginRight: 8 }}>
                      {item.category}
                    </Tag>
                    {item.share}%
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
