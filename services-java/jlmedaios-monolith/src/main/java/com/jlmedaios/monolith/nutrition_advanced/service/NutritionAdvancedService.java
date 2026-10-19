/*
 * 健澜科技 jlmedaios - 营养管理深化 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nutrition_advanced.service;

import com.jlmedaios.monolith.nutrition_advanced.entity.NutritionOrder;
import com.jlmedaios.monolith.nutrition_advanced.repository.NutritionOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 营养管理深化 Service。
 *
 * <p>append-only: 营养医嘱不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class NutritionAdvancedService {

    private final NutritionOrderRepository nutritionOrderRepository;

    /**
     * 创建营养医嘱。
     *
     * @param orderNo              医嘱编号
     * @param patientId             患者 ID
     * @param dietType             膳食类型
     * @param calorieRequirement    热量需求
     * @param proteinRequirement    蛋白质需求
     * @param startDate             开始日期
     * @param endDate               结束日期
     * @return 已持久化的营养医嘱
     */
    public NutritionOrder createOrder(String orderNo, String patientId, String dietType,
                                        Integer calorieRequirement, BigDecimal proteinRequirement,
                                        LocalDate startDate, LocalDate endDate) {
        NutritionOrder order = NutritionOrder.builder()
                .orderNo(orderNo)
                .patientId(patientId)
                .dietType(dietType)
                .calorieRequirement(calorieRequirement)
                .proteinRequirement(proteinRequirement)
                .startDate(startDate)
                .endDate(endDate)
                .build();
        return nutritionOrderRepository.save(order);
    }

    /**
     * 今日配餐（status=ACTIVE 且包含今天）。
     *
     * @return 营养医嘱列表
     */
    public List<NutritionOrder> todayOrders() {
        LocalDate today = LocalDate.now();
        return nutritionOrderRepository.findByStatus("ACTIVE").stream()
                .filter(o -> !o.getStartDate().isAfter(today) && !o.getEndDate().isBefore(today))
                .toList();
    }

    /**
     * 患者营养处方。
     *
     * @param patientId 患者 ID
     * @return 营养医嘱列表
     */
    public List<NutritionOrder> patientOrders(Long patientId) {
        return nutritionOrderRepository.findByPatientId(String.valueOf(patientId));
    }
}
