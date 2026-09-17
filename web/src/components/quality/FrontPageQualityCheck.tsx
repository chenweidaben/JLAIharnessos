/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 病案首页质控：首页数据展示 + ICD编码校验 + 逻辑检查 + DRG分组预测
 */
import { useEffect, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  List,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CodeOutlined,
  ApartmentOutlined,
  FundOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { FrontPageRecord } from '@/types/quality';
import { useQualityStore } from '@/store/qualityStore';

const ADMISSION_CONDITION_LABEL: Record<
  FrontPageRecord['mainDiagnosis']['admissionCondition'],
  string
> = {
  new: '有',
  complication: '并发症',
  comorbidity: '伴随',
  no_change: '无变化',
};

const LEVEL_TAG: Record<string, string> = { minor: 'default', major: 'warning', critical: 'error' };

const PROFIT_LABEL = {
  profit: { text: '盈利', color: 'success' },
  balance: { text: '持平', color: 'default' },
  loss: { text: '亏损', color: 'error' },
} as const;

export default function FrontPageQualityCheck() {
  const { frontPageRecords, fetchFrontPageRecords, loading } = useQualityStore();
  const [current, setCurrent] = useState<FrontPageRecord | null>(null);

  useEffect(() => {
    void fetchFrontPageRecords();
  }, [fetchFrontPageRecords]);

  useEffect(() => {
    if (frontPageRecords.length && !current) setCurrent(frontPageRecords[0]);
  }, [frontPageRecords, current]);

  const drg = current?.drg;
  const gradeColor =
    current?.grade === 'A' ? 'success' : current?.grade === 'B' ? 'warning' : 'error';

  return (
    <div className="flex gap-3">
      {/* 左侧首页列表 */}
      <Card
        size="small"
        title="病案首页列表"
        className="w-64 shrink-0"
        styles={{ body: { padding: 8 } }}
        loading={loading}
      >
        <List
          size="small"
          dataSource={frontPageRecords}
          renderItem={(r) => (
            <List.Item
              className={`cursor-pointer rounded px-2 ${current?.recordNo === r.recordNo ? 'bg-jl-primary/10' : ''}`}
              onClick={() => setCurrent(r)}
            >
              <List.Item.Meta
                avatar={<Avatar style={{ background: '#0A4D8C' }}>{r.patientName[0]}</Avatar>}
                title={<span className="text-xs">{r.recordNo}</span>}
                description={
                  <span className="text-[10px]">
                    {r.dept} · {r.mainDiagnosis.name}
                  </span>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 右侧详情 */}
      <div className="flex-1 space-y-3 overflow-auto">
        {current ? (
          <>
            {/* 基本信息 + 评分 */}
            <Card
              size="small"
              className="shadow-card"
              title={
                <Space>
                  <span>病案首页 · {current.recordNo}</span>
                  <Tag color={gradeColor}>
                    {current.grade === 'A' ? '甲级' : current.grade === 'B' ? '乙级' : '丙级'}
                  </Tag>
                </Space>
              }
              extra={
                <Space>
                  <Statistic title="首页评分" value={current.score} suffix="分" />
                </Space>
              }
            >
              <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }} bordered>
                <Descriptions.Item label="患者">{current.patientName}</Descriptions.Item>
                <Descriptions.Item label="性别/年龄">
                  {current.gender === 'male' ? '男' : '女'} / {current.age}岁
                </Descriptions.Item>
                <Descriptions.Item label="科室">{current.dept}</Descriptions.Item>
                <Descriptions.Item label="主治医生">{current.attendDoctor}</Descriptions.Item>
                <Descriptions.Item label="入院日期">{current.admitDate}</Descriptions.Item>
                <Descriptions.Item label="出院日期">{current.dischargeDate}</Descriptions.Item>
                <Descriptions.Item label="住院日">{current.los} 天</Descriptions.Item>
                <Descriptions.Item label="总费用">
                  ¥{current.totalCost.toFixed(2)}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 诊断与手术 */}
            <Row gutter={3}>
              <Col xs={24} lg={14}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <CodeOutlined className="text-jl-primary" />
                      诊断信息（ICD-10）
                    </Space>
                  }
                  className="shadow-card"
                >
                  <Table
                    size="small"
                    pagination={false}
                    rowKey="code"
                    dataSource={[current.mainDiagnosis, ...current.otherDiagnoses]}
                    columns={[
                      {
                        title: '',
                        width: 50,
                        render: (_v, _r, i) =>
                          i === 0 ? <Tag color="blue">主诊</Tag> : <Tag>其他</Tag>,
                      },
                      { title: 'ICD-10编码', dataIndex: 'code', width: 100 },
                      { title: '诊断名称', dataIndex: 'name' },
                      {
                        title: '入院病情',
                        dataIndex: 'admissionCondition',
                        width: 90,
                        render: (v: keyof typeof ADMISSION_CONDITION_LABEL) =>
                          ADMISSION_CONDITION_LABEL[v],
                      },
                      {
                        title: '校验',
                        width: 70,
                        render: (_, r) =>
                          r.isValid ? (
                            <CheckCircleOutlined className="text-success" />
                          ) : (
                            <WarningOutlined className="text-danger" />
                          ),
                      },
                    ]}
                  />
                </Card>
              </Col>
              <Col xs={24} lg={10}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <ApartmentOutlined className="text-jl-primary" />
                      手术操作（ICD-9-CM-3）
                    </Space>
                  }
                  className="shadow-card"
                >
                  {current.surgeries.length === 0 ? (
                    <div className="py-6 text-center text-xs text-ink-secondary">
                      本次住院无手术操作
                    </div>
                  ) : (
                    <Table
                      size="small"
                      pagination={false}
                      rowKey="code"
                      dataSource={current.surgeries}
                      columns={[
                        { title: '编码', dataIndex: 'code', width: 80 },
                        { title: '手术名称', dataIndex: 'name' },
                        { title: '术者', dataIndex: 'surgeon', width: 80 },
                        { title: '切口', dataIndex: 'incisionGrade', width: 50 },
                        { title: '愈合', dataIndex: 'healingGrade', width: 50 },
                      ]}
                    />
                  )}
                </Card>
              </Col>
            </Row>

            {/* 编码校验 + 逻辑检查 */}
            <Row gutter={3}>
              <Col xs={24} lg={12}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <CodeOutlined className="text-warning" />
                      编码校验问题（{current.codingIssues.length}）
                    </Space>
                  }
                  className="shadow-card"
                >
                  <List
                    size="small"
                    dataSource={current.codingIssues}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space size={4}>
                              <Tag color={LEVEL_TAG[item.level]}>{item.field}</Tag>
                            </Space>
                          }
                          description={
                            <div>
                              <div className="text-xs">{item.issue}</div>
                              {item.aiRecommendedCode && (
                                <div className="mt-1">
                                  <Tag color="geekblue">
                                    AI推荐：{item.aiRecommendedCode} {item.aiRecommendedName}
                                  </Tag>
                                  <Button
                                    size="small"
                                    type="link"
                                    onClick={() =>
                                      message.success(`已应用AI编码建议：${item.aiRecommendedCode}`)
                                    }
                                  >
                                    采用建议
                                  </Button>
                                </div>
                              )}
                              <div className="mt-0.5 text-[10px] text-ink-secondary">
                                建议：{item.suggestion}
                              </div>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <WarningOutlined className="text-jl-primary" />
                      逻辑检查
                    </Space>
                  }
                  className="shadow-card"
                >
                  <List
                    size="small"
                    dataSource={current.logicIssues}
                    renderItem={(item) => (
                      <List.Item>
                        <Space>
                          {item.level === 'minor' && item.message.includes('正常') ? (
                            <CheckCircleOutlined className="text-success" />
                          ) : (
                            <WarningOutlined className="text-warning" />
                          )}
                          <div>
                            <div className="text-xs font-medium">{item.rule}</div>
                            <div className="text-[10px] text-ink-secondary">{item.message}</div>
                          </div>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>

            {/* DRG 分组预测 */}
            {drg && (
              <Card
                size="small"
                title={
                  <Space>
                    <FundOutlined className="text-jl-primary" />
                    DRG 分组预测
                  </Space>
                }
                className="shadow-card"
              >
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Descriptions size="small" column={1}>
                      <Descriptions.Item label="DRG组">
                        <Tag color="blue">{drg.groupCode}</Tag> {drg.groupName}
                      </Descriptions.Item>
                      <Descriptions.Item label="相对权重（RW）">{drg.rw}</Descriptions.Item>
                      <Descriptions.Item label="盈亏预测">
                        <Tag color={PROFIT_LABEL[drg.profitPrediction].color}>
                          {PROFIT_LABEL[drg.profitPrediction].text}
                        </Tag>
                      </Descriptions.Item>
                    </Descriptions>
                  </Col>
                  <Col xs={24} md={8}>
                    <div className="mb-2 text-xs text-ink-secondary">
                      费用偏差（实际 {drg.actualCost} / 预估 {drg.estimatedCost}）
                    </div>
                    <Progress
                      percent={Math.abs(drg.costDeviation)}
                      status={drg.costDeviation > 5 ? 'exception' : 'active'}
                      format={() => `${drg.costDeviation > 0 ? '+' : ''}${drg.costDeviation}%`}
                      strokeColor="#0A4D8C"
                    />
                    <div className="mt-2 text-xs text-ink-secondary">
                      时间偏差（实际 {drg.actualLOS}天 / 预估 {drg.estimatedLOS}天）
                    </div>
                    <Progress
                      percent={Math.abs(drg.timeDeviation)}
                      status={drg.timeDeviation > 10 ? 'exception' : 'active'}
                      format={() => `${drg.timeDeviation > 0 ? '+' : ''}${drg.timeDeviation}%`}
                      strokeColor="#13C2C2"
                    />
                  </Col>
                  <Col xs={24} md={8}>
                    <Space direction="vertical">
                      <Tag color={drg.lowRiskDeath ? 'error' : 'default'}>
                        {drg.lowRiskDeath ? '⚠ 低风险死亡标识' : '低风险死亡：无'}
                      </Tag>
                      <Tag color={drg.lowRiskReadmit ? 'error' : 'default'}>
                        {drg.lowRiskReadmit ? '⚠ 低风险再入院标识' : '低风险再入院：无'}
                      </Tag>
                      <Tooltip title="DRG分组结果仅供参考，最终以医保结算为准">
                        <Button
                          size="small"
                          type="link"
                          onClick={() => message.info('已生成DRG分析报告')}
                        >
                          查看DRG分析报告
                        </Button>
                      </Tooltip>
                    </Space>
                  </Col>
                </Row>
              </Card>
            )}
          </>
        ) : (
          <div className="py-10 text-center text-ink-secondary">暂无首页数据</div>
        )}
      </div>
    </div>
  );
}
