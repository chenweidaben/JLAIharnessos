/**
 * 健澜科技 jlmedaios - 采购周期预警 V13 页（M317-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface OrderRow {
  orderId: string;
  itemName: string;
  leadTimeDays: number;
  alert: "red" | "yellow" | "none";
}

interface Resp {
  avgLeadTime: number;
  delayedOrders: OrderRow[];
}

const alertColor = (a: "red" | "yellow" | "none"): string => {
  if (a === "red") return "red";
  if (a === "yellow") return "gold";
  return "green";
};

export default function ProcurementLeadTimePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/procurement-lead-time");
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
        <Title level={3} style={{ color: VI.deep }}>采购周期预警</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="平均采购周期" style={{ marginBottom: 16 }}>
              <Statistic title="平均周期" value={data.avgLeadTime} precision={1} suffix="天" />
            </Card>
            <Card title="延迟订单（黄/红牌）">
              <List
                dataSource={data.delayedOrders}
                renderItem={(o) => (
                  <List.Item>
                    <span>{o.orderId} · {o.itemName} · {o.leadTimeDays}天</span>
                    <Tag color={alertColor(o.alert)}>{o.alert === "red" ? "红牌" : "黄牌"}</Tag>
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
