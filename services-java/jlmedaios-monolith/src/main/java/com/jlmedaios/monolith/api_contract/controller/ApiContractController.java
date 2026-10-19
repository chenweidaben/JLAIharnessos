/*
 * 健澜科技 jlmedaios - API 契约 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.api_contract.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.api_contract.entity.ApiContract;
import com.jlmedaios.monolith.api_contract.service.ApiContractService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * API 契约 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/contract")
public class ApiContractController {

    private final ApiContractService apiContractService;

    /**
     * 契约列表。
     *
     * @return Result<List<ApiContract>>
     */
    @GetMapping("/list")
    public Result<List<ApiContract>> contractList() {
        return Result.ok(apiContractService.contractList());
    }

    /**
     * 契约详情。
     *
     * @param code 契约编码
     * @return Result<ApiContract>
     */
    @GetMapping("/{code}")
    public Result<ApiContract> contractDetail(@PathVariable String code) {
        return Result.ok(apiContractService.contractDetail(code));
    }

    /**
     * 发布契约。
     *
     * @param code 契约编码
     * @return Result<ApiContract>
     */
    @PutMapping("/{code}/release")
    public Result<ApiContract> releaseContract(@PathVariable String code) {
        return Result.ok(apiContractService.releaseContract(code));
    }
}
