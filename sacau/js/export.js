/**
 * Exportación del plan convertido a Word (.docx) y PDF.
 */
(function (global) {
  "use strict";

  function fmt(n, d = 1) {
    return Number(n || 0).toLocaleString("es-AR", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  }

  function fmt0(n) {
    return fmt(n, 0);
  }

  function buildRows(planConv) {
    return planConv.items.map((item) => {
      const a = item.asignatura;
      return {
        codigo: a.codigo || "",
        nombre: a.nombre || "",
        anio: String(a.anio || ""),
        area: a.area || "",
        teo: fmt0(a.horas_teoricas),
        prac: fmt0(a.horas_practicas),
        inter: fmt0(item.horas_interaccion),
        auto: fmt0(item.horas_autonomas),
        total: fmt0(item.horas_totales),
        cre: fmt(item.cre, 1),
        valorCre: fmt0(item.valor_cre),
      };
    });
  }

  function paragraphsFromText(text, Paragraph, TextRun, size = 18) {
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

  function anexoChildren(anexo911, campos911, Paragraph, TextRun, HeadingLevel) {
    if (!anexo911) return [];
    const fields =
      campos911 ||
      SacauAnexo911?.FIELD_ORDER?.map((id) => ({ id, label: id })) ||
      [];
    const out = [
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Anexo curricular (Res. 911-CS-2026 UCCuyo)")],
        spacing: { before: 300 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Borrador editable generado por el Convertidor SACAU. La unidad académica debe adaptarlo a la especificidad de la carrera.",
            italics: true,
            size: 16,
          }),
        ],
        spacing: { after: 160 },
      }),
    ];
    for (const f of fields) {
      const val = anexo911[f.id];
      if (val == null || String(val).trim() === "") continue;
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun(f.label || f.id)],
        })
      );
      out.push(...paragraphsFromText(val, Paragraph, TextRun));
    }
    return out;
  }

  async function exportDocx(planConv, validation, opts = {}) {
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
      AlignmentType,
      BorderStyle,
    } = global.docx;

    const border = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
    const borders = { top: border, bottom: border, left: border, right: border };
    const cell = (text, opts = {}) =>
      new TableCell({
        borders,
        width: { size: opts.width || 1200, type: WidthType.DXA },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: String(text ?? ""),
                bold: Boolean(opts.bold),
                size: opts.size || 16,
              }),
            ],
          }),
        ],
      });

    const t = planConv.totales;
    const header = new TableRow({
      children: [
        cell("Cód.", { bold: true, width: 600 }),
        cell("Asignatura", { bold: true, width: 3200 }),
        cell("Año", { bold: true, width: 500 }),
        cell("Área", { bold: true, width: 700 }),
        cell("Inter.", { bold: true, width: 700 }),
        cell("Autón.", { bold: true, width: 700 }),
        cell("Total", { bold: true, width: 700 }),
        cell("CRE", { bold: true, width: 600 }),
      ],
    });

    const bodyRows = buildRows(planConv).map(
      (r) =>
        new TableRow({
          children: [
            cell(r.codigo, { width: 600 }),
            cell(r.nombre, { width: 3200 }),
            cell(r.anio, { width: 500 }),
            cell(r.area, { width: 700 }),
            cell(r.inter, { width: 700 }),
            cell(r.auto, { width: 700 }),
            cell(r.total, { width: 700 }),
            cell(r.cre, { width: 600 }),
          ],
        })
    );

    const checks = (validation?.checks || []).map(
      (c) =>
        new Paragraph({
          children: [
            new TextRun({
              text: `${c.nivel === "ok" ? "[OK]" : c.nivel === "warning" ? "[AVISO]" : "[REVISAR]"} ${c.mensaje}`,
              size: 18,
            }),
          ],
          spacing: { after: 80 },
        })
    );

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("Plan de estudios en créditos CRE (SACAU)")],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: planConv.plan.nombre || "Plan de estudios",
                  bold: true,
                }),
              ],
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(
                  `${planConv.plan.institucion || "UCCuyo"} · Valor CRE por defecto: ${planConv.opciones.valor_cre_default} h · Generado por Convertidor SACAU`
                ),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun("Totales")],
            }),
            new Paragraph({
              children: [
                new TextRun(
                  `Interacción: ${fmt0(t.horas_interaccion)} h · Autónomas: ${fmt0(t.horas_autonomas)} h · Totales: ${fmt0(t.horas_totales)} h · CRE: ${fmt(t.cre, 1)} · CRE/año: ${fmt(t.cre_promedio_anual, 1)}`
                ),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun("Asignaturas")],
            }),
            new Table({
              width: { size: 9000, type: WidthType.DXA },
              rows: [header, ...bodyRows],
            }),
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun("Cumplimiento SACAU")],
              spacing: { before: 300 },
            }),
            ...checks,
            ...anexoChildren(opts.anexo911, opts.campos911, Paragraph, TextRun, HeadingLevel),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Nota: las horas autónomas son estimaciones editables; no son objeto de verificación en validez nacional (RESOL-2025-556).",
                  italics: true,
                  size: 16,
                }),
              ],
              spacing: { before: 200 },
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    return blob;
  }

  function exportPdf(planConv, validation, opts = {}) {
    if (!global.jspdf || !global.jspdf.jsPDF) throw new Error("jsPDF no disponible");
    const { jsPDF } = global.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const t = planConv.totales;

    doc.setFontSize(16);
    doc.text("Plan de estudios en créditos CRE (SACAU)", 40, 40);
    doc.setFontSize(10);
    doc.text(planConv.plan.nombre || "Plan de estudios", 40, 58);
    doc.text(
      `${planConv.plan.institucion || "UCCuyo"} · CRE default ${planConv.opciones.valor_cre_default} h`,
      40,
      72
    );
    doc.text(
      `Interacción ${fmt0(t.horas_interaccion)} h | Autónomas ${fmt0(t.horas_autonomas)} h | Totales ${fmt0(t.horas_totales)} h | CRE ${fmt(t.cre, 1)} | CRE/año ${fmt(t.cre_promedio_anual, 1)}`,
      40,
      88
    );

    const rows = buildRows(planConv).map((r) => [
      r.codigo,
      r.nombre,
      r.anio,
      r.area,
      r.inter,
      r.auto,
      r.total,
      r.cre,
    ]);

    if (typeof doc.autoTable === "function") {
      doc.autoTable({
        startY: 100,
        head: [["Cód.", "Asignatura", "Año", "Área", "Inter.", "Autón.", "Total", "CRE"]],
        body: rows,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [122, 21, 50] },
        columnStyles: { 1: { cellWidth: 220 } },
      });
      let y = doc.lastAutoTable.finalY + 18;
      doc.setFontSize(11);
      doc.text("Cumplimiento SACAU", 40, y);
      y += 14;
      doc.setFontSize(8);
      for (const c of validation?.checks || []) {
        const mark = c.nivel === "ok" ? "[OK]" : c.nivel === "warning" ? "[AVISO]" : "[REVISAR]";
        const lines = doc.splitTextToSize(`${mark} ${c.mensaje}`, 760);
        doc.text(lines, 40, y);
        y += lines.length * 10 + 2;
        if (y > 560) {
          doc.addPage();
          y = 40;
        }
      }

      const anexo = opts.anexo911;
      const campos = opts.campos911 || [];
      if (anexo && campos.length) {
        doc.addPage();
        y = 40;
        doc.setFontSize(14);
        doc.text("Anexo curricular (Res. 911-CS-2026 UCCuyo)", 40, y);
        y += 18;
        doc.setFontSize(8);
        doc.text(
          "Borrador editable. Adaptar a la especificidad de la carrera y universidad.",
          40,
          y
        );
        y += 16;
        for (const f of campos) {
          const val = anexo[f.id];
          if (val == null || String(val).trim() === "") continue;
          if (y > 520) {
            doc.addPage();
            y = 40;
          }
          doc.setFont(undefined, "bold");
          doc.setFontSize(10);
          doc.text(f.label || f.id, 40, y);
          y += 12;
          doc.setFont(undefined, "normal");
          doc.setFontSize(8);
          const lines = doc.splitTextToSize(String(val), 760);
          for (const line of lines) {
            if (y > 560) {
              doc.addPage();
              y = 40;
            }
            doc.text(line, 40, y);
            y += 10;
          }
          y += 8;
        }
      }
    } else {
      doc.text("Instalá jspdf-autotable para la tabla completa.", 40, 110);
    }

    return doc.output("blob");
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  global.SacauExport = {
    exportDocx,
    exportPdf,
    downloadBlob,
  };
})(window);
