/**
 * 健澜科技 jlmedaios - 药房库存预警 V13 页（M312-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Item {
  itemId: string;
  name: string;
  currentStock: number;
  safetyStock: number;
  expiryDaysFromNow: number;
}

interface Reorder {
  itemId: string;
  name: string;
  suggestQty: number;
}

interface Resp {
  lowStock: Item[];
  reorders: Reorder[];
  expiringSoon: Item[];
  days: number;
}

export default function PharmacyInventoryAlertPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/pharmacy-inventory-alert?days=7");
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
        <Title level={3} style={{ color: VI.deep }}>药房库存预警</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="低库存（红 Tag）" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.lowStock}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta title={it.name} description={`当前 ${it.currentStock} / 安全 ${it.safetyStock}`} />
                    <Tag color="red">低库存</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="补货建议" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.reorders}
                renderItem={(r) => (
                  <List.Item>
                    <span>{r.name}</span>
                    <Tag color="blue">建议补 {r.suggestQty}</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title={`近效期（≤${data.days} 天，橙 Tag）`}>
              {data.expiringSoon.map((e) => (
                <Tag key={e.itemId} color="orange">{e.name} · ${e.expiryDaysFromNow}天后到期</Tag>
              ))}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
