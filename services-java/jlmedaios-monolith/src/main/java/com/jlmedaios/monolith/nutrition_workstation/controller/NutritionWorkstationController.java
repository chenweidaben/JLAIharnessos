/*
 * 健澜科技 jlmedaios - 营养科工作站 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nutrition_workstation.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.nutrition_workstation.entity.NutritionOrder;
import com.jlmedaios.monolith.nutrition_workstation.service.NutritionWorkstationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 营养科工作站 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/nutrition")
public class NutritionWorkstationController {

    private final NutritionWorkstationService nutritionWorkstationService;

    /**
     * 今日营养医嘱。
     *
     * @return Result<List<NutritionOrder>>
     */
    @GetMapping("/today")
    public Result<List<NutritionOrder>> todayOrders() {
        return Result.ok(nutritionWorkstationService.todayOrders());
    }

    /**
     * 开具营养医嘱。
     *
     * @param body {orderNo, patientId, diseaseType, dietType, calorieTarget, proteinTarget, startDate}
     * @return Result<NutritionOrder>
     */
    @PostMapping("/order")
    public Result<NutritionOrder> issueOrder(@RequestBody Map<String, Object> body) {
        NutritionOrder order = nutritionWorkstationService.issueOrder(
                String.valueOf(body.get("orderNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("diseaseType")),
                String.valueOf(body.get("dietType")),
                Integer.valueOf(String.valueOf(body.get("calorieTarget"))),
                Integer.valueOf(String.valueOf(body.get("proteinTarget"))),
                LocalDate.parse(String.valueOf(body.get("startDate")))
        );
        return Result.ok(order);
    }

    /**
     * 调整膳食方案。
     *
     * @param orderNo 医嘱编号
     * @param body    {dietType, calorieTarget, proteinTarget}
     * @return Result<NutritionOrder>
     */
    @PutMapping("/{orderNo}/adjust")
    public Result<NutritionOrder> adjustOrder(@PathVariable String orderNo,
                                                @RequestBody Map<String, Object> body) {
        NutritionOrder order = nutritionWorkstationService.adjustOrder(
                orderNo,
                String.valueOf(body.get("dietType")),
                Integer.valueOf(String.valueOf(body.get("calorieTarget"))),
                Integer.valueOf(String.valueOf(body.get("proteinTarget")))
        );
        return Result.ok(order);
    }

    /**
     * 患者营养史。
     *
     * @param patientId 患者 ID
     * @return Result<List<NutritionOrder>>
     */
    @GetMapping("/{patientId}/history")
    public Result<List<NutritionOrder>> nutritionHistory(@PathVariable Long patientId) {
        return Result.ok(nutritionWorkstationService.nutritionHistory(patientId));
    }
}
