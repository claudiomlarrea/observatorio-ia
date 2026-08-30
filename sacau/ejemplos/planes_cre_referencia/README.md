# Planes de referencia ya en créditos (SACAU / CRE)

Planes institucionales UCCuyo **ya creditizados**, útiles para calibrar la importación
horas → CRE y para probar el modo “plan ya en CRE”.

| Archivo | Utilidad |
| --- | --- |
| [Plan_Maestria_Diabetes.pdf](Plan_Maestria_Diabetes.pdf) | **Alta.** Cuadro SACAU: supervisadas · autónomo · total · CRE (decimales, 1 CRE = 25 h). |
| [Plan_Odontologia.pdf](Plan_Odontologia.pdf) | **Alta.** Cuadro CRE por año: IP · TA · CH total · CRE (60 CRE/año). |
| [Tecnicatura_Logistica_Integral_plan.pdf](Tecnicatura_Logistica_Integral_plan.pdf) | **Media.** Plan con CRE; tablas densas / poco extractables por texto (mejor CSV/Word). |

Los **informes técnicos CAP** (checklist de evaluación del plan) no aportan grilla CRE;
no se versionan aquí.

## Fixtures listos para cargar en SACAU CRE

| Fixture | Uso |
| --- | --- |
| [fixtures/maestria_diabetes_cre.csv](fixtures/maestria_diabetes_cre.csv) | CSV completo (12 módulos) |
| [fixtures/maestria_diabetes_cre.json](fixtures/maestria_diabetes_cre.json) | Mismo plan en JSON |
| [fixtures/odontologia_anio1_cre.csv](fixtures/odontologia_anio1_cre.csv) | Muestra 1.er año Odontología |

Columnas clave: `horas_teoricas` = interacción; `horas_autonomas_override` = trabajo autónomo
del cuadro. El motor recalcula CRE (política UCCuyo: **enteros**); el origen suele traer
decimales (p. ej. 9,60).

Plantilla genérica: [../plantilla_plan_cre.csv](../plantilla_plan_cre.csv)

App: https://observatorio-ia.uccuyo.edu.ar/sacau/
