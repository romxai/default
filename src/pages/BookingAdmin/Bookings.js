import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardBody,
  CardHeader,
  Col,
  Row,
  Table,
  Badge,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
  Label,
  Input,
} from "reactstrap";
import {
  selectAllBookings,
  selectAllEventTypes,
  cancelBooking,
} from "../../slices/booking";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_BADGE = {
  confirmed:   { color: "success",   icon: "ri-checkbox-circle-line" },
  cancelled:   { color: "danger",    icon: "ri-close-circle-line"    },
  rescheduled: { color: "warning",   icon: "ri-refresh-line"         },
};

function formatDateTimeLocal(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleString("en-US", {
    month:  "short",
    day:    "numeric",
    year:   "numeric",
    hour:   "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

function isUpcoming(isoStr) {
  return new Date(isoStr) > new Date();
}

const FILTER_OPTIONS = [
  { value: "all",         label: "All Bookings"  },
  { value: "confirmed",   label: "Confirmed"     },
  { value: "rescheduled", label: "Rescheduled"   },
  { value: "cancelled",   label: "Cancelled"     },
];

// ─── Component ───────────────────────────────────────────────────────────────

const Bookings = () => {
  const dispatch    = useDispatch();
  const bookings    = useSelector(selectAllBookings);
  const eventTypes  = useSelector(selectAllEventTypes);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search,       setSearch]       = useState("");

  // ── Cancel modal state ───────────────────────────────────────────────────
  const [cancelModal,  setCancelModal]  = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  // ── Detail modal state ───────────────────────────────────────────────────
  const [detailModal,  setDetailModal]  = useState(false);
  const [detailTarget, setDetailTarget] = useState(null);

  // ── Derived data ─────────────────────────────────────────────────────────

  const eventTypeMap = eventTypes.reduce((acc, et) => {
    acc[et.id] = et;
    return acc;
  }, {});

  const filtered = bookings
    .filter((b) => statusFilter === "all" || b.status === statusFilter)
    .filter((b) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        b.attendee_name.toLowerCase().includes(q) ||
        b.attendee_email.toLowerCase().includes(q) ||
        (eventTypeMap[b.event_type_id]?.title || "").toLowerCase().includes(q)
      );
    })
    .slice()
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

  // ── Handlers ─────────────────────────────────────────────────────────────

  const openCancelModal = (booking) => {
    setCancelTarget(booking);
    setCancelReason("");
    setCancelModal(true);
  };

  const handleCancelConfirm = () => {
    if (cancelTarget) {
      dispatch(cancelBooking({ id: cancelTarget.id, cancel_reason: cancelReason || null }));
    }
    setCancelModal(false);
    setCancelTarget(null);
    setCancelReason("");
  };

  const openDetailModal = (booking) => {
    setDetailTarget(booking);
    setDetailModal(true);
  };

  // ── Summary counts ────────────────────────────────────────────────────────
  const confirmedCount   = bookings.filter((b) => b.status === "confirmed").length;
  const cancelledCount   = bookings.filter((b) => b.status === "cancelled").length;
  const upcomingCount    = bookings.filter((b) => b.status === "confirmed" && isUpcoming(b.start_time)).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page-content">
      <div className="container-fluid">

        {/* Page header */}
        <Row className="mb-3 align-items-center">
          <Col>
            <h4 className="mb-0">
              <i className="ri-calendar-check-line me-2 text-primary"></i>
              Bookings
            </h4>
            <p className="text-muted mb-0">
              View, manage, and cancel scheduled meetings.
            </p>
          </Col>
        </Row>

        {/* ── Summary Cards ─────────────────────────────────────────────── */}
        <Row className="mb-4">
          <Col sm={4}>
            <Card className="border-0 shadow-sm">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="avatar-sm rounded bg-soft-success d-flex align-items-center justify-content-center fs-4">
                  <i className="ri-calendar-check-line text-success"></i>
                </div>
                <div>
                  <div className="fs-4 fw-bold">{upcomingCount}</div>
                  <div className="text-muted small">Upcoming</div>
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col sm={4}>
            <Card className="border-0 shadow-sm">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="avatar-sm rounded bg-soft-primary d-flex align-items-center justify-content-center fs-4">
                  <i className="ri-check-double-line text-primary"></i>
                </div>
                <div>
                  <div className="fs-4 fw-bold">{confirmedCount}</div>
                  <div className="text-muted small">Confirmed (total)</div>
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col sm={4}>
            <Card className="border-0 shadow-sm">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="avatar-sm rounded bg-soft-danger d-flex align-items-center justify-content-center fs-4">
                  <i className="ri-close-circle-line text-danger"></i>
                </div>
                <div>
                  <div className="fs-4 fw-bold">{cancelledCount}</div>
                  <div className="text-muted small">Cancelled</div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* ── Bookings Table ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <Row className="align-items-center g-2">
              <Col>
                <span className="fw-semibold">
                  <i className="ri-list-check me-2 text-muted"></i>
                  All Bookings
                </span>
              </Col>

              {/* Search */}
              <Col md={4}>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-transparent border-end-0">
                    <i className="ri-search-line text-muted"></i>
                  </span>
                  <Input
                    bsSize="sm"
                    placeholder="Search name, email, event…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border-start-0"
                  />
                </div>
              </Col>

              {/* Status filter */}
              <Col md="auto">
                <Input
                  type="select"
                  bsSize="sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ minWidth: "150px" }}
                >
                  {FILTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Input>
              </Col>
            </Row>
          </CardHeader>

          <CardBody className="p-0">
            {filtered.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="ri-calendar-2-line fs-1 d-block mb-2"></i>
                No bookings match your filters.
              </div>
            ) : (
              <div className="table-responsive">
                <Table className="table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Attendee</th>
                      <th>Event Type</th>
                      <th>Date &amp; Time (UTC)</th>
                      <th>Status</th>
                      <th>Meeting Link</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((bk) => {
                      const et           = eventTypeMap[bk.event_type_id];
                      const badgeConfig  = STATUS_BADGE[bk.status] || {};
                      const canCancel    = bk.status === "confirmed" && isUpcoming(bk.start_time);

                      return (
                        <tr key={bk.id}>
                          {/* Attendee */}
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className="rounded-circle bg-light border d-flex align-items-center justify-content-center text-muted fw-semibold"
                                style={{ width: 36, height: 36, minWidth: 36, fontSize: 14 }}
                              >
                                {bk.attendee_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="fw-semibold">{bk.attendee_name}</div>
                                <small className="text-muted">{bk.attendee_email}</small>
                              </div>
                            </div>
                          </td>

                          {/* Event type */}
                          <td>
                            {et ? (
                              <div className="d-flex align-items-center gap-2">
                                <span className={`badge bg-${et.color || "primary"} rounded-circle p-1`}
                                  style={{ width: 8, height: 8, display: "inline-block" }}
                                />
                                <span>{et.title}</span>
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>

                          {/* Date / time */}
                          <td>
                            <div className="fw-semibold">{formatDateTimeLocal(bk.start_time)}</div>
                            {et && (
                              <small className="text-muted">
                                <i className="ri-time-line me-1"></i>{et.duration_minutes} min
                              </small>
                            )}
                          </td>

                          {/* Status */}
                          <td>
                            <Badge color={badgeConfig.color || "secondary"}>
                              {badgeConfig.icon && (
                                <i className={`${badgeConfig.icon} me-1`}></i>
                              )}
                              {bk.status.charAt(0).toUpperCase() + bk.status.slice(1)}
                            </Badge>
                            {bk.status === "cancelled" && bk.cancel_reason && (
                              <div className="text-muted small mt-1">
                                {bk.cancel_reason}
                              </div>
                            )}
                          </td>

                          {/* Meet link */}
                          <td>
                            {bk.meet_link ? (
                              <a
                                href={bk.meet_link}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-sm btn-soft-primary"
                              >
                                <i className="ri-video-chat-line me-1"></i>Join
                              </a>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="text-end">
                            <Button
                              size="sm"
                              color="light"
                              className="border me-1"
                              onClick={() => openDetailModal(bk)}
                              title="View details"
                            >
                              <i className="ri-eye-line"></i>
                            </Button>
                            {canCancel && (
                              <Button
                                size="sm"
                                color="soft-danger"
                                onClick={() => openCancelModal(bk)}
                                title="Cancel booking"
                              >
                                <i className="ri-close-line"></i>
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── Cancel Confirm Modal ───────────────────────────────────────── */}
        <Modal isOpen={cancelModal} toggle={() => setCancelModal(false)} centered>
          <ModalHeader toggle={() => setCancelModal(false)}>
            <i className="ri-close-circle-line me-2 text-danger"></i>Cancel Booking
          </ModalHeader>
          <ModalBody>
            <p className="mb-3">
              Cancel the booking for{" "}
              <strong>{cancelTarget?.attendee_name}</strong> on{" "}
              <strong>{formatDateTimeLocal(cancelTarget?.start_time)}</strong>?
            </p>
            <FormGroup>
              <Label for="cancel-reason">
                Cancellation Reason <span className="text-muted small">(optional)</span>
              </Label>
              <Input
                type="textarea"
                id="cancel-reason"
                rows={3}
                placeholder="e.g. Owner unavailable, rescheduling required…"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={() => setCancelModal(false)}>
              Keep Booking
            </Button>
            <Button color="danger" onClick={handleCancelConfirm}>
              <i className="ri-close-circle-line me-1"></i>Cancel Booking
            </Button>
          </ModalFooter>
        </Modal>

        {/* ── Detail Modal ─────────────────────────────────────────────────── */}
        <Modal isOpen={detailModal} toggle={() => setDetailModal(false)} scrollable>
          <ModalHeader toggle={() => setDetailModal(false)}>
            <i className="ri-information-line me-2 text-primary"></i>Booking Details
          </ModalHeader>
          <ModalBody>
            {detailTarget && (() => {
              const bk = detailTarget;
              const et = eventTypeMap[bk.event_type_id];
              return (
                <div>
                  {/* Booking ID */}
                  <div className="mb-3">
                    <small className="text-muted text-uppercase fw-semibold">Booking ID</small>
                    <div className="font-monospace">{bk.id}</div>
                  </div>

                  {/* Attendee */}
                  <div className="mb-3">
                    <small className="text-muted text-uppercase fw-semibold">Attendee</small>
                    <div className="fw-semibold">{bk.attendee_name}</div>
                    <div className="text-muted">{bk.attendee_email}</div>
                    <div className="text-muted small">
                      <i className="ri-global-line me-1"></i>{bk.attendee_timezone}
                    </div>
                  </div>

                  {/* Event */}
                  <div className="mb-3">
                    <small className="text-muted text-uppercase fw-semibold">Event Type</small>
                    <div>{et?.title || bk.event_type_id}</div>
                  </div>

                  {/* Time */}
                  <div className="mb-3">
                    <small className="text-muted text-uppercase fw-semibold">Date &amp; Time</small>
                    <div>{formatDateTimeLocal(bk.start_time)}</div>
                    <div className="text-muted small">to {formatDateTimeLocal(bk.end_time)}</div>
                  </div>

                  {/* Status */}
                  <div className="mb-3">
                    <small className="text-muted text-uppercase fw-semibold">Status</small>
                    <div>
                      <Badge color={STATUS_BADGE[bk.status]?.color || "secondary"}>
                        {bk.status}
                      </Badge>
                      {bk.cancel_reason && (
                        <span className="ms-2 text-muted small">{bk.cancel_reason}</span>
                      )}
                    </div>
                  </div>

                  {/* Meet link */}
                  {bk.meet_link && (
                    <div className="mb-3">
                      <small className="text-muted text-uppercase fw-semibold">Meeting Link</small>
                      <div>
                        <a href={bk.meet_link} target="_blank" rel="noreferrer">
                          {bk.meet_link}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Custom answers */}
                  {bk.custom_answers?.length > 0 && (
                    <div className="mb-3">
                      <small className="text-muted text-uppercase fw-semibold">Custom Answers</small>
                      {bk.custom_answers.map((a, idx) => (
                        <div key={idx} className="mt-2">
                          <div className="text-muted small">{a.label}</div>
                          <div className="fw-semibold">{a.answer}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Booked at */}
                  <div>
                    <small className="text-muted text-uppercase fw-semibold">Booked At</small>
                    <div className="text-muted small">{formatDateTimeLocal(bk.created_at)}</div>
                  </div>
                </div>
              );
            })()}
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={() => setDetailModal(false)}>Close</Button>
          </ModalFooter>
        </Modal>

      </div>
    </div>
  );
};

export default Bookings;
