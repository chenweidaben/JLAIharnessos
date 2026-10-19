/*
 * 健澜科技 jlmedaios - 院长级 KPI 实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.admin_dashboard.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 院长级 KPI 实体。
 *
 * <p>院长级 KPI 主数据；生产接 ClickHouse/Doris，H2 下 mock</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "executive_kpi")
public class ExecutiveKPI {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "kpi_code")
    private String kpiCode;

    @Column(name = "kpi_name")
    private String kpiName;

    @Column(name = "category")
    private String category;

    @Column(name = "current_value")
    private BigDecimal currentValue;

    @Column(name = "target_value")
    private BigDecimal targetValue;

    @Column(name = "yoy_growth")
    private BigDecimal yoyGrowth;

    @Column(name = "trend")
    private String trend;
}
