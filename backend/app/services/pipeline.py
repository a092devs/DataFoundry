import json
import re
import unicodedata
from dataclasses import dataclass
from io import BytesIO

import pandas as pd


NULL_TOKENS = {"", "null", "none", "n/a", "na", "nan", "<na>"}
DATE_HINT = re.compile(r"date|time|timestamp|created|updated|purchase|delivery|shipped", re.I)
IDENTIFIER_HINT = re.compile(r"(^|_)(id|code|zip|postal|phone|sku|account)(_|$)", re.I)


@dataclass
class CleaningOptions:
    trim_whitespace: bool = True
    drop_empty_rows: bool = True
    remove_duplicates: bool = True


def normalize_column(label: str) -> str:
    normalized = unicodedata.normalize("NFKD", label)
    normalized = normalized.encode("ascii", "ignore").decode("ascii").lower()
    normalized = re.sub(r"[^a-z0-9]+", "_", normalized).strip("_")
    if not normalized:
        normalized = "field"
    if normalized[0].isdigit():
        normalized = f"field_{normalized}"
    return normalized[:140]


def unique_column_keys(labels):
    used = set()
    keys = []
    for index, label in enumerate(labels, start=1):
        base = normalize_column(str(label))
        key = base
        suffix = 2
        while key in used:
            key = f"{base[:130]}_{suffix}"
            suffix += 1
        used.add(key)
        keys.append(key)
    return keys


def _kind(series):
    if pd.api.types.is_datetime64_any_dtype(series):
        return "date"
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if pd.api.types.is_numeric_dtype(series):
        return "number"
    return "text"


def _json_scalar(value):
    if pd.isna(value):
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if hasattr(value, "item"):
        return value.item()
    if isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def prepare_csv(content: bytes, options: CleaningOptions):
    """Read, clean, profile, and serialize a CSV for PostgreSQL storage."""
    try:
        header = pd.read_csv(BytesIO(content), nrows=0, encoding="utf-8-sig")
        identifier_types = {
            str(column): "string"
            for column in header.columns
            if IDENTIFIER_HINT.search(str(column))
        }
        frame = pd.read_csv(
            BytesIO(content),
            encoding="utf-8-sig",
            dtype=identifier_types,
            low_memory=False,
        )
    except (UnicodeDecodeError, pd.errors.ParserError, ValueError) as error:
        raise ValueError(f"The file could not be read as a UTF-8 CSV: {error}") from error

    if len(frame.columns) == 0:
        raise ValueError("The CSV must include a header row and at least one column.")
    if len(frame.columns) > 250:
        raise ValueError("The CSV has too many columns. The limit is 250.")
    if len(frame) > 500_000:
        raise ValueError("The CSV has too many rows. The limit is 500,000.")

    original_labels = [str(label).strip() for label in frame.columns]
    frame.columns = unique_column_keys(original_labels)
    input_rows = len(frame)

    for column in frame.select_dtypes(include=["object", "string"]).columns:
        values = frame[column].astype("string")
        if options.trim_whitespace:
            values = values.str.strip()
        null_like = values.str.strip().str.casefold().isin(NULL_TOKENS)
        frame[column] = values.mask(null_like, pd.NA)

    empty_rows_removed = 0
    if options.drop_empty_rows:
        empty_rows = frame.isna().all(axis=1)
        empty_rows_removed = int(empty_rows.sum())
        frame = frame.loc[~empty_rows].copy()

    date_fields = []
    date_parse_failures = {}
    date_rows_with_failures = pd.Series(False, index=frame.index)
    for key, label in zip(frame.columns, original_labels):
        if not DATE_HINT.search(f"{label} {key}"):
            continue
        values = frame[key]
        if pd.api.types.is_numeric_dtype(values):
            continue
        present = values.notna()
        if not present.any():
            continue
        parsed = pd.to_datetime(values, errors="coerce", format="mixed", utc=True)
        valid_ratio = float(parsed[present].notna().mean())
        if valid_ratio < 0.8:
            continue
        failures = int((present & parsed.isna()).sum())
        date_parse_failures[key] = failures
        date_rows_with_failures |= present & parsed.isna()
        frame[key] = parsed.dt.tz_convert(None)
        date_fields.append(key)

    duplicate_rows_found = int(frame.duplicated().sum())
    duplicate_rows_removed = 0
    if options.remove_duplicates and duplicate_rows_found:
        frame = frame.drop_duplicates().copy()
        duplicate_rows_removed = duplicate_rows_found

    if frame.empty:
        raise ValueError("Cleaning removed every row. Review the cleaning options and try again.")

    frame = frame.convert_dtypes()
    missing_cells = int(frame.isna().sum().sum())
    total_cells = int(frame.shape[0] * frame.shape[1])
    rows_with_missing = int(frame.isna().any(axis=1).sum())
    quality_score = round(100 * (1 - missing_cells / total_cells), 1) if total_cells else 100.0

    columns = []
    for key, label in zip(frame.columns, original_labels):
        series = frame[key]
        samples = [_json_scalar(value) for value in series.dropna().head(5).tolist()]
        columns.append(
            {
                "key": key,
                "label": label or key,
                "kind": _kind(series),
                "data_type": str(series.dtype),
                "null_count": int(series.isna().sum()),
                "unique_count": int(series.nunique(dropna=True)),
                "sample_values": samples,
            }
        )

    quality_summary = {
        "score": quality_score,
        "missing_cells": missing_cells,
        "rows_with_missing": rows_with_missing,
        "duplicate_rows_found": duplicate_rows_found,
        "duplicate_rows_remaining": int(frame.duplicated().sum()),
        "date_parse_failures": sum(date_parse_failures.values()),
        "date_rows_with_parse_failures": int(date_rows_with_failures.sum()),
    }
    cleaning_summary = {
        "input_rows": input_rows,
        "output_rows": len(frame),
        "empty_rows_removed": empty_rows_removed,
        "duplicate_rows_removed": duplicate_rows_removed,
        "trimmed_whitespace": options.trim_whitespace,
        "removed_empty_rows": options.drop_empty_rows,
        "removed_duplicates": options.remove_duplicates,
        "parsed_date_columns": date_fields,
        "date_parse_failures_by_column": date_parse_failures,
    }

    records = json.loads(
        frame.to_json(orient="records", date_format="iso", force_ascii=False)
    )
    return {
        "row_count": len(frame),
        "column_count": len(frame.columns),
        "quality_score": quality_score,
        "quality_summary": quality_summary,
        "cleaning_summary": cleaning_summary,
        "columns": columns,
        "records": records,
    }
