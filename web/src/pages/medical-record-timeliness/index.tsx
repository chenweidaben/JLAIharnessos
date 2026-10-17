/**
 * 健澜科技 jlmedaios - 病历书写及时性 V13 页（M318-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface OverdueRecord {
  recordId: string;
  doctorId: string;
  overdueItems: string[];
}

interface Resp {
  dept: string;
  admissionRate: number;
  firstProgressRate: number;
  overdueRecords: OverdueRecord[];
}

export default function MedicalRecordTimelinessPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/medical-record-timeliness?dept=cardio");
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
        <Title level={3} style={{ color: VI.deep }}>病历书写及时性</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="达标率" style={{ marginBottom: 16 }}>
              <Statistic title="入院记录 24h 达标率" value={data.admissionRate} suffix="%" style={{ marginRight: 24 }} />
              <Statistic title="首次病程 8h 达标率" value={data.firstProgressRate} suffix="%" />
            </Card>
            <Card title="超时记录（红牌）">
              <List
                dataSource={data.overdueRecords}
                renderItem={(r) => (
                  <List.Item>
                    <span>{r.recordId} · {r.doctorId}</span>
                    <Tag color="red">{r.overdueItems.join(", ")}</Tag>
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
