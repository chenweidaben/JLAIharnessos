/*
 * 健澜科技 jlmedaios - 电子病历评级 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ehr_rating.service;

import com.jlmedaios.monolith.ehr_rating.entity.EHRRatingItem;
import com.jlmedaios.monolith.ehr_rating.repository.EHRRatingItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * 电子病历评级 Service。
 *
 * <p>评级指标主数据；对应电子病历五级/六级评审标准，生产接数据中台自动采集</p>
 */
@Service
@RequiredArgsConstructor
public class EHRRatingService {

    private final EHRRatingItemRepository ehrRatingItemRepository;

    /**
     * 评级指标列表。
     *
     * @return 评级指标列表
     */
    public List<EHRRatingItem> itemList() {
        return ehrRatingItemRepository.findAll();
    }

    /**
     * 按类别查询。
     *
     * @param category 类别
     * @return 评级指标列表
     */
    public List<EHRRatingItem> byCategory(String category) {
        return ehrRatingItemRepository.findByCategory(category);
    }

    /**
     * 更新得分（自动判定 status）。
     *
     * @param itemCode 指标编码
     * @param score    得分
     * @return 已更新的评级指标
     */
    public EHRRatingItem updateScore(String itemCode, BigDecimal score) {
        List<EHRRatingItem> items = ehrRatingItemRepository.findAll();
        for (EHRRatingItem item : items) {
            if (itemCode.equals(item.getItemCode())) {
                item.setScore(score);
                BigDecimal max = item.getMaxScore();
                if (max == null || max.compareTo(BigDecimal.ZERO) == 0) {
                    item.setStatus("PARTIAL");
                } else if (score.compareTo(max.multiply(new BigDecimal("0.8"))) >= 0) {
                    item.setStatus("ACHIEVED");
                } else if (score.compareTo(BigDecimal.ZERO) > 0) {
                    item.setStatus("PARTIAL");
                } else {
                    item.setStatus("NOT_ACHIEVED");
                }
                return ehrRatingItemRepository.save(item);
            }
        }
        return null;
    }
}
