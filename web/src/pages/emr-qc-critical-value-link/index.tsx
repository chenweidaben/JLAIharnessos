/**
 * 健澜科技 jlmedaios - 质控-危急值联动前端页（M515-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：质控-危急值联动（记录ID/危急值/已通知/一致性检查）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Checkbox, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface CriticalValueLink {
  recordId: string;
  criticalValue: string;
  notified: boolean;
}

interface CheckResult {
  pass: boolean;
  defects: string[];
}

interface CheckReport {
  pass: boolean;
  defectCount: number;
}

export default function EmrQcCriticalValueLinkPage() {
  const [link, setLink] = useState<CriticalValueLink | null>(null);
  const [hasReport, setHasReport] = useState(true);
  const [hasNotification, setHasNotification] = useState(true);
  const [hasDocResponse, setHasDocResponse] = useState(true);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-critical-value-link", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setLink(data?.data ?? null);
        }
      } catch {
        message.error("加载危急值联动失败");
      }
    };
    void fetchLink();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-critical-value-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ hasReport, hasNotification, hasDocResponse }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("检查完成");
      } else {
        message.error("检查失败");
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
        <Title level={3} style={{ color: VI.deep }}>质控-危急值联动</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="危急值联动数据">
          {link && (
            <div>
              <Text strong>记录ID：</Text><Text style={{ marginRight: 24 }}>{link.recordId}</Text>
              <Text strong>危急值：</Text><Text style={{ marginRight: 24 }}>{link.criticalValue}</Text>
              <Text strong>已通知：</Text>
              <Tag color={link.notified ? "green" : "red"}>{link.notified ? "是" : "否"}</Tag>
            </div>
          )}
        </Card>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="危急值一致性检查">
          <div style={{ marginBottom: 16 }}>
            <Checkbox checked={hasReport} onChange={(e) => setHasReport(e.target.checked)} style={{ marginRight: 24 }}>有危急值报告</Checkbox>
            <Checkbox checked={hasNotification} onChange={(e) => setHasNotification(e.target.checked)} style={{ marginRight: 24 }}>有危急值通知记录</Checkbox>
            <Checkbox checked={hasDocResponse} onChange={(e) => setHasDocResponse(e.target.checked)}>有医生响应记录</Checkbox>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doCheck}>
            检查
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="检查结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong>结果：</Text>
              <Tag color={report.pass ? "green" : "red"} style={{ marginLeft: 8 }}>
                {report.pass ? "通过" : "不通过"}
              </Tag>
              <Text style={{ marginLeft: 16 }}>缺陷数：{report.defectCount}</Text>
            </div>
            {result.defects.length > 0 && (
              <List
                dataSource={result.defects}
                renderItem={(item) => (
                  <List.Item>
                    <Tag color="red">{item}</Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
