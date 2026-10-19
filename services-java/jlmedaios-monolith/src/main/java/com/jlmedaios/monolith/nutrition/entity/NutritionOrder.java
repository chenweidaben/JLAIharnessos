/*
 * 健澜科技 jlmedaios - 营养医嘱实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nutrition.entity;

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
import java.util.List;

/**
 * 营养医嘱实体。
 *
 * <p>append-only: 营养医嘱不可修改，停止留痕</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "nutrition_order")
public class NutritionOrder {

    // 特殊膳食常量
    public static final List<String> SPECIAL_DIETS = List.of(
            "糖尿病低盐", "肾病低蛋白", "痛风低嘌呤"
    );

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    // 肠内营养/肠外营养/治疗膳食
    @Column(name = "order_type")
    private String orderType;

    @Column(name = "diet_name")
    private String dietName;

    @Column(name = "calorie_kcal")
    private Integer calorieKcal;

    @Column(name = "protein_g")
    private BigDecimal proteinG;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "status")
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
