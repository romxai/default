import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Container, Row, Col, Card, CardBody, Button } from "reactstrap";
import { selectAllBookings } from "../../slices/booking";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format ISO UTC string → "20260303T090000Z" (Google Calendar compact format) */
const toGCalDate = (isoStr) =>
  new Date(isoStr)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, ""); // "20260303T090000Z"

/**
 * Build the Google Calendar "Add Event" redirect URL.
 * Format: https://calendar.google.com/calendar/render?action=TEMPLATE
 *         &text=Title&dates=START/END&details=Description&location=Link
 */
const buildGCalUrl = ({ title, startISO, endISO, description, location }) => {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toGCalDate(startISO)}/${toGCalDate(endISO)}`,
    details: description ?? "",
    location: location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const formatDateTime = (isoStr, tz) =>
  new Date(isoStr).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });

const LOCATION_LABELS = {
  google_meet: "Google Meet",
  zoom: "Zoom",
  phone: "Phone",
  in_person: "In Person",
};

// ─── Component ────────────────────────────────────────────────────────────────

const BookingConfirmationPage = () => {
  const { ownerSlug, eventTypeSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Payload from BookingFormPage
  const { booking, eventType } = location.state ?? {};
  const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Retrieve the full confirmed booking record from Redux (has id + meet_link)
  const allBookings = useSelector(selectAllBookings);
  const confirmedBooking = allBookings.find(
    (b) =>
      b.start_time === booking?.start_time &&
      b.attendee_email === booking?.attendee_email,
  );

  const meetLink =
    confirmedBooking?.meet_link ??
    `https://meet.google.com/mock-${Date.now().toString(36)}`;

  // ── Guard ────────────────────────────────────────────────────────────────
  if (!booking || !eventType) {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <i className="ri-error-warning-line display-4 text-warning d-block mb-3" />
          <p className="text-muted">No booking data found.</p>
          <Button
            color="primary"
            onClick={() => navigate(`/book/${ownerSlug}`)}
          >
            Book Again
          </Button>
        </div>
      </div>
    );
  }

  const gCalUrl = buildGCalUrl({
    title: eventType.title,
    startISO: booking.start_time,
    endISO: booking.end_time,
    description: `${eventType.description}\n\nJoin: ${meetLink}`,
    location: meetLink,
  });

  const locationLabel =
    LOCATION_LABELS[eventType.location_type] || eventType.location_type;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-vh-100 bg-light py-5">
      <Container>
        <Row className="justify-content-center">
          <Col md={7} lg={6}>
            <Card className="shadow-sm border-0">
              <CardBody className="p-4 p-md-5">
                {/* ── Success icon ─────────────────────────────────── */}
                <div className="text-center mb-4">
                  <div
                    className="rounded-circle bg-success bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: 72, height: 72 }}
                  >
                    <i className="ri-checkbox-circle-line text-success fs-1" />
                  </div>
                  <h4 className="fw-semibold mb-1">You're Booked!</h4>
                  <p className="text-muted fs-14 mb-0">
                    A confirmation has been sent to{" "}
                    <strong>{booking.attendee_email}</strong>.
                  </p>
                </div>

                <hr className="my-4" />

                {/* ── Booking details ───────────────────────────────── */}
                <h6 className="fw-semibold text-muted text-uppercase fs-12 mb-3 letter-spacing">
                  Booking Details
                </h6>

                <div className="d-flex flex-column gap-3 mb-4">
                  <div className="d-flex align-items-start gap-3">
                    <i className="ri-calendar-event-line text-primary fs-18 flex-shrink-0 mt-1" />
                    <div>
                      <p className="fw-semibold mb-0">{eventType.title}</p>
                      <p className="text-muted fs-13 mb-0">
                        {formatDateTime(booking.start_time, clientTz)}
                      </p>
                    </div>
                  </div>

                  <div className="d-flex align-items-start gap-3">
                    <i className="ri-timer-line text-primary fs-18 flex-shrink-0 mt-1" />
                    <div>
                      <p className="fw-semibold mb-0">
                        {eventType.duration_minutes} minutes
                      </p>
                    </div>
                  </div>

                  <div className="d-flex align-items-start gap-3">
                    <i className="ri-video-chat-line text-primary fs-18 flex-shrink-0 mt-1" />
                    <div>
                      <p className="fw-semibold mb-0">{locationLabel}</p>
                      <a
                        href={meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary fs-13 text-break"
                      >
                        {meetLink}
                      </a>
                    </div>
                  </div>

                  <div className="d-flex align-items-start gap-3">
                    <i className="ri-user-line text-primary fs-18 flex-shrink-0 mt-1" />
                    <div>
                      <p className="fw-semibold mb-0">
                        {booking.attendee_name}
                      </p>
                      <p className="text-muted fs-13 mb-0">
                        {booking.attendee_email}
                      </p>
                    </div>
                  </div>

                  <div className="d-flex align-items-start gap-3">
                    <i className="ri-global-line text-primary fs-18 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-muted fs-13 mb-0">
                        {booking.attendee_timezone}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Show custom answers if any */}
                {booking.custom_answers?.length > 0 && (
                  <>
                    <hr className="my-3" />
                    <h6 className="fw-semibold text-muted text-uppercase fs-12 mb-3">
                      Your Responses
                    </h6>
                    {booking.custom_answers.map((a, i) => (
                      <div key={i} className="mb-2">
                        <p className="fw-medium fs-13 mb-0">{a.label}</p>
                        <p className="text-muted fs-13 mb-0">
                          {a.answer || "—"}
                        </p>
                      </div>
                    ))}
                  </>
                )}

                <hr className="my-4" />

                {/* ── CTA Buttons ───────────────────────────────────── */}
                <div className="d-flex flex-column gap-2">
                  {/* Primary: Add to Google Calendar */}
                  <a
                    href={gCalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-lg d-flex align-items-center justify-content-center gap-2"
                  >
                    <i className="ri-calendar-2-line fs-16" />
                    Add to Google Calendar
                  </a>

                  {/* Secondary: Join Meeting */}
                  <a
                    href={meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-soft-primary btn-lg d-flex align-items-center justify-content-center gap-2"
                  >
                    <i className="ri-video-chat-line fs-16" />
                    Join Google Meet
                  </a>

                  {/* Tertiary: Book another */}
                  <button
                    className="btn btn-light btn-lg d-flex align-items-center justify-content-center gap-2"
                    onClick={() => navigate(`/book/${ownerSlug}`)}
                  >
                    <i className="ri-arrow-left-line fs-16" />
                    Book Another Meeting
                  </button>
                </div>

                {/* ── Google Calendar URL for transparency (dev) ─── */}
                <details className="mt-4">
                  <summary
                    className="text-muted fs-12 cursor-pointer"
                    style={{ cursor: "pointer" }}
                  >
                    View Google Calendar redirect URL
                  </summary>
                  <code className="d-block mt-2 p-2 bg-light rounded fs-11 text-break">
                    {gCalUrl}
                  </code>
                </details>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default BookingConfirmationPage;
