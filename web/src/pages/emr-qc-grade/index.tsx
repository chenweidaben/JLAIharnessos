/**
 * 健澜科技 jlmedaios - 病历质控等级评定前端页（M479-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：分数输入框 + 等级徽章（优秀绿/良好蓝/合格黄/不合格红）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Spin, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

const gradeColor: Record<string, string> = {
  "优秀": "green",
  "良好": "blue",
  "合格": "orange",
  "不合格": "red",
};

export default function EmrQcGradePage() {
  const [score, setScore] = useState<string>("90");
  const [grade, setGrade] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const evaluate = async () => {
    const numScore = Number(score);
    if (Number.isNaN(numScore)) {
      message.error("请输入有效数字");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-grade", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ score: numScore }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setGrade(data?.result?.grade ?? null);
      }
    } catch {
      message.error("评定失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控等级评定</Title>
        <Spin spinning={loading}>
          <Card headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
            <Text strong>质控分数（0-100）：</Text>
            <Input
              value={score}
              onChange={(e) => setScore(e.target.value)}
              style={{ width: 200, marginTop: 8 }}
              placeholder="请输入分数"
            />
            <Button type="primary" onClick={evaluate} style={{ background: VI.accent, marginTop: 16, marginLeft: 16 }}>
              评定等级
            </Button>
          </Card>
          {grade !== null && (
            <Card title="评定结果" headStyle={{ background: VI.mid, color: "#fff" }}>
              <Tag color={gradeColor[grade] ?? "default"} style={{ fontSize: 16, padding: "8px 16px" }}>
                {grade}
              </Tag>
              <br />
              <Text type="secondary" style={{ marginTop: 8, display: "inline-block" }}>
                规则：≥90 优秀 / 80-89 良好 / 60-79 合格 / &lt;60 不合格
              </Text>
            </Card>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
