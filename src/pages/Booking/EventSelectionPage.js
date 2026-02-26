import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Container, Row, Col, Card, CardBody } from "reactstrap";
import { selectActiveEventTypes } from "../../slices/booking";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

const CARD_COLORS = {
  primary: { bg: "bg-primary bg-opacity-10", text: "text-primary" },
  success: { bg: "bg-success bg-opacity-10", text: "text-success" },
  warning: { bg: "bg-warning bg-opacity-10", text: "text-warning" },
  info: { bg: "bg-info bg-opacity-10", text: "text-info" },
  danger: { bg: "bg-danger bg-opacity-10", text: "text-danger" },
};

// ─── Component ──────────────────────────────────────────────────────────────

const EventSelectionPage = () => {
  const { ownerSlug } = useParams();
  const navigate = useNavigate();
  const eventTypes = useSelector(selectActiveEventTypes);

  // Filter to the owner's event types
  const ownerEventTypes = eventTypes.filter(
    (et) => et.owner_slug === ownerSlug,
  );

  // Derive owner display name from slug (capitalise first word)
  const ownerName = ownerSlug
    ? ownerSlug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "Owner";

  const ownerInitial = ownerName.charAt(0).toUpperCase();

  const handleSelect = (et) => {
    navigate(`/book/${ownerSlug}/${et.slug}`);
  };

  return (
    <div className="min-vh-100 bg-light py-5">
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="text-center mb-4">
              {/* Avatar */}
              <div
                className="avatar-md mx-auto mb-3 rounded-circle bg-primary d-flex align-items-center justify-content-center"
                style={{ width: 64, height: 64 }}
              >
                <span className="fs-4 fw-bold text-white">{ownerInitial}</span>
              </div>
              <h4 className="mb-1 fw-semibold">{ownerName}</h4>
              <p className="text-muted fs-14 mb-0">
                Select a meeting type to get started
              </p>
            </div>

            {/* ── Event Type Cards ────────────────────────────────────── */}
            {ownerEventTypes.length === 0 ? (
              <Card className="shadow-none border">
                <CardBody className="text-center py-5">
                  <i className="ri-calendar-close-line display-4 text-muted d-block mb-3" />
                  <p className="text-muted mb-0">
                    No event types are available right now.
                  </p>
                </CardBody>
              </Card>
            ) : (
              ownerEventTypes.map((et) => {
                const color = CARD_COLORS[et.color] || CARD_COLORS.primary;
                const locationIcon =
                  LOCATION_ICONS[et.location_type] || "ri-map-pin-line";
                const locationLabel =
                  LOCATION_LABELS[et.location_type] || et.location_type;

                return (
                  <Card
                    key={et.id}
                    className="mb-3 border card-animate"
                    onClick={() => handleSelect(et)}
                    style={{ cursor: "pointer" }}
                  >
                    <CardBody>
                      <div className="d-flex align-items-center gap-3">
                        {/* ── Left: Icon + Select ───────────────────── */}
                        <div className="d-flex flex-column align-items-center gap-2 flex-shrink-0">
                          <div
                            className={`rounded-circle d-flex align-items-center justify-content-center ${color.bg}`}
                            style={{ width: 48, height: 48 }}
                          >
                            <i
                              className={`ri-calendar-event-line fs-20 ${color.text}`}
                            />
                          </div>
                          <button
                            className={`btn btn-sm btn-soft-${et.color || "primary"} px-3`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(et);
                            }}
                          >
                            Select
                          </button>
                        </div>

                        {/* ── Right: Details ────────────────────────── */}
                        <div className="flex-grow-1 text-end">
                          <h6 className="fw-semibold mb-1">{et.title}</h6>
                          <p className="text-muted fs-13 mb-2 lh-sm">
                            {et.description}
                          </p>
                          <div className="d-flex justify-content-end align-items-center gap-3 flex-wrap">
                            <span className="d-flex align-items-center gap-1 text-muted fs-12">
                              <i className="ri-time-line" />
                              {et.min_notice_mins >= 60
                                ? `${et.min_notice_mins / 60}h notice`
                                : `${et.min_notice_mins}m notice`}
                            </span>
                            <span className="d-flex align-items-center gap-1 text-muted fs-12">
                              <i className={locationIcon} />
                              {locationLabel}
                            </span>
                            <span className="d-flex align-items-center gap-1 fw-medium fs-12">
                              <i className="ri-timer-line" />
                              {et.duration_minutes} min
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                );
              })
            )}

            {/* ── Footer branding ─────────────────────────────────────── */}
            <div className="text-center mt-4">
              <p className="text-muted fs-12 mb-0">
                <i className="ri-calendar-2-line me-1" />
                Powered by <strong>BookingModule</strong>
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default EventSelectionPage;
