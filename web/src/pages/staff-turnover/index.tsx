/**
 * 健澜科技 jlmedaios - 人员流失率 V13 页（M317-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DeptRate {
  dept: string;
  rate: number;
}

interface Resp {
  month: string;
  threshold: number;
  monthlyRate: number;
  deptRates: DeptRate[];
  highTurnoverDepts: DeptRate[];
}

export default function StaffTurnoverPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/staff-turnover?month=2026-09");
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
        <Title level={3} style={{ color: VI.deep }}>人员流失率</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title={`月度离职率（${data.month}）`} style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 32, color: VI.deep }}>{data.monthlyRate}%</span>
              <span style={{ marginLeft: 16, color: "#999" }}>预警阈值 {data.threshold}%</span>
            </Card>
            <Card title="科室分组流失率">
              <Table
                rowKey="dept"
                pagination={false}
                dataSource={data.deptRates}
                columns={[
                  { title: "科室", dataIndex: "dept" },
                  { title: "流失率", dataIndex: "rate", render: (v: number) => `${v}%` },
                  {
                    title: "预警",
                    dataIndex: "rate",
                    render: (v: number) =>
                      v > data.threshold ? <Tag color="red">高流失</Tag> : <Tag color="green">正常</Tag>,
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
