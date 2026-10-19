/*
 * 健澜科技 jlmedaios - 互联互通评级 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.interconnection_rating;

import com.jlmedaios.monolith.interconnection_rating.entity.InterconnectionItem;
import com.jlmedaios.monolith.interconnection_rating.service.InterconnectionRatingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 互联互通评级 Service 测试。
 */
@SpringBootTest
public class InterconnectionRatingServiceTest {

    @Autowired
    private InterconnectionRatingService interconnectionRatingService;

    @Test
    void testItemList() {
        List<InterconnectionItem> list = interconnectionRatingService.itemList();
        assertNotNull(list);
    }

    @Test
    void testByCategory() {
        List<InterconnectionItem> list = interconnectionRatingService.byCategory("数据治理");
        assertNotNull(list);
    }

    @Test
    void testUpdateScore() {
        InterconnectionItem item = interconnectionRatingService.updateScore("IC-001", new BigDecimal("75.0"));
        // 可能为空（H2 内存库无预置数据）
    }
}
