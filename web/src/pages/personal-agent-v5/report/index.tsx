/**
 * 健澜科技 jlmedaios - Personal Agent 2.0 V5 页（M257-B）
 *
 * Doctor MUSE 2.0（医嘱推荐病历生成鉴别诊断用药建议科研助手主动服务）/Nurse MUSE 2.0（护理计划巡视提醒风险预警护理记录交接主动提醒）/Pharma MUSE 2.0（处方审核用药指导ADR药事咨询库存用药安全）/Admin MUSE 2.0（报表生成异常预警流程审批会议纪要决策支持）/Patient MUSE 2.0（导诊预约报告解读用药提醒随访健康宣教陪伴）/主动预警主动推荐主动提醒主动学习越用越聪明/成功记录失败复盘经验沉淀后继者继承持续进化/权限边界操作确认审计人工接管可解释边界守护。深海蓝 VI。
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
  doctorMUSE: { orderRecommend: number; noteGenerate: number; differentialDx: number; medicationAdvice: number; researchAssistant: number; proactiveService: number };
  nurseMUSE: { carePlan: number; roundingReminder: number; riskAlert: number; noteRecord: number; handover: number; proactiveReminder: number };
  pharmaMUSE: { rxReview: number; medicationGuidance: number; adr: number; consultation: number; inventory: number; safety: number };
  adminMUSE: { reportGenerate: number; anomalyAlert: number; approval: number; meetingMinutes: number; decisionSupport: number };
  patientMUSE: { triage: number; booking: number; reportInterpret: number; medicationReminder: number; followup: number; education: number; companion: number };
  proactive: { alert: number; recommend: number; reminder: number; learning: number; smarter: number };
  learningFlywheel: { successRecord: number; failureReview: number; experience: number; successor: number; evolution: number };
  safety: { permission: number; confirm: number; audit: number; takeover: number; explainability: number; guard: number };
  suggestions: string[];
}

export default function PersonalAgentV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/personal-agent-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>Personal Agent 2.0 V5</Title>
        <Paragraph type="secondary">Doctor MUSE·医嘱推荐·病历生成·鉴别诊断·用药建议·科研助手 / Nurse MUSE·护理计划·巡视提醒·风险预警·护理记录·交接 / Pharma MUSE·处方审核·用药指导·ADR·药事咨询·库存 / Admin MUSE·报表生成·异常预警·流程审批·会议纪要·决策支持 / Patient MUSE·导诊·预约·报告解读·用药提醒·随访·宣教·陪伴 / 主动预警·主动推荐·主动提醒·主动学习·越用越聪明 / 成功记录·失败复盘·经验沉淀·后继者继承·持续进化 / 权限边界·操作确认·审计·人工接管·可解释·边界守护</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="Doctor MUSE 医嘱推荐" value={data.doctorMUSE.orderRecommend} /></Card></Col>
              <Col span={6}><Card><Statistic title="主动服务" value={data.doctorMUSE.proactiveService} /></Card></Col>
              <Col span={6}><Card><Statistic title="学习飞轮" value={`${data.learningFlywheel.evolution}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="安全边界" value={`${data.safety.guard}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>Agent 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "nurse", name: "Nurse MUSE 风险预警", value: data.nurseMUSE.riskAlert },
                  { key: "pharma", name: "Pharma MUSE 处方审核", value: data.pharmaMUSE.rxReview },
                  { key: "patient", name: "Patient MUSE 用药提醒", value: data.patientMUSE.medicationReminder },
                  { key: "successor", name: "后继者继承率", value: `${data.learningFlywheel.successor}%` },
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
