/**
 * 健澜科技 jlmedaios - 病历借阅登记管理前端页（M540-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历借阅登记管理（病历ID/借阅人/科室/借阅日期/登记状态）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface BorrowRecord {
  recordId: string;
  borrower: string;
}

interface RegisterResult {
  recordId: string;
  status: string;
}

interface RegisterReport {
  recordId: string;
  status: string;
}

export default function EmrBorrowRecordPage() {
  const [base, setBase] = useState<BorrowRecord | null>(null);
  const [recordId, setRecordId] = useState("REC701");
  const [borrower, setBorrower] = useState("王医生");
  const [dept, setDept] = useState("心内科");
  const [borrowDate, setBorrowDate] = useState("2026-10-15");
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [report, setReport] = useState<RegisterReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-borrow-record", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载借阅登记基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doRegister = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-borrow-record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ recordId, borrower, dept, borrowDate }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("登记完成");
      } else {
        message.error("登记失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历借阅登记管理</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>借阅人：</Text><Tag color="blue">{base.borrower}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="登记输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>病历ID：</Text>
              <Input value={recordId} onChange={(e) => setRecordId(e.target.value)} style={{ width: 140, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>借阅人：</Text>
              <Input value={borrower} onChange={(e) => setBorrower(e.target.value)} style={{ width: 140, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>科室：</Text>
              <Input value={dept} onChange={(e) => setDept(e.target.value)} style={{ width: 140, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>借阅日期：</Text>
              <Input value={borrowDate} onChange={(e) => setBorrowDate(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doRegister}>
            执行登记
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="登记结果">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{report.recordId}</Text>
              <Text strong>登记状态：</Text>
              <Tag color="green" style={{ fontSize: 16 }}>{report.status}</Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
