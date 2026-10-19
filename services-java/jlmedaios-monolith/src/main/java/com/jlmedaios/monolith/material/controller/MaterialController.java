/*
 * 健澜科技 jlmedaios - 物资耗材 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.material.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.material.entity.MaterialItem;
import com.jlmedaios.monolith.material.entity.MaterialUsage;
import com.jlmedaios.monolith.material.service.MaterialService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 物资耗材 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/material")
public class MaterialController {

    private final MaterialService materialService;

    /**
     * 库存列表。
     *
     * @return Result<List<MaterialItem>>
     */
    @GetMapping("/list")
    public Result<List<MaterialItem>> list() {
        return Result.ok(materialService.listItems());
    }

    /**
     * 记录耗材消耗。
     *
     * @param body {patientId, encounterId, materialCode, quantity, deptCode}
     * @return Result<MaterialUsage>
     */
    @PostMapping("/usage")
    public Result<MaterialUsage> recordUsage(@RequestBody Map<String, Object> body) {
        MaterialUsage usage = materialService.recordUsage(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                Long.valueOf(String.valueOf(body.get("encounterId"))),
                String.valueOf(body.get("materialCode")),
                Integer.valueOf(String.valueOf(body.get("quantity"))),
                String.valueOf(body.get("deptCode"))
        );
        return Result.ok(usage);
    }

    /**
     * 低库存预警。
     *
     * @return Result<List<MaterialItem>>
     */
    @GetMapping("/low-stock")
    public Result<List<MaterialItem>> lowStock() {
        return Result.ok(materialService.lowStock());
    }
}
