/**
 * 健澜科技 jlmedaios - 质控科室改进建议前端页（M501-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：科室改进建议（科室输入 + 建议列表）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ImproveReport {
  dept: string;
  suggestions: string[];
  count: number;
}

export default function EmrQcDeptImproveSuggestPage() {
  const [dept, setDept] = useState("");
  const [score, setScore] = useState<number>(80);
  const [report, setReport] = useState<ImproveReport | null>(null);
  const [loading, setLoading] = useState(false);

  const getSuggest = async () => {
    if (!dept.trim()) {
      message.warning("请输入科室名称");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-dept-improve-suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ dept, score }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setReport(data?.data?.report ?? null);
        message.success("建议生成完成");
      } else {
        message.error("生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>科室改进建议</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="科室信息输入">
          <Input
            style={{ width: 200, marginRight: 16 }}
            placeholder="科室名称"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
          />
          <Input
            type="number"
            style={{ width: 120, marginRight: 16 }}
            placeholder="评分"
            value={score}
            onChange={(e) => setScore(Number(e.target.value) || 0)}
          />
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={getSuggest}>
            生成建议
          </Button>
        </Card>
        {report && (
          <Card
            style={{ marginTop: 16 }}
            headStyle={{ background: VI.mid, color: "#fff" }}
            title={
              <span>
                {report.dept} - 改进建议
                <Tag color="default" style={{ marginLeft: 8 }}>共 {report.count} 条</Tag>
              </span>
            }
          >
            <List
              dataSource={report.suggestions}
              renderItem={(item, index) => (
                <List.Item>
                  <Tag color={VI.accent}>{index + 1}</Tag>
                  <Text>{item}</Text>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
