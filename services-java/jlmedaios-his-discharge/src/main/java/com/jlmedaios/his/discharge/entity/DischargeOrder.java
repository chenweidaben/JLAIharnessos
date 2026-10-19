/*
 * 健澜科技 jlmedaios - 出院医嘱实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.discharge.entity;

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
 * 出院医嘱实体。
 * status 默认 "APPLIED"，取值 APPLIED/SETTLED；totalAmount 默认 0；summary 可空。
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
}
