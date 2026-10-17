/**
 * 健澜科技 jlmedaios - 医疗设备维保到期提醒 V13 页（M313-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Alert, Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Row {
  deviceId: string;
  name: string;
  daysLeft: number;
  urgency: string;
}

interface Overdue {
  deviceId: string;
  name: string;
  daysLeft: number;
}

interface Resp {
  today: string;
  board: Row[];
  overdue: Overdue[];
}

const tagColor = (u: string): string =>
  u === "红" ? "red" : u === "橙" ? "orange" : u === "蓝" ? "blue" : "green";

export default function EquipmentMaintenancePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/equipment-maintenance?today=2026-10-17");
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
        <Title level={3} style={{ color: VI.deep }}>设备维保看板</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            {data.overdue.length > 0 && (
              <Alert type="error" message={`超期设备 ${data.overdue.length} 台`} showIcon style={{ marginBottom: 16 }} />
            )}
            <Card title={`到期分级（今日 ${data.today}）`}>
              <List
                dataSource={data.board}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta title={it.name} description={`剩余 ${it.daysLeft} 天`} />
                    <Tag color={tagColor(it.urgency)}>{it.urgency}</Tag>
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
