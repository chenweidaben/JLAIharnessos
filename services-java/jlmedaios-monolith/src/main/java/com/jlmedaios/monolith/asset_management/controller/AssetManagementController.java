/*
 * 健澜科技 jlmedaios - 固定资产管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.asset_management.controller;

import com.jlmedaios.monolith.asset_management.entity.FixedAsset;
import com.jlmedaios.monolith.asset_management.service.AssetManagementService;
import com.jlmedaios.monolith.common.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 固定资产管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/asset")
public class AssetManagementController {

    private final AssetManagementService assetManagementService;

    /**
     * 资产清单。
     *
     * @return Result<List<FixedAsset>>
     */
    @GetMapping("/list")
    public Result<List<FixedAsset>> assetList() {
        return Result.ok(assetManagementService.assetList());
    }

    /**
     * 资产转移。
     *
     * @param code 资产编码
     * @param body {newDepartment, newLocation}
     * @return Result<FixedAsset>
     */
    @PutMapping("/{code}/transfer")
    public Result<FixedAsset> transfer(@PathVariable String code, @RequestBody Map<String, Object> body) {
        return assetManagementService.transfer(
                code,
                String.valueOf(body.get("newDepartment")),
                String.valueOf(body.get("newLocation"))
        ).map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 资产报废。
     *
     * @param code 资产编码
     * @return Result<FixedAsset>
     */
    @PutMapping("/{code}/scrap")
    public Result<FixedAsset> scrap(@PathVariable String code) {
        return assetManagementService.scrap(code)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 资产统计。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/statistics")
    public Result<Map<String, Object>> statistics() {
        return Result.ok(assetManagementService.statistics());
    }
}
