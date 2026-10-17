/**
 * 健澜科技 jlmedaios - 慢病管理达标率 V13 页（M316-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Statistic, Table, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DoctorRow {
  doctorId: string;
  total: number;
  controlled: number;
  rate: number;
}

interface Resp {
  disease: string;
  hypertensionRate: number;
  diabetesRate: number;
  doctorGroups: DoctorRow[];
}

export default function ChronicDiseaseMgmtPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/chronic-disease-mgmt?disease=hypertension");
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
        <Title level={3} style={{ color: VI.deep }}>慢病管理达标率</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="达标率" style={{ marginBottom: 16 }}>
              <Statistic title="高血压达标率" value={data.hypertensionRate} suffix="%" style={{ marginRight: 48 }} />
              <Statistic title="糖尿病达标率" value={data.diabetesRate} suffix="%" />
            </Card>
            <Card title="按医生分组（高血压达标）">
              <Table
                rowKey="doctorId"
                pagination={false}
                dataSource={data.doctorGroups}
                columns={[
                  { title: "医生", dataIndex: "doctorId" },
                  { title: "总患者", dataIndex: "total" },
                  { title: "达标", dataIndex: "controlled" },
                  {
                    title: "达标率",
                    dataIndex: "rate",
                    render: (r: number) => (
                      <Tag color={r >= 80 ? "green" : r >= 60 ? "orange" : "red"}>{r}%</Tag>
                    ),
                  },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
