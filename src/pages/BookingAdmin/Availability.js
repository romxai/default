import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardBody,
  CardHeader,
  Col,
  Row,
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
  Table,
} from "reactstrap";
import {
  selectAllRules,
  selectOwnerTimezone,
  updateRecurringDay,
  addRule,
  deleteRule,
  setOwnerTimezone,
} from "../../slices/booking";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = [
  { index: 1, label: "Monday", short: "Mon" },
  { index: 2, label: "Tuesday", short: "Tue" },
  { index: 3, label: "Wednesday", short: "Wed" },
  { index: 4, label: "Thursday", short: "Thu" },
  { index: 5, label: "Friday", short: "Fri" },
  { index: 6, label: "Saturday", short: "Sat" },
  { index: 0, label: "Sunday", short: "Sun" },
];

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
];

const EMPTY_OVERRIDE = {
  date_override: "",
  rule_type: "one_time", // "one_time" | "day_off"
  start_time_utc: "09:00",
  end_time_utc: "17:00",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateDisplay(dateStr) {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

const Availability = () => {
  const dispatch = useDispatch();
  const allRules = useSelector(selectAllRules);
  const ownerTimezone = useSelector(selectOwnerTimezone);

  // Derived: recurring rules keyed by day_of_week
  const recurringByDay = allRules.reduce((acc, r) => {
    if (r.rule_type === "recurring") acc[r.day_of_week] = r;
    return acc;
  }, {});

  // One-time overrides sorted chronologically
  const overrides = allRules
    .filter((r) => r.rule_type === "one_time" || r.rule_type === "day_off")
    .slice()
    .sort((a, b) => (a.date_override > b.date_override ? 1 : -1));

  // ── Local state for inline time edits ────────────────────────────────────
  // Tracks unsaved time values while user edits a day row
  const [localTimes, setLocalTimes] = useState({}); // { dayIndex: { start, end } }

  const getTimeValue = (dayIndex, field) => {
    if (localTimes[dayIndex]) return localTimes[dayIndex][field];
    const rule = recurringByDay[dayIndex];
    return field === "start"
      ? rule?.start_time_utc || "09:00"
      : rule?.end_time_utc || "17:00";
  };

  const handleTimeChange = (dayIndex, field, value) => {
    setLocalTimes((prev) => ({
      ...prev,
      [dayIndex]: {
        start: field === "start" ? value : getTimeValue(dayIndex, "start"),
        end: field === "end" ? value : getTimeValue(dayIndex, "end"),
      },
    }));
  };

  const handleDayToggle = (dayIndex) => {
    const rule = recurringByDay[dayIndex];
    if (!rule) return;
    dispatch(
      updateRecurringDay({
        day_of_week: dayIndex,
        is_available: !rule.is_available,
        start_time_utc: rule.start_time_utc || "09:00",
        end_time_utc: rule.end_time_utc || "17:00",
      }),
    );
  };

  const handleTimeSave = (dayIndex) => {
    const local = localTimes[dayIndex];
    if (!local) return;
    dispatch(
      updateRecurringDay({
        day_of_week: dayIndex,
        is_available: recurringByDay[dayIndex]?.is_available ?? true,
        start_time_utc: local.start,
        end_time_utc: local.end,
      }),
    );
    setLocalTimes((prev) => {
      const next = { ...prev };
      delete next[dayIndex];
      return next;
    });
  };

  // ── Override modal state ──────────────────────────────────────────────────
  const [overrideModal, setOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState(EMPTY_OVERRIDE);
  const [overrideErrors, setOverrideErrors] = useState({});

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleOverrideFieldChange = (e) => {
    const { name, value } = e.target;
    setOverrideForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateOverride = (form) => {
    const errors = {};
    if (!form.date_override) errors.date_override = "Date is required.";
    if (form.rule_type === "one_time") {
      if (!form.start_time_utc) errors.start_time_utc = "Start time required.";
      if (!form.end_time_utc) errors.end_time_utc = "End time required.";
      if (
        form.start_time_utc &&
        form.end_time_utc &&
        form.start_time_utc >= form.end_time_utc
      )
        errors.end_time_utc = "End time must be after start time.";
    }
    return errors;
  };

  const handleOverrideSubmit = () => {
    const errs = validateOverride(overrideForm);
    if (Object.keys(errs).length) {
      setOverrideErrors(errs);
      return;
    }
    dispatch(
      addRule({
        owner_slug: "dwayne",
        rule_type: overrideForm.rule_type,
        day_of_week: null,
        date_override: overrideForm.date_override,
        start_time_utc:
          overrideForm.rule_type === "day_off"
            ? null
            : overrideForm.start_time_utc,
        end_time_utc:
          overrideForm.rule_type === "day_off"
            ? null
            : overrideForm.end_time_utc,
        is_available: overrideForm.rule_type !== "day_off",
      }),
    );
    setOverrideModal(false);
    setOverrideForm(EMPTY_OVERRIDE);
    setOverrideErrors({});
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page-content">
      <div className="container-fluid">
        {/* Page header */}
        <Row className="mb-3 align-items-center">
          <Col>
            <h4 className="mb-0">
              <i className="ri-time-line me-2 text-primary"></i>
              Availability
            </h4>
            <p className="text-muted mb-0">
              Set your weekly working hours and block out specific dates.
            </p>
          </Col>
        </Row>

        {/* ── Timezone Card ─────────────────────────────────────────────── */}
        <Card className="mb-4">
          <CardHeader>
            <i className="ri-earth-line me-2 text-muted"></i>
            <span className="fw-semibold">Timezone</span>
          </CardHeader>
          <CardBody>
            <Row className="align-items-center">
              <Col md={5}>
                <Label for="tz-select" className="mb-1">
                  Owner Timezone
                </Label>
                <Input
                  type="select"
                  id="tz-select"
                  value={ownerTimezone}
                  onChange={(e) => dispatch(setOwnerTimezone(e.target.value))}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </Input>
                <small className="text-muted">
                  All slot times are stored and displayed in this timezone.
                </small>
              </Col>
            </Row>
          </CardBody>
        </Card>

        {/* ── Recurring Weekly Hours ────────────────────────────────────── */}
        <Card className="mb-4">
          <CardHeader>
            <i className="ri-calendar-2-line me-2 text-muted"></i>
            <span className="fw-semibold">Weekly Working Hours</span>
          </CardHeader>
          <CardBody className="p-0">
            <Table className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "130px" }}>Day</th>
                  <th style={{ width: "90px" }}>Available</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map(({ index, label }) => {
                  const rule = recurringByDay[index];
                  const active = rule?.is_available ?? false;
                  const hasDraft = !!localTimes[index];

                  return (
                    <tr key={index} className={!active ? "text-muted" : ""}>
                      {/* Day label */}
                      <td className="fw-semibold">{label}</td>

                      {/* Toggle */}
                      <td>
                        <div className="form-check form-switch mb-0">
                          <Input
                            type="switch"
                            role="switch"
                            id={`day-toggle-${index}`}
                            checked={active}
                            onChange={() => handleDayToggle(index)}
                          />
                        </div>
                      </td>

                      {/* Start time */}
                      <td>
                        <Input
                          type="time"
                          bsSize="sm"
                          style={{ maxWidth: "130px" }}
                          disabled={!active}
                          value={getTimeValue(index, "start")}
                          onChange={(e) =>
                            handleTimeChange(index, "start", e.target.value)
                          }
                        />
                      </td>

                      {/* End time */}
                      <td>
                        <Input
                          type="time"
                          bsSize="sm"
                          style={{ maxWidth: "130px" }}
                          disabled={!active}
                          value={getTimeValue(index, "end")}
                          onChange={(e) =>
                            handleTimeChange(index, "end", e.target.value)
                          }
                        />
                      </td>

                      {/* Save button – only appears when there are unsaved changes */}
                      <td>
                        {hasDraft && (
                          <Button
                            size="sm"
                            color="primary"
                            onClick={() => handleTimeSave(index)}
                          >
                            <i className="ri-save-line me-1"></i>Save
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </CardBody>
        </Card>

        {/* ── Date Overrides ────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="d-flex align-items-center">
            <i className="ri-calendar-close-line me-2 text-muted"></i>
            <span className="fw-semibold">Date Overrides</span>
            <Badge color="secondary" className="ms-2">
              {overrides.length}
            </Badge>
            <Button
              size="sm"
              color="primary"
              className="ms-auto"
              onClick={() => {
                setOverrideForm(EMPTY_OVERRIDE);
                setOverrideErrors({});
                setOverrideModal(true);
              }}
            >
              <i className="ri-add-line me-1"></i>Add Override
            </Button>
          </CardHeader>
          <CardBody className="p-0">
            {overrides.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="ri-calendar-check-line fs-2 d-block mb-2"></i>
                No date overrides. Use overrides to block days off or change
                hours for specific dates.
              </div>
            ) : (
              <Table className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Hours</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {overrides.map((ov) => (
                    <tr key={ov.id}>
                      <td className="fw-semibold">
                        {formatDateDisplay(ov.date_override)}
                      </td>
                      <td>
                        {ov.rule_type === "day_off" ? (
                          <Badge
                            color="danger"
                            className="d-flex align-items-center gap-1"
                            style={{ width: "fit-content" }}
                          >
                            <i className="ri-forbid-line"></i> Day Off
                          </Badge>
                        ) : (
                          <Badge
                            color="info"
                            className="d-flex align-items-center gap-1"
                            style={{ width: "fit-content" }}
                          >
                            <i className="ri-time-line"></i> Custom Hours
                          </Badge>
                        )}
                      </td>
                      <td>
                        {ov.rule_type === "day_off" ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span>
                            <i className="ri-time-line me-1 text-muted"></i>
                            {ov.start_time_utc} – {ov.end_time_utc}
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        <Button
                          size="sm"
                          color="soft-danger"
                          onClick={() => {
                            setDeleteTarget(ov);
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
            )}
          </CardBody>
        </Card>

        {/* ── Add Override Modal ──────────────────────────────────────────── */}
        <Modal
          isOpen={overrideModal}
          toggle={() => setOverrideModal(false)}
          centered
        >
          <ModalHeader toggle={() => setOverrideModal(false)}>
            <i className="ri-add-line me-2"></i>Add Date Override
          </ModalHeader>
          <ModalBody>
            <Form>
              {/* Type */}
              <FormGroup>
                <Label>Override Type</Label>
                <div className="d-flex gap-3 mt-1">
                  <div className="form-check">
                    <Input
                      type="radio"
                      id="ov-type-one"
                      name="rule_type"
                      value="one_time"
                      checked={overrideForm.rule_type === "one_time"}
                      onChange={handleOverrideFieldChange}
                    />
                    <Label for="ov-type-one" className="form-check-label">
                      Custom Hours
                    </Label>
                  </div>
                  <div className="form-check">
                    <Input
                      type="radio"
                      id="ov-type-off"
                      name="rule_type"
                      value="day_off"
                      checked={overrideForm.rule_type === "day_off"}
                      onChange={handleOverrideFieldChange}
                    />
                    <Label for="ov-type-off" className="form-check-label">
                      Day Off (block entire day)
                    </Label>
                  </div>
                </div>
              </FormGroup>

              {/* Date */}
              <FormGroup>
                <Label for="ov-date">
                  Date <span className="text-danger">*</span>
                </Label>
                <Input
                  type="date"
                  id="ov-date"
                  name="date_override"
                  value={overrideForm.date_override}
                  onChange={handleOverrideFieldChange}
                  invalid={!!overrideErrors.date_override}
                />
                {overrideErrors.date_override && (
                  <div className="invalid-feedback d-block">
                    {overrideErrors.date_override}
                  </div>
                )}
              </FormGroup>

              {/* Time range – shown only for one_time */}
              {overrideForm.rule_type === "one_time" && (
                <Row>
                  <Col>
                    <FormGroup>
                      <Label for="ov-start">
                        Start Time <span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="time"
                        id="ov-start"
                        name="start_time_utc"
                        value={overrideForm.start_time_utc}
                        onChange={handleOverrideFieldChange}
                        invalid={!!overrideErrors.start_time_utc}
                      />
                      {overrideErrors.start_time_utc && (
                        <div className="invalid-feedback d-block">
                          {overrideErrors.start_time_utc}
                        </div>
                      )}
                    </FormGroup>
                  </Col>
                  <Col>
                    <FormGroup>
                      <Label for="ov-end">
                        End Time <span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="time"
                        id="ov-end"
                        name="end_time_utc"
                        value={overrideForm.end_time_utc}
                        onChange={handleOverrideFieldChange}
                        invalid={!!overrideErrors.end_time_utc}
                      />
                      {overrideErrors.end_time_utc && (
                        <div className="invalid-feedback d-block">
                          {overrideErrors.end_time_utc}
                        </div>
                      )}
                    </FormGroup>
                  </Col>
                </Row>
              )}
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={() => setOverrideModal(false)}>
              Cancel
            </Button>
            <Button color="primary" onClick={handleOverrideSubmit}>
              <i className="ri-save-line me-1"></i>Save Override
            </Button>
          </ModalFooter>
        </Modal>

        {/* ── Delete Override Confirm ─────────────────────────────────────── */}
        <Modal
          isOpen={deleteModal}
          toggle={() => setDeleteModal(false)}
          centered
          size="sm"
        >
          <ModalHeader toggle={() => setDeleteModal(false)}>
            Remove Override
          </ModalHeader>
          <ModalBody>
            Remove the override for{" "}
            <strong>{formatDateDisplay(deleteTarget?.date_override)}</strong>?
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={() => setDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              color="danger"
              onClick={() => {
                if (deleteTarget) dispatch(deleteRule(deleteTarget.id));
                setDeleteModal(false);
                setDeleteTarget(null);
              }}
            >
              Remove
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </div>
  );
};

export default Availability;
