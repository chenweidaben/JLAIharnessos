/**
 * 健澜科技 jlmedaios - 门诊流量预测与分时段建议 V13 页（M313-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DailyRow {
  dayOfWeek: number;
  volume: number;
}

interface SlotRow {
  slot: string;
  volume: number;
}

interface AllocRow {
  slot: string;
  suggestion: string;
}

interface Resp {
  daily: DailyRow[];
  slots: SlotRow[];
  allocation: AllocRow[];
}

export default function OutpatientFlowForecastPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/outpatient-flow-forecast?days=7");
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
        <Title level={3} style={{ color: VI.deep }}>门诊流量预测</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="每日预测" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.daily}
                renderItem={(d) => (
                  <List.Item>
                    <span>周{d.dayOfWeek}</span>
                    <Tag color="blue">{d.volume}</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="分时段流量" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.slots}
                renderItem={(s) => (
                  <List.Item>
                    <span>{s.slot}</span>
                    <Tag color="cyan">{s.volume}</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="号源建议">
              <List
                dataSource={data.allocation}
                renderItem={(a) => (
                  <List.Item>
                    <span>{a.slot}</span>
                    <Tag color={a.suggestion === "高峰加配号源" ? "orange" : "default"}>{a.suggestion}</Tag>
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
