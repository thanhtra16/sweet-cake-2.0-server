const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const DATA_FILE = path.join(__dirname, 'slot-config.data.json');

const DEFAULT_CONFIG = {
  rules: {
    minLeadHours: 4,
    customCakeLeadHours: 24,
    sameDayCutoffTime: '17:30',
    maxAdvanceDays: 30,
    autoLockWhenFull: true
  },
  slots: [
    { id: 'slot-1', label: '08:00 - 10:00', startTime: '08:00', endTime: '10:00', maxOrders: 8, surcharge: 0, channel: 'both', active: true },
    { id: 'slot-2', label: '10:00 - 12:00', startTime: '10:00', endTime: '12:00', maxOrders: 12, surcharge: 0, channel: 'both', active: true },
    { id: 'slot-3', label: '14:00 - 16:00', startTime: '14:00', endTime: '16:00', maxOrders: 12, surcharge: 0, channel: 'both', active: true },
    { id: 'slot-4', label: '16:00 - 18:00', startTime: '16:00', endTime: '18:00', maxOrders: 15, surcharge: 15000, channel: 'both', active: true },
    { id: 'slot-5', label: '18:00 - 20:00', startTime: '18:00', endTime: '20:00', maxOrders: 10, surcharge: 0, channel: 'both', active: true }
  ],
  blackoutDates: []
};

function readConfig() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {}
  return DEFAULT_CONFIG;
}

function writeConfig(cfg) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

// API cho trang Checkout của khách hàng: GET /api/time-slots?date=YYYY-MM-DD
router.get('/api/time-slots', (req, res) => {
  const { date } = req.query;
  const cfg = readConfig();

  const fullDayBlock = (cfg.blackoutDates || []).find(
    (b) => b.date === date && b.scope === 'full_day'
  );
  if (fullDayBlock) {
    return res.json({
      date,
      closed: true,
      reason: fullDayBlock.reason || 'Xưởng tạm ngưng nhận đơn trong ngày này',
      slots: [],
      items: []
    });
  }

  const blockedLabels = new Set(
    (cfg.blackoutDates || [])
      .filter((b) => b.date === date && b.scope === 'specific_slot')
      .map((b) => b.slotLabel)
  );

  const availableSlots = (cfg.slots || [])
    .filter((s) => s.active && !blockedLabels.has(s.label))
    .map((s) => ({
      _id: s.id,
      id: s.id,
      label: s.label,
      time: s.label,
      startTime: s.startTime,
      endTime: s.endTime,
      maxOrders: s.maxOrders,
      remaining: s.maxOrders,
      available: true,
      surcharge: s.surcharge || 0,
      channel: s.channel || 'both'
    }));

  res.json({
    date,
    rules: cfg.rules,
    slots: availableSlots,
    items: availableSlots,
    data: availableSlots
  });
});

// API cho trang Admin Cấu hình khung giờ
router.get('/api/admin/slot-config', (req, res) => {
  res.json(readConfig());
});

router.put('/api/admin/slot-config', (req, res) => {
  const nextCfg = { ...readConfig(), ...req.body };
  writeConfig(nextCfg);
  res.json({ success: true, data: nextCfg });
});

module.exports = router;
