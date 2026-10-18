/**
 * 健澜科技 jlmedaios - 质控评分改进建议前端页（M492-D，M492 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：评分输入 + 改进建议列表（红差/橙中/黄良/绿优）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ScoreSuggestion {
  score: number;
  level: string;
  suggestions: string[];
}

interface SuggestionReport {
  level: string;
  suggestions: string[];
}

const levelColor: Record<string, string> = {
  差: "red",
  中: "orange",
  良: "gold",
  优: "green",
};

export default function EmrQcScoreSuggestionPage() {
  const [scoreInput, setScoreInput] = useState("85");
  const [suggestion, setSuggestion] = useState<ScoreSuggestion | null>(null);
  const [report, setReport] = useState<SuggestionReport | null>(null);

  const generate = async () => {
    try {
      const score = Number(scoreInput) || 0;
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-score-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ score }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setSuggestion(data?.data?.suggestion ?? null);
        setReport(data?.data?.report ?? null);
        message.success("改进建议生成完成");
      }
    } catch {
      message.error("改进建议生成失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控评分改进建议</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="评分输入">
          <TextArea
            rows={1}
            placeholder="输入评分（0-100）"
            value={scoreInput}
            onChange={(e) => setScoreInput(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" onClick={generate} style={{ background: VI.accent }}>
            生成改进建议
          </Button>
        </Card>
        {suggestion && (
          <Card style={{ marginTop: 16 }}>
            <Text strong>评分等级：</Text>
            <Tag color={levelColor[suggestion.level] ?? "default"}>{suggestion.level}</Tag>
            <Text style={{ marginLeft: 16 }}>得分：{suggestion.score}</Text>
            <Title level={5} style={{ marginTop: 16 }}>改进建议：</Title>
            <List
              dataSource={report?.suggestions ?? []}
              renderItem={(item) => <List.Item>{item}</List.Item>}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
