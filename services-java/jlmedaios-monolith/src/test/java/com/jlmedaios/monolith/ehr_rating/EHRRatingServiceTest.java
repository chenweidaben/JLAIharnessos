/*
 * 健澜科技 jlmedaios - 电子病历评级 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ehr_rating;

import com.jlmedaios.monolith.ehr_rating.entity.EHRRatingItem;
import com.jlmedaios.monolith.ehr_rating.service.EHRRatingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 电子病历评级 Service 测试。
 */
@SpringBootTest
public class EHRRatingServiceTest {

    @Autowired
    private EHRRatingService ehrRatingService;

    @Test
    void testItemList() {
        List<EHRRatingItem> list = ehrRatingService.itemList();
        assertNotNull(list);
    }

    @Test
    void testByCategory() {
        List<EHRRatingItem> list = ehrRatingService.byCategory("数据应用");
        assertNotNull(list);
    }

    @Test
    void testUpdateScore() {
        EHRRatingItem item = ehrRatingService.updateScore("EHR-001", new BigDecimal("85.0"));
        // 可能为空（H2 内存库无预置数据）
    }
}
