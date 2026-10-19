/*
 * 健澜科技 jlmedaios - 出院医嘱实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.discharge.entity;

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
import java.time.LocalDateTime;

/**
 * 出院医嘱实体。
 *
 * <p>append-only: 本记录创建后不可修改，只能新增修订记录</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "discharge_order")
public class DischargeOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "visit_id")
    private Long visitId;

    @Column(name = "status")
    @Builder.Default
    private String status = "APPLIED";

    @Column(name = "total_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "summary")
    private String summary;

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
