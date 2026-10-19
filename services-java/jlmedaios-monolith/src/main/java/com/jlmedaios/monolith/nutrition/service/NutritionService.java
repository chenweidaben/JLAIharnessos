/*
 * 健澜科技 jlmedaios - 营养 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nutrition.service;

import com.jlmedaios.monolith.nutrition.entity.NutritionOrder;
import com.jlmedaios.monolith.nutrition.repository.NutritionOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 营养 Service。
 */
@Service
@RequiredArgsConstructor
public class NutritionService {

    private final NutritionOrderRepository nutritionOrderRepository;

    /**
     * 开立营养医嘱。
     *
     * @param patientId   患者 ID
     * @param orderType    类型（肠内营养/肠外营养/治疗膳食）
     * @param dietName     膳食名称
     * @param calorieKcal  热量（kcal）
     * @param proteinG     蛋白质（g）
     * @param startDate    开始日期
     * @return 已持久化的营养医嘱
     */
    public NutritionOrder order(Long patientId, String orderType, String dietName,
                                 Integer calorieKcal, BigDecimal proteinG, LocalDate startDate) {
        NutritionOrder order = NutritionOrder.builder()
                .patientId(patientId)
                .orderType(orderType)
                .dietName(dietName)
                .calorieKcal(calorieKcal)
                .proteinG(proteinG)
                .startDate(startDate)
                .build();
        return nutritionOrderRepository.save(order);
    }

    /**
     * 按患者 ID 查询营养医嘱列表。
     *
     * @param patientId 患者 ID
     * @return 营养医嘱列表
     */
    public List<NutritionOrder> listByPatient(Long patientId) {
        return nutritionOrderRepository.findByPatientId(patientId);
    }

    /**
     * 完成营养医嘱（status → COMPLETED）。
     *
     * @param id 营养医嘱 ID
     * @return 更新后的营养医嘱
     */
    public Optional<NutritionOrder> complete(Long id) {
        Optional<NutritionOrder> opt = nutritionOrderRepository.findById(id);
        opt.ifPresent(order -> {
            order.setStatus("COMPLETED");
            nutritionOrderRepository.save(order);
        });
        return opt;
    }
}
