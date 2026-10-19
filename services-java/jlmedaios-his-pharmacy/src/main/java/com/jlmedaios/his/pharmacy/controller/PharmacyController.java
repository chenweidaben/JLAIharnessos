/*
 * 健澜科技 jlmedaios - 药房 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.pharmacy.controller;

import com.jlmedaios.his.pharmacy.common.Result;
import com.jlmedaios.his.pharmacy.entity.DispenseRecord;
import com.jlmedaios.his.pharmacy.entity.DrugStock;
import com.jlmedaios.his.pharmacy.service.PharmacyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 药房 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/his/pharmacy")
public class PharmacyController {

    private final PharmacyService pharmacyService;

    /**
     * 查询全部药品。
     *
     * @return Result<List<DrugStock>>
     */
    @GetMapping("/drugs")
    public Result<List<DrugStock>> listDrugs() {
        return Result.ok(pharmacyService.listDrugs());
    }

    /**
     * 发药核对。
     *
     * @param body {orderId, drugCode, operator}
     * @return Result<DispenseRecord>
     */
    @PostMapping("/dispense")
    public Result<DispenseRecord> dispense(@RequestBody Map<String, Object> body) {
        Long orderId = Long.valueOf(String.valueOf(body.get("orderId")));
        String drugCode = String.valueOf(body.get("drugCode"));
        String operator = String.valueOf(body.get("operator"));
        return Result.ok(pharmacyService.dispense(orderId, drugCode, operator));
    }

    /**
     * 查询库存列表。
     *
     * @return Result<List<DrugStock>>
     */
    @GetMapping("/stock")
    public Result<List<DrugStock>> stock() {
        return Result.ok(pharmacyService.stock());
    }
}
