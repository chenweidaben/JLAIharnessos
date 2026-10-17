/**
 * 健澜科技 jlmedaios - 门诊爽约率分析 V13 页（M314-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Table, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DoctorRow {
  doctorId: string;
  rate: number;
}

interface Resp {
  dept: string;
  deptRate: number;
  doctorRates: DoctorRow[];
  chronicPatients: string[];
}

export default function NoShowRatePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/no-show-rate?dept=cardio");
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
        <Title level={3} style={{ color: VI.deep }}>门诊爽约率分析</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title={`科室爽约率（${data.dept}）`} style={{ marginBottom: 16 }}>
              <Tag color={data.deptRate >= 20 ? "red" : "green"} style={{ fontSize: 18 }}>
                {data.deptRate}%
              </Tag>
            </Card>
            <Card title="医生爽约率" style={{ marginBottom: 16 }}>
              <Table
                rowKey="doctorId"
                pagination={false}
                dataSource={data.doctorRates}
                columns={[
                  { title: "医生", dataIndex: "doctorId" },
                  {
                    title: "爽约率",
                    dataIndex: "rate",
                    render: (r: number) => (
                      <Tag color={r >= 20 ? "red" : "green"}>{r}%</Tag>
                    ),
                  },
                ]}
              />
            </Card>
            <Card title="连续爽约患者（≥2 次）">
              <List
                dataSource={data.chronicPatients}
                renderItem={(pid) => (
                  <List.Item>
                    <Tag color="red">{pid}</Tag>
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
