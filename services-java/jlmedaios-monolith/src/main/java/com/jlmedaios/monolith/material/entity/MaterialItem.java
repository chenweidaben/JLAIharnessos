/*
 * 健澜科技 jlmedaios - 物资耗材主数据实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.material.entity;

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

/**
 * 物资耗材主数据实体。
 *
 * <p>物资耗材主数据，库存可增减</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "material_item")
public class MaterialItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "material_code")
    private String materialCode;

    @Column(name = "name")
    private String name;

    @Column(name = "spec")
    private String spec;

    @Column(name = "unit")
    private String unit;

    @Column(name = "stock_quantity")
    @Builder.Default
    private Integer stockQuantity = 0;

    @Column(name = "safety_stock")
    private Integer safetyStock;

    @Column(name = "warhouse_location")
    private String warhouseLocation;
}
