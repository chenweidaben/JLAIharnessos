/**
 * 健澜科技 jlmedaios - 闭环回灌飞轮 V13 页（M307-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  prevScore: number;
  newScore: number;
  closureRate: number;
  leak: string;
}

export default function ClosedLoopOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/closed-loop-overview");
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
        <Title level={3} style={{ color: VI.deep }}>闭环回灌飞轮</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Card title="院长视角：任务闭环 → 飞轮总分回灌">
            <Statistic title="原飞轮分" value={data.prevScore} />
            <Statistic title="回灌后新分" value={data.newScore} style={{ marginTop: 12 }} />
            <Statistic title="任务闭环率" value={`${data.closureRate}%`} style={{ marginTop: 12 }} />
            <Tag
              color={data.leak === "闭环健康" ? "green" : "red"}
              style={{ marginTop: 12 }}
            >
              {data.leak}
            </Tag>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
