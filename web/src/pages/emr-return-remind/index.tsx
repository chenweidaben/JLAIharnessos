/**
 * 健澜科技 jlmedaios - 病历归还提醒前端页（M540-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历归还提醒（病历ID/借阅人/借阅天数/逾期阈值/是否逾期/提醒级别）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ReturnRemind {
  recordId: string;
  borrower: string;
}

interface RemindResult {
  overdue: boolean;
  remindLevel: string;
}

interface RemindReport {
  overdue: boolean;
  remindLevel: string;
}

export default function EmrReturnRemindPage() {
  const [base, setBase] = useState<ReturnRemind | null>(null);
  const [borrowDays, setBorrowDays] = useState(10);
  const [overdueThreshold, setOverdueThreshold] = useState(7);
  const [result, setResult] = useState<RemindResult | null>(null);
  const [report, setReport] = useState<RemindReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-return-remind", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载归还提醒基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doDetect = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-return-remind", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ borrowDays, overdueThreshold }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("检测完成");
      } else {
        message.error("检测失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历归还提醒</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>借阅人：</Text><Tag color="blue">{base.borrower}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="检测输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>借阅天数：</Text>
              <Input
                type="number"
                value={borrowDays}
                onChange={(e) => setBorrowDays(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>逾期阈值：</Text>
              <Input
                type="number"
                value={overdueThreshold}
                onChange={(e) => setOverdueThreshold(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doDetect}>
            执行检测
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="检测结果">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Text strong>是否逾期：</Text>
              <Tag color={report.overdue ? "red" : "green"} style={{ fontSize: 16 }}>
                {report.overdue ? "已逾期" : "未逾期"}
              </Tag>
              <Text strong>提醒级别：</Text>
              <Tag color={report.remindLevel === "紧急提醒" ? "red" : report.remindLevel === "普通提醒" ? "orange" : "default"} style={{ fontSize: 16 }}>
                {report.remindLevel}
              </Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
