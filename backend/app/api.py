import csv
import json
from datetime import date, datetime, time, timedelta
from io import StringIO
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import DateTime, Float, cast, delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DataQualityCheck, Dataset, DatasetColumn, DatasetRecord
from app.services.pipeline import CleaningOptions, prepare_csv


router = APIRouter(prefix="/datasets", tags=["datasets"])
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
ANALYTIC_DATE_BUCKETS = {"day", "week", "month", "quarter", "year"}


def dataset_payload(dataset):
    return {
        "id": str(dataset.id),
        "name": dataset.name,
        "source_filename": dataset.source_filename,
        "row_count": dataset.row_count,
        "column_count": dataset.column_count,
        "quality_score": dataset.quality_score,
        "quality_summary": dataset.quality_summary,
        "cleaning_summary": dataset.cleaning_summary,
        "created_at": dataset.created_at.isoformat(),
    }


def column_payload(column):
    return {
        "key": column.key,
        "label": column.label,
        "kind": column.kind,
        "data_type": column.data_type,
        "null_count": column.null_count,
        "unique_count": column.unique_count,
        "sample_values": column.sample_values,
    }


def get_dataset_or_404(db: Session, dataset_id: UUID):
    dataset = db.get(Dataset, dataset_id)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return dataset


def save_quality_checks(db, dataset_id, prepared):
    quality = prepared["quality_summary"]
    cleaning = prepared["cleaning_summary"]
    checks = [
        {
            "check_name": "missing_values",
            "status": "warning" if quality["missing_cells"] else "pass",
            "affected_rows": quality["rows_with_missing"],
            "details": {"missing_cells": quality["missing_cells"]},
        },
        {
            "check_name": "duplicate_rows",
            "status": "warning" if quality["duplicate_rows_found"] else "pass",
            "affected_rows": quality["duplicate_rows_found"],
            "details": {
                "removed": cleaning["duplicate_rows_removed"],
                "remaining": quality["duplicate_rows_remaining"],
            },
        },
        {
            "check_name": "empty_rows",
            "status": "warning" if cleaning["empty_rows_removed"] else "pass",
            "affected_rows": cleaning["empty_rows_removed"],
            "details": {"removed": cleaning["empty_rows_removed"]},
        },
        {
            "check_name": "date_values",
            "status": "warning" if quality["date_parse_failures"] else "pass",
            "affected_rows": quality["date_rows_with_parse_failures"],
            "details": {
                "parsed_columns": cleaning["parsed_date_columns"],
                "failures_by_column": cleaning["date_parse_failures_by_column"],
            },
        },
    ]
    db.add_all(
        [DataQualityCheck(dataset_id=dataset_id, **check) for check in checks]
    )


@router.get("")
def list_datasets(db: Session = Depends(get_db)):
    datasets = db.scalars(select(Dataset).order_by(Dataset.created_at.desc())).all()
    return [dataset_payload(dataset) for dataset in datasets]


@router.post("", status_code=201)
def create_dataset(
    file: UploadFile = File(...),
    dataset_name: str | None = Form(default=None),
    trim_whitespace: bool = Form(default=True),
    drop_empty_rows: bool = Form(default=True),
    remove_duplicates: bool = Form(default=True),
    db: Session = Depends(get_db),
):
    upload_name = (file.filename or "").replace("\\", "/").split("/")[-1]
    if not upload_name or Path(upload_name).suffix.casefold() != ".csv":
        raise HTTPException(status_code=415, detail="Upload a CSV file.")

    content = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="The upload limit is 25 MB.")
    if not content:
        raise HTTPException(status_code=422, detail="The uploaded CSV is empty.")

    options = CleaningOptions(
        trim_whitespace=trim_whitespace,
        drop_empty_rows=drop_empty_rows,
        remove_duplicates=remove_duplicates,
    )
    try:
        prepared = prepare_csv(content, options)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    name = (dataset_name or Path(upload_name).stem).strip()
    if not name:
        name = Path(upload_name).stem or "Untitled dataset"
    if len(name) > 160:
        raise HTTPException(status_code=422, detail="Dataset names can be at most 160 characters.")

    dataset = Dataset(
        name=name,
        source_filename=upload_name[:255],
        row_count=prepared["row_count"],
        column_count=prepared["column_count"],
        quality_score=prepared["quality_score"],
        quality_summary=prepared["quality_summary"],
        cleaning_summary=prepared["cleaning_summary"],
    )
    try:
        db.add(dataset)
        db.flush()
        db.add_all(
            [
                DatasetColumn(dataset_id=dataset.id, **column)
                for column in prepared["columns"]
            ]
        )
        save_quality_checks(db, dataset.id, prepared)

        for start in range(0, len(prepared["records"]), 1_000):
            batch = prepared["records"][start : start + 1_000]
            db.execute(
                insert(DatasetRecord),
                [
                    {
                        "dataset_id": dataset.id,
                        "row_number": start + offset + 1,
                        "data": record,
                    }
                    for offset, record in enumerate(batch)
                ],
            )
        db.commit()
        db.refresh(dataset)
    except Exception:
        db.rollback()
        raise
    return dataset_payload(dataset)


