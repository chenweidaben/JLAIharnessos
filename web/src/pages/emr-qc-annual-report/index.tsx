/**
 * 健澜科技 jlmedaios - 质控年报前端页（M487-D，M487 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：年报汇总卡片（年度趋势+4 季度对比）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Statistic, Table, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AnnualReport {
  year: string;
  metrics: { quarter: string; value: number }[];
}

interface AnnualAggregate {
  quarters: number;
  avgValue: number;
  maxValue: number;
}

const columns = [
  { title: "季度", dataIndex: "quarter", key: "quarter" },
  { title: "指标值", dataIndex: "value", key: "value" },
];

export default function EmrQcAnnualReportPage() {
  const [report, setReport] = useState<AnnualReport | null>(null);
  const [aggregate, setAggregate] = useState<AnnualAggregate | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-annual-report", {
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
        <Title level={3} style={{ color: VI.deep }}>质控年报{report ? `（${report.year}）` : ""}</Title>
        {aggregate && (
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="季数" value={aggregate.quarters} />
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
            <Table columns={columns} dataSource={report.metrics} rowKey="quarter" pagination={false} />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
