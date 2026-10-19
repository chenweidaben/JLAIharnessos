/*
 * 健澜科技 jlmedaios - 收费记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.charge.entity;

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
 * 收费记录实体。
 * payStatus 默认 "UNPAID"。
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "charge")
public class Charge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "register_id")
    private Long registerId;

    @Column(name = "item_name")
    private String itemName;

    @Column(name = "amount", precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "pay_status")
    @Builder.Default
    private String payStatus = "UNPAID";
}
