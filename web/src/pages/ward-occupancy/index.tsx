/**
 * 健澜科技 jlmedaios - 病房床位使用率 V13 页（M331-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface WardOccupancyItem {
  wardName: string;
  occupancyRate: number;
}

interface Resp {
  wardOccupancy: WardOccupancyItem[];
  overallOccupancy: number;
}

export default function WardOccupancyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/ward-occupancy");
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
        <Title level={3} style={{ color: VI.deep }}>病房床位使用率</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Card>
                  <Statistic title="全院平均床位使用率" value={data.overallOccupancy} suffix="%" />
                </Card>
              </Col>
            </Row>
            <Card title="各病区床位使用率">
              <List
                dataSource={data.wardOccupancy}
                renderItem={(item) => (
                  <List.Item>
                    {item.wardName}：
                    <Tag
                      color={item.occupancyRate >= 90 ? "green" : item.occupancyRate >= 80 ? "orange" : "red"}
                      style={{ marginLeft: 8 }}
                    >
                      {item.occupancyRate}%
                    </Tag>
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
