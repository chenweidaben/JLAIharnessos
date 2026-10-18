/**
 * 健澜科技 jlmedaios - 病历逻辑关系检查前端页（M485-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：三栏输入（诊断/用药/手术）+ 冲突项红色 + 得分。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Col, Input, Layout, List, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface LogicRelationResult {
  diagnosis: string;
  medication: string;
  procedure: string;
  conflicts: string[];
}

interface LogicReport {
  conflictCount: number;
  score: number;
  conflicts: string[];
}

export default function EmrLogicRelationCheckPage() {
  const [diagnosis, setDiagnosis] = useState("");
  const [medication, setMedication] = useState("");
  const [procedure, setProcedure] = useState("");
  const [result, setResult] = useState<LogicRelationResult | null>(null);
  const [report, setReport] = useState<LogicReport | null>(null);

  const check = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-logic-relation-check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ diagnosis, medication, procedure }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.result ?? null);
        setReport(data?.report ?? null);
        message.success("检查完成");
      }
    } catch {
      message.error("检查失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历逻辑关系检查</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }}>
          <Row gutter={16}>
            <Col span={8}>
              <Input placeholder="诊断" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ marginBottom: 16 }} />
            </Col>
            <Col span={8}>
              <Input placeholder="用药" value={medication} onChange={(e) => setMedication(e.target.value)} style={{ marginBottom: 16 }} />
            </Col>
            <Col span={8}>
              <Input placeholder="手术" value={procedure} onChange={(e) => setProcedure(e.target.value)} style={{ marginBottom: 16 }} />
            </Col>
          </Row>
          <Button type="primary" onClick={check} style={{ background: VI.accent }}>
            检查
          </Button>
        </Card>
        {report && (
          <Card style={{ marginTop: 16 }}>
            <Statistic title="得分" value={report.score} suffix="分" />
            <Statistic title="冲突数" value={report.conflictCount} style={{ marginTop: 12 }} />
            {report.conflicts.length > 0 && (
              <List
                style={{ marginTop: 16 }}
                header={<Tag color="red">冲突项</Tag>}
                dataSource={report.conflicts}
                renderItem={(conflict) => <List.Item><Tag color="red">{conflict}</Tag></List.Item>}
              />
            )}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
