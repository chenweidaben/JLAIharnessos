/**
 * 健澜科技 jlmedaios - 质控 PDCA 改进计划前端页（M504-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：PDCA 改进计划（标题/当前阶段）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Form, Input, Layout, Steps, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PdcaReport {
  title: string;
  currentPhase: string;
  nextPhase: string;
  isComplete: boolean;
}

const phaseMap: Record<string, number> = { P: 0, D: 1, C: 2, A: 3, 完成: 4 };

export default function EmrQcPdcaPlanPage() {
  const [title, setTitle] = useState("");
  const [currentPhase, setCurrentPhase] = useState<string>("P");
  const [report, setReport] = useState<PdcaReport | null>(null);
  const [loading, setLoading] = useState(false);

  const submitPlan = async () => {
    if (!title.trim()) {
      message.warning("请输入计划标题");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-pdca-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ title, currentPhase }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setReport(data?.data?.report ?? null);
        message.success(`提交成功，下一阶段：${data?.data?.nextPhase ?? ""}`);
      } else {
        message.error("提交失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>PDCA 改进计划</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="计划提交">
          <Form layout="inline">
            <Form.Item label="计划标题">
              <Input placeholder="如：降低病历缺陷率" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Form.Item>
            <Form.Item label="当前阶段">
              <Input
                placeholder="P/D/C/A"
                value={currentPhase}
                onChange={(e) => setCurrentPhase(e.target.value)}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={submitPlan}>
                提交计划
              </Button>
            </Form.Item>
          </Form>
        </Card>
        {report && (
          <Card style={{ marginTop: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="阶段推进">
            <Steps
              current={phaseMap[report.currentPhase] ?? 0}
              items={[
                { title: "P 计划" },
                { title: "D 执行" },
                { title: "C 检查" },
                { title: "A 处理" },
                { title: "完成" },
              ]}
            />
            <Text style={{ marginTop: 16, display: "block" }}>
              当前阶段：
              <Tag color={VI.accent} style={{ marginLeft: 8 }}>{report.currentPhase}</Tag>
              下一阶段：
              <Tag color={report.isComplete ? "green" : "orange"} style={{ marginLeft: 8 }}>
                {report.nextPhase}
              </Tag>
            </Text>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
