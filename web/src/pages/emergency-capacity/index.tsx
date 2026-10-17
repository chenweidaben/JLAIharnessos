/**
 * 健澜科技 jlmedaios - 急诊容量预警 V13 页（M312-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Alert, Card, Layout, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  obsBeds: { total: number; occupied: number };
  occupancyRate: number;
  waitLight: string;
  avgWaitMin: number;
  reinforce: string;
}

export default function EmergencyCapacityPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/emergency-capacity");
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
        <Title level={3} style={{ color: VI.deep }}>急诊容量看板</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            {data.reinforce === "需增援" && (
              <Alert type="error" message={data.reinforce} showIcon style={{ marginBottom: 16 }} />
            )}
            <Card>
              <Statistic title="留观床占用率" value={`${data.occupancyRate}%`} />
              <Tag color={data.waitLight === "红灯" ? "red" : data.waitLight === "黄灯" ? "orange" : "green"}
                style={{ marginTop: 12 }}>
                候诊 {data.avgWaitMin}min · {data.waitLight}
              </Tag>
              <Tag color={data.reinforce === "需增援" ? "red" : "default"} style={{ marginTop: 12, marginLeft: 8 }}>
                {data.reinforce}
              </Tag>
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
