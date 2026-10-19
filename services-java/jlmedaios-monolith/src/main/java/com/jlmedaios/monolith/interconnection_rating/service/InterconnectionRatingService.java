/*
 * 健澜科技 jlmedaios - 互联互通评级 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.interconnection_rating.service;

import com.jlmedaios.monolith.interconnection_rating.entity.InterconnectionItem;
import com.jlmedaios.monolith.interconnection_rating.repository.InterconnectionItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * 互联互通评级 Service。
 *
 * <p>互联互通评级指标主数据；对应国家卫健委互联互通成熟度四级甲等/五级乙等标准</p>
 */
@Service
@RequiredArgsConstructor
public class InterconnectionRatingService {

    private final InterconnectionItemRepository interconnectionItemRepository;

    /**
     * 评级指标列表。
     *
     * @return 互联互通评级指标列表
     */
    public List<InterconnectionItem> itemList() {
        return interconnectionItemRepository.findAll();
    }

    /**
     * 按类别查询。
     *
     * @param category 类别
     * @return 互联互通评级指标列表
     */
    public List<InterconnectionItem> byCategory(String category) {
        return interconnectionItemRepository.findByCategory(category);
    }

    /**
     * 更新得分（自动判定 status）。
     *
     * @param itemCode 指标编码
     * @param score    得分
     * @return 已更新的互联互通评级指标
     */
    public InterconnectionItem updateScore(String itemCode, BigDecimal score) {
        List<InterconnectionItem> items = interconnectionItemRepository.findAll();
        for (InterconnectionItem item : items) {
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
                return interconnectionItemRepository.save(item);
            }
        }
        return null;
    }
}
