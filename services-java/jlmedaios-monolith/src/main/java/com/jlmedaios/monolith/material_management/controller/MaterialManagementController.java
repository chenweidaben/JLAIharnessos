/*
 * 健澜科技 jlmedaios - 耗材管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.material_management.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.material_management.entity.Consumable;
import com.jlmedaios.monolith.material_management.entity.ConsumableUsage;
import com.jlmedaios.monolith.material_management.service.MaterialManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 耗材管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/material")
public class MaterialManagementController {

    private final MaterialManagementService materialManagementService;

    /**
     * 耗材目录列表。
     *
     * @return Result<List<Consumable>>
     */
    @GetMapping("/list")
    public Result<List<Consumable>> materialList() {
        return Result.ok(materialManagementService.materialList());
    }

    /**
     * 记录耗材使用。
     *
     * @param code 耗材编码
     * @param body {quantityUsed, department, usedBy, relatedEncounterId}
     * @return Result<ConsumableUsage>
     */
    @PutMapping("/{code}/usage")
    public Result<ConsumableUsage> recordUsage(@PathVariable String code,
                                                @RequestBody Map<String, Object> body) {
        ConsumableUsage usage = materialManagementService.recordUsage(
                code,
                Integer.parseInt(String.valueOf(body.get("quantityUsed"))),
                String.valueOf(body.get("department")),
                String.valueOf(body.get("usedBy")),
                body.get("relatedEncounterId") != null
                        ? Long.valueOf(String.valueOf(body.get("relatedEncounterId"))) : null
        );
        return Result.ok(usage);
    }

    /**
     * 低库存预警。
     *
     * @return Result<List<Consumable>>
     */
    @GetMapping("/low-stock")
    public Result<List<Consumable>> lowStock() {
        return Result.ok(materialManagementService.lowStock());
    }

    /**
     * 耗材使用统计。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/usage-stats")
    public Result<Map<String, Object>> usageStats() {
        return Result.ok(materialManagementService.usageStats());
    }
}
