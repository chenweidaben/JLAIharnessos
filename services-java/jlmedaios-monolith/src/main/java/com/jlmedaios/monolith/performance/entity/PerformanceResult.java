/*
 * 健澜科技 jlmedaios - 考核结果实体
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
 * 考核结果实体。
 *
 * <p>append-only: 考核结果不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "performance_result")
public class PerformanceResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "department_code")
    private String departmentCode;

    @Column(name = "period")
    private String period;

    @Column(name = "total_score")
    private BigDecimal totalScore;

    @Column(name = "rank")
    private Integer rank;

    @Column(name = "status")
    @Builder.Default
    private String status = "QUALIFIED";
}
