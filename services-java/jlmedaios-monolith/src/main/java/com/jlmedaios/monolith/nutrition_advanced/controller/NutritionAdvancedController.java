/*
 * 健澜科技 jlmedaios - 营养管理深化 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nutrition_advanced.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.nutrition_advanced.entity.NutritionOrder;
import com.jlmedaios.monolith.nutrition_advanced.service.NutritionAdvancedService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 营养管理深化 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/nutrition")
public class NutritionAdvancedController {

    private final NutritionAdvancedService nutritionAdvancedService;

    /**
     * 创建营养医嘱。
     *
     * @param body {orderNo, patientId, dietType, calorieRequirement, proteinRequirement, startDate, endDate}
     * @return Result<NutritionOrder>
     */
    @PostMapping("/order")
    public Result<NutritionOrder> createOrder(@RequestBody Map<String, Object> body) {
        NutritionOrder order = nutritionAdvancedService.createOrder(
                String.valueOf(body.get("orderNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("dietType")),
                Integer.parseInt(String.valueOf(body.get("calorieRequirement"))),
                new BigDecimal(String.valueOf(body.get("proteinRequirement"))),
                LocalDate.parse(String.valueOf(body.get("startDate"))),
                LocalDate.parse(String.valueOf(body.get("endDate")))
        );
        return Result.ok(order);
    }

    /**
     * 今日配餐。
     *
     * @return Result<List<NutritionOrder>>
     */
    @GetMapping("/orders/today")
    public Result<List<NutritionOrder>> todayOrders() {
        return Result.ok(nutritionAdvancedService.todayOrders());
    }

    /**
     * 患者营养处方。
     *
     * @param patientId 患者 ID
     * @return Result<List<NutritionOrder>>
     */
    @GetMapping("/patient/{patientId}")
    public Result<List<NutritionOrder>> patientOrders(@PathVariable Long patientId) {
        return Result.ok(nutritionAdvancedService.patientOrders(patientId));
    }
}
