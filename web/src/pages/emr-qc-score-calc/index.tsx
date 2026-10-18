/**
 * 健澜科技 jlmedaios - 质控评分自动计算前端页（M492-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历缺陷输入 + 自动评分结果（得分大数字+扣分明细）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Deduction {
  rule: string;
  points: number;
}

interface ScoreCalcReport {
  totalDeduction: number;
  finalScore: number;
}

export default function EmrQcScoreCalcPage() {
  const [deductions] = useState<Deduction[]>([
    { rule: "缺主诉", points: 5 },
    { rule: "缺诊断", points: 10 },
  ]);
  const [score, setScore] = useState<number | null>(null);
  const [report, setReport] = useState<ScoreCalcReport | null>(null);

  const calculate = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-score-calc", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ deductions }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setScore(data?.data?.score ?? null);
        setReport(data?.data?.report ?? null);
        message.success("自动评分完成");
      }
    } catch {
      message.error("自动评分失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控评分自动计算</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="扣分明细">
          <List
            dataSource={deductions}
            renderItem={(item) => (
              <List.Item>
                <Text style={{ width: 200 }}>{item.rule}</Text>
                <Tag color="red">-{item.points} 分</Tag>
              </List.Item>
            )}
          />
          <Button type="primary" onClick={calculate} style={{ background: VI.accent, marginTop: 16 }}>
            自动计算得分
          </Button>
        </Card>
        {score !== null && (
          <Card style={{ marginTop: 16 }}>
            <Title level={2} style={{ color: VI.accent, margin: 0 }}>{score} 分</Title>
            <Text style={{ marginLeft: 24 }}>
              总扣分：{report?.totalDeduction ?? 0}，最终得分：{report?.finalScore ?? 0}
            </Text>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
