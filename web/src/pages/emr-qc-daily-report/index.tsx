/**
 * 健澜科技 jlmedaios - 质控日报前端页（M487-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：日报卡片（日期+当日质控指标大数字）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Statistic, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DailyReport {
  date: string;
  metrics: { name: string; value: number }[];
}

interface DailyAggregate {
  count: number;
  avgValue: number;
}

export default function EmrQcDailyReportPage() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [aggregate, setAggregate] = useState<DailyAggregate | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-daily-report", {
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
        <Title level={3} style={{ color: VI.deep }}>质控日报{report ? `（${report.date}）` : ""}</Title>
        {aggregate && (
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="指标数" value={aggregate.count} />
              </Col>
              <Col span={12}>
                <Statistic title="平均得分" value={aggregate.avgValue} precision={1} suffix="分" />
              </Col>
            </Row>
          </Card>
        )}
        {report && (
          <Row gutter={16}>
            {report.metrics.map((m) => (
              <Col span={8} key={m.name} style={{ marginBottom: 16 }}>
                <Card headStyle={{ background: VI.mid, color: "#fff" }} title={m.name}>
                  <Statistic value={m.value} suffix="%" />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Content>
    </Layout>
  );
}
