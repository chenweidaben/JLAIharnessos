/**
 * 健澜科技 jlmedaios - Doctor MUSE 使用统计 V13 页（M319-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Statistic, Table, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DoctorRow {
  doctorId: string;
  count: number;
}

interface ScenarioDist {
  diagnosis: number;
  medication: number;
  sop: number;
}

interface Resp {
  dept: string;
  deptCallCount: number;
  doctorCallCounts: DoctorRow[];
  scenarioDistribution: ScenarioDist;
}

export default function DoctorMuseUsagePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/doctor-muse-usage?dept=cardio");
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
        <Title level={3} style={{ color: VI.deep }}>Doctor MUSE 使用统计</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title={`科室调用次数（${data.dept}）`} style={{ marginBottom: 16 }}>
              <Statistic title="调用次数" value={data.deptCallCount} />
            </Card>
            <Card title="医生调用次数" style={{ marginBottom: 16 }}>
              <Table
                rowKey="doctorId"
                pagination={false}
                dataSource={data.doctorCallCounts}
                columns={[
                  { title: "医生", dataIndex: "doctorId" },
                  { title: "调用次数", dataIndex: "count" },
                ]}
              />
            </Card>
            <Card title="场景分布">
              <Statistic title="诊断建议" value={data.scenarioDistribution.diagnosis} style={{ marginRight: 24 }} />
              <Statistic title="用药提醒" value={data.scenarioDistribution.medication} style={{ marginRight: 24 }} />
              <Statistic title="SOP 推荐" value={data.scenarioDistribution.sop} />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
