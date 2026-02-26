// ─── Booking Module – Redux Toolkit Slices ───────────────────────────────────
// Central barrel export for all booking-related reducers and actions.
// Import the three named reducers below into src/store/reducers.js.
// ─────────────────────────────────────────────────────────────────────────────

// Reducers (default exports) – used in combineReducers
export { default as BookingEventTypesReducer } from "./eventTypesSlice";
export { default as BookingAvailabilityReducer } from "./availabilitySlice";
export { default as BookingBookingsReducer } from "./bookingsSlice";

// ── eventTypesSlice actions ───────────────────────────────────────────────────
export {
  addEventType,
  updateEventType,
  deleteEventType,
  toggleEventTypeActive,
  selectEventType,
  clearSelectedEventType,
  // selectors
  selectAllEventTypes,
  selectActiveEventTypes,
  selectEventTypeBySlug,
  selectCurrentEventType,
} from "./eventTypesSlice";

// ── availabilitySlice actions ─────────────────────────────────────────────────
export {
  addRule,
  updateRule,
  deleteRule,
  updateRecurringDay,
  setOwnerTimezone,
  // selectors
  selectAllRules,
  selectOwnerTimezone,
  selectRecurringRuleForDay,
  selectOneTimeOverrides,
  selectOverrideForDate,
} from "./availabilitySlice";

// ── bookingsSlice actions ─────────────────────────────────────────────────────
export {
  addBooking,
  cancelBooking,
  rescheduleBooking,
  selectBooking,
  clearSelectedBooking,
  // selectors
  selectAllBookings,
  selectUpcomingBookings,
  selectConfirmedBookings,
  selectCurrentBooking,
  selectIsSlotTaken,
} from "./bookingsSlice";
