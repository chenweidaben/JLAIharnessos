/*
 * 健澜科技 jlmedaios - 营养 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nutrition.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.nutrition.entity.NutritionOrder;
import com.jlmedaios.monolith.nutrition.service.NutritionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 营养 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/nutrition")
public class NutritionController {

    private final NutritionService nutritionService;

    /**
     * 开立营养医嘱。
     *
     * @param body {patientId, orderType, dietName, calorieKcal, proteinG, startDate}
     * @return Result<NutritionOrder>
     */
    @PostMapping("/order")
    public Result<NutritionOrder> order(@RequestBody Map<String, Object> body) {
        NutritionOrder order = nutritionService.order(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("orderType")),
                String.valueOf(body.get("dietName")),
                Integer.valueOf(String.valueOf(body.get("calorieKcal"))),
                new BigDecimal(String.valueOf(body.get("proteinG"))),
                LocalDate.parse(String.valueOf(body.get("startDate")))
        );
        return Result.ok(order);
    }

    /**
     * 按患者 ID 查询营养医嘱列表。
     *
     * @param patientId 患者 ID
     * @return Result<List<NutritionOrder>>
     */
    @GetMapping("/patient/{patientId}")
    public Result<List<NutritionOrder>> listByPatient(@PathVariable Long patientId) {
        return Result.ok(nutritionService.listByPatient(patientId));
    }

    /**
     * 完成营养医嘱。
     *
     * @param id 营养医嘱 ID
     * @return Result<NutritionOrder>
     */
    @PutMapping("/{id}/complete")
    public Result<NutritionOrder> complete(@PathVariable Long id) {
        return nutritionService.complete(id)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "营养医嘱不存在"));
    }
}
