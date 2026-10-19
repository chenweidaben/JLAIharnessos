/*
 * 健澜科技 jlmedaios - 电子病历评级 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ehr_rating.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.ehr_rating.entity.EHRRatingItem;
import com.jlmedaios.monolith.ehr_rating.service.EHRRatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 电子病历评级 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ehr")
public class EHRRatingController {

    private final EHRRatingService ehrRatingService;

    /**
     * 评级指标列表。
     *
     * @return Result<List<EHRRatingItem>>
     */
    @GetMapping("/items")
    public Result<List<EHRRatingItem>> itemList() {
        return Result.ok(ehrRatingService.itemList());
    }

    /**
     * 按类别查询。
     *
     * @param category 类别
     * @return Result<List<EHRRatingItem>>
     */
    @GetMapping("/category/{category}")
    public Result<List<EHRRatingItem>> byCategory(@PathVariable String category) {
        return Result.ok(ehrRatingService.byCategory(category));
    }

    /**
     * 更新得分。
     *
     * @param code 指标编码
     * @param body {score}
     * @return Result<EHRRatingItem>
     */
    @PutMapping("/item/{code}/update")
    public Result<EHRRatingItem> updateScore(@PathVariable String code,
                                              @RequestBody Map<String, Object> body) {
        return Result.ok(ehrRatingService.updateScore(code,
                new BigDecimal(String.valueOf(body.get("score")))));
    }
}
