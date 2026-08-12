"""Modelos de dominio para planes SACAU / CRE UCCuyo."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class Tipologia:
    """Coeficientes para estimar horas autónomas según tipo de actividad."""

    id: str
    nombre: str
    ratio_autonomo: float
    autonomas_fijas: float = 0.0
    descripcion: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Tipologia":
        return cls(
            id=data["id"],
            nombre=data.get("nombre", data["id"]),
            ratio_autonomo=float(data.get("ratio_autonomo", 1.0)),
            autonomas_fijas=float(data.get("autonomas_fijas", 0.0)),
            descripcion=data.get("descripcion", ""),
        )


@dataclass
class Asignatura:
    codigo: str
    nombre: str
    anio: int
    area: str  # FB, FP, FGC, FCI, etc.
    horas_teoricas: float
    horas_practicas: float
    regimen: str = "S"  # A | S
    tipologia: str = "teorica"
    horas_autonomas_override: float | None = None
    valor_cre_override: float | None = None
    horas_estimadas: bool = False
    notas: str = ""

    @property
    def horas_interaccion(self) -> float:
        return float(self.horas_teoricas) + float(self.horas_practicas)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Asignatura":
        return cls(
            codigo=str(data.get("codigo", "")),
            nombre=str(data.get("nombre", "")),
            anio=int(data.get("anio", 1)),
            area=str(data.get("area", "")),
            horas_teoricas=float(data.get("horas_teoricas", 0) or 0),
            horas_practicas=float(data.get("horas_practicas", 0) or 0),
            regimen=str(data.get("regimen", "S") or "S"),
            tipologia=str(data.get("tipologia", "teorica") or "teorica"),
            horas_autonomas_override=(
                None
                if data.get("horas_autonomas_override") in (None, "")
                else float(data["horas_autonomas_override"])
            ),
            valor_cre_override=(
                None
                if data.get("valor_cre_override") in (None, "")
                else float(data["valor_cre_override"])
            ),
            horas_estimadas=bool(data.get("horas_estimadas", False)),
            notas=str(data.get("notas", "") or ""),
        )


@dataclass
class AsignaturaConvertida:
    asignatura: Asignatura
    horas_autonomas: float
    horas_totales: float
    valor_cre: float
    cre: float
    autonomas_fuente: str  # override | tipologia

    @property
    def horas_interaccion(self) -> float:
        return self.asignatura.horas_interaccion


@dataclass
class ConvertOptions:
    valor_cre_default: float = 25.0
    redondeo_cre: float = 0.5  # 0.25 | 0.5 | 0 (sin redondeo)
    tipologias: dict[str, Tipologia] = field(default_factory=dict)


@dataclass
class TotalesPlan:
    horas_teoricas: float = 0.0
    horas_practicas: float = 0.0
    horas_interaccion: float = 0.0
    horas_autonomas: float = 0.0
    horas_totales: float = 0.0
    cre: float = 0.0
    anios: int = 0
    cre_promedio_anual: float = 0.0


@dataclass
class PlanEstudios:
    id: str
    nombre: str
    titulo: str = ""
    institucion: str = "Universidad Católica de Cuyo"
    normativa: str = ""
    duracion_anios: int = 0
    carrera_clave: str = ""  # psicologia | generica
    asignaturas: list[Asignatura] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "nombre": self.nombre,
            "titulo": self.titulo,
            "institucion": self.institucion,
            "normativa": self.normativa,
            "duracion_anios": self.duracion_anios,
            "carrera_clave": self.carrera_clave,
            "metadata": self.metadata,
            "asignaturas": [a.to_dict() for a in self.asignaturas],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "PlanEstudios":
        return cls(
            id=str(data.get("id", "plan")),
            nombre=str(data.get("nombre", "Plan de estudios")),
            titulo=str(data.get("titulo", "")),
            institucion=str(data.get("institucion", "Universidad Católica de Cuyo")),
            normativa=str(data.get("normativa", "")),
            duracion_anios=int(data.get("duracion_anios", 0) or 0),
            carrera_clave=str(data.get("carrera_clave", "")),
            asignaturas=[Asignatura.from_dict(a) for a in data.get("asignaturas", [])],
            metadata=dict(data.get("metadata", {}) or {}),
        )


@dataclass
class PlanConvertido:
    plan: PlanEstudios
    items: list[AsignaturaConvertida]
    totales: TotalesPlan
    opciones: ConvertOptions
