/*
 * 健澜科技 jlmedaios - 数据中台 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_platform.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.data_platform.entity.DataAsset;
import com.jlmedaios.monolith.data_platform.service.DataPlatformService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 数据中台 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/data")
public class DataPlatformController {

    private final DataPlatformService dataPlatformService;

    /**
     * 数据资产目录。
     *
     * @return Result<List<DataAsset>>
     */
    @GetMapping("/assets")
    public Result<List<DataAsset>> assetList() {
        return Result.ok(dataPlatformService.assetList());
    }

    /**
     * 按类别查询。
     *
     * @param category 类别
     * @return Result<List<DataAsset>>
     */
    @GetMapping("/category/{category}")
    public Result<List<DataAsset>> byCategory(@PathVariable String category) {
        return Result.ok(dataPlatformService.byCategory(category));
    }

    /**
     * 资产详情。
     *
     * @param assetCode 资产编码
     * @return Result<DataAsset>
     */
    @GetMapping("/asset/{assetCode}")
    public Result<DataAsset> assetDetail(@PathVariable String assetCode) {
        return Result.ok(dataPlatformService.assetDetail(assetCode));
    }
}
