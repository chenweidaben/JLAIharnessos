/*
 * 健澜科技 jlmedaios - 等级评审 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.quality_review.service;

import com.jlmedaios.monolith.quality_review.entity.ReviewIndicator;
import com.jlmedaios.monolith.quality_review.repository.ReviewIndicatorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 等级评审 Service。
 *
 * <p>对应三甲医院评审标准，生产接数据中台自动采集</p>
 */
@Service
@RequiredArgsConstructor
public class QualityReviewService {

    private final ReviewIndicatorRepository reviewIndicatorRepository;

    /**
     * 全部评审指标列表。
     *
     * @return 指标列表
     */
    public List<ReviewIndicator> allIndicators() {
        return reviewIndicatorRepository.findAll();
    }

    /**
     * 按类别查询指标。
     *
     * @param category 类别
     * @return 指标列表
     */
    public List<ReviewIndicator> byCategory(String category) {
        return reviewIndicatorRepository.findByCategory(category);
    }

    /**
     * 更新指标值，自动算 status。
     *
     * @param indicatorCode 指标编码
     * @param actualValue  实际值
     * @return 已更新的指标
     */
    public Optional<ReviewIndicator> updateValue(String indicatorCode, BigDecimal actualValue) {
        // mock：按编码查找（生产用 findByIndicatorCode）
        List<ReviewIndicator> list = reviewIndicatorRepository.findAll();
        Optional<ReviewIndicator> opt = list.stream()
                .filter(i -> indicatorCode.equals(i.getIndicatorCode()))
                .findFirst();
        if (opt.isPresent()) {
            ReviewIndicator indicator = opt.get();
            indicator.setActualValue(actualValue);
            indicator.setLastUpdated(LocalDateTime.now());
            // 自动判定 status：actual >= target → ACHIEVED
            if (indicator.getTargetValue() != null && actualValue.compareTo(indicator.getTargetValue()) >= 0) {
                indicator.setStatus("ACHIEVED");
            } else {
                indicator.setStatus("NOT_ACHIEVED");
            }
            reviewIndicatorRepository.save(indicator);
        }
        return opt;
    }
}
