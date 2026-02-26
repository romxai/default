import { createSlice } from "@reduxjs/toolkit";

// ---------------------------------------------------------------------------
// Mock data – replace with real API calls in Phase 4
// ---------------------------------------------------------------------------
const MOCK_EVENT_TYPES = [
  {
    id: "et_001",
    slug: "30-min-intro",
    title: "30-Min Introduction Call",
    duration_minutes: 30,
    description:
      "A quick chat to get to know each other and explore how we can work together.",
    buffer_before_mins: 5,
    buffer_after_mins: 10,
    min_notice_mins: 60, // attendee must book at least 1 h in advance
    location_type: "google_meet", // "google_meet" | "zoom" | "phone" | "in_person"
    color: "primary",
    is_active: true,
    date_range_start: null, // null = no restriction
    date_range_end: null,
    max_bookings_per_day: null,
    custom_questions: [],
    owner_slug: "dwayne",
  },
  {
    id: "et_002",
    slug: "60-min-consultation",
    title: "60-Min Paid Consultation",
    duration_minutes: 60,
    description:
      "In-depth strategy session covering your goals, roadblocks, and action plan.",
    buffer_before_mins: 10,
    buffer_after_mins: 15,
    min_notice_mins: 120,
    location_type: "google_meet",
    color: "success",
    is_active: true,
    date_range_start: "2026-02-01",
    date_range_end: "2026-12-31",
    max_bookings_per_day: 3,
    custom_questions: [
      {
        id: "cq_001",
        label: "What is the main topic you'd like to cover?",
        type: "textarea",
        required: true,
      },
    ],
    owner_slug: "dwayne",
  },
  {
    id: "et_003",
    slug: "15-min-quick-sync",
    title: "15-Min Quick Sync",
    duration_minutes: 15,
    description: "A short stand-up-style sync for existing clients.",
    buffer_before_mins: 0,
    buffer_after_mins: 5,
    min_notice_mins: 30,
    location_type: "phone",
    color: "warning",
    is_active: true,
    date_range_start: null,
    date_range_end: null,
    max_bookings_per_day: null,
    custom_questions: [
      {
        id: "cq_002",
        label: "What would you like to discuss?",
        type: "text",
        required: false,
      },
    ],
    owner_slug: "dwayne",
  },
  {
    id: "et_004",
    slug: "90-min-workshop",
    title: "90-Min Deep-Dive Workshop",
    duration_minutes: 90,
    description:
      "A hands-on workshop session. Come prepared with your questions and materials.",
    buffer_before_mins: 15,
    buffer_after_mins: 15,
    min_notice_mins: 1440, // 24 hours
    location_type: "in_person",
    color: "info",
    is_active: false, // draft / hidden
    date_range_start: "2026-03-01",
    date_range_end: "2026-06-30",
    max_bookings_per_day: 1,
    custom_questions: [
      {
        id: "cq_003",
        label: "Number of attendees",
        type: "number",
        required: true,
      },
      {
        id: "cq_004",
        label: "Special requirements or accessibility needs?",
        type: "textarea",
        required: false,
      },
    ],
    owner_slug: "dwayne",
  },
];

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------
const initialState = {
  items: MOCK_EVENT_TYPES,
  selectedEventType: null, // used during the client booking funnel
  isLoading: false,
  error: null,
};

const eventTypesSlice = createSlice({
  name: "eventTypes",
  initialState,
  reducers: {
    // Admin CRUD
    addEventType(state, action) {
      state.items.push({ ...action.payload, id: `et_${Date.now()}` });
    },
    updateEventType(state, action) {
      const idx = state.items.findIndex((et) => et.id === action.payload.id);
      if (idx !== -1)
        state.items[idx] = { ...state.items[idx], ...action.payload };
    },
    deleteEventType(state, action) {
      state.items = state.items.filter((et) => et.id !== action.payload);
    },
    toggleEventTypeActive(state, action) {
      const et = state.items.find((et) => et.id === action.payload);
      if (et) et.is_active = !et.is_active;
    },

    // Client booking funnel
    selectEventType(state, action) {
      state.selectedEventType =
        state.items.find((et) => et.id === action.payload) ?? null;
    },
    clearSelectedEventType(state) {
      state.selectedEventType = null;
    },

    // Async stubs (wire up real thunks in Phase 4)
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
  },
});

export const {
  addEventType,
  updateEventType,
  deleteEventType,
  toggleEventTypeActive,
  selectEventType,
  clearSelectedEventType,
  setLoading,
  setError,
} = eventTypesSlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------
export const selectAllEventTypes = (state) => state.BookingEventTypes.items;
export const selectActiveEventTypes = (state) =>
  state.BookingEventTypes.items.filter((et) => et.is_active);
export const selectEventTypeBySlug = (slug) => (state) =>
  state.BookingEventTypes.items.find((et) => et.slug === slug);
export const selectCurrentEventType = (state) =>
  state.BookingEventTypes.selectedEventType;

export default eventTypesSlice.reducer;
