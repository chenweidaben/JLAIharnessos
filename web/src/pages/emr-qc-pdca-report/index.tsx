/**
 * 健澜科技 jlmedaios - 质控 PDCA 闭环报告前端页（M496-D，M496 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：PDCA 闭环报告（四阶段 Card P/D/C/A + 完成率进度条）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Progress, Row, Statistic, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PdcaReport {
  plan: string;
  do: string;
  check: string;
  act: string;
}

interface PdcaAggregate {
  total: number;
  completed: number;
  rate: number;
}

export default function EmrQcPdcaReportPage() {
  const [report, setReport] = useState<PdcaReport | null>(null);
  const [aggregate, setAggregate] = useState<PdcaAggregate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-pdca-report", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setReport(data?.data?.report ?? null);
          setAggregate(data?.data?.aggregate ?? null);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控 PDCA 闭环报告</Title>
        {aggregate && (
          <Card style={{ marginBottom: 16 }}>
            <Statistic title="总阶段" value={aggregate.total} style={{ display: "inline-block", marginRight: 32 }} />
            <Statistic title="已完成" value={aggregate.completed} style={{ display: "inline-block", marginRight: 32 }} />
            <Progress percent={aggregate.rate} style={{ width: 300, display: "inline-block" }} strokeColor={VI.accent} />
          </Card>
        )}
        <Row gutter={16}>
          <Col span={6}>
            <Card headStyle={{ background: VI.accent, color: "#fff" }} title="P 计划">
              <Text>{report?.plan ?? "-"}</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card headStyle={{ background: VI.mid, color: "#fff" }} title="D 执行">
              <Text>{report?.do ?? "-"}</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card headStyle={{ background: VI.deep, color: "#fff" }} title="C 检查">
              <Text>{report?.check ?? "-"}</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card headStyle={{ background: "#333", color: "#fff" }} title="A 处理">
              <Text>{report?.act ?? "-"}</Text>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
