/**
 * 健澜科技 jlmedaios - 质控季报前端页（M487-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：季报卡片（月份对比+指标值）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Statistic, Table, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface QuarterlyReport {
  quarter: string;
  metrics: { month: string; value: number }[];
}

interface QuarterlyAggregate {
  months: number;
  avgValue: number;
  maxValue: number;
}

const columns = [
  { title: "月份", dataIndex: "month", key: "month" },
  { title: "指标值", dataIndex: "value", key: "value" },
];

export default function EmrQcQuarterlyReportPage() {
  const [report, setReport] = useState<QuarterlyReport | null>(null);
  const [aggregate, setAggregate] = useState<QuarterlyAggregate | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-quarterly-report", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setReport(data?.report ?? null);
          setAggregate(data?.aggregate ?? null);
        }
      } catch {
        message.error("加载失败");
      }
    };
    fetchReport();
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控季报{report ? `（${report.quarter}）` : ""}</Title>
        {aggregate && (
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="月数" value={aggregate.months} />
              </Col>
              <Col span={8}>
                <Statistic title="平均得分" value={aggregate.avgValue} precision={1} suffix="分" />
              </Col>
              <Col span={8}>
                <Statistic title="最高得分" value={aggregate.maxValue} suffix="分" />
              </Col>
            </Row>
          </Card>
        )}
        {report && (
          <Card>
            <Table columns={columns} dataSource={report.metrics} rowKey="month" pagination={false} />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
