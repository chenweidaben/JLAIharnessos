/**
 * 健澜科技 jlmedaios - 处方点评合格率 V13 页（M318-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Statistic, Table, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface IrrationalClassification {
  indication: number;
  dosage: number;
  duplicate: number;
  interaction: number;
}

interface DoctorRow {
  doctorId: string;
  passRate: number;
}

interface Resp {
  dept: string;
  deptPassRate: number;
  irrationalClassification: IrrationalClassification;
  doctorPassRates: DoctorRow[];
}

export default function PrescriptionAuditPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/prescription-audit?dept=cardio");
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
        <Title level={3} style={{ color: VI.deep }}>处方点评合格率</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title={`科室处方合格率（${data.dept}）`} style={{ marginBottom: 16 }}>
              <Statistic title="合格率" value={data.deptPassRate} suffix="%" />
            </Card>
            <Card title="不合理处方分类" style={{ marginBottom: 16 }}>
              <Statistic title="适应症" value={data.irrationalClassification.indication} style={{ marginRight: 24 }} />
              <Statistic title="剂量" value={data.irrationalClassification.dosage} style={{ marginRight: 24 }} />
              <Statistic title="重复" value={data.irrationalClassification.duplicate} style={{ marginRight: 24 }} />
              <Statistic title="相互作用" value={data.irrationalClassification.interaction} />
            </Card>
            <Card title="医生处方合格率">
              <Table
                rowKey="doctorId"
                pagination={false}
                dataSource={data.doctorPassRates}
                columns={[
                  { title: "医生", dataIndex: "doctorId" },
                  { title: "合格率", dataIndex: "passRate", render: (v: number) => `${v}%` },
                  {
                    title: "状态",
                    dataIndex: "passRate",
                    render: (v: number) =>
                      v >= 80 ? <Tag color="green">合格</Tag> : <Tag color="red">待改进</Tag>,
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
