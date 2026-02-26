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
  Form,
  FormGroup,
  Label,
  Input,
  FormFeedback,
} from "reactstrap";
import {
  selectAllEventTypes,
  addEventType,
  updateEventType,
  deleteEventType,
  toggleEventTypeActive,
} from "../../slices/booking";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LOCATION_OPTIONS = [
  { value: "google_meet", label: "Google Meet" },
  { value: "zoom",        label: "Zoom" },
  { value: "phone",       label: "Phone Call" },
  { value: "in_person",   label: "In Person" },
];

const LOCATION_ICON = {
  google_meet: "ri-video-chat-line",
  zoom:        "ri-video-line",
  phone:       "ri-phone-line",
  in_person:   "ri-map-pin-line",
};

const LOCATION_LABEL = {
  google_meet: "Google Meet",
  zoom:        "Zoom",
  phone:       "Phone",
  in_person:   "In Person",
};

const COLOR_OPTIONS = ["primary", "success", "warning", "info", "danger"];

const EMPTY_FORM = {
  title:              "",
  slug:               "",
  description:        "",
  duration_minutes:   30,
  location_type:      "google_meet",
  buffer_before_mins: 5,
  buffer_after_mins:  10,
  min_notice_mins:    60,
  color:              "primary",
};

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function validateForm(form) {
  const errors = {};
  if (!form.title.trim())           errors.title       = "Title is required.";
  if (!form.slug.trim())            errors.slug        = "URL slug is required.";
  if (!/^[a-z0-9-]+$/.test(form.slug)) errors.slug    = "Only lowercase letters, numbers, and hyphens.";
  if (form.duration_minutes < 5)    errors.duration    = "Duration must be at least 5 minutes.";
  if (form.min_notice_mins < 0)     errors.min_notice  = "Min notice cannot be negative.";
  return errors;
}

// ─── Component ───────────────────────────────────────────────────────────────

