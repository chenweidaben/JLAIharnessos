/**
 * 健澜科技 jlmedaios - 门诊次均费用 V13 页（M317-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DoctorRow {
  doctorId: string;
  avg: number;
  isHigh: boolean;
}

interface Resp {
  dept: string;
  threshold: number;
  deptAvg: number;
  doctorAvgs: DoctorRow[];
}

export default function OutpatientAvgCostPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/outpatient-avg-cost?dept=cardio");
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
        <Title level={3} style={{ color: VI.deep }}>门诊次均费用</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title={`科室次均费用（${data.dept}）`} style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 32, color: VI.deep }}>¥{data.deptAvg}</span>
              <span style={{ marginLeft: 16, color: "#999" }}>阈值 ¥{data.threshold}</span>
            </Card>
            <Card title="医生次均费用">
              <Table
                rowKey="doctorId"
                pagination={false}
                dataSource={data.doctorAvgs}
                columns={[
                  { title: "医生", dataIndex: "doctorId" },
                  { title: "次均费用", dataIndex: "avg" },
                  {
                    title: "状态",
                    dataIndex: "isHigh",
                    render: (isHigh: boolean) =>
                      isHigh ? <Tag color="red">超阈值</Tag> : <Tag color="green">正常</Tag>,
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
