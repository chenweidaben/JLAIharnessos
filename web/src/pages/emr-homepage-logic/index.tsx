/**
 * 健澜科技 jlmedaios - 病案首页逻辑校验前端页（M535-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病案首页逻辑校验（病历ID/科室/住院天数/年龄/是否手术/是否有效/错误列表）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface HomepageLogic {
  recordId: string;
  dept: string;
}

interface LogicResult {
  valid: boolean;
  errors: string[];
}

interface LogicReport {
  valid: boolean;
  errors: string[];
}

export default function EmrHomepageLogicPage() {
  const [logic, setLogic] = useState<HomepageLogic | null>(null);
  const [admissionDays, setAdmissionDays] = useState(7);
  const [age, setAge] = useState(45);
  const [hasSurgery, setHasSurgery] = useState(true);
  const [result, setResult] = useState<LogicResult | null>(null);
  const [report, setReport] = useState<LogicReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLogic = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-homepage-logic", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setLogic(data?.data ?? null);
        }
      } catch {
        message.error("加载首页逻辑校验基础数据失败");
      }
    };
    void fetchLogic();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-homepage-logic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ admissionDays, age, hasSurgery }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("校验完成");
      } else {
        message.error("校验失败");
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
        <Title level={3} style={{ color: VI.deep }}>病案首页逻辑校验</Title>
        {logic && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{logic.recordId}</Text>
              <Text strong>科室：</Text><Text>{logic.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="校验输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>住院天数：</Text>
              <Input
                type="number"
                value={admissionDays}
                onChange={(e) => setAdmissionDays(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>年龄：</Text>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>是否手术：</Text>
              <Switch checked={hasSurgery} onChange={setHasSurgery} style={{ marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doCheck}>
            执行校验
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="校验结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong>是否有效：</Text>
              <Tag color={report.valid ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                {report.valid ? "有效" : "无效"}
              </Tag>
            </div>
            <div>
              <Text strong>错误列表：</Text>
              <List
                size="small"
                dataSource={report.errors}
                style={{ marginTop: 8 }}
                renderItem={(item) => (
                  <List.Item>
                    <Tag color="red" style={{ marginBottom: 4 }}>{item}</Tag>
                  </List.Item>
                )}
              />
              {report.errors.length === 0 && <Text style={{ color: "#999", marginTop: 8, display: "block" }}>无错误</Text>}
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