const EventTypes = () => {
  const dispatch    = useDispatch();
  const eventTypes  = useSelector(selectAllEventTypes);

  // ── Modal state ──────────────────────────────────────────────────────────
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editingId,   setEditingId]   = useState(null); // null = create mode
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [errors,      setErrors]      = useState({});

  // ── Delete confirm modal ─────────────────────────────────────────────────
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEditModal = (et) => {
    setEditingId(et.id);
    setForm({
      title:              et.title,
      slug:               et.slug,
      description:        et.description || "",
      duration_minutes:   et.duration_minutes,
      location_type:      et.location_type,
      buffer_before_mins: et.buffer_before_mins,
      buffer_after_mins:  et.buffer_after_mins,
      min_notice_mins:    et.min_notice_mins,
      color:              et.color || "primary",
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Auto-slug when title changes (create mode only)
      if (name === "title" && !editingId) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
  };

  const handleSubmit = () => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    if (editingId) {
      dispatch(updateEventType({ id: editingId, ...form }));
    } else {
      dispatch(
        addEventType({
          ...form,
          owner_slug:            "dwayne",
          is_active:             true,
          date_range_start:      null,
          date_range_end:        null,
          max_bookings_per_day:  null,
          custom_questions:      [],
        })
      );
    }
    setModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      dispatch(deleteEventType(deleteTarget.id));
    }
    setDeleteModal(false);
    setDeleteTarget(null);
  };

  const copyBookingLink = (et) => {
    const url = `${window.location.origin}/book/${et.owner_slug}/${et.slug}`;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page-content">
      <div className="container-fluid">

        {/* Page header */}
        <Row className="mb-3 align-items-center">
          <Col>
            <h4 className="mb-0">
              <i className="ri-calendar-event-line me-2 text-primary"></i>
              Event Types
            </h4>
            <p className="text-muted mb-0">
              Manage the meeting types attendees can book with you.
            </p>
          </Col>
          <Col xs="auto">
            <Button color="primary" onClick={openCreateModal}>
              <i className="ri-add-line me-1"></i>Add New Event Type
            </Button>
          </Col>
        </Row>

        {/* Table card */}
        <Card>
          <CardHeader className="d-flex align-items-center">
            <i className="ri-grid-line me-2 text-muted"></i>
            <span className="fw-semibold">All Event Types</span>
            <Badge color="secondary" className="ms-2">
              {eventTypes.length}
            </Badge>
          </CardHeader>
          <CardBody className="p-0">
            {eventTypes.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="ri-calendar-check-line fs-1 d-block mb-2"></i>
                No event types yet. Click "Add New Event Type" to create one.
              </div>
            ) : (
              <div className="table-responsive">
                <Table className="table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Title</th>
                      <th>Duration</th>
                      <th>Location</th>
                      <th>Buffers</th>
                      <th>Status</th>
                      <th>Booking Link</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventTypes.map((et) => (
                      <tr key={et.id}>
                        {/* Title + color dot */}
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span
                              className={`badge bg-${et.color || "primary"} rounded-circle p-1`}
                              style={{ width: 10, height: 10, display: "inline-block" }}
                            />
                            <div>
                              <div className="fw-semibold">{et.title}</div>
                              <small className="text-muted">/{et.slug}</small>
                            </div>
                          </div>
                        </td>

                        {/* Duration */}
                        <td>
                          <i className="ri-time-line me-1 text-muted"></i>
                          {et.duration_minutes} min
                        </td>

                        {/* Location */}
                        <td>
                          <i
                            className={`${LOCATION_ICON[et.location_type] || "ri-map-pin-line"} me-1 text-muted`}
                          ></i>
                          {LOCATION_LABEL[et.location_type] || et.location_type}
                        </td>

                        {/* Buffers */}
                        <td>
                          <small className="text-muted">
                            {et.buffer_before_mins}m before &nbsp;/&nbsp; {et.buffer_after_mins}m after
                          </small>
                        </td>

                        {/* Status toggle */}
                        <td>
                          <div className="form-check form-switch mb-0">
                            <Input
                              type="switch"
                              role="switch"
                              id={`toggle-${et.id}`}
                              checked={et.is_active}
                              onChange={() => dispatch(toggleEventTypeActive(et.id))}
                            />
                            <Label htmlFor={`toggle-${et.id}`} className="form-check-label ms-1">
                              {et.is_active ? (
                                <Badge color="success">Active</Badge>
                              ) : (
                                <Badge color="secondary">Inactive</Badge>
                              )}
                            </Label>
                          </div>
                        </td>

                        {/* Booking link */}
                        <td>
                          <Button
                            size="sm"
                            color="light"
                            className="border"
                            onClick={() => copyBookingLink(et)}
                            title={`/book/${et.owner_slug}/${et.slug}`}
                          >
                            <i className="ri-link me-1"></i>Copy Link
                          </Button>
                        </td>

                        {/* Edit / Delete */}
                        <td className="text-end">
                          <Button
                            size="sm"
                            color="soft-primary"
                            className="me-1"
                            onClick={() => openEditModal(et)}
                          >
                            <i className="ri-edit-line"></i>
                          </Button>
                          <Button
                            size="sm"
                            color="soft-danger"
                            onClick={() => {
                              setDeleteTarget(et);
                              setDeleteModal(true);
                            }}
                          >
                            <i className="ri-delete-bin-line"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── Create / Edit Modal ─────────────────────────────────────────── */}
        <Modal isOpen={modalOpen} toggle={() => setModalOpen(false)} size="lg" scrollable>
          <ModalHeader toggle={() => setModalOpen(false)}>
            <i className={`${editingId ? "ri-edit-line" : "ri-add-line"} me-2`}></i>
            {editingId ? "Edit Event Type" : "Add New Event Type"}
          </ModalHeader>
          <ModalBody>
            <Form>
              <Row>
                {/* Title */}
                <Col md={7}>
                  <FormGroup>
                    <Label for="et-title">
                      Title <span className="text-danger">*</span>
                    </Label>
                    <Input
                      id="et-title"
                      name="title"
                      placeholder="e.g. 30-Min Introduction Call"
                      value={form.title}
                      onChange={handleFieldChange}
                      invalid={!!errors.title}
                    />
                    <FormFeedback>{errors.title}</FormFeedback>
                  </FormGroup>
                </Col>

                {/* Color */}
                <Col md={5}>
                  <FormGroup>
                    <Label>Color</Label>
                    <div className="d-flex gap-2 mt-1">
                      {COLOR_OPTIONS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`btn btn-${c} rounded-circle p-0 ${form.color === c ? "border border-dark border-3" : ""}`}
                          style={{ width: 28, height: 28, minWidth: 28 }}
                          onClick={() => setForm((prev) => ({ ...prev, color: c }))}
                          title={c}
                        />
                      ))}
                    </div>
                  </FormGroup>
                </Col>

                {/* Slug */}
                <Col md={12}>
                  <FormGroup>
                    <Label for="et-slug">
                      URL Slug <span className="text-danger">*</span>
                    </Label>
                    <div className="input-group">
                      <span className="input-group-text text-muted">/book/dwayne/</span>
                      <Input
                        id="et-slug"
                        name="slug"
                        placeholder="30-min-intro"
                        value={form.slug}
                        onChange={handleFieldChange}
                        invalid={!!errors.slug}
                      />
                      <FormFeedback>{errors.slug}</FormFeedback>
                    </div>
                    <small className="text-muted">Lowercase letters, numbers, hyphens only.</small>
                  </FormGroup>
                </Col>

                {/* Description */}
                <Col md={12}>
                  <FormGroup>
                    <Label for="et-description">Description</Label>
                    <Input
                      type="textarea"
                      id="et-description"
                      name="description"
                      rows={2}
                      placeholder="What attendees will get out of this meeting…"
                      value={form.description}
                      onChange={handleFieldChange}
                    />
                  </FormGroup>
                </Col>

                {/* Duration */}
                <Col md={4}>
                  <FormGroup>
                    <Label for="et-duration">
                      Duration (min) <span className="text-danger">*</span>
                    </Label>
                    <Input
                      type="number"
                      id="et-duration"
                      name="duration_minutes"
                      min={5}
                      step={5}
                      value={form.duration_minutes}
                      onChange={handleNumberChange}
                      invalid={!!errors.duration}
                    />
                    <FormFeedback>{errors.duration}</FormFeedback>
                  </FormGroup>
                </Col>

                {/* Location type */}
                <Col md={8}>
                  <FormGroup>
                    <Label for="et-location">Location Type</Label>
                    <Input
                      type="select"
                      id="et-location"
                      name="location_type"
                      value={form.location_type}
                      onChange={handleFieldChange}
                    >
                      {LOCATION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>

                {/* Buffer before */}
                <Col md={4}>
                  <FormGroup>
                    <Label for="et-buf-before">Buffer Before (min)</Label>
                    <Input
                      type="number"
                      id="et-buf-before"
                      name="buffer_before_mins"
                      min={0}
                      step={5}
                      value={form.buffer_before_mins}
                      onChange={handleNumberChange}
                    />
                  </FormGroup>
                </Col>

                {/* Buffer after */}
                <Col md={4}>
                  <FormGroup>
                    <Label for="et-buf-after">Buffer After (min)</Label>
                    <Input
                      type="number"
                      id="et-buf-after"
                      name="buffer_after_mins"
                      min={0}
                      step={5}
                      value={form.buffer_after_mins}
                      onChange={handleNumberChange}
                    />
                  </FormGroup>
                </Col>

                {/* Min notice */}
                <Col md={4}>
                  <FormGroup>
                    <Label for="et-notice">Min Notice (min)</Label>
                    <Input
                      type="number"
                      id="et-notice"
                      name="min_notice_mins"
                      min={0}
                      step={15}
                      value={form.min_notice_mins}
                      onChange={handleNumberChange}
                      invalid={!!errors.min_notice}
                    />
                    <FormFeedback>{errors.min_notice}</FormFeedback>
                    <small className="text-muted">How far ahead attendees must book.</small>
                  </FormGroup>
                </Col>
              </Row>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onClick={handleSubmit}>
              <i className={`${editingId ? "ri-save-line" : "ri-add-line"} me-1`}></i>
              {editingId ? "Save Changes" : "Create Event Type"}
            </Button>
          </ModalFooter>
        </Modal>

        {/* ── Delete Confirm Modal ────────────────────────────────────────── */}
        <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} centered size="sm">
          <ModalHeader toggle={() => setDeleteModal(false)}>Delete Event Type</ModalHeader>
          <ModalBody>
            <p className="mb-1">
              Delete <strong>{deleteTarget?.title}</strong>?
            </p>
            <p className="text-muted small mb-0">
              This cannot be undone. Existing bookings for this event type will remain in the system.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button color="danger" onClick={handleDeleteConfirm}>
              <i className="ri-delete-bin-line me-1"></i>Delete
            </Button>
          </ModalFooter>
        </Modal>

      </div>
    </div>
  );
};

export default EventTypes;
