/**
 * 健澜科技 jlmedaios - 医保结算 V13 页（M329-D）
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
  settlement: number;
  rejected: number;
  rejectionRate: number;
}

export default function InsuranceSettlementPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/insurance-settlement");
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
        <Title level={3} style={{ color: VI.deep }}>医保结算</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="结算金额" value={data.settlement} suffix="万元" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="拒付金额" value={data.rejected} suffix="万元" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="拒付率" value={data.rejectionRate} suffix="%" />
              </Card>
            </Col>
          </Row>
        )}
        {/* v5.0试点扩展（M208薄页补表）：近期医保结算 demo */}
        <Card style={{ marginTop: 16 }} title="近期医保结算明细">
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={[
              { id: 1, billNo: "YB20261019001", patient: "张*三", dept: "心内科", amount: 4820.50, status: "已结算" },
              { id: 2, billNo: "YB20261019002", patient: "李*四", dept: "呼吸科", amount: 3210.00, status: "已结算" },
              { id: 3, billNo: "YB20261019003", patient: "王*五", dept: "普外科", amount: 12800.00, status: "拒付" },
              { id: 4, billNo: "YB20261019004", patient: "赵*六", dept: "骨科", amount: 8900.00, status: "已结算" },
              { id: 5, billNo: "YB20261019005", patient: "钱*七", dept: "神经外科", amount: 21500.00, status: "审核中" },
            ]}
            columns={[
              { title: "结算单号", dataIndex: "billNo" },
              { title: "患者", dataIndex: "patient" },
              { title: "科室", dataIndex: "dept" },
              { title: "金额(元)", dataIndex: "amount", render: (v: number) => v.toFixed(2) },
              { title: "状态", dataIndex: "status", render: (s: string) => <Tag color={s === "已结算" ? "green" : s === "拒付" ? "red" : "orange"}>{s}</Tag> },
            ]}
            locale={{ emptyText: <Empty description="暂无结算记录" /> }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
