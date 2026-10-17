/**
 * 健澜科技 jlmedaios - 手术室利用率 V13 页（M331-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface OperatingRoomUtilizationItem {
  roomName: string;
  utilizationRate: number;
}

interface Resp {
  rooms: OperatingRoomUtilizationItem[];
}

export default function OperatingRoomPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/operating-room");
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
        <Title level={3} style={{ color: VI.deep }}>手术室利用率</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Card title="各手术间利用率">
            <List
              dataSource={data.rooms}
              renderItem={(item) => (
                <List.Item>
                  {item.roomName}：
                  <Tag
                    color={item.utilizationRate >= 80 ? "green" : item.utilizationRate >= 60 ? "orange" : "red"}
                    style={{ marginLeft: 8 }}
                  >
                    {item.utilizationRate}%
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
