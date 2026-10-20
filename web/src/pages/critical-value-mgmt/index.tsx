/**
 * 健澜科技 jlmedaios - 危急值管理 V13 页（M411-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Empty, Layout, Row, Spin, Statistic, Table, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  criticalValueReportTimelyRate: number;
  criticalValueClosedLoopRate: number;
  criticalValueRegistrationPassRate: number;
}

export default function CriticalValueMgmtPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/critical-value-mgmt");
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
        <Title level={3} style={{ color: VI.deep }}>危急值管理</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="危急值报告及时率" value={data.criticalValueReportTimelyRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="危急值处理闭环率" value={data.criticalValueClosedLoopRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="危急值登记合格率" value={data.criticalValueRegistrationPassRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
        {/* v5.0试点扩展（M208薄页补表）：今日危急值 demo */}
        <Card style={{ marginTop: 16 }} title="今日危急值报告">
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={[
              { id: 1, patient: "张*三", item: "血钾", value: "6.8 mmol/L", time: "09:12", status: "已闭环" },
              { id: 2, patient: "李*四", item: "血糖", value: "2.3 mmol/L", time: "10:05", status: "已闭环" },
              { id: 3, patient: "王*五", item: "血红蛋白", value: "45 g/L", time: "11:30", status: "处理中" },
              { id: 4, patient: "赵*六", item: "血小板", value: "18×10^9/L", time: "13:45", status: "已闭环" },
              { id: 5, patient: "钱*七", item: "血钠", value: "158 mmol/L", time: "14:20", status: "待处理" },
            ]}
            columns={[
              { title: "患者", dataIndex: "patient" },
              { title: "项目", dataIndex: "item" },
              { title: "结果", dataIndex: "value" },
              { title: "报告时间", dataIndex: "time" },
              { title: "状态", dataIndex: "status", render: (s: string) => <Tag color={s === "已闭环" ? "green" : s === "处理中" ? "orange" : "red"}>{s}</Tag> },
            ]}
            locale={{ emptyText: <Empty description="暂无危急值" /> }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
