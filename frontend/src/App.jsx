import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Database,
  FileCheck2,
  FileSpreadsheet,
  Filter,
  LayoutDashboard,
  LoaderCircle,
  Moon,
  Plus,
  Rows3,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Table2,
  Trash2,
  Upload,
  X,
  Download,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
async function requestJson(path, init) {
  const response = await fetch(`/api/v1${path}`, init);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      message = typeof payload.detail === "string" ? payload.detail : message;
    } catch {
      // Keep the HTTP status message when the server response isn't JSON.
    }
    throw new Error(message);
  }
  return response.json();
}

function formatNumber(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
}

function formatCompact(value) {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function dateValueFromDate(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateFromValue(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return dateValueFromDate(date) === value ? date : null;
}

function DatePickerField({ label, value, onChange, minValue, maxValue }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState("below");
  const [popoverMaxHeight, setPopoverMaxHeight] = useState(360);
  const [viewMode, setViewMode] = useState("days");
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initialDate = dateFromValue(value) ?? new Date();
    return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  });
  const pickerRef = useRef(null);
  const triggerRef = useRef(null);
  const selectedDate = dateFromValue(value);
  const today = dateValueFromDate(new Date());
  const beforeMinValue = (dateValue) => minValue && dateValue < minValue;
  const afterMaxValue = (dateValue) => maxValue && dateValue > maxValue;
  const monthTitle = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
      new Date(2023, 0, index + 1),
    ),
  );
  const monthOffset = visibleMonth.getDay();
  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate();
  const dayCount = Math.ceil((monthOffset + daysInMonth) / 7) * 7;
  const calendarDays = Array.from({ length: dayCount }, (_, index) =>
    new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      index - monthOffset + 1,
    ),
  );
  const previousMonthEnd = dateValueFromDate(
    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 0),
  );
  const nextMonthStart = dateValueFromDate(
    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1),
  );
  const yearStart = Math.floor(visibleMonth.getFullYear() / 12) * 12;
  const yearEnd = yearStart + 11;
  const previousPeriodEnd = viewMode === "days"
    ? previousMonthEnd
    : viewMode === "months"
      ? dateValueFromDate(new Date(visibleMonth.getFullYear() - 1, 11, 31))
      : dateValueFromDate(new Date(yearStart - 1, 11, 31));
  const nextPeriodStart = viewMode === "days"
    ? nextMonthStart
    : viewMode === "months"
      ? dateValueFromDate(new Date(visibleMonth.getFullYear() + 1, 0, 1))
      : dateValueFromDate(new Date(yearEnd + 1, 0, 1));
  const monthOptions = Array.from({ length: 12 }, (_, monthIndex) => {
    const monthStart = dateValueFromDate(
      new Date(visibleMonth.getFullYear(), monthIndex, 1),
    );
    const monthEnd = dateValueFromDate(
      new Date(visibleMonth.getFullYear(), monthIndex + 1, 0),
    );
    return {
      monthIndex,
      label: new Intl.DateTimeFormat(undefined, { month: "short" }).format(
        new Date(visibleMonth.getFullYear(), monthIndex, 1),
      ),
      disabled: beforeMinValue(monthEnd) || afterMaxValue(monthStart),
    };
  });
  const yearOptions = Array.from({ length: 12 }, (_, index) => yearStart + index);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePointer = (event) => {
      if (!pickerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function chooseDate(date) {
    const dateValue = dateValueFromDate(date);
    if (beforeMinValue(dateValue) || afterMaxValue(dateValue)) return;
    onChange(dateValue);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function togglePicker() {
    if (open) {
      setOpen(false);
      return;
    }
    const initialDate = selectedDate ?? new Date();
    setVisibleMonth(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
    setViewMode("days");
    const triggerBounds = triggerRef.current?.getBoundingClientRect();
    const roomBelow = triggerBounds
      ? window.innerHeight - triggerBounds.bottom - 8
      : window.innerHeight;
    const headerBottom = document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 0;
    const safeTop = Math.max(8, headerBottom + 8);
    const roomAbove = Math.max(0, (triggerBounds?.top ?? 0) - safeTop);
    const nextPlacement = roomBelow >= 340 || roomBelow >= roomAbove ? "below" : "above";
    const availableSpace = nextPlacement === "below" ? roomBelow : roomAbove;
    setPlacement(nextPlacement);
    setPopoverMaxHeight(Math.max(120, Math.min(360, availableSpace - 12)));
    setOpen(true);
  }

  const displayValue = selectedDate
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(selectedDate)
    : "Select date";

  return (
    <div className={`date-picker ${open ? "open" : ""}`} ref={pickerRef}>
      <button
        ref={triggerRef}
        className="text-input date-picker-trigger"
        type="button"
        aria-label={`${label}: ${selectedDate ? displayValue : "choose date"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={togglePicker}
      >
        <span className={selectedDate ? "" : "date-picker-placeholder"}>{displayValue}</span>
        <CalendarDays size={15} aria-hidden="true" />
      </button>
      {open && (
        <div
          className={`date-picker-popover ${placement}`}
          role="dialog"
          aria-label={`${label} date picker`}
          style={{ maxHeight: popoverMaxHeight }}
        >
          <div className="date-calendar-header">
            <button
              className="date-calendar-nav"
              type="button"
              aria-label={viewMode === "days" ? "Previous month" : viewMode === "months" ? "Previous year" : "Previous 12 years"}
              disabled={beforeMinValue(previousPeriodEnd)}
              onClick={() => setVisibleMonth((month) => {
                if (viewMode === "days") return new Date(month.getFullYear(), month.getMonth() - 1, 1);
                if (viewMode === "months") return new Date(month.getFullYear() - 1, month.getMonth(), 1);
                return new Date(month.getFullYear() - 12, month.getMonth(), 1);
              })}
            >
              <ChevronLeft size={17} />
            </button>
            {viewMode === "days" && (
              <button
                className="date-calendar-title"
                type="button"
                aria-label="Choose month and year"
                onClick={() => setViewMode("months")}
              >
                {monthTitle}
              </button>
            )}
            {viewMode === "months" && (
              <button
                className="date-calendar-title"
                type="button"
                aria-label={`Choose year ${visibleMonth.getFullYear()}`}
                onClick={() => setViewMode("years")}
              >
                {visibleMonth.getFullYear()}
              </button>
            )}
            {viewMode === "years" && <strong>{yearStart} - {yearEnd}</strong>}
            <button
              className="date-calendar-nav"
              type="button"
              aria-label={viewMode === "days" ? "Next month" : viewMode === "months" ? "Next year" : "Next 12 years"}
              disabled={afterMaxValue(nextPeriodStart)}
              onClick={() => setVisibleMonth((month) => {
                if (viewMode === "days") return new Date(month.getFullYear(), month.getMonth() + 1, 1);
                if (viewMode === "months") return new Date(month.getFullYear() + 1, month.getMonth(), 1);
                return new Date(month.getFullYear() + 12, month.getMonth(), 1);
              })}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          {viewMode === "days" && (
            <>
              <div className="date-calendar-weekdays" aria-hidden="true">
                {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
              </div>
              <div className="date-calendar-days">
                {calendarDays.map((date) => {
                  const dateValue = dateValueFromDate(date);
                  const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
                  return (
                    <button
                      key={dateValue}
                      className={[
                        "date-calendar-day",
                        isCurrentMonth ? "" : "outside-month",
                        dateValue === value ? "selected" : "",
                        dateValue === today ? "today" : "",
                        beforeMinValue(dateValue) || afterMaxValue(dateValue) ? "out-of-range" : "",
                      ].filter(Boolean).join(" ")}
                      type="button"
                      aria-label={new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(date)}
                      aria-pressed={dateValue === value}
                      disabled={beforeMinValue(dateValue) || afterMaxValue(dateValue)}
                      onClick={() => chooseDate(date)}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {viewMode === "months" && (
            <div className="date-calendar-options" aria-label="Choose month">
              {monthOptions.map(({ monthIndex, label: monthLabel, disabled }) => (
                <button
                  key={monthIndex}
                  className={monthIndex === visibleMonth.getMonth() ? "selected" : ""}
                  type="button"
                  aria-label={new Intl.DateTimeFormat(undefined, { month: "long" }).format(
                    new Date(visibleMonth.getFullYear(), monthIndex, 1),
                  )}
                  aria-pressed={monthIndex === visibleMonth.getMonth()}
                  disabled={disabled}
                  onClick={() => {
                    setVisibleMonth(new Date(visibleMonth.getFullYear(), monthIndex, 1));
                    setViewMode("days");
                  }}
                >
                  {monthLabel}
                </button>
              ))}
            </div>
          )}
          {viewMode === "years" && (
            <div className="date-calendar-options" aria-label="Choose year">
              {yearOptions.map((year) => {
                const yearStartValue = dateValueFromDate(new Date(year, 0, 1));
                const yearEndValue = dateValueFromDate(new Date(year, 11, 31));
                const disabled = beforeMinValue(yearEndValue) || afterMaxValue(yearStartValue);
                return (
                  <button
                    key={year}
                    className={year === visibleMonth.getFullYear() ? "selected" : ""}
                    type="button"
                    aria-pressed={year === visibleMonth.getFullYear()}
                    disabled={disabled}
                    onClick={() => {
                      setVisibleMonth(new Date(year, visibleMonth.getMonth(), 1));
                      setViewMode("months");
                    }}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          )}
          <div className="date-calendar-footer">
            <button type="button" disabled={!value} onClick={() => { onChange(""); setOpen(false); }}>
              Clear
            </button>
            <button
              type="button"
              disabled={beforeMinValue(today) || afterMaxValue(today)}
              onClick={() => chooseDate(new Date())}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function labelFor(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function qualityCheckTitle(name) {
  return {
    missing_values: "Missing values",
    duplicate_rows: "Repeated records",
    empty_rows: "Blank rows removed",
    date_values: "Date value parsing",
  }[name] ?? labelFor(name);
}

function qualityCheckDescription(check) {
  const count = formatNumber(check.affected_rows);
  if (check.name === "missing_values") {
    return check.affected_rows
      ? `${formatNumber(check.details.missing_cells)} blank cells appear in ${count} records.`
      : "Every analyzed field contains a value.";
  }
  if (check.name === "duplicate_rows") {
    if (!check.affected_rows) return "No identical records were found.";
    return `${count} repeated records found; ${formatNumber(check.details.removed)} removed, ${formatNumber(check.details.remaining)} remain.`;
  }
  if (check.name === "empty_rows") {
    return check.affected_rows
      ? `${count} completely blank records were removed before analysis.`
      : "No completely blank records needed to be removed.";
  }
  if (check.name === "date_values") {
    const invalidValues = Object.values(check.details.failures_by_column ?? {})
      .reduce((total, value) => total + value, 0);
    return check.affected_rows
      ? `${count} records contain ${formatNumber(invalidValues)} values that could not be read as dates.`
      : "All values in detected date fields could be read as dates.";
  }
  return check.affected_rows
    ? `${count} records were affected.`
    : "No affected records were found.";
}

function shortDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function sampleText(value) {
  if (value === null || value === undefined) return "Blank";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function createSampleCsvFile() {
  const rows = [
    ["order_id", "order_date", "region", "product_category", "quantity", "unit_price", "total_sales", "order_status"],
    ["ORD-1001", "2025-01-05", " North ", "Office supplies", 4, 18.5, 74, "Delivered"],
    ["ORD-1002", "2025-01-11", "South", "Electronics", 1, 249, 249, "Delivered"],
    ["ORD-1003", "2025-01-18", "West", "Furniture", 2, 125, 250, "Returned"],
    ["ORD-1004", "2025-02-02", "East", "Office supplies", 8, 12, 96, "Delivered"],
    ["ORD-1005", "2025-02-13", "North", "Electronics", 2, 89, 178, "Delivered"],
    ["ORD-1006", "2025-02-24", "South", "Furniture", 1, 340, 340, "Processing"],
    ["ORD-1007", "2025-03-04", "West", "Office supplies", 5, 22, 110, "Delivered"],
    ["ORD-1008", "2025-03-15", "East", "Electronics", 3, "N/A", 177, "Delivered"],
    ["ORD-1009", "2025-03-27", "North", "Furniture", 1, 215, 215, "Processing"],
    ["ORD-1010", "2025-04-03", "South", "Office supplies", 10, 9.5, 95, "Delivered"],
    ["ORD-1011", "2025-04-16", "West", "Electronics", 1, 499, 499, "Delivered"],
    ["ORD-1012", "2025-04-28", "East", "Furniture", 2, 185, 370, "Returned"],
    ["ORD-1013", "not-a-date", " South ", "Office supplies", 3, 14, 42, "Delivered"],
    ["ORD-1014", "2025-05-04", "West", "Furniture", 1, 280, 280, "Processing"],
    ["ORD-1001", "2025-01-05", " North ", "Office supplies", 4, 18.5, 74, "Delivered"],
    ["", "", "", "", "", "", "", ""],
  ];
  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
  return new File([csv], "datafoundry-sample-messy-sales.csv", { type: "text/csv;charset=utf-8" });
}

function downloadSampleCsv() {
  const file = createSampleCsvFile();
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function initialTheme() {
  try {
    const saved = window.localStorage.getItem("datafoundry-theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // Use the device preference when local storage is unavailable.
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function App() {
  const [theme, setTheme] = useState(initialTheme);
  const [datasets, setDatasets] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [quality, setQuality] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [view, setView] = useState("explore");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [datasetName, setDatasetName] = useState("");
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [dropEmptyRows, setDropEmptyRows] = useState(true);
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [failure, setFailure] = useState("");
  const [previewSearch, setPreviewSearch] = useState("");
  const [exportingCsv, setExportingCsv] = useState(false);
  const [dimension, setDimension] = useState("");
  const [metric, setMetric] = useState("");
  const [aggregation, setAggregation] = useState("sum");
  const [timeBucket, setTimeBucket] = useState("month");
  const [filterColumn, setFilterColumn] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [dateColumn, setDateColumn] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [previewOffset, setPreviewOffset] = useState(0);
  const [datasetReloadKey, setDatasetReloadKey] = useState(0);
  const [kpiTarget, setKpiTarget] = useState(null);
  const fileInput = useRef(null);
  const uploadDialogRef = useRef(null);
  const chartAccent = theme === "dark" ? "#ac98ff" : "#7057e8";
  const todayDate = dateValueFromDate(new Date());
  const fromDateMax = dateTo && dateTo < todayDate ? dateTo : todayDate;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#11101b" : "#f7f6fb");
    try {
      window.localStorage.setItem("datafoundry-theme", theme);
    } catch {
      // Theme remains active for this session when local storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    const boundedTo = dateTo && dateTo > todayDate ? todayDate : dateTo;
    let boundedFrom = dateFrom && dateFrom > todayDate ? todayDate : dateFrom;
    if (boundedFrom && boundedTo && boundedFrom > boundedTo) boundedFrom = boundedTo;
    if (boundedTo !== dateTo) setDateTo(boundedTo);
    if (boundedFrom !== dateFrom) setDateFrom(boundedFrom);
  }, [dateFrom, dateTo, todayDate]);

  useEffect(() => {
    const dialog = uploadDialogRef.current;
    if (uploadOpen && dialog && !dialog.open) dialog.showModal();
  }, [uploadOpen]);

  useEffect(() => {
    if (!kpiTarget) return;
    const targetView = kpiTarget === "dataset-preview" ? "explore" : "quality";
    if (view !== targetView) return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(kpiTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setKpiTarget(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [kpiTarget, view]);

  function jumpToKpiTarget(target, targetView) {
    setKpiTarget(target);
    setView(targetView);
  }

  const loadDatasets = useCallback(async () => {
    setLoading(true);
    try {
      const items = await requestJson("/datasets");
      setDatasets(items);
      setActiveId((current) => current ?? items[0]?.id ?? null);
      setFailure("");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Could not load datasets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDatasets();
    fetch("/api/v1/health")
      .then((response) => setApiReady(response.ok))
      .catch(() => setApiReady(false));
  }, [loadDatasets]);

  useEffect(() => {
    if (!activeId) {
      setDataset(null);
      setQuality(null);
      setPreview(null);
      setAnalytics(null);
      setPreviewSearch("");
      return;
    }
    setPreviewSearch("");
    let cancelled = false;
    async function loadActiveDataset() {
      try {
        const [datasetInfo, profile, sample] = await Promise.all([
          requestJson(`/datasets/${activeId}`),
          requestJson(`/datasets/${activeId}/quality`),
          requestJson(`/datasets/${activeId}/preview?offset=${previewOffset}&limit=25`),
        ]);
        if (cancelled) return;
        setDataset(datasetInfo);
        setQuality(profile);
        setPreview(sample);
        setFailure("");

        const numeric = profile.columns.find((column) => column.kind === "number");
        const date = profile.columns.find((column) => column.kind === "date");
        const category = profile.columns.find((column) => column.kind === "text");
        setMetric((current) =>
          current && profile.columns.some((column) => column.key === current && column.kind === "number")
            ? current
            : numeric?.key ?? "",
        );
        setDimension((current) =>
          current && profile.columns.some((column) => column.key === current)
            ? current
            : date?.key ?? category?.key ?? "",
        );
        setDateColumn((current) =>
          current && profile.columns.some((column) => column.key === current && column.kind === "date")
            ? current
            : date?.key ?? "",
        );
        setFilterColumn((current) =>
          current && profile.columns.some((column) => column.key === current && (column.kind === "text" || column.kind === "boolean"))
            ? current
            : "",
        );
        if (!numeric) setAggregation("count");
        else setAggregation((current) => (current === "count" ? "sum" : current));
      } catch (error) {
        if (!cancelled) {
          setFailure(error instanceof Error ? error.message : "Could not load this dataset.");
        }
      }
    }
    void loadActiveDataset();
    return () => {
      cancelled = true;
    };
  }, [activeId, datasetReloadKey, previewOffset]);

  const columns = quality?.columns ?? [];
  const dateColumns = useMemo(
    () => columns.filter((column) => column.kind === "date"),
    [columns],
  );
  const numericColumns = useMemo(
    () => columns.filter((column) => column.kind === "number"),
    [columns],
  );
  const filterableColumns = useMemo(
    () => columns.filter((column) => column.kind === "text" || column.kind === "boolean"),
    [columns],
  );
  const dimensionInfo = columns.find((column) => column.key === dimension);
  const filterInfo = columns.find((column) => column.key === filterColumn);

  useEffect(() => {
    if (!activeId || !quality || dataset?.id !== activeId) return;
    const query = new URLSearchParams();
    if (dimension) query.set("dimension", dimension);
    if (metric) query.set("metric", metric);
    query.set("aggregation", aggregation);
    query.set("time_bucket", timeBucket);
    if (filterColumn && filterValue.trim()) {
      query.set("filter_column", filterColumn);
      query.set("filter_value", filterValue.trim());
    }
    if (dateColumn) {
      if (dateFrom || dateTo) query.set("date_column", dateColumn);
      if (dateFrom) query.set("date_from", dateFrom);
      if (dateTo) query.set("date_to", dateTo);
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setAnalyticsLoading(true);
      try {
        const result = await requestJson(
          `/datasets/${activeId}/analytics?${query.toString()}`,
        );
        if (!cancelled) {
          setAnalytics(result);
          setFailure("");
        }
      } catch (error) {
        if (!cancelled) {
          setFailure(error instanceof Error ? error.message : "Could not run this analysis.");
        }
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    activeId,
    aggregation,
    dateColumn,
    dateFrom,
    dateTo,
    dataset?.id,
    dimension,
    filterColumn,
    filterValue,
    metric,
    quality,
    timeBucket,
  ]);

  function chooseFile(nextFile) {
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setFailure("Choose a CSV file to upload.");
      return;
    }
    if (nextFile.size > 25 * 1024 * 1024) {
      setFailure("This file exceeds the 25 MB upload limit.");
      return;
    }
    setFile(nextFile);
    setFailure("");
    if (!datasetName) setDatasetName(nextFile.name.replace(/\.csv$/i, ""));
  }

  function usePracticeCsv() {
    chooseFile(createSampleCsvFile());
    setUploadOpen(true);
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0] ?? null;
    if (selectedFile) chooseFile(selectedFile);
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function uploadDataset() {
    if (!file) return;
    setUploading(true);
    setFailure("");
    const form = new FormData();
    form.append("file", file);
    form.append("dataset_name", datasetName.trim() || file.name.replace(/\.csv$/i, ""));
    form.append("trim_whitespace", String(trimWhitespace));
    form.append("drop_empty_rows", String(dropEmptyRows));
    form.append("remove_duplicates", String(removeDuplicates));
    try {
      const created = await requestJson("/datasets", {
        method: "POST",
        body: form,
      });
      setDatasets((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setActiveId(created.id);
      setPreviewOffset(0);
      setFile(null);
      setDatasetName("");
      setUploadOpen(false);
      setView("explore");
      setApiReady(true);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "The upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function removeDataset(item) {
    if (!window.confirm(`Delete "${item.name}" and its stored rows?`)) return;
    try {
      await fetch(`/api/v1/datasets/${item.id}`, { method: "DELETE" }).then(async (response) => {
        if (!response.ok) throw new Error("Could not delete this dataset.");
      });
      const remaining = datasets.filter((datasetItem) => datasetItem.id !== item.id);
      setDatasets(remaining);
      if (activeId === item.id) setActiveId(remaining[0]?.id ?? null);
      setFailure("");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Could not delete this dataset.");
    }
  }

  async function exportDatasetCsv() {
    if (!dataset?.id) return;
    setExportingCsv(true);
    setFailure("");
    try {
      const response = await fetch(`/api/v1/datasets/${dataset.id}/export`);
      if (!response.ok) throw new Error("Could not export this dataset.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `${(dataset.name || "dataset").replace(/[^a-zA-Z0-9._-]+/g, "_")}.csv`;
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Could not export this dataset.");
    } finally {
      setExportingCsv(false);
    }
  }

  const allPass = quality?.checks.every((check) => check.status === "pass") ?? false;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="side-section-label">WORKSPACE</div>
        <button className={`side-link ${view === "explore" ? "active" : ""}`} type="button" title="Explore data" aria-label="Explore data" onClick={() => setView("explore")}>
          <LayoutDashboard size={17} /> <span>Explore data</span>
        </button>
        <button
          className={`side-link ${view === "quality" ? "active" : ""}`}
          type="button"
          title="Data quality"
          aria-label="Data quality"
          onClick={() => setView("quality")}
        >
          <ShieldCheck size={17} /> <span>Data quality</span>
        </button>

        <div className="dataset-list-heading">
          <span className="side-section-label">YOUR DATASETS</span>
        </div>
        <button
          className="sidebar-add-dataset"
          type="button"
          title="Upload a CSV dataset"
          onClick={() => setUploadOpen((open) => !open)}
        >
          <Plus size={16} /> <span>Add dataset</span>
        </button>
        <div className="dataset-list">
          {loading && <div className="sidebar-empty">Loading datasets...</div>}
          {!loading && datasets.length === 0 && (
            <div className="sidebar-empty">Upload a CSV and it will appear here.</div>
          )}
          {datasets.map((item) => (
            <div className={`dataset-nav-row ${item.id === activeId ? "current" : ""}`} key={item.id}>
              <button
                className="dataset-nav-button"
                type="button"
                onClick={() => {
                  setActiveId(item.id);
                  setPreviewOffset(0);
                  setFilterValue("");
                  setDateFrom("");
                  setDateTo("");
                  setUploadOpen(false);
                }}
              >
                <FileSpreadsheet size={16} />
                <span className="dataset-nav-name">{item.name}</span>
              </button>
              <button
                className="dataset-remove"
                type="button"
                title={`Delete ${item.name}`}
                onClick={() => void removeDataset(item)}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="connection-line">
            <span className={`connection-dot ${apiReady ? "online" : "offline"}`} />
            <span>{apiReady ? "API connected" : "API unavailable"}</span>
          </div>
          <div className="sidebar-version">FastAPI · PostgreSQL</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="brand-lockup topbar-brand-lockup">
            <div className="brand-mark"><span>D</span></div>
            <div className="topbar-brand-copy">
              <div className="brand-name">DataFoundry</div>
              <div className="brand-subtitle">DATA WORKSPACE</div>
            </div>
          </div>
          <div className="topbar-main">
            <div className="breadcrumbs">
              <button
                className="breadcrumb-workspace"
                type="button"
                onClick={() => {
                  setView("explore");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Workspace
              </button>
              <ChevronRight size={14} />
              <strong>{dataset?.name ?? "Overview"}</strong>
            </div>
            <div className="topbar-actions">
              <span className="privacy-note"><ShieldCheck size={14} /> Stored in your database</span>
              {datasets.length > 1 && (
                <SelectField
                  className="topbar-dataset-select"
                  compact
                  label="Choose dataset"
                  value={activeId ?? ""}
                  onChange={(value) => {
                    setActiveId(value || null);
                    setPreviewOffset(0);
                    setFilterValue("");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  options={datasets.map((item) => [item.id, item.name])}
                />
              )}
              <button
                className="icon-button theme-toggle"
                type="button"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button className="button button-primary button-small" type="button" title="Upload data" aria-label="Upload data" onClick={() => setUploadOpen((open) => !open)}>
                <Upload size={15} /> Upload data
              </button>
            </div>
          </div>
        </header>

        <div className="page-content">
          {failure && (
            <div className="notice notice-error" role="alert">
              <AlertCircle size={17} /> <span>{failure}</span>
              <button type="button" className="notice-close" onClick={() => setFailure("")} aria-label="Dismiss">
                <X size={15} />
              </button>
            </div>
          )}

          {uploadOpen && (
            <dialog
              ref={uploadDialogRef}
              className="upload-panel card upload-dialog"
              aria-labelledby="upload-dialog-title"
              onClose={() => setUploadOpen(false)}
              onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                const clickedOutside =
                  event.clientX < bounds.left ||
                  event.clientX > bounds.right ||
                  event.clientY < bounds.top ||
                  event.clientY > bounds.bottom;
                if (clickedOutside) setUploadOpen(false);
              }}
            >
              <div className="section-heading upload-heading">
                <div>
                  <div className="eyebrow">NEW DATASET</div>
                  <h2 id="upload-dialog-title">Bring your data in</h2>
                  <p>Choose a CSV and the cleaning steps below, then click Upload and analyze. DataFoundry cleans and checks the file, then saves the result in PostgreSQL.</p>
                </div>
                <button className="icon-button" type="button" onClick={() => setUploadOpen(false)} aria-label="Close upload panel">
                  <X size={18} />
                </button>
              </div>
              <div className="upload-grid">
                <div>
                  <div
                    className={`drop-zone ${file ? "has-file" : ""}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInput.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") fileInput.current?.click();
                    }}
                  >
                    <input ref={fileInput} type="file" accept=".csv,text/csv" onChange={handleFileChange} hidden />
                    <div className="drop-icon"><Upload size={21} /></div>
                    <strong>{file ? file.name : "Drop a CSV file here"}</strong>
                    <span>{file ? `${formatNumber(file.size / 1024)} KB · Ready to process` : "or browse from your computer · up to 25 MB"}</span>
                  </div>
                  <button className="button button-quiet use-practice-file" type="button" onClick={usePracticeCsv}><Sparkles size={15} /> Load quick practice CSV (under 2 KB)</button>
                  <label className="field-label" htmlFor="dataset-name">Dataset name</label>
                  <input
                    id="dataset-name"
                    className="text-input"
                    value={datasetName}
                    onChange={(event) => setDatasetName(event.target.value)}
                    placeholder="e.g. Monthly sales"
                    maxLength={160}
                  />
                </div>
                <div className="cleaning-options">
                  <div className="options-title"><Sparkles size={16} /> Cleaning steps</div>
                  <label className="check-option">
                    <input type="checkbox" checked={trimWhitespace} onChange={(event) => setTrimWhitespace(event.target.checked)} />
                    <span><strong>Trim text fields</strong><small>Remove extra spaces around values</small></span>
                  </label>
                  <label className="check-option">
                    <input type="checkbox" checked={dropEmptyRows} onChange={(event) => setDropEmptyRows(event.target.checked)} />
                    <span><strong>Drop fully empty rows</strong><small>Remove records without any values</small></span>
                  </label>
                  <label className="check-option">
                    <input type="checkbox" checked={removeDuplicates} onChange={(event) => setRemoveDuplicates(event.target.checked)} />
                    <span><strong>Remove exact duplicates</strong><small>Keep the first copy of each repeated row</small></span>
                  </label>
                  <button className="button button-primary upload-submit" type="button" onClick={() => void uploadDataset()} disabled={!file || uploading}>
                    {uploading ? <LoaderCircle className="spin" size={16} /> : <Database size={16} />}
                    {uploading ? "Processing dataset..." : "Upload and analyze"}
                  </button>
                </div>
              </div>
            </dialog>
          )}

          {dataset && quality && dataset.id === activeId ? (
            <>
              <section className="dataset-heading-row">
                <div>
                  <div className="eyebrow">DATASET OVERVIEW</div>
                  <h1>{dataset.name}</h1>
              <div className="dataset-meta">
                <span><FileSpreadsheet size={14} /> {dataset.source_filename}</span>
                <span><span className="meta-dot" /> Added {shortDate(dataset.created_at)}</span>
              </div>
              <p className="dataset-intro">These cards summarize the cleaned data and open related details when clicked. Use Explore to build charts or Quality report to review checks.</p>
                </div>
                <button className="button button-quiet delete-current" type="button" title="Delete dataset" aria-label="Delete dataset" onClick={() => void removeDataset(dataset)}>
                  <Trash2 size={15} />
                  <span className="delete-current-label">Delete dataset</span>
                </button>
              </section>

              <div className="kpi-grid">
                <MetricCard icon={Rows3} label="Records" value={formatCompact(dataset.row_count)} detail={`${formatNumber(dataset.row_count)} rows stored`} action="View cleaned records" onClick={() => jumpToKpiTarget("dataset-preview", "explore")} />
                <MetricCard icon={Table2} label="Fields" value={formatNumber(dataset.column_count)} detail="Detected columns" action="View field profiles" onClick={() => jumpToKpiTarget("column-profile-card", "quality")} />
                <MetricCard icon={ShieldCheck} label="Completeness" value={`${dataset.quality_score.toFixed(1)}%`} detail="Non-empty cells" action="Open quality report" onClick={() => jumpToKpiTarget("quality-summary-banner", "quality")} accent />
                <MetricCard icon={AlertCircle} label="Missing cells" value={formatCompact(dataset.quality_summary.missing_cells)} detail={`${formatNumber(dataset.quality_summary.rows_with_missing)} records affected`} action="Review missing values" onClick={() => jumpToKpiTarget("quality-check-missing_values", "quality")} warning={dataset.quality_summary.missing_cells > 0} />
              </div>

              <div className="view-switcher" role="tablist" aria-label="Dataset views">
                <button className={view === "explore" ? "view-tab active" : "view-tab"} type="button" onClick={() => setView("explore")}>
                  <BarChart3 size={16} /> Explore
                </button>
                <button className={view === "quality" ? "view-tab active" : "view-tab"} type="button" onClick={() => setView("quality")}>
                  <FileCheck2 size={16} /> Quality report
                  {allPass ? <Check size={14} className="tab-check" /> : <span className="tab-count">{quality.checks.filter((check) => check.status === "warning").length}</span>}
                </button>
              </div>

              {view === "explore" ? (
                <>
              <section className="card analysis-card">
                    <div className="section-heading analysis-heading">
                      <div>
                        <div className="eyebrow">ANALYZE YOUR DATA</div>
                        <h2>Build a chart</h2>
                        <p>Choose how to group and calculate your records. The chart updates when you change these controls.</p>
                      </div>
                      <div className="chart-query-status">
                        {analyticsLoading ? <LoaderCircle className="spin" size={15} /> : <Activity size={15} />}
                        <span>{analyticsLoading ? "Updating" : "Queried from PostgreSQL"}</span>
                      </div>
                    </div>
                    <div className="analysis-controls">
                      <SelectField label="Group by" help="Split results by a field, such as month or region." value={dimension} onChange={setDimension} options={columns.map((column) => [column.key, column.label])} emptyLabel="All records" />
                      <SelectField label="Measure" help={aggregation === "count" ? "Record count counts rows; no measure is needed." : "The numeric field to summarize."} value={aggregation === "count" ? "" : metric} onChange={setMetric} options={numericColumns.map((column) => [column.key, column.label])} emptyLabel="Choose a number" disabled={aggregation === "count"} />
                      <SelectField label="Calculation" help="Choose how the measure is combined." value={aggregation} onChange={setAggregation} options={[
                        ["sum", "Sum"], ["avg", "Average"], ["min", "Minimum"], ["max", "Maximum"], ["count", "Record count"],
                      ]} />
                      {dimensionInfo?.kind === "date" && (
                        <SelectField label="Time interval" help="Combine dates by day, month, or year." value={timeBucket} onChange={setTimeBucket} options={[
                          ["day", "Day"], ["week", "Week"], ["month", "Month"], ["quarter", "Quarter"], ["year", "Year"],
                        ]} />
                      )}
                    </div>
                    <div className="filter-controls">
                      <div className="filter-title"><span><Filter size={15} /> FILTERS</span><small>Only matching records are included in the chart.</small></div>
                      <div className="filter-fields">
                        {filterableColumns.length > 0 && (
                          <>
                            <SelectField label="Column" value={filterColumn} onChange={setFilterColumn} options={filterableColumns.map((column) => [column.key, column.label])} emptyLabel="No filter" />
                            {filterColumn && (
                              <label className="control-field">
                                <span>Exact value</span>
                                <input className="text-input" value={filterValue} onChange={(event) => setFilterValue(event.target.value)} placeholder={`Filter ${filterInfo?.label ?? "values"}`} />
                              </label>
                            )}
                          </>
                        )}
                        {dateColumns.length > 0 && (
                          <>
                            <SelectField label="Date field" value={dateColumn} onChange={setDateColumn} options={dateColumns.map((column) => [column.key, column.label])} emptyLabel="No date filter" />
                            {dateColumn && (
                              <div className="control-field date-control">
                                <span>From</span>
                                <DatePickerField label="From date" value={dateFrom} onChange={setDateFrom} maxValue={fromDateMax} />
                              </div>
                            )}
                            {dateColumn && (
                              <div className="control-field date-control">
                                <span>To</span>
                                <DatePickerField label="To date" value={dateTo} onChange={setDateTo} minValue={dateFrom || undefined} maxValue={todayDate} />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="chart-title-row">
                      <div>
                        <h3>{aggregation === "count" ? "Record count" : `${labelFor(aggregation)} of ${columns.find((column) => column.key === metric)?.label ?? "metric"}`}</h3>
                        <p>{dimensionInfo ? `Grouped by ${dimensionInfo.label}` : "Across all filtered records"}</p>
                      </div>
                      <span className="chart-total">
                        {analytics?.chart.points.length ? `${analytics.chart.points.length} groups` : "No groups"}
                      </span>
                    </div>
                    <div className="chart-wrap">
                      {analyticsLoading && !analytics ? (
                        <div className="chart-empty"><LoaderCircle className="spin" size={20} /> Running query...</div>
                      ) : analytics?.chart.points.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                          {dimensionInfo?.kind === "date" ? (
                            <AreaChart data={analytics.chart.points} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
                              <defs><linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartAccent} stopOpacity={0.2} /><stop offset="100%" stopColor={chartAccent} stopOpacity={0.01} /></linearGradient></defs>
                              <CartesianGrid vertical={false} stroke={theme === "dark" ? "#37334a" : "#e9e6f1"} />
                              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={11} minTickGap={24} />
                              <YAxis tickFormatter={formatCompact} tickLine={false} axisLine={false} width={58} />
                              <Tooltip formatter={(value) => formatNumber(Number(value))} contentStyle={{ borderRadius: 12, border: `1px solid ${theme === "dark" ? "#49435f" : "#ded9ec"}`, backgroundColor: theme === "dark" ? "#201d2d" : "#ffffff", color: theme === "dark" ? "#f1eff8" : "#262238" }} />
                              <Area type="monotone" dataKey="value" stroke={chartAccent} strokeWidth={2.5} fill="url(#fillValue)" activeDot={{ r: 5 }} />
                            </AreaChart>
                          ) : (
                            <BarChart data={analytics.chart.points} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
                              <CartesianGrid vertical={false} stroke={theme === "dark" ? "#37334a" : "#e9e6f1"} />
                              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={12} interval="preserveStartEnd" />
                              <YAxis tickFormatter={formatCompact} tickLine={false} axisLine={false} width={58} />
                              <Tooltip formatter={(value) => formatNumber(Number(value))} contentStyle={{ borderRadius: 12, border: `1px solid ${theme === "dark" ? "#49435f" : "#ded9ec"}`, backgroundColor: theme === "dark" ? "#201d2d" : "#ffffff", color: theme === "dark" ? "#f1eff8" : "#262238" }} />
                              <Bar dataKey="value" fill={chartAccent} radius={[5, 5, 0, 0]} maxBarSize={46} />
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                      ) : (
                        <div className="chart-empty"><CircleHelp size={20} /> No results for these settings. Try changing the group or filters above.</div>
                      )}
                    </div>
                  </section>

                  <section className="card preview-card" id="dataset-preview">
                    <div className="section-heading preview-heading">
                      <div>
                        <div className="eyebrow">SOURCE RECORDS</div>
                        <h2>Data preview</h2>
                        <p>Cleaned records stored in PostgreSQL.</p>
                      </div>
                      <div className="preview-toolbar-actions">
                        <button className="button button-quiet button-small" type="button" onClick={() => void exportDatasetCsv()} disabled={!dataset || exportingCsv}>
                          {exportingCsv ? <LoaderCircle className="spin" size={14} /> : <Download size={14} />}
                          {exportingCsv ? "Preparing" : "Export CSV"}
                        </button>
                        <div className="pagination">
                          <span>{preview ? `${formatNumber(preview.total_rows)} rows` : ""}</span>
                          <button className="icon-button" type="button" title="Previous page" disabled={previewOffset === 0} onClick={() => setPreviewOffset((offset) => Math.max(0, offset - 25))}><ArrowLeft size={16} /></button>
                          <button className="icon-button" type="button" title="Next page" disabled={!preview || previewOffset + 25 >= preview.total_rows} onClick={() => setPreviewOffset((offset) => offset + 25)}><ArrowRight size={16} /></button>
                        </div>
                      </div>
                    </div>
                    <div className="preview-toolbar">
                      <label className="preview-search" aria-label="Search rows">
                        <Search size={14} />
                        <input
                          type="search"
                          value={previewSearch}
                          onChange={(event) => setPreviewSearch(event.target.value)}
                          placeholder="Search values in this preview"
                        />
                      </label>
                    </div>
                    <DataTable preview={preview} searchTerm={previewSearch} />
                  </section>
                </>
              ) : (
                <QualityView dataset={dataset} profile={quality} />
              )}
            </>
          ) : loading || (activeId && !failure) ? (
            <section className="workspace-loading" aria-live="polite">
              <span className="workspace-loading-icon"><Database size={18} /></span>
              <div>
                <strong>{activeId ? "Opening your dataset" : "Loading your workspace"}</strong>
                <span>{activeId ? "Preparing its profile and saved records." : "Checking for saved datasets."}</span>
              </div>
            </section>
          ) : activeId && failure ? (
            <section className="workspace-load-error card" role="alert">
              <span className="workspace-load-error-icon"><AlertCircle size={20} /></span>
              <div>
                <h2>Couldn’t open this dataset</h2>
                <p>{failure}</p>
                <button
                  className="button button-quiet"
                  type="button"
                  onClick={() => {
                    setFailure("");
                    setDatasetReloadKey((current) => current + 1);
                  }}
                >
                  Try again
                </button>
              </div>
            </section>
          ) : !loading && view === "quality" ? (
            <section className="empty-workspace quality-empty-workspace">
              <div className="empty-intro">
                <div className="eyebrow">DATA QUALITY · START HERE</div>
                <h1>Review a dataset before you analyze it.</h1>
                <p>Upload a CSV to check missing values, duplicates, dates, and column types.</p>
                <div className="empty-actions">
                  <button className="button button-primary" type="button" onClick={() => setUploadOpen(true)}><Upload size={16} /> Upload a CSV</button>
                  <button className="button button-quiet sample-download" type="button" onClick={downloadSampleCsv}><Download size={16} /> Get sample CSV</button>
                </div>
                <p className="sample-hint">New to DataFoundry? Try the sample CSV to see cleaning and quality checks in action.</p>
              </div>
              <div className="quality-preview-grid" aria-label="Checks run after upload">
                <article className="workflow-step card">
                  <div className="workflow-step-top"><span className="step-number">01</span><AlertCircle size={20} /></div>
                  <h2>Missing values</h2>
                  <p>Count blank cells and identify how many records contain blanks.</p>
                </article>
                <article className="workflow-step card">
                  <div className="workflow-step-top"><span className="step-number">02</span><Rows3 size={20} /></div>
                  <h2>Repeated or empty rows</h2>
                  <p>See duplicate and fully blank rows; choose whether to remove them during upload.</p>
                </article>
                <article className="workflow-step card">
                  <div className="workflow-step-top"><span className="step-number">03</span><Activity size={20} /></div>
                  <h2>Dates and field types</h2>
                  <p>Review detected dates, numeric fields, text fields, and date parsing issues.</p>
                </article>
                <article className="workflow-step card">
                  <div className="workflow-step-top"><span className="step-number">04</span><Table2 size={20} /></div>
                  <h2>Column profiles</h2>
                  <p>See each field's completeness, distinct values, and example entries.</p>
                </article>
              </div>
              <p className="empty-note">No check results appear until you upload a dataset. The quick practice CSV is small and includes issues you can clean and review.</p>
            </section>
          ) : !loading ? (
            <section className="empty-workspace">
              <div className="empty-intro">
                <div className="eyebrow">YOUR DATA WORKSPACE</div>
                <h1>Your data, ready to explore.</h1>
                <p>Upload a CSV to clean it, check data quality, and build useful charts.</p>
                <div className="empty-actions">
                  <button className="button button-primary" type="button" onClick={() => setUploadOpen(true)}><Upload size={16} /> Upload a CSV</button>
                  <button className="button button-quiet sample-download" type="button" onClick={downloadSampleCsv}><Download size={16} /> Get sample CSV</button>
                </div>
                <p className="sample-hint">Start with the sample CSV if you’d like a quick guided example.</p>
              </div>
              <div className="workflow-steps" aria-label="How DataFoundry works">
                <article className="workflow-step card">
                  <div className="workflow-step-top"><span className="step-number">01</span><FileSpreadsheet size={20} /></div>
                  <h2>Bring in your data</h2>
                  <p>Upload a CSV and give your dataset a name.</p>
                </article>
                <article className="workflow-step card">
                  <div className="workflow-step-top"><span className="step-number">02</span><Sparkles size={20} /></div>
                  <h2>Clean and validate</h2>
                  <p>Remove unwanted rows, then review quality checks and field types.</p>
                </article>
                <article className="workflow-step card">
                  <div className="workflow-step-top"><span className="step-number">03</span><BarChart3 size={20} /></div>
                  <h2>Explore your results</h2>
                  <p>Build charts, apply filters, and browse your cleaned records.</p>
                </article>
              </div>
              <p className="empty-note">Your original CSV is not retained; DataFoundry stores the cleaned data and quality report.</p>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  action,
  onClick,
  accent = false,
  warning = false,
}) {
  return (
    <button className={`metric-card card ${accent ? "metric-accent" : ""} ${warning ? "metric-warning" : ""}`} type="button" onClick={onClick} title={action} aria-label={`${label}: ${value}. ${action}`}>
      <div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={17} /></span></div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
      <div className="metric-action"><span>{action}</span><ArrowRight size={13} /></div>
    </button>
  );
}

function SelectField({
  label,
  help,
  value,
  onChange,
  options,
  emptyLabel,
  disabled = false,
  compact = false,
  className = "",
}) {
  const id = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const typeahead = useRef("");
  const typeaheadTimer = useRef(null);
  const [open, setOpen] = useState(false);
  const menuOptions = emptyLabel === undefined ? options : [["", emptyLabel], ...options];
  const selectedIndex = menuOptions.findIndex(([key]) => key === value);
  const [activeIndex, setActiveIndex] = useState(Math.max(selectedIndex, 0));
  const selectedOption = menuOptions.find(([key]) => key === value);

  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  useEffect(() => () => window.clearTimeout(typeaheadTimer.current), []);

  function chooseOption(index) {
    const option = menuOptions[index];
    if (!option) return;
    onChange(option[0]);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (disabled || menuOptions.length === 0) return;
    const lastIndex = menuOptions.length - 1;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!open) {
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
        setOpen(true);
      } else {
        setActiveIndex((current) => (current + direction + menuOptions.length) % menuOptions.length);
      }
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(event.key === "Home" ? 0 : lastIndex);
      return;
    }
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) chooseOption(activeIndex);
      else {
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
        setOpen(true);
      }
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      typeahead.current += event.key.toLocaleLowerCase();
      window.clearTimeout(typeaheadTimer.current);
      typeaheadTimer.current = window.setTimeout(() => { typeahead.current = ""; }, 650);
      const match = menuOptions.findIndex(([, title]) => title.toLocaleLowerCase().startsWith(typeahead.current));
      if (match >= 0) {
        setActiveIndex(match);
        setOpen(true);
      }
    }
  }

  return (
    <div className={`control-field ${compact ? "control-field-compact" : ""} ${className}`.trim()}>
      {!compact && <span id={`${id}-label`}>{label}</span>}
      {help && !compact && <small className="control-help" id={`${id}-help`}>{help}</small>}
      <div className={`select-control ${open ? "open" : ""}`} ref={rootRef}>
        <button
          ref={triggerRef}
          className="select-trigger"
          type="button"
          role="combobox"
          aria-label={compact ? label : undefined}
          aria-labelledby={!compact ? `${id}-label` : undefined}
          aria-describedby={help && !compact ? `${id}-help` : undefined}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? `${id}-listbox` : undefined}
          aria-valuetext={selectedOption?.[1] ?? emptyLabel ?? "Choose an option"}
          aria-activedescendant={open && menuOptions[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
          disabled={disabled}
          onClick={() => {
            if (!open) setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
            setOpen((current) => !current);
          }}
          onKeyDown={handleKeyDown}
        >
          <span className="select-selected">{selectedOption?.[1] ?? emptyLabel ?? "Choose an option"}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {open && (
          <div className="select-menu" id={`${id}-listbox`} role="listbox" aria-labelledby={`${id}-label`}>
            {menuOptions.map(([key, title], index) => {
              const selected = key === value;
              return (
                <div
                  ref={(element) => { optionRefs.current[index] = element; }}
                  className={`select-option ${selected ? "selected" : ""} ${index === activeIndex ? "active" : ""}`}
                  id={`${id}-option-${index}`}
                  key={key || "empty-option"}
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => chooseOption(index)}
                >
                  <span>{title}</span>
                  {selected && <Check size={14} aria-hidden="true" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DataTable({ preview, searchTerm = "" }) {
  if (!preview) return <div className="table-loading"><LoaderCircle className="spin" size={17} /> Loading records...</div>;

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const rows = normalizedSearch
    ? preview.rows.filter((row) =>
        preview.columns.some((column) =>
          sampleText(row[column.key]).toLowerCase().includes(normalizedSearch),
        ),
      )
    : preview.rows;

  if (rows.length === 0) {
    return <div className="table-loading">{normalizedSearch ? "No rows match your search in this preview." : "This dataset has no preview rows."}</div>;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr>{preview.columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${preview.offset}-${rowIndex}`}>
              {preview.columns.map((column) => <td key={column.key} title={sampleText(row[column.key])}>{sampleText(row[column.key])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QualityCheckDetails({ check, profile, onClose, detailsRef }) {
  const missingColumns = profile.columns
    .filter((column) => column.null_count > 0)
    .sort((left, right) => right.null_count - left.null_count);
  const dateColumns = check.details.parsed_columns ?? [];
  const dateFailures = check.details.failures_by_column ?? {};

  let explanation = "Review the information recorded for this check.";
  if (check.name === "missing_values") {
    explanation = `${formatNumber(check.details.missing_cells)} blank cells across ${formatNumber(check.affected_rows)} records. These stay blank in the saved data; correct them in the source and upload again if values are known.`;
  } else if (check.name === "duplicate_rows") {
    explanation = `${formatNumber(check.affected_rows)} exact duplicate rows were detected. ${formatNumber(check.details.removed)} were removed during upload and ${formatNumber(check.details.remaining)} remain in the saved data.`;
  } else if (check.name === "empty_rows") {
    explanation = `${formatNumber(check.details.removed)} completely blank rows were removed before the dataset was saved.`;
  } else if (check.name === "date_values") {
    const failureCount = Object.values(dateFailures).reduce((total, value) => total + value, 0);
    explanation = failureCount
      ? `${formatNumber(failureCount)} date value${failureCount === 1 ? " could not" : "s could not"} be parsed. Failed values are stored as blank; correct the source and upload again to preserve the original date.`
      : "All detected date values were parsed successfully. No date rows need correction.";
  }

  return (
    <section ref={detailsRef} id="quality-check-details" className="quality-detail-panel card" aria-labelledby="quality-check-details-title" aria-live="polite">
      <div className="quality-detail-header">
        <div>
          <div className="eyebrow">CHECK DETAILS</div>
          <h3 id="quality-check-details-title">{qualityCheckTitle(check.name)}</h3>
          <p>{explanation}</p>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close check details"><X size={16} /></button>
      </div>

      {check.name === "missing_values" && (
        missingColumns.length ? (
          <div className="quality-detail-list" aria-label="Fields with missing values">
            {missingColumns.map((column) => {
              const complete = profile.cleaning.output_rows
                ? 100 * (1 - column.null_count / profile.cleaning.output_rows)
                : 100;
              return <div className="quality-detail-item" key={column.key}>
                <strong>{column.label}</strong>
                <small>{column.key}</small>
                <span>{formatNumber(column.null_count)} blank cells · {complete.toFixed(1)}% complete</span>
              </div>;
            })}
          </div>
        ) : <p className="quality-detail-empty">No fields have missing values.</p>
      )}

      {check.name === "duplicate_rows" && (
        <div className="quality-detail-stats">
          <div><span>Duplicates found</span><strong>{formatNumber(check.affected_rows)}</strong></div>
          <div><span>Removed on upload</span><strong>{formatNumber(check.details.removed)}</strong></div>
          <div><span>Still in dataset</span><strong>{formatNumber(check.details.remaining)}</strong></div>
        </div>
      )}

      {check.name === "empty_rows" && (
        <div className="quality-detail-stats">
          <div><span>Input rows</span><strong>{formatNumber(profile.cleaning.input_rows)}</strong></div>
          <div><span>Blank rows removed</span><strong>{formatNumber(check.details.removed)}</strong></div>
          <div><span>Rows saved</span><strong>{formatNumber(profile.cleaning.output_rows)}</strong></div>
        </div>
      )}

      {check.name === "date_values" && (
        dateColumns.length ? (
          <div className="quality-detail-list" aria-label="Detected date fields">
            {dateColumns.map((key) => {
              const column = profile.columns.find((item) => item.key === key);
              const failures = dateFailures[key] ?? 0;
              return <div className="quality-detail-item" key={key}>
                <strong>{column?.label ?? labelFor(key)}</strong>
                <small>{key}</small>
                <span>{formatNumber(failures)} values could not be parsed</span>
              </div>;
            })}
          </div>
        ) : <p className="quality-detail-empty">No date-like fields were detected in this dataset.</p>
      )}
    </section>
  );
}

function QualityView({ dataset, profile }) {
  const [activeCheck, setActiveCheck] = useState(null);
  const detailsRef = useRef(null);
  const attentionCount = profile.checks.filter((check) => check.status === "warning").length;
  const selectedCheck = profile.checks.find((check) => check.name === activeCheck);

  useEffect(() => {
    if (activeCheck) detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeCheck]);

  return (
    <div className="quality-view">
      <div className="quality-summary-banner card" id="quality-summary-banner">
        <div className={`quality-score ${dataset.quality_score >= 95 ? "good" : dataset.quality_score >= 80 ? "mid" : "low"}`}>
          <ShieldCheck size={23} />
          <div><strong>{dataset.quality_score.toFixed(1)}%</strong><span>Completeness score</span></div>
        </div>
        <div className="quality-banner-copy">
          <h2>{dataset.quality_score >= 95 ? "Your data is in good shape." : "Review the findings before analysis."}</h2>
          <p>This report explains data completeness and the checks run during upload. {formatNumber(profile.summary.missing_cells)} missing cells were found across {formatNumber(profile.summary.rows_with_missing)} records.</p>
        </div>
        <div className="quality-cleaned-count"><span>ROWS AFTER CLEANING</span><strong>{formatNumber(profile.cleaning.output_rows)}</strong><small>{formatNumber(profile.cleaning.input_rows - profile.cleaning.output_rows)} rows removed</small></div>
      </div>

      <div className="quality-section-title"><div><div className="eyebrow">VALIDATION</div><h2>Quality checks</h2><p>Select a check to see the affected fields or rows removed during upload.</p></div><span>{attentionCount === 0 ? "No checks need attention" : `${attentionCount} ${attentionCount === 1 ? "check needs" : "checks need"} attention`}</span></div>
      <div className="quality-check-grid">
        {profile.checks.map((check) => (
          <button
            className={`quality-check card ${activeCheck === check.name ? "selected" : ""}`}
            id={`quality-check-${check.name}`}
            key={check.name}
            type="button"
            aria-expanded={activeCheck === check.name}
            aria-controls={activeCheck === check.name ? "quality-check-details" : undefined}
            onClick={() => setActiveCheck((current) => current === check.name ? null : check.name)}
          >
            <span className={`check-status ${check.status}`}>
              {check.status === "pass" ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
              <span>{check.status === "pass" ? "Passed" : "Review"}</span>
            </span>
            <strong>{qualityCheckTitle(check.name)}</strong>
            <span className="quality-check-copy">{qualityCheckDescription(check)}</span>
            <span className="quality-check-action">{activeCheck === check.name ? "Details shown below" : "View details"} <ArrowRight size={13} /></span>
          </button>
        ))}
      </div>
      {selectedCheck && <QualityCheckDetails detailsRef={detailsRef} check={selectedCheck} profile={profile} onClose={() => setActiveCheck(null)} />}

      <section className="card column-profile-card" id="column-profile-card">
        <div className="section-heading">
          <div><div className="eyebrow">FIELD PROFILE</div><h2>Column-by-column details</h2><p>Complete is the filled percentage; unique is the count of distinct non-blank values. Examples show a few cleaned values.</p></div>
        </div>
        <div className="table-scroll">
          <table className="profile-table">
            <thead><tr><th>Field</th><th>Type</th><th>Complete</th><th>Unique</th><th>Example values</th></tr></thead>
            <tbody>
              {profile.columns.map((column) => {
                const completeness = dataset.row_count ? 100 * (1 - column.null_count / dataset.row_count) : 100;
                return <tr key={column.key}>
                  <td><strong>{column.label}</strong><small>{column.key}</small></td>
                  <td><span className={`type-chip ${column.kind}`}>{column.kind}</span></td>
                  <td><span className="completeness-cell"><span className="mini-progress"><i style={{ width: `${Math.max(0, Math.min(100, completeness))}%` }} /></span>{completeness.toFixed(0)}%</span></td>
                  <td>{formatNumber(column.unique_count)}</td>
                  <td className="sample-cell">{column.sample_values.slice(0, 4).map(sampleText).join(" · ") || "—"}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card cleaning-summary-card">
        <div className="section-heading">
          <div><div className="eyebrow">PROCESSING HISTORY</div><h2>Cleaning applied</h2><p>These counts show what DataFoundry changed during import.</p></div>
          <Sparkles size={18} className="muted-icon" />
        </div>
        <div className="cleaning-chips">
          <span><Check size={14} /> {formatNumber(profile.cleaning.empty_rows_removed)} empty rows removed</span>
          <span><Check size={14} /> {formatNumber(profile.cleaning.duplicate_rows_removed)} duplicate rows removed</span>
          {profile.cleaning.parsed_date_columns.map((key) => <span key={key}><Check size={14} /> Parsed {labelFor(key)} as date</span>)}
          {profile.cleaning.parsed_date_columns.length === 0 && <span><CircleHelp size={14} /> No date columns detected</span>}
        </div>
      </section>
    </div>
  );
}

export default App;
