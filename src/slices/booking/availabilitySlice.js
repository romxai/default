import { createSlice } from "@reduxjs/toolkit";

// ---------------------------------------------------------------------------
// Mock data – replace with real API calls in Phase 4
//
// rule_type "recurring"  → repeats every week on `day_of_week`
// rule_type "one_time"   → applies to one specific date (date_override)
// rule_type "day_off"    → marks a normally-working day as unavailable
// ---------------------------------------------------------------------------
const DAY = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

const MOCK_AVAILABILITY = [
  // ── Recurring weekly schedule ──────────────────────────────────────────
  {
    id: "av_mon",
    owner_slug: "dwayne",
    rule_type: "recurring",
    day_of_week: DAY.MON,
    start_time_utc: "09:00", // HH:mm in owner's configured timezone (UTC for mock)
    end_time_utc: "17:00",
    is_available: true,
    date_override: null,
  },
  {
    id: "av_tue",
    owner_slug: "dwayne",
    rule_type: "recurring",
    day_of_week: DAY.TUE,
    start_time_utc: "09:00",
    end_time_utc: "17:00",
    is_available: true,
    date_override: null,
  },
  {
    id: "av_wed",
    owner_slug: "dwayne",
    rule_type: "recurring",
    day_of_week: DAY.WED,
    start_time_utc: "09:00",
    end_time_utc: "17:00",
    is_available: true,
    date_override: null,
  },
  {
    id: "av_thu",
    owner_slug: "dwayne",
    rule_type: "recurring",
    day_of_week: DAY.THU,
    start_time_utc: "09:00",
    end_time_utc: "17:00",
    is_available: true,
    date_override: null,
  },
  {
    id: "av_fri",
    owner_slug: "dwayne",
    rule_type: "recurring",
    day_of_week: DAY.FRI,
    start_time_utc: "09:00",
    end_time_utc: "15:00", // finish early on Fridays
    is_available: true,
    date_override: null,
  },
  {
    id: "av_sat",
    owner_slug: "dwayne",
    rule_type: "recurring",
    day_of_week: DAY.SAT,
    start_time_utc: null,
    end_time_utc: null,
    is_available: false, // weekend – unavailable
    date_override: null,
  },
  {
    id: "av_sun",
    owner_slug: "dwayne",
    rule_type: "recurring",
    day_of_week: DAY.SUN,
    start_time_utc: null,
    end_time_utc: null,
    is_available: false,
    date_override: null,
  },

  // ── One-time overrides ─────────────────────────────────────────────────
  {
    id: "av_ot_001",
    owner_slug: "dwayne",
    rule_type: "one_time",
    day_of_week: null,
    // Extended hours on a specific Saturday for a special event
    date_override: "2026-03-07",
    start_time_utc: "10:00",
    end_time_utc: "14:00",
    is_available: true,
  },
  {
    id: "av_ot_002",
    owner_slug: "dwayne",
    rule_type: "day_off",
    day_of_week: null,
    // Annual leave – blocked for the whole day
    date_override: "2026-03-17",
    start_time_utc: null,
    end_time_utc: null,
    is_available: false,
  },
  {
    id: "av_ot_003",
    owner_slug: "dwayne",
    rule_type: "one_time",
    day_of_week: null,
    // Afternoon-only slot on a normally full Monday
    date_override: "2026-03-23",
    start_time_utc: "13:00",
    end_time_utc: "17:00",
    is_available: true,
  },
];

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------
const initialState = {
  rules: MOCK_AVAILABILITY,
  ownerTimezone: "UTC", // displayed in admin UI; override per owner in Phase 4
  isLoading: false,
  error: null,
};

const availabilitySlice = createSlice({
  name: "availability",
  initialState,
  reducers: {
    // Admin mutations
    addRule(state, action) {
      state.rules.push({ ...action.payload, id: `av_${Date.now()}` });
    },
    updateRule(state, action) {
      const idx = state.rules.findIndex((r) => r.id === action.payload.id);
      if (idx !== -1)
        state.rules[idx] = { ...state.rules[idx], ...action.payload };
    },
    deleteRule(state, action) {
      state.rules = state.rules.filter((r) => r.id !== action.payload);
    },
    updateRecurringDay(state, action) {
      // Convenience: update a single recurring day's hours in one dispatch
      // payload: { day_of_week, start_time_utc, end_time_utc, is_available }
      const rule = state.rules.find(
        (r) =>
          r.rule_type === "recurring" &&
          r.day_of_week === action.payload.day_of_week,
      );
      if (rule) Object.assign(rule, action.payload);
    },
    setOwnerTimezone(state, action) {
      state.ownerTimezone = action.payload;
    },

    // Async stubs
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
  },
});

export const {
  addRule,
  updateRule,
  deleteRule,
  updateRecurringDay,
  setOwnerTimezone,
  setLoading,
  setError,
} = availabilitySlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------
export const selectAllRules = (state) => state.BookingAvailability.rules;
export const selectOwnerTimezone = (state) =>
  state.BookingAvailability.ownerTimezone;

/** Returns the recurring rule for a given day index (0=Sun … 6=Sat) */
export const selectRecurringRuleForDay = (dayIndex) => (state) =>
  state.BookingAvailability.rules.find(
    (r) => r.rule_type === "recurring" && r.day_of_week === dayIndex,
  );

/** Returns one-time overrides sorted chronologically */
export const selectOneTimeOverrides = (state) =>
  state.BookingAvailability.rules
    .filter((r) => r.rule_type === "one_time" || r.rule_type === "day_off")
    .sort((a, b) => (a.date_override > b.date_override ? 1 : -1));

/** Returns the override (if any) that applies to a specific date string "YYYY-MM-DD" */
export const selectOverrideForDate = (dateStr) => (state) =>
  state.BookingAvailability.rules.find(
    (r) =>
      (r.rule_type === "one_time" || r.rule_type === "day_off") &&
      r.date_override === dateStr,
  ) ?? null;

export default availabilitySlice.reducer;
