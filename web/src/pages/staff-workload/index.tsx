/**
 * 健澜科技 jlmedaios - 医护工作量与疲劳度监测 V13 页（M311-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Row {
  staffId: string;
  name: string;
  totalTasks: number;
  overtimeHours: number;
  avgPerDay: number;
  fatigue: string;
}

interface Overloaded {
  staffId: string;
  name: string;
}

interface Resp {
  board: Row[];
  overloaded: Overloaded[];
}

export default function StaffWorkloadPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/staff-workload");
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
        <Title level={3} style={{ color: VI.deep }}>医护工作量看板</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="工作量灯色" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.board}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta
                      title={it.name}
                      description={`${it.totalTasks} 任务 · 日均 ${it.avgPerDay} · 加班 ${it.overtimeHours}h`}
                    />
                    <Tag color={it.fatigue === "红灯" ? "red" : it.fatigue === "黄灯" ? "orange" : "green"}>
                      {it.fatigue}
                    </Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="过载名单（红灯）">
              {data.overloaded.map((o) => <Tag key={o.staffId} color="red">{o.name}</Tag>)}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
