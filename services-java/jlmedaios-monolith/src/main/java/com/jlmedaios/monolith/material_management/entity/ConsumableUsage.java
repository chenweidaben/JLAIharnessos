/*
 * 健澜科技 jlmedaios - 耗材使用记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.material_management.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 耗材使用记录实体。
 *
 * <p>append-only: 耗材使用记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "consumable_usage")
public class ConsumableUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usage_no")
    private String usageNo;

    @Column(name = "material_code")
    private String materialCode;

    @Column(name = "quantity_used")
    private Integer quantityUsed;

    @Column(name = "department")
    private String department;

    @Column(name = "used_by")
    private String usedBy;

    @Column(name = "usage_date")
    @Builder.Default
    private LocalDate usageDate = LocalDate.now();

    @Column(name = "related_encounter_id")
    private Long relatedEncounterId;
}
