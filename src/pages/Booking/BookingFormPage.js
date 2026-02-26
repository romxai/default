import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Form,
  FormGroup,
  Label,
  Input,
  FormFeedback,
  Button,
  Spinner,
} from "reactstrap";
import { addBooking } from "../../slices/booking/bookingsSlice";
import { selectEventTypeBySlug } from "../../slices/booking";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatSlotDisplay = (isoStr, tz) =>
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

const BookingFormPage = () => {
  const { ownerSlug, eventTypeSlug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  // State passed from CalendarTimeSlotPage via navigate()
  const { slot, eventTypeId, selectedDate } = location.state ?? {};

  const eventType = useSelector(selectEventTypeBySlug(eventTypeSlug));
  const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // ── Form state ──────────────────────────────────────────────────────────
  const [fields, setFields] = useState({
    attendee_name: "",
    attendee_email: "",
    notes: "",
  });
  const [guests, setGuests] = useState([]);
  const [customAnswers, setCustomAnswers] = useState(
    (eventType?.custom_questions ?? []).reduce((acc, q) => {
      acc[q.id] = "";
      return acc;
    }, {}),
  );
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ── Guard ────────────────────────────────────────────────────────────────
  if (!eventType || !slot) {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <i className="ri-error-warning-line display-4 text-warning d-block mb-3" />
          <p className="text-muted">
            Booking session expired or invalid. Please start over.
          </p>
          <Button
            color="primary"
            onClick={() => navigate(`/book/${ownerSlug}`)}
          >
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!fields.attendee_name.trim()) e.attendee_name = "Name is required.";
    if (!fields.attendee_email.trim()) e.attendee_email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.attendee_email))
      e.attendee_email = "Please enter a valid email address.";

    // Validate guest emails
    guests.forEach((guestEmail, idx) => {
      if (guestEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
        e[`guest_${idx}`] = "Please enter a valid email address.";
      }
    });

    // Required custom questions
    (eventType.custom_questions ?? []).forEach((q) => {
      if (q.required && !customAnswers[q.id]?.toString().trim())
        e[q.id] = `${q.label} is required.`;
    });
    return e;
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();

    // Prevent double-fire
    if (submitting) return;

    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);

    const newBooking = {
      event_type_id: eventType.id,
      attendee_name: fields.attendee_name.trim(),
      attendee_email: fields.attendee_email.trim(),
      attendee_timezone: clientTz,
      notes: fields.notes.trim(),
      guests: guests.filter((g) => g.trim()).map((g) => g.trim()),
      start_time: slot.start,
      end_time: slot.end,
      custom_answers: (eventType.custom_questions ?? []).map((q) => ({
        question_id: q.id,
        label: q.label,
        answer: customAnswers[q.id] ?? "",
      })),
    };

    // Fake a network delay of 1.5 seconds to prevent double-click
    setTimeout(() => {
      dispatch(addBooking(newBooking));
      setSubmitting(false);

      // Navigate to confirmation page with booking payload in state
      navigate(`/book/${ownerSlug}/${eventTypeSlug}/confirmed`, {
        state: { booking: { ...newBooking }, eventType },
      });
    }, 1500);
  };

  const handleFieldChange = (e) => {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const handleCustomChange = (id, value) => {
    setCustomAnswers((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => ({ ...prev, [id]: undefined }));
  };

  const handleAddGuest = () => {
    if (guests.length < 5) {
      setGuests([...guests, ""]);
    }
  };

  const handleGuestChange = (index, value) => {
    const newGuests = [...guests];
    newGuests[index] = value;
    setGuests(newGuests);
    setErrors((prev) => ({ ...prev, [`guest_${index}`]: undefined }));
  };

  const handleRemoveGuest = (index) => {
    setGuests(guests.filter((_, i) => i !== index));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`guest_${index}`];
      return newErrors;
    });
  };

  const locationLabel =
    LOCATION_LABELS[eventType.location_type] || eventType.location_type;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-vh-100 bg-light py-5">
      <Container>
        <Row className="justify-content-center">
          <Col md={7} lg={6}>
            {/* Back */}
            <div className="mb-3">
              <button
                className="btn btn-link text-muted p-0 fs-13"
                onClick={() => navigate(-1)}
              >
                <i className="ri-arrow-left-line me-1" />
                Back
              </button>
            </div>

            <Card className="shadow-sm border-0">
              <CardBody className="p-4 p-md-5">
                {/* ── Booking summary banner ─────────────────────── */}
                <div className="p-3 bg-light rounded-3 mb-4">
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="rounded-circle bg-primary d-inline-flex align-items-center justify-content-center flex-shrink-0 mt-1"
                      style={{ width: 40, height: 40 }}
                    >
                      <span className="fw-bold text-white fs-16">
                        {ownerSlug?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h6 className="fw-semibold mb-1">{eventType.title}</h6>
                      <div className="d-flex flex-wrap gap-3 text-muted fs-13">
                        <span className="d-flex align-items-center gap-1">
                          <i className="ri-calendar-event-line" />
                          {formatSlotDisplay(slot.start, clientTz)}
                        </span>
                        <span className="d-flex align-items-center gap-1">
                          <i className="ri-timer-line" />
                          {eventType.duration_minutes} min
                        </span>
                        <span className="d-flex align-items-center gap-1">
                          <i className="ri-video-chat-line" />
                          {locationLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Form ──────────────────────────────────────── */}
                <h6 className="fw-semibold mb-4">Enter your details</h6>

                <Form onSubmit={handleSubmit} noValidate>
                  <FormGroup>
                    <Label for="attendee_name" className="fw-medium fs-14">
                      Full Name <span className="text-danger">*</span>
                    </Label>
                    <Input
                      id="attendee_name"
                      name="attendee_name"
                      type="text"
                      placeholder="Jane Smith"
                      value={fields.attendee_name}
                      onChange={handleFieldChange}
                      invalid={!!errors.attendee_name}
                    />
                    <FormFeedback>{errors.attendee_name}</FormFeedback>
                  </FormGroup>

                  <FormGroup>
                    <Label for="attendee_email" className="fw-medium fs-14">
                      Email Address <span className="text-danger">*</span>
                    </Label>
                    <Input
                      id="attendee_email"
                      name="attendee_email"
                      type="email"
                      placeholder="jane@example.com"
                      value={fields.attendee_email}
                      onChange={handleFieldChange}
                      invalid={!!errors.attendee_email}
                    />
                    <FormFeedback>{errors.attendee_email}</FormFeedback>
                  </FormGroup>

                  <FormGroup>
                    <Label for="notes" className="fw-medium fs-14">
                      Additional Notes
                    </Label>
                    <Input
                      id="notes"
                      name="notes"
                      type="textarea"
                      rows={3}
                      placeholder="Please share anything that will help prepare for our meeting."
                      value={fields.notes}
                      onChange={handleFieldChange}
                    />
                  </FormGroup>

                  {/* Guest emails */}
                  <FormGroup>
                    <Label className="fw-medium fs-14 d-flex align-items-center justify-content-between">
                      <span>Guests</span>
                      {guests.length < 5 && (
                        <Button
                          color="link"
                          size="sm"
                          className="p-0 text-decoration-none"
                          onClick={handleAddGuest}
                        >
                          <i className="ri-add-line me-1" />
                          Add Guest
                        </Button>
                      )}
                    </Label>
                    {guests.length === 0 && (
                      <small className="text-muted d-block mb-2">
                        Add up to 5 guests to this event
                      </small>
                    )}
                    {guests.map((guest, idx) => (
                      <div key={idx} className="d-flex gap-2 mb-2">
                        <Input
                          type="email"
                          placeholder={`Guest ${idx + 1} email`}
                          value={guest}
                          onChange={(e) =>
                            handleGuestChange(idx, e.target.value)
                          }
                          invalid={!!errors[`guest_${idx}`]}
                        />
                        <Button
                          color="light"
                          size="sm"
                          onClick={() => handleRemoveGuest(idx)}
                        >
                          <i className="ri-close-line" />
                        </Button>
                        {errors[`guest_${idx}`] && (
                          <FormFeedback className="d-block">
                            {errors[`guest_${idx}`]}
                          </FormFeedback>
                        )}
                      </div>
                    ))}
                  </FormGroup>

                  {/* Custom questions */}
                  {(eventType.custom_questions ?? []).map((q) => (
                    <FormGroup key={q.id}>
                      <Label for={q.id} className="fw-medium fs-14">
                        {q.label}
                        {q.required && <span className="text-danger"> *</span>}
                      </Label>
                      {q.type === "textarea" ? (
                        <Input
                          id={q.id}
                          type="textarea"
                          rows={3}
                          value={customAnswers[q.id] ?? ""}
                          onChange={(e) =>
                            handleCustomChange(q.id, e.target.value)
                          }
                          invalid={!!errors[q.id]}
                        />
                      ) : (
                        <Input
                          id={q.id}
                          type={q.type === "number" ? "number" : "text"}
                          value={customAnswers[q.id] ?? ""}
                          onChange={(e) =>
                            handleCustomChange(q.id, e.target.value)
                          }
                          invalid={!!errors[q.id]}
                        />
                      )}
                      <FormFeedback>{errors[q.id]}</FormFeedback>
                    </FormGroup>
                  ))}

                  <div className="d-grid mt-4">
                    <Button
                      color="primary"
                      type="submit"
                      size="lg"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Confirming…
                        </>
                      ) : (
                        <>
                          <i className="ri-check-line me-2" />
                          Confirm Booking
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default BookingFormPage;
