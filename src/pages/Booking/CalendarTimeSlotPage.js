import React, { useState, useMemo } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Container, Row, Col, Card, CardBody, Button } from "reactstrap";
import {
  selectActiveEventTypes,
  selectEventTypeBySlug,
  selectAllRules,
  selectOverrideForDate,
  selectAllBookings,
  selectAllEventTypes,
  selectOwnerTimezone,
} from "../../slices/booking";

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const LOCATION_ICONS = {
  google_meet: "ri-video-chat-line",
  zoom: "ri-vidicon-line",
  phone: "ri-phone-line",
  in_person: "ri-map-pin-line",
};
const LOCATION_LABELS = {
  google_meet: "Google Meet",
  zoom: "Zoom",
  phone: "Phone",
  in_person: "In Person",
};

// ─── Pure Helpers ────────────────────────────────────────────────────────────

/** "HH:mm" → total minutes from midnight */
const hmToMins = (hm) => {
  if (!hm) return 0;
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
};

/** Format a YYYY-MM-DD date string like "Monday, March 3, 2026" */
const formatDateHeading = (dateStr) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

/** Format an ISO UTC time into HH:MM am/pm for the given IANA timezone */
const formatSlotTime = (isoStr, tz) =>
  new Date(isoStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });

/**
 * Check whether proposed [startISO, endISO] overlaps any confirmed booking.
 * Applies buffer_before / buffer_after from each existing booking's event type.
 */
const isSlotTaken = (startISO, endISO, bookings, allEventTypes) => {
  const pStart = new Date(startISO).getTime();
  const pEnd = new Date(endISO).getTime();

  return bookings.some((b) => {
    if (b.status !== "confirmed") return false;
    const et = allEventTypes.find((e) => e.id === b.event_type_id);
    const bufBefore = (et?.buffer_before_mins ?? 0) * 60_000;
    const bufAfter = (et?.buffer_after_mins ?? 0) * 60_000;
    const bStart = new Date(b.start_time).getTime() - bufBefore;
    const bEnd = new Date(b.end_time).getTime() + bufAfter;
    return pStart < bEnd && pEnd > bStart;
  });
};

/**
 * Generate available time slots for one date.
 * @param {string} dateStr   - "YYYY-MM-DD"
 * @param {object} rule      - availability rule (recurring or one_time)
 * @param {object} eventType - the selected event type
 * @param {object[]} bookings
 * @param {object[]} allEventTypes
 * @param {string} ownerTimezone - IANA timezone of the owner (e.g., "Asia/Kolkata")
 * @returns {Array<{ start: string, end: string }>}
 */
const generateSlots = (
  dateStr,
  rule,
  eventType,
  bookings,
  allEventTypes,
  ownerTimezone,
) => {
  if (!rule || !rule.is_available) return [];

  const startMins = hmToMins(rule.start_time_utc);
  const endMins = hmToMins(rule.end_time_utc);
  const duration = eventType.duration_minutes;
  const minNotice = eventType.min_notice_mins;
  const now = Date.now();
  const slots = [];

  let cursor = startMins;
  while (cursor + duration <= endMins) {
    // Convert owner's local time to UTC
    const hourStr = String(Math.floor(cursor / 60)).padStart(2, "0");
    const minStr = String(cursor % 60).padStart(2, "0");

    // Create a UTC timestamp representing this time in the owner's timezone
    const slotStartUTC = convertToUTC(dateStr, hourStr, minStr, ownerTimezone);
    const slotEndUTC = new Date(slotStartUTC.getTime() + duration * 60_000);

    // Min-notice check – slot must not start too soon
    if (slotStartUTC.getTime() - now >= minNotice * 60_000) {
      if (
        !isSlotTaken(
          slotStartUTC.toISOString(),
          slotEndUTC.toISOString(),
          bookings,
          allEventTypes,
        )
      ) {
        slots.push({
          start: slotStartUTC.toISOString(),
          end: slotEndUTC.toISOString(),
        });
      }
    }
    cursor += duration;
  }
  return slots;
};

