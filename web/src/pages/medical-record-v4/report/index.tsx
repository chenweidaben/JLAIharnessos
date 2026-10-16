/**
 * 健澜科技 jlmedaios - 病案 V4 页（M252-B）
 *
 * 出院病案回收及时率缺页漏项AI智能核查/编号排序装订归档上架借阅数字化加工/ICD-10/ICD-9-CM-3编码准确率质控AI辅助/运行终末内涵甲级率丙级率缺陷AI质控/申请审核复印邮寄收费电子在线查阅/门诊住院手术病种DRG-DIP-CMI统计/电子病案扫描数据库查询共享安全/库房安全保密利用销毁档案法评级。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  retrieval: { discharge: number; returnRate: number; missing: number };
  archive: { numbering: number; binding: number; digitize: number; borrow: number };
  coding: { icd10: number; icd9: number; accuracy: number; ai: number };
  quality: { active: number; final: number; gradeA: number; gradeC: number; aiQc: number };
  copy: { application: number; audit: number; mail: number; eOnline: number };
  stat: { drg: number; dip: number; cmi: number };
  suggestions: string[];
}

export default function MedicalRecordV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/medical-record-v4/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病案 V4</Title>
        <Paragraph type="secondary">出院·回收·及时率·缺页·AI 核查 / 编号·排序·装订·归档·借阅·数字化 / ICD-10·ICD-9-CM-3·编码准确率·AI 辅助 / 运行·终末·甲级率·丙级率·AI 质控 / 申请·审核·复印·邮寄·电子在线 / 门诊·住院·手术·DRG·DIP·CMI / 电子病案·扫描·共享·安全 / 库房·保密·销毁·档案法评级</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="出院病案" value={data.retrieval.discharge} /></Card></Col>
              <Col span={6}><Card><Statistic title="编码准确率" value={`${data.coding.accuracy}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="甲级病案" value={data.quality.gradeA} /></Card></Col>
              <Col span={6}><Card><Statistic title="CMI" value={data.stat.cmi} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>病案明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "missing", name: "缺页漏项", value: data.retrieval.missing },
                  { key: "digitize", name: "数字化加工", value: data.archive.digitize },
                  { key: "gradeC", name: "丙级病案", value: data.quality.gradeC },
                  { key: "eOnline", name: "电子在线查阅", value: data.copy.eOnline },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "数值", dataIndex: "value", key: "value" },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
