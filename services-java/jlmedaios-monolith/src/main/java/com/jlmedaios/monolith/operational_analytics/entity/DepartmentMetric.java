/*
 * 健澜科技 jlmedaios - 科室运营指标实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.operational_analytics.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 科室运营指标实体。
 *
 * <p>科室运营指标，数据从各模块聚合</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "department_metric")
public class DepartmentMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dept_code")
    private String deptCode;

    @Column(name = "metric_name")
    private String metricName;

    @Column(name = "metric_value")
    private BigDecimal metricValue;

    @Column(name = "period")
    private String period;

    @Column(name = "recorded_at")
    @Builder.Default
    private LocalDate recordedAt = LocalDate.now();
}
