/**
 * SACAU Aula — exportación Word, PDF y JSON del programa de cátedra.
 */
(function (global) {
  "use strict";

  const E = global.SacauAulaEngine;
  const C = global.SacauAulaCatalog;

  function fmt0(n) {
    return Number(n || 0).toLocaleString("es-AR", {
      maximumFractionDigits: 0,
    });
  }

  function fmt1(n) {
    return Number(n || 0).toLocaleString("es-AR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  function paragraphsFromText(text, Paragraph, TextRun, size = 20) {
    const chunks = String(text || "")
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!chunks.length) {
      return [
        new Paragraph({
          children: [new TextRun({ text: "—", italics: true, size })],
          spacing: { after: 80 },
        }),
      ];
    }
    return chunks.map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line, size })],
          spacing: { after: 80 },
        })
    );
  }

  async function exportDocx(ficha, diag) {
    if (!global.docx) throw new Error("Librería docx no disponible");
    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      Table,
      TableRow,
      TableCell,
      WidthType,
      HeadingLevel,
      BorderStyle,
    } = global.docx;

    const a = ficha.asignatura || {};
    const b = (diag && diag.budget) || E.budget(ficha);
    const tip = (C && C.TIPOLOGIA_LABEL[a.tipologia]) || a.tipologia || "";
    const border = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
    const borders = { top: border, bottom: border, left: border, right: border };
    const cell = (text, opts = {}) =>
      new TableCell({
        borders,
        width: { size: opts.w || 1200, type: WidthType.DXA },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: String(text ?? ""),
                bold: Boolean(opts.bold),
                size: opts.size || 18,
              }),
            ],
          }),
        ],
      });

    const metricRows = [
      ["Asignatura", a.nombre || "—"],
      ["Código", a.codigo || "—"],
      ["Carrera", ficha.carrera || "—"],
      ["Institución", ficha.institucion || "—"],
      ["Unidad académica", ficha.unidad_academica || "—"],
      ["Docente / cátedra", ficha.docente || "—"],
      ["Ciclo", ficha.ciclo || "—"],
      ["Año del plan", String(a.anio || "—")],
      ["Régimen", a.regimen === "A" ? "Anual" : "Semestral"],
      ["Tipología", tip],
      ["Semanas de cursado", String(b.semanas)],
      ["Interacción pedagógica", `${fmt0(b.ip)} h`],
      ["Trabajo autónomo", `${fmt0(b.ta)} h`],
      ["Tiempo total del estudiante", `${fmt0(b.total)} h`],
      ["Valor CRE", `${fmt0(b.valor)} h`],
      ["CRE de la cátedra", fmt0(b.cre)],
      ["Esfuerzo semanal", `${fmt1(b.hSemana)} h (${fmt1(b.hSemanaIp)} clase + ${fmt1(b.hSemanaTa)} autónomas)`],
      [
        "Peso en el tramo",
        `${fmt1(b.pctCarga)} % de un ${b.regimen === "A" ? "año de 60 CRE" : "cuatrimestre de 30 CRE"}`,
      ],
    ];

    const metricTable = new Table({
      width: { size: 9360, type: WidthType.DXA },
      rows: metricRows.map(
        ([k, v]) =>
          new TableRow({
            children: [cell(k, { bold: true, w: 3600 }), cell(v, { w: 5760 })],
          })
      ),
    });

    const actHeader = new TableRow({
      children: ["Tipo", "Actividad", "Horas", "IA", "RA"].map((h) => cell(h, { bold: true })),
    });
    const actRows = (ficha.actividades || []).map((act) => {
      const ra = (ficha.ra || []).find((r) => r.id === act.ra_id);
      return new TableRow({
        children: [
          cell(act.tipo === "ip" ? "IP" : "TA"),
          cell(act.nombre || ""),
          cell(fmt0(act.horas)),
          cell(E.iaLabel(act.ia)),
          cell(ra ? ra.texto.slice(0, 80) : "—"),
        ],
      });
    });

    const children = [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Programa analítico · SACAU Aula")],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Del crédito al programa de cátedra. Observatorio de Inteligencia Artificial · Universidad Católica de Cuyo.",
            italics: true,
            size: 20,
          }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("1. Identificación y presupuesto CRE")],
      }),
      metricTable,
      new Paragraph({
        spacing: { before: 240 },
        children: [
          new TextRun({
            text: "El CRE (Res. 556/2025 y Res. 788-CS-2026 UCCuyo) mide el tiempo total de trabajo del estudiante: interacción pedagógica + trabajo autónomo. Este programa desglosa ese tiempo para que el crédito sea habitable, no solo convertible.",
            size: 20,
          }),
        ],
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("2. Resultados de aprendizaje")],
      }),
    ];

    (ficha.ra || []).forEach((r, i) => {
      if (!String(r.texto || "").trim()) return;
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun(`RA${i + 1}`)],
        })
      );
      children.push(...paragraphsFromText(r.texto, Paragraph, TextRun));
      if (r.evidencia) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Evidencia: ", bold: true, size: 20 }),
              new TextRun({ text: r.evidencia, size: 20 }),
            ],
          })
        );
      }
      if (r.criterio) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Criterio: ", bold: true, size: 20 }),
              new TextRun({ text: r.criterio, size: 20 }),
            ],
            spacing: { after: 120 },
          })
        );
      }
    });

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("3. Actividades (interacción y autónomo)")],
      })
    );
    children.push(
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        rows: [actHeader, ...actRows],
      })
    );

    (ficha.actividades || []).forEach((act) => {
      if (!String(act.descripcion || "").trim() && !String(act.rediseño || "").trim()) return;
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun(act.nombre || "Actividad")],
        })
      );
      if (act.descripcion) children.push(...paragraphsFromText(act.descripcion, Paragraph, TextRun));
      if (act.ia === "rojo" && act.rediseño) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Rediseño sugerido: ", bold: true, italics: true, size: 20 }),
              new TextRun({ text: act.rediseño, italics: true, size: 20 }),
            ],
          })
        );
      }
    });

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("4. Cláusula de uso de inteligencia artificial")],
      })
    );
    children.push(...paragraphsFromText(ficha.contrato_ia || "—", Paragraph, TextRun));

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("5. Diagnóstico de coherencia")],
      })
    );
    ((diag && diag.checks) || []).forEach((c) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[${c.nivel === "ok" ? "OK" : c.nivel === "error" ? "ALERTA" : "REVISAR"}] `,
              bold: true,
              size: 20,
            }),
            new TextRun({ text: c.mensaje, size: 20 }),
          ],
          spacing: { after: 60 },
        })
      );
    });

    if (ficha.notas) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("6. Notas de la cátedra")],
        })
      );
      children.push(...paragraphsFromText(ficha.notas, Paragraph, TextRun));
    }

    children.push(
      new Paragraph({
        spacing: { before: 280 },
        children: [
          new TextRun({
            text: "Documento de trabajo generado por SACAU Aula (Observatorio de IA, UCCuyo). No reemplaza la aprobación de los órganos académicos ni la presentación ante instancias nacionales. Marco: RESOL-2025-556, Res. 788-CS-2026 y Res. 911-CS-2026.",
            italics: true,
            size: 16,
          }),
        ],
      })
    );

    const doc = new Document({
      sections: [{ children }],
    });
    return Packer.toBlob(doc);
  }

  function exportPdf(ficha, diag) {
    if (!global.jspdf || !global.jspdf.jsPDF) {
      throw new Error("Librería jsPDF no disponible");
    }
    const { jsPDF } = global.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const a = ficha.asignatura || {};
    const b = (diag && diag.budget) || E.budget(ficha);
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 48;
    let y = 56;

    function ensure(space) {
      if (y + space > 780) {
        doc.addPage();
        y = 48;
      }
    }

    function h1(text) {
      ensure(28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(74, 12, 31);
      doc.text(text, margin, y);
      y += 22;
    }
    function h2(text) {
      ensure(24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(74, 12, 31);
      doc.text(text, margin, y);
      y += 16;
    }
    function body(text) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(31, 20, 24);
      const lines = doc.splitTextToSize(String(text || "—"), pageW - margin * 2);
      for (const line of lines) {
        ensure(14);
        doc.text(line, margin, y);
        y += 13;
      }
      y += 4;
    }

    h1("Programa analítico · SACAU Aula");
    body("Observatorio de Inteligencia Artificial · Universidad Católica de Cuyo");
    h2("1. Identificación y presupuesto CRE");
    body(
      [
        `${a.nombre || "Asignatura"} (${a.codigo || "s/c"})`,
        `Carrera: ${ficha.carrera || "—"} · ${ficha.institucion || ""}`,
        `Unidad: ${ficha.unidad_academica || "—"} · Docente: ${ficha.docente || "—"}`,
        `Régimen: ${a.regimen === "A" ? "Anual" : "Semestral"} · ${b.semanas} semanas · Tipología: ${a.tipologia || "—"}`,
        `IP ${fmt0(b.ip)} h · Autónomo ${fmt0(b.ta)} h · Total ${fmt0(b.total)} h · ${fmt0(b.cre)} CRE (${fmt0(b.valor)} h/CRE)`,
        `Esfuerzo: ${fmt1(b.hSemana)} h/semana · ${fmt1(b.pctCarga)} % de un ${b.regimen === "A" ? "año de 60 CRE" : "cuatrimestre de 30 CRE"}`,
      ].join("\n")
    );

    h2("2. Resultados de aprendizaje");
    (ficha.ra || []).forEach((r, i) => {
      if (!String(r.texto || "").trim()) return;
      body(`RA${i + 1}. ${r.texto}${r.evidencia ? `\nEvidencia: ${r.evidencia}` : ""}${r.criterio ? `\nCriterio: ${r.criterio}` : ""}`);
    });

    h2("3. Actividades");
    if (doc.autoTable) {
      const rows = (ficha.actividades || []).map((act) => [
        act.tipo === "ip" ? "IP" : "TA",
        act.nombre || "",
        fmt0(act.horas),
        E.iaLabel(act.ia),
      ]);
      doc.autoTable({
        startY: y,
        head: [["Tipo", "Actividad", "Horas", "IA"]],
        body: rows,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [122, 21, 50] },
        margin: { left: margin, right: margin },
      });
      y = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : y) + 16;
    } else {
      (ficha.actividades || []).forEach((act) => {
        body(`${act.tipo === "ip" ? "IP" : "TA"} · ${act.nombre} · ${fmt0(act.horas)} h · ${E.iaLabel(act.ia)}`);
      });
    }

    h2("4. Cláusula de uso de IA");
    body(ficha.contrato_ia || "—");

    h2("5. Diagnóstico");
    ((diag && diag.checks) || []).forEach((c) => {
      body(`[${c.nivel === "ok" ? "OK" : c.nivel === "error" ? "ALERTA" : "REVISAR"}] ${c.mensaje}`);
    });

    ensure(40);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(92, 79, 84);
    const foot = doc.splitTextToSize(
      "Documento de trabajo · SACAU Aula · Observatorio IA UCCuyo. No reemplaza aprobación institucional. RESOL-2025-556 · Res. 788 y 911-CS-2026.",
      pageW - margin * 2
    );
    doc.text(foot, margin, y);

    return doc.output("blob");
  }

  function exportJson(ficha) {
    const payload = Object.assign({}, ficha, { exported: new Date().toISOString() });
    return new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  global.SacauAulaExport = {
    exportDocx,
    exportPdf,
    exportJson,
    downloadBlob,
  };
})(typeof window !== "undefined" ? window : globalThis);
