/*
 * 健澜科技 jlmedaios - 报表统计 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.report.service;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 报表统计 Service（纯 mock）。
 */
@Service
public class ReportService {

    /**
     * 门诊日报（mock）。
     *
     * @return {date, count}
     */
    public Map<String, Object> outpatientDaily() {
        Map<String, Object> result = new HashMap<>();
        result.put("date", LocalDate.now().toString());
        result.put("count", ThreadLocalRandom.current().nextInt(200, 701));
        return result;
    }

    /**
     * 住院床位占用率（mock）。
     *
     * @return {totalBeds, occupiedBeds, occupancyRate}
     */
    public Map<String, Object> inpatientOccupancy() {
        int totalBeds = 500;
        int occupiedBeds = ThreadLocalRandom.current().nextInt(200, 401);
        double occupancyRate = Math.round(occupiedBeds * 10000.0 / totalBeds) / 100.0;
        Map<String, Object> result = new HashMap<>();
        result.put("totalBeds", totalBeds);
        result.put("occupiedBeds", occupiedBeds);
        result.put("occupancyRate", occupancyRate + "%");
        return result;
    }

    /**
     * 药房销售日报（mock）。
     *
     * @return {todaySales}
     */
    public Map<String, Object> pharmacySales() {
        Map<String, Object> result = new HashMap<>();
        result.put("todaySales", ThreadLocalRandom.current().nextInt(5000, 15001));
        return result;
    }
}
