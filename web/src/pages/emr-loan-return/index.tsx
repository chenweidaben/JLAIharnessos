/**
 * 健澜科技 jlmedaios - 病历借阅归还管理前端页（M534-D，V14，EMR 深化四模块，M534 收官）
 *
 * 深海蓝VI：病历借阅归还管理（病历ID/借阅人/借出日期/归还日期/是否归还/逾期天数/提示）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface LoanReturn {
  recordId: string;
  borrower: string;
}

interface ReturnResult {
  returned: boolean;
  overdueDays: number;
}

interface ReturnReport {
  returned: boolean;
  overdueDays: number;
  hint: string;
}

export default function EmrLoanReturnPage() {
  const [loan, setLoan] = useState<LoanReturn | null>(null);
  const [recordId, setRecordId] = useState("REC104");
  const [borrowedDate, setBorrowedDate] = useState("2026-10-10");
  const [returnedDate, setReturnedDate] = useState("2026-10-12");
  const [result, setResult] = useState<ReturnResult | null>(null);
  const [report, setReport] = useState<ReturnReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLoan = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-loan-return", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setLoan(data?.data ?? null);
        }
      } catch {
        message.error("加载借阅归还基础数据失败");
      }
    };
    void fetchLoan();
  }, []);

  const doRecord = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-loan-return", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          recordId,
          borrowedDate,
          returnedDate: returnedDate === "" ? null : returnedDate,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("记录完成");
      } else {
        message.error("记录失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历借阅归还管理</Title>
        {loan && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{loan.recordId}</Text>
              <Text strong>借阅人：</Text><Text>{loan.borrower}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="记录输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>病历ID：</Text>
              <Input value={recordId} onChange={(e) => setRecordId(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>借出日期：</Text>
              <Input value={borrowedDate} onChange={(e) => setBorrowedDate(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>归还日期（空=未还）：</Text>
              <Input value={returnedDate} onChange={(e) => setReturnedDate(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doRecord}>
            记录归还
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="记录结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>是否归还：</Text>
                <Tag color={report.returned ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.returned ? "已归还" : "未归还"}
                </Tag>
              </div>
              <Statistic title="逾期天数" value={report.overdueDays} />
              <div>
                <Text strong>提示：</Text>
                <Tag color={report.returned ? "green" : "orange"} style={{ marginLeft: 8, fontSize: 14 }}>
                  {report.hint}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
