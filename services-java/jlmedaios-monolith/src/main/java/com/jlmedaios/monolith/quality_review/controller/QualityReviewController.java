/*
 * 健澜科技 jlmedaios - 等级评审 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.quality_review.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.quality_review.entity.ReviewIndicator;
import com.jlmedaios.monolith.quality_review.service.QualityReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 等级评审 Controller。
 *
 * <p>对应三甲医院评审标准，生产接数据中台自动采集</p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/review")
public class QualityReviewController {

    private final QualityReviewService qualityReviewService;

    /**
     * 全部评审指标列表。
     *
     * @return Result<List<ReviewIndicator>>
     */
    @GetMapping("/indicators")
    public Result<List<ReviewIndicator>> allIndicators() {
        return Result.ok(qualityReviewService.allIndicators());
    }

    /**
     * 按类别查询指标。
     *
     * @param category 类别
     * @return Result<List<ReviewIndicator>>
     */
    @GetMapping("/category/{category}")
    public Result<List<ReviewIndicator>> byCategory(@PathVariable String category) {
        return Result.ok(qualityReviewService.byCategory(category));
    }

    /**
     * 更新指标值。
     *
     * @param code 指标编码
     * @param body {actualValue}
     * @return Result<ReviewIndicator>
     */
    @PutMapping("/indicator/{code}/update")
    public Result<ReviewIndicator> updateValue(@PathVariable String code, @RequestBody Map<String, Object> body) {
        return qualityReviewService.updateValue(code, new BigDecimal(String.valueOf(body.get("actualValue"))))
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }
}