/**
 * Convert a local date/time in a specific timezone to a UTC Date object
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {string} hourStr - "HH" (00-23)
 * @param {string} minStr - "mm" (00-59)
 * @param {string} timezone - IANA timezone string
 * @returns {Date} UTC Date object
 */
const convertToUTC = (dateStr, hourStr, minStr, timezone) => {
  // Parse date components
  const [year, month, day] = dateStr.split("-").map(Number);
  const hour = Number(hourStr);
  const minute = Number(minStr);

  // Create a date string that represents the local time in the target timezone
  // We'll format a known UTC time and see how it appears in the target timezone,
  // then calculate the offset

  // Start with midnight UTC on this date
  const referenceUTC = Date.UTC(year, month - 1, day, 12, 0, 0); // Use noon to avoid DST edge cases
  const referenceDate = new Date(referenceUTC);

  // Format this date in the target timezone to see what time it shows
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  });

  const parts = formatter.formatToParts(referenceDate);
  const tzYear = Number(parts.find((p) => p.type === "year").value);
  const tzMonth = Number(parts.find((p) => p.type === "month").value);
  const tzDay = Number(parts.find((p) => p.type === "day").value);
  const tzHour = Number(parts.find((p) => p.type === "hour").value);
  const tzMinute = Number(parts.find((p) => p.type === "minute").value);

  // Calculate the offset: difference between UTC time and local time
  const localMs = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, 0);
  const offsetMs = referenceUTC - localMs;

  // Now apply this offset to our target time
  // Our target is: year-month-day hour:minute in the owner's timezone
  // To get UTC, we subtract the offset
  const targetLocalMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const targetUTCMs = targetLocalMs + offsetMs;

  return new Date(targetUTCMs);
};

/** Build a 6×7 grid of day numbers (0 = empty padding cell) */
const buildCalendarGrid = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid = [];
  let week = Array(firstDay).fill(0);

  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      grid.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(0);
    grid.push(week);
  }
  return grid;
};

// ─── Component ───────────────────────────────────────────────────────────────

