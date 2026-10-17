/**
 * 健澜科技 jlmedaios - 患者满意度闭环 V13 页（M311-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Dispatch {
  complaintId: string;
  owner: string;
  status: "open" | "resolved";
}

interface Resp {
  closureRate: number;
  dispatches: Dispatch[];
  totalComplaints: number;
}

export default function PatientSatisfactionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/patient-satisfaction");
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
        <Title level={3} style={{ color: VI.deep }}>患者满意度闭环</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Statistic title="闭环率" value={`${data.closureRate}%`} />
              <Tag color="blue" style={{ marginTop: 12 }}>差评总数 {data.totalComplaints}</Tag>
            </Card>
            <Card title="自动派单（低分≤3）">
              <List
                dataSource={data.dispatches}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta title={`投诉 ${it.complaintId}`} description={`责任：${it.owner}`} />
                    <Tag color={it.status === "resolved" ? "green" : "orange"}>{it.status}</Tag>
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
