/*
 * 健澜科技 jlmedaios - 营养科工作站 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nutrition_workstation.service;

import com.jlmedaios.monolith.nutrition_workstation.entity.NutritionOrder;
import com.jlmedaios.monolith.nutrition_workstation.repository.NutritionOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/**
 * 营养科工作站 Service。
 *
 * <p>append-only: 营养医嘱不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class NutritionWorkstationService {

    private final NutritionOrderRepository nutritionOrderRepository;

    /**
     * 今日营养医嘱。
     *
     * @return 营养医嘱列表
     */
    public List<NutritionOrder> todayOrders() {
        return nutritionOrderRepository.findByStatus("ISSUED");
    }

    /**
     * 开具营养医嘱。
     *
     * @param orderNo       医嘱编号
     * @param patientId     患者 ID
     * @param diseaseType   疾病类型
     * @param dietType      膳食类型
     * @param calorieTarget 热量目标
     * @param proteinTarget 蛋白质目标
     * @param startDate     开始日期
     * @return 已开具的营养医嘱
     */
    public NutritionOrder issueOrder(String orderNo, String patientId, String diseaseType,
                                      String dietType, Integer calorieTarget,
                                      Integer proteinTarget, LocalDate startDate) {
        NutritionOrder order = NutritionOrder.builder()
                .orderNo(orderNo)
                .patientId(patientId)
                .diseaseType(diseaseType)
                .dietType(dietType)
                .calorieTarget(calorieTarget)
                .proteinTarget(proteinTarget)
                .startDate(startDate)
                .status("ISSUED")
                .build();
        return nutritionOrderRepository.save(order);
    }

    /**
     * 调整膳食方案。
     *
     * @param orderNo       医嘱编号
     * @param dietType      膳食类型
     * @param calorieTarget 热量目标
     * @param proteinTarget 蛋白质目标
     * @return 已调整的营养医嘱
     */
    public NutritionOrder adjustOrder(String orderNo, String dietType,
                                       Integer calorieTarget, Integer proteinTarget) {
        NutritionOrder order = findByOrderNo(orderNo);
        if (order != null) {
            order.setDietType(dietType);
            order.setCalorieTarget(calorieTarget);
            order.setProteinTarget(proteinTarget);
            order.setStatus("IN_PROGRESS");
            return nutritionOrderRepository.save(order);
        }
        return null;
    }

    /**
     * 患者营养史。
     *
     * @param patientId 患者 ID
     * @return 营养医嘱列表
     */
    public List<NutritionOrder> nutritionHistory(Long patientId) {
        return nutritionOrderRepository.findByPatientId(String.valueOf(patientId));
    }

    private NutritionOrder findByOrderNo(String orderNo) {
        return nutritionOrderRepository.findAll().stream()
                .filter(o -> orderNo.equals(o.getOrderNo()))
                .findFirst()
                .orElse(null);
    }
}
