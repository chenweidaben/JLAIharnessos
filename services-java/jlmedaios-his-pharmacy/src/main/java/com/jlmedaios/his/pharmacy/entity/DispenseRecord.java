/*
 * 健澜科技 jlmedaios - 发药记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.pharmacy.entity;

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

import java.time.LocalDateTime;

/**
 * 发药记录实体。
 * dispenseTime 默认当前时间。
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "dispense_record")
public class DispenseRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "drug_code")
    private String drugCode;

    @Column(name = "operator")
    private String operator;

    @Column(name = "dispense_time")
    @Builder.Default
    private LocalDateTime dispenseTime = LocalDateTime.now();
}
