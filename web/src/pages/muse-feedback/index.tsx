/**
 * 健澜科技 jlmedaios - MUSE 建议采纳反馈 V13 页（M319-B）
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
  hitRate: number;
}

interface FeedbackClass {
  adopt: number;
  ignore: number;
  error: number;
}

interface Resp {
  dept: string;
  threshold: number;
  doctorRates: DoctorRow[];
  feedbackClassification: FeedbackClass;
  lowHitRateDoctors: DoctorRow[];
}

export default function MuseFeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/muse-feedback?dept=cardio");
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
        <Title level={3} style={{ color: VI.deep }}>MUSE 建议采纳反馈</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="医生命中率" style={{ marginBottom: 16 }}>
              <Table
                rowKey="doctorId"
                pagination={false}
                dataSource={data.doctorRates}
                columns={[
                  { title: "医生", dataIndex: "doctorId" },
                  { title: "命中率", dataIndex: "hitRate", render: (v: number) => `${v}%` },
                  {
                    title: "状态",
                    dataIndex: "hitRate",
                    render: (v: number) =>
                      v < data.threshold ? <Tag color="red">低命中率</Tag> : <Tag color="green">正常</Tag>,
                  },
                ]}
              />
            </Card>
            <Card title="反馈分类">
              <Statistic title="采纳" value={data.feedbackClassification.adopt} style={{ marginRight: 24 }} />
              <Statistic title="忽略" value={data.feedbackClassification.ignore} style={{ marginRight: 24 }} />
              <Statistic title="错误" value={data.feedbackClassification.error} />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
