/**
 * 健澜科技 jlmedaios - DRG 费用超支预警 V13 页（M313-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Table, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Summary {
  dept: string;
  cases: number;
  avgVariance: number;
  overrunCount: number;
  saveCount: number;
}

interface CaseRow {
  caseId: string;
  dept: string;
  actualCost: number;
  drgStandard: number;
  variance: number;
  classification: string;
}

interface Resp {
  summaries: Summary[];
  cases: CaseRow[];
}

export default function DrgCostOverrunPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/drg-cost-overrun?dept=cardio");
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
        <Title level={3} style={{ color: VI.deep }}>DRG 费用超支预警</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="科室汇总" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.summaries}
                renderItem={(s) => (
                  <List.Item>
                    <List.Item.Meta title={s.dept} description={`平均偏差 ${s.avgVariance} · ${s.cases} 例`} />
                    <Tag color="red">超支 {s.overrunCount}</Tag>
                    <Tag color="green" style={{ marginLeft: 8 }}>节省 {s.saveCount}</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="病例明细">
              <Table
                rowKey="caseId"
                pagination={false}
                dataSource={data.cases}
                columns={[
                  { title: "病例", dataIndex: "caseId" },
                  { title: "实际", dataIndex: "actualCost" },
                  { title: "DRG标准", dataIndex: "drgStandard" },
                  { title: "偏差", dataIndex: "variance" },
                  {
                    title: "分类",
                    dataIndex: "classification",
                    render: (c: string) => (
                      <Tag color={c === "超支" ? "red" : c === "节省" ? "green" : "blue"}>{c}</Tag>
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
