/**
 * 健澜科技 jlmedaios - 床位占用预测 V13 页（M312-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ForecastRow {
  deptId: string;
  deptName: string;
  occupancySeries: number[];
  avgOccupancy: number;
  tension: string;
}

interface Crisis {
  deptId: string;
  deptName: string;
  avgOccupancy: number;
}

interface Resp {
  days: number;
  forecast: ForecastRow[];
  crisis: Crisis[];
}

export default function BedOccupancyForecastPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/bed-occupancy-forecast?days=7");
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
        <Title level={3} style={{ color: VI.deep }}>床位占用预测（未来 {data?.days ?? 7} 天）</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="各病区占用率" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.forecast}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta
                      title={it.deptName}
                      description={`日均 ${it.avgOccupancy}% · 序列 ${it.occupancySeries.length} 天`}
                    />
                    <Tag color={it.tension === "红灯" ? "red" : it.tension === "黄灯" ? "orange" : "green"}>
                      {it.tension}
                    </Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="红灯病区（床位紧张）">
              {data.crisis.map((c) => <Tag key={c.deptId} color="red">{c.deptName} {c.avgOccupancy}%</Tag>)}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
