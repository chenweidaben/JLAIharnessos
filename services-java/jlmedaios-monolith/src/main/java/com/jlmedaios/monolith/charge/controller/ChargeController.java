/*
 * 健澜科技 jlmedaios - 收费 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.charge.controller;

import com.jlmedaios.monolith.charge.entity.Charge;
import com.jlmedaios.monolith.charge.service.ChargeService;
import com.jlmedaios.monolith.common.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 收费 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/charge")
public class ChargeController {

    private final ChargeService chargeService;

    /**
     * 创建收费。
     *
     * @param charge 收费
     * @return Result<Charge>
     */
    @PostMapping("/pay")
    public Result<Charge> pay(@RequestBody Charge charge) {
        return Result.ok(chargeService.create(charge));
    }

    /**
     * 按挂号 ID 查询收费列表。
     *
     * @param registerId 挂号 ID
     * @return Result<List<Charge>>
     */
    @GetMapping("/by-register/{registerId}")
    public Result<List<Charge>> getByRegisterId(@PathVariable Long registerId) {
        return Result.ok(chargeService.getByRegisterId(registerId));
    }
}
