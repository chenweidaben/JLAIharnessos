/*
 * 健澜科技 jlmedaios - 日 KPI 实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.opdashboard.entity;

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
import java.time.LocalDateTime;

/**
 * 日 KPI 实体。
 *
 * <p>append-only: 日 KPI 数据导入不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "daily_kpi")
public class DailyKpi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "stat_date")
    private LocalDate statDate;

    @Column(name = "outpatient_visits")
    private Integer outpatientVisits;

    @Column(name = "inpatient_count")
    private Integer inpatientCount;

    @Column(name = "avg_los")
    private BigDecimal avgLOS;

    @Column(name = "pharmacy_ratio")
    private BigDecimal pharmacyRatio;

    @Column(name = "revenue")
    private BigDecimal revenue;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
