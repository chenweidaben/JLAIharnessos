/**
 * 健澜科技 jlmedaios - 手卫生依从性 V13 页（M318-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Statistic, Table, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DeptRow {
  dept: string;
  rate: number;
  isLow: boolean;
}

interface Resp {
  dept: string;
  threshold: number;
  overallRate: number;
  deptRates: DeptRow[];
}

export default function HandHygieneCompliancePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/hand-hygiene-compliance?dept=cardio");
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
        <Title level={3} style={{ color: VI.deep }}>手卫生依从性</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="整体依从率" style={{ marginBottom: 16 }}>
              <Statistic title="依从率" value={data.overallRate} suffix="%" />
              <span style={{ marginLeft: 16, color: "#999" }}>阈值 {data.threshold}%</span>
            </Card>
            <Card title="科室分组依从率">
              <Table
                rowKey="dept"
                pagination={false}
                dataSource={data.deptRates}
                columns={[
                  { title: "科室", dataIndex: "dept" },
                  { title: "依从率", dataIndex: "rate", render: (v: number) => `${v}%` },
                  {
                    title: "状态",
                    dataIndex: "isLow",
                    render: (isLow: boolean) =>
                      isLow ? <Tag color="red">低依从</Tag> : <Tag color="green">达标</Tag>,
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