@router.get("/{dataset_id}")
def get_dataset(dataset_id: UUID, db: Session = Depends(get_db)):
    return dataset_payload(get_dataset_or_404(db, dataset_id))


@router.get("/{dataset_id}/quality")
def get_quality(dataset_id: UUID, db: Session = Depends(get_db)):
    dataset = get_dataset_or_404(db, dataset_id)
    columns = db.scalars(
        select(DatasetColumn)
        .where(DatasetColumn.dataset_id == dataset_id)
        .order_by(DatasetColumn.id)
    ).all()
    checks = db.scalars(
        select(DataQualityCheck)
        .where(DataQualityCheck.dataset_id == dataset_id)
        .order_by(DataQualityCheck.id)
    ).all()
    return {
        "summary": dataset.quality_summary,
        "cleaning": dataset.cleaning_summary,
        "columns": [column_payload(column) for column in columns],
        "checks": [
            {
                "name": check.check_name,
                "status": check.status,
                "affected_rows": check.affected_rows,
                "details": check.details,
            }
            for check in checks
        ],
    }


@router.get("/{dataset_id}/preview")
def preview_dataset(
    dataset_id: UUID,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    dataset = get_dataset_or_404(db, dataset_id)
    columns = db.scalars(
        select(DatasetColumn)
        .where(DatasetColumn.dataset_id == dataset_id)
        .order_by(DatasetColumn.id)
    ).all()
    rows = db.scalars(
        select(DatasetRecord)
        .where(DatasetRecord.dataset_id == dataset_id)
        .order_by(DatasetRecord.row_number)
        .offset(offset)
        .limit(limit)
    ).all()
    return {
        "dataset_id": str(dataset.id),
        "offset": offset,
        "limit": limit,
        "total_rows": dataset.row_count,
        "columns": [column_payload(column) for column in columns],
        "rows": [row.data for row in rows],
    }


@router.get("/{dataset_id}/analytics")
def analyze_dataset(
    dataset_id: UUID,
    dimension: str | None = None,
    metric: str | None = None,
    aggregation: str = Query(default="sum", pattern="^(sum|avg|min|max|count)$"),
    time_bucket: str = Query(default="month", pattern="^(day|week|month|quarter|year)$"),
    filter_column: str | None = None,
    filter_value: str | None = None,
    date_column: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    dataset = get_dataset_or_404(db, dataset_id)
    columns = db.scalars(
        select(DatasetColumn).where(DatasetColumn.dataset_id == dataset_id)
    ).all()
    columns_by_key = {column.key: column for column in columns}

    def require_column(key, label):
        if key and key not in columns_by_key:
            raise HTTPException(status_code=422, detail=f"Unknown {label} column.")
        return columns_by_key.get(key) if key else None

    dimension_column = require_column(dimension, "dimension")
    metric_column = require_column(metric, "metric")
    filter_field = require_column(filter_column, "filter")
    date_field = require_column(date_column, "date")

    if aggregation != "count" and (metric_column is None or metric_column.kind != "number"):
        raise HTTPException(
            status_code=422,
            detail="Choose a numeric metric for sum, average, minimum, or maximum.",
        )
    if (date_from or date_to) and (date_field is None or date_field.kind != "date"):
        raise HTTPException(status_code=422, detail="Date filters need a date column.")
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="The date range is reversed.")

    conditions = [DatasetRecord.dataset_id == dataset_id]
    if filter_field and filter_value is not None and filter_value != "":
        conditions.append(DatasetRecord.data[filter_field.key].astext == filter_value)
    if date_field and date_from:
        timestamp = cast(DatasetRecord.data[date_field.key].astext, DateTime)
        conditions.append(timestamp >= datetime.combine(date_from, time.min))
    if date_field and date_to:
        timestamp = cast(DatasetRecord.data[date_field.key].astext, DateTime)
        conditions.append(
            timestamp < datetime.combine(date_to + timedelta(days=1), time.min)
        )

    if aggregation == "count":
        measure_expression = func.count()
    else:
        numeric_value = cast(DatasetRecord.data[metric_column.key].astext, Float)
        measure_expression = {
            "sum": func.sum,
            "avg": func.avg,
            "min": func.min,
            "max": func.max,
        }[aggregation](numeric_value)

    if dimension_column:
        dimension_expression = DatasetRecord.data[dimension_column.key].astext
        if dimension_column.kind == "date":
            dimension_expression = func.date_trunc(
                time_bucket,
                cast(DatasetRecord.data[dimension_column.key].astext, DateTime),
            )
        else:
            dimension_expression = func.coalesce(dimension_expression, "(blank)")
        statement = (
            select(
                dimension_expression.label("label"),
                measure_expression.label("value"),
            )
            .where(*conditions)
            .group_by(dimension_expression)
        )
        if dimension_column.kind == "date":
            statement = statement.order_by(dimension_expression.asc()).limit(limit)
        else:
            statement = statement.order_by(measure_expression.desc()).limit(limit)
        result_rows = db.execute(statement).all()
        points = [
            {
                "label": row.label.isoformat() if isinstance(row.label, datetime) else str(row.label),
                "value": float(row.value or 0),
            }
            for row in result_rows
        ]
    else:
        statement = select(measure_expression.label("value")).where(*conditions)
        value = db.scalar(statement)
        points = [{"label": "All records", "value": float(value or 0)}]

    return {
        "dataset_id": str(dataset_id),
        "kpis": {
            "rows": dataset.row_count,
            "columns": dataset.column_count,
            "quality_score": dataset.quality_score,
            "missing_cells": dataset.quality_summary["missing_cells"],
        },
        "chart": {
            "dimension": dimension,
            "metric": metric,
            "aggregation": aggregation,
            "time_bucket": time_bucket if dimension_column and dimension_column.kind == "date" else None,
            "points": points,
        },
    }


@router.get("/{dataset_id}/export")
def export_dataset_csv(dataset_id: UUID, db: Session = Depends(get_db)):
    dataset = get_dataset_or_404(db, dataset_id)
    columns = db.scalars(
        select(DatasetColumn)
        .where(DatasetColumn.dataset_id == dataset_id)
        .order_by(DatasetColumn.id)
    ).all()
    rows = db.scalars(
        select(DatasetRecord)
        .where(DatasetRecord.dataset_id == dataset_id)
        .order_by(DatasetRecord.row_number)
    ).all()

    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow([column.label for column in columns])

    for row in rows:
        writer.writerow(
            [
                ""
                if row.data.get(column.key) is None
                else json.dumps(row.data.get(column.key), ensure_ascii=False)
                if isinstance(row.data.get(column.key), (dict, list))
                else row.data.get(column.key)
                for column in columns
            ]
        )

    filename = (dataset.name or "dataset").strip() or "dataset"
    safe_name = "".join(ch if ch.isalnum() or ch in "-_. " else "_" for ch in filename)
    payload = buffer.getvalue().encode("utf-8")

    return StreamingResponse(
        iter([payload]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.csv"'},
    )


@router.delete("/{dataset_id}", status_code=204)
def delete_dataset(dataset_id: UUID, db: Session = Depends(get_db)):
    get_dataset_or_404(db, dataset_id)
    db.execute(delete(Dataset).where(Dataset.id == dataset_id))
    db.commit()
    return Response(status_code=204)
