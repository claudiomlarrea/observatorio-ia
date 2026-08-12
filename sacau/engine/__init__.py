"""Motor SACAU: conversión de planes en horas a créditos CRE (UCCuyo)."""

from .convert import convert_plan, estimate_autonomous_hours
from .export import (
    plan_to_dataframe,
    to_csv_bytes,
    to_docx_bytes,
    to_excel_bytes,
    to_pdf_bytes,
)
from .models import Asignatura, ConvertOptions, PlanEstudios, Tipologia
from .validate import ValidationResult, validate_plan

__all__ = [
    "Asignatura",
    "ConvertOptions",
    "PlanEstudios",
    "Tipologia",
    "convert_plan",
    "estimate_autonomous_hours",
    "plan_to_dataframe",
    "to_csv_bytes",
    "to_docx_bytes",
    "to_excel_bytes",
    "to_pdf_bytes",
    "ValidationResult",
    "validate_plan",
]
