/*
 * 健澜科技 jlmedaios - 考核指标实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.performance.entity;

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

/**
 * 考核指标实体。
 *
 * <p>考核指标主数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "performance_indicator")
public class PerformanceIndicator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "indicator_code")
    private String indicatorCode;

    @Column(name = "indicator_name")
    private String indicatorName;

    @Column(name = "category")
    private String category;

    @Column(name = "target_value")
    private BigDecimal targetValue;

    @Column(name = "actual_value")
    private BigDecimal actualValue;

    @Column(name = "weight")
    private BigDecimal weight;

    @Column(name = "score")
    private BigDecimal score;
}
