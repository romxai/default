import { createSlice } from "@reduxjs/toolkit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a mock Google Meet link */
const mockMeetLink = (id) =>
  `https://meet.google.com/mock-${id.replace("bk_", "")}`;

// ---------------------------------------------------------------------------
// Mock data – replace with real API calls in Phase 4
// All timestamps are ISO-8601 strings (UTC).
// ---------------------------------------------------------------------------
const MOCK_BOOKINGS = [
  {
    id: "bk_001",
    event_type_id: "et_001",           // 30-Min Introduction Call
    attendee_name: "Alice Thompson",
    attendee_email: "alice.thompson@example.com",
    attendee_timezone: "America/New_York",
    start_time: "2026-03-02T14:00:00Z",
    end_time: "2026-03-02T14:30:00Z",
    meet_link: mockMeetLink("bk_001"),
    status: "confirmed",               // "confirmed" | "cancelled" | "rescheduled"
    custom_answers: [],
    created_at: "2026-02-20T10:22:00Z",
    cancel_reason: null,
  },
  {
    id: "bk_002",
    event_type_id: "et_002",           // 60-Min Paid Consultation
    attendee_name: "Bob Martinez",
    attendee_email: "bob.martinez@example.com",
    attendee_timezone: "Europe/London",
    start_time: "2026-03-03T09:00:00Z",
    end_time: "2026-03-03T10:00:00Z",
    meet_link: mockMeetLink("bk_002"),
    status: "confirmed",
    custom_answers: [
      {
        question_id: "cq_001",
        label: "What is the main topic you'd like to cover?",
        answer: "Migrating our monolith to a microservices architecture.",
      },
    ],
    created_at: "2026-02-21T08:05:00Z",
    cancel_reason: null,
  },
  {
    id: "bk_003",
    event_type_id: "et_001",
    attendee_name: "Carol Singh",
    attendee_email: "carol.singh@example.com",
    attendee_timezone: "Asia/Kolkata",
    start_time: "2026-03-03T11:00:00Z",
    end_time: "2026-03-03T11:30:00Z",
    meet_link: mockMeetLink("bk_003"),
    status: "confirmed",
    custom_answers: [],
    created_at: "2026-02-22T14:40:00Z",
    cancel_reason: null,
  },
  {
    id: "bk_004",
    event_type_id: "et_003",           // 15-Min Quick Sync
    attendee_name: "David Kim",
    attendee_email: "david.kim@example.com",
    attendee_timezone: "Asia/Seoul",
    start_time: "2026-03-04T08:00:00Z",
    end_time: "2026-03-04T08:15:00Z",
    meet_link: mockMeetLink("bk_004"),
    status: "cancelled",
    custom_answers: [
      {
        question_id: "cq_002",
        label: "What would you like to discuss?",
        answer: "Sprint planning catch-up.",
      },
    ],
    created_at: "2026-02-23T11:00:00Z",
    cancel_reason: "Attendee requested cancellation",
  },
  {
    id: "bk_005",
    event_type_id: "et_002",
    attendee_name: "Eva Rossi",
    attendee_email: "eva.rossi@example.com",
    attendee_timezone: "Europe/Rome",
    start_time: "2026-03-10T13:00:00Z",
    end_time: "2026-03-10T14:00:00Z",
    meet_link: mockMeetLink("bk_005"),
    status: "confirmed",
    custom_answers: [
      {
        question_id: "cq_001",
        label: "What is the main topic you'd like to cover?",
        answer: "Product roadmap alignment for Q2.",
      },
    ],
    created_at: "2026-02-25T09:15:00Z",
    cancel_reason: null,
  },
  {
    id: "bk_006",
    event_type_id: "et_001",
    attendee_name: "Frank Nguyen",
    attendee_email: "frank.nguyen@example.com",
    attendee_timezone: "America/Los_Angeles",
    start_time: "2026-03-11T15:00:00Z",
    end_time: "2026-03-11T15:30:00Z",
    meet_link: mockMeetLink("bk_006"),
    status: "rescheduled",
    custom_answers: [],
    created_at: "2026-02-24T07:50:00Z",
    cancel_reason: null,
  },
];

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------
const initialState = {
  items: MOCK_BOOKINGS,
  selectedBooking: null, // set when admin clicks a row
  isLoading: false,
  error: null,
};

const bookingsSlice = createSlice({
  name: "bookings",
  initialState,
  reducers: {
    // Client: add a new confirmed booking
    addBooking(state, action) {
      const newBooking = {
        ...action.payload,
        id: `bk_${Date.now()}`,
        meet_link: mockMeetLink(`bk_${Date.now()}`),
        status: "confirmed",
        created_at: new Date().toISOString(),
        cancel_reason: null,
      };
      state.items.push(newBooking);
    },

    // Admin: cancel a booking
    cancelBooking(state, action) {
      // payload: { id, cancel_reason }
      const booking = state.items.find((b) => b.id === action.payload.id);
      if (booking) {
        booking.status = "cancelled";
        booking.cancel_reason = action.payload.cancel_reason ?? "Cancelled by owner";
      }
    },

    // Admin: reschedule (update start/end; keep same id & meet_link)
    rescheduleBooking(state, action) {
      // payload: { id, start_time, end_time }
      const booking = state.items.find((b) => b.id === action.payload.id);
      if (booking) {
        booking.start_time = action.payload.start_time;
        booking.end_time = action.payload.end_time;
        booking.status = "rescheduled";
      }
    },

    selectBooking(state, action) {
      state.selectedBooking =
        state.items.find((b) => b.id === action.payload) ?? null;
    },
    clearSelectedBooking(state) {
      state.selectedBooking = null;
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
  addBooking,
  cancelBooking,
  rescheduleBooking,
  selectBooking,
  clearSelectedBooking,
  setLoading,
  setError,
} = bookingsSlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------
export const selectAllBookings = (state) => state.BookingBookings.items;

export const selectUpcomingBookings = (state) => {
  const now = new Date().toISOString();
  return state.BookingBookings.items.filter(
    (b) => b.status === "confirmed" && b.start_time >= now
  );
};

export const selectConfirmedBookings = (state) =>
  state.BookingBookings.items.filter((b) => b.status === "confirmed");

export const selectCurrentBooking = (state) =>
  state.BookingBookings.selectedBooking;

/**
 * Double-booking prevention check.
 *
 * Returns true if the proposed [proposedStart, proposedEnd] window overlaps
 * with any *confirmed* booking (accounting for buffer times from the event
 * type definitions supplied as the second argument).
 *
 * Usage in components:
 *   const isDoubleBooked = useSelector(
 *     selectIsSlotTaken(proposedStart, proposedEnd, eventTypesList)
 *   );
 */
export const selectIsSlotTaken =
  (proposedStart, proposedEnd, eventTypes = []) =>
  (state) => {
    const pStart = new Date(proposedStart).getTime();
    const pEnd = new Date(proposedEnd).getTime();

    return state.BookingBookings.items.some((booking) => {
      if (booking.status !== "confirmed") return false;

      // Find the matching event type to include buffer paddings
      const et = eventTypes.find((e) => e.id === booking.event_type_id);
      const bufferBefore = (et?.buffer_before_mins ?? 0) * 60_000;
      const bufferAfter = (et?.buffer_after_mins ?? 0) * 60_000;

      const bStart = new Date(booking.start_time).getTime() - bufferBefore;
      const bEnd = new Date(booking.end_time).getTime() + bufferAfter;

      // Overlap check: two intervals overlap unless one ends before the other starts
      return pStart < bEnd && pEnd > bStart;
    });
  };

export default bookingsSlice.reducer;