const CalendarTimeSlotPage = () => {
  const { ownerSlug, eventTypeSlug } = useParams();
  const navigate = useNavigate();

  // ── Redux state ──────────────────────────────────────────────────────────
  const eventType = useSelector(selectEventTypeBySlug(eventTypeSlug));
  const allEventTypes = useSelector(selectAllEventTypes);
  const rules = useSelector(selectAllRules);
  const bookings = useSelector(selectAllBookings);
  const ownerTimezone = useSelector(selectOwnerTimezone);

  // ── Local state ──────────────────────────────────────────────────────────
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD"

  // Detected client timezone
  const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // ── Navigation ───────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
    setSelectedDate(null);
  };

  // ── Calendar grid ────────────────────────────────────────────────────────
  const grid = useMemo(
    () => buildCalendarGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  // ── Availability helper for a specific day number in the view month ──────
  const getAvailabilityForDay = (dayNum) => {
    if (!dayNum) return null;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const dayOfWeek = new Date(dateStr + "T00:00:00").getDay();

    // Check for one-time override
    const override = rules.find(
      (r) =>
        (r.rule_type === "one_time" || r.rule_type === "day_off") &&
        r.date_override === dateStr,
    );
    if (override) return override;

    // Fallback to recurring rule
    return (
      rules.find(
        (r) => r.rule_type === "recurring" && r.day_of_week === dayOfWeek,
      ) ?? null
    );
  };

  const isDayAvailable = (dayNum) => {
    if (!dayNum) return false;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const cellDate = new Date(dateStr + "T00:00:00");
    const todayMidnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    if (cellDate < todayMidnight) return false; // past
    const rule = getAvailabilityForDay(dayNum);
    return rule?.is_available ?? false;
  };

  // ── Selected date slots ───────────────────────────────────────────────────
  const availableSlots = useMemo(() => {
    if (!selectedDate || !eventType) return [];
    const dayOfWeek = new Date(selectedDate + "T00:00:00").getDay();
    const override = rules.find(
      (r) =>
        (r.rule_type === "one_time" || r.rule_type === "day_off") &&
        r.date_override === selectedDate,
    );
    const rule =
      override ??
      rules.find(
        (r) => r.rule_type === "recurring" && r.day_of_week === dayOfWeek,
      ) ??
      null;
    return generateSlots(
      selectedDate,
      rule,
      eventType,
      bookings,
      allEventTypes,
      ownerTimezone,
    );
  }, [selectedDate, eventType, rules, bookings, allEventTypes, ownerTimezone]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleDayClick = (dayNum) => {
    if (!isDayAvailable(dayNum)) return;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    setSelectedDate(dateStr);
  };

  const handleSlotSelect = (slot) => {
    navigate(`/book/${ownerSlug}/${eventTypeSlug}/form`, {
      state: { slot, eventTypeId: eventType?.id, selectedDate },
    });
  };

  const handleBack = () => navigate(`/book/${ownerSlug}`);

  // ── Today ISO string for comparison ──────────────────────────────────────
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!eventType) {
    return <Navigate to="/pages-404" replace />;
  }

  const locationIcon =
    LOCATION_ICONS[eventType.location_type] || "ri-map-pin-line";
  const locationLabel =
    LOCATION_LABELS[eventType.location_type] || eventType.location_type;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="vh-100 bg-light d-flex flex-column">
      <Container fluid="lg" className="py-3 flex-shrink-0">
        {/* Back link */}
        <div className="mb-2">
          <button
            className="btn btn-link text-muted p-0 fs-13"
            onClick={handleBack}
          >
            <i className="ri-arrow-left-line me-1" />
            Back to event types
          </button>
        </div>
      </Container>

      <Container
        fluid="lg"
        className="flex-grow-1 pb-3"
        style={{ minHeight: 0 }}
      >
        {/* ── Main 3-panel Card ────────────────────────────────── */}
        <Card className="shadow-sm border-0 overflow-hidden h-100">
          <Row className="g-0 h-100">
            {/* ══ Panel 1 ── Event Details (bg-light) ════════════════ */}
            <Col
              md={3}
              className="bg-light border-end p-4 d-flex flex-column"
              style={{ maxHeight: "100%", overflow: "auto" }}
            >
              {/* Owner avatar */}
              <div className="mb-3">
                <div
                  className="rounded-circle bg-primary d-inline-flex align-items-center justify-content-center mb-2"
                  style={{ width: 48, height: 48 }}
                >
                  <span className="fw-bold text-white fs-18">
                    {ownerSlug ? ownerSlug.charAt(0).toUpperCase() : "O"}
                  </span>
                </div>
                <p className="text-muted fs-12 mb-0">
                  {ownerSlug
                    ?.split("-")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ")}
                </p>
              </div>

              <h5 className="fw-semibold mb-3">{eventType.title}</h5>

              <div className="d-flex flex-column gap-2 mb-4">
                <span className="d-flex align-items-center gap-2 text-muted fs-13">
                  <i className="ri-timer-line text-primary" />
                  {eventType.duration_minutes} minutes
                </span>
                <span className="d-flex align-items-center gap-2 text-muted fs-13">
                  <i className={`${locationIcon} text-primary`} />
                  {locationLabel}
                </span>
                {eventType.buffer_after_mins > 0 && (
                  <span className="d-flex align-items-center gap-2 text-muted fs-13">
                    <i className="ri-time-line text-primary" />+
                    {eventType.buffer_after_mins} min buffer
                  </span>
                )}
                {eventType.min_notice_mins >= 60 && (
                  <span className="d-flex align-items-center gap-2 text-muted fs-13">
                    <i className="ri-notification-line text-primary" />
                    {eventType.min_notice_mins / 60}h notice required
                  </span>
                )}
              </div>

              <p className="text-muted fs-13 lh-base">
                {eventType.description}
              </p>
            </Col>

            {/* ══ Panel 2 ── Calendar ═════════════════════════════════ */}
            <Col
              md={5}
              className="border-end p-4"
              style={{ maxHeight: "100%", overflow: "auto" }}
            >
              <h6 className="fw-semibold mb-4 text-center">Select a Date</h6>

              {/* Month navigation */}
              <div className="d-flex align-items-center justify-content-between mb-3">
                <button
                  className="btn btn-sm btn-light border"
                  onClick={prevMonth}
                  aria-label="Previous month"
                >
                  <i className="ri-arrow-left-s-line" />
                </button>
                <span className="fw-semibold">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button
                  className="btn btn-sm btn-light border"
                  onClick={nextMonth}
                  aria-label="Next month"
                >
                  <i className="ri-arrow-right-s-line" />
                </button>
              </div>

              {/* Day-of-week header */}
              <table
                className="w-100 text-center mb-2"
                style={{ tableLayout: "fixed" }}
              >
                <thead>
                  <tr>
                    {DAY_LABELS.map((d) => (
                      <th key={d} className="text-muted fw-normal fs-12 pb-2">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.map((week, wi) => (
                    <tr key={wi}>
                      {week.map((day, di) => {
                        if (!day) return <td key={di} />;

                        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const isSelected = selectedDate === dateStr;
                        const isToday = dateStr === todayStr;
                        const available = isDayAvailable(day);
                        const isPast =
                          new Date(dateStr + "T00:00:00") <
                          new Date(
                            today.getFullYear(),
                            today.getMonth(),
                            today.getDate(),
                          );

                        return (
                          <td key={di} className="p-1">
                            <button
                              onClick={() => handleDayClick(day)}
                              disabled={!available}
                              className={[
                                "btn btn-sm rounded-circle p-0 d-inline-flex align-items-center justify-content-center",
                                isSelected
                                  ? "btn-primary text-white fw-semibold"
                                  : "",
                                !isSelected && isToday
                                  ? "border border-primary text-primary"
                                  : "",
                                !isSelected && !isToday && available
                                  ? "text-body btn-light"
                                  : "",
                                isPast || !available
                                  ? "text-muted opacity-50"
                                  : "",
                              ].join(" ")}
                              style={{ width: 36, height: 36, fontSize: 13 }}
                              aria-label={dateStr}
                            >
                              {day}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Col>

            {/* ══ Panel 3 ── Time Slots ═══════════════════════════════ */}
            <Col
              md={4}
              className="p-4 d-flex flex-column"
              style={{ maxHeight: "100%" }}
            >
              {selectedDate ? (
                <>
                  <div className="mb-3 flex-shrink-0">
                    <h6 className="fw-semibold mb-1">
                      {formatDateHeading(selectedDate)}
                    </h6>
                    <p className="text-muted fs-12 mb-0 d-flex align-items-center gap-1">
                      <i className="ri-global-line" />
                      {clientTz}
                    </p>
                  </div>

                  {availableSlots.length === 0 ? (
                    <div className="text-center mt-4">
                      <i className="ri-calendar-close-line display-5 text-muted d-block mb-2" />
                      <p className="text-muted fs-13">
                        No available slots for this date.
                      </p>
                    </div>
                  ) : (
                    <div
                      className="overflow-auto flex-grow-1 pe-2"
                      style={{ minHeight: 0 }}
                    >
                      {availableSlots.map((slot, idx) => (
                        <button
                          key={idx}
                          className="btn btn-outline-primary d-block w-100 mb-2 text-center fw-medium"
                          onClick={() => handleSlotSelect(slot)}
                        >
                          {formatSlotTime(slot.start, clientTz)}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center text-muted">
                  <i className="ri-calendar-check-line display-4 mb-3 opacity-50" />
                  <p className="fs-14">
                    Pick a date on the calendar to see available time slots.
                  </p>
                </div>
              )}
            </Col>
          </Row>
        </Card>
      </Container>
    </div>
  );
};

export default CalendarTimeSlotPage;
