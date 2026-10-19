/*
 * 健澜科技 jlmedaios - 血库库存实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.blood_bank.entity;

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

import java.time.LocalDate;

/**
 * 血库库存实体。
 *
 * <p>血库库存主数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "blood_inventory")
public class BloodInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "blood_type")
    private String bloodType;

    @Column(name = "rh_factor")
    private String rhFactor;

    @Column(name = "component")
    private String component;

    @Column(name = "volume_ml")
    private Integer volumeML;

    @Column(name = "stock_date")
    private LocalDate stockDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "status")
    @Builder.Default
    private String status = "AVAILABLE";
}
