/**
 * AviPeso — seguimiento de peso diario en aves de corral (0–30 días)
 * Observatorio de Inteligencia Artificial · UCCuyo
 */
(function () {
  "use strict";

  const STORAGE_KEY = "avipeso-oia-v1";
  const MAX_DAY = 30;

  const RAZAS = {
    "pollo-parrillero": [
      "Cobb 500",
      "Ross 308",
      "Hubbard",
      "Arbor Acres",
      "Línea experimental",
      "Criollo / mestizo",
    ],
    "gallina-postura": [
      "Hy-Line Brown",
      "Lohmann Brown",
      "Isa Brown",
      "Leghorn",
      "Criolla",
      "Línea experimental",
    ],
    pato: ["Pekín", "Muscovy", "Criollo", "Línea experimental"],
    pavo: ["Broad Breasted White", "Bronceado", "Criollo", "Línea experimental"],
    codorniz: ["Japonesa", "Coturnix", "Línea experimental"],
    otra: ["No especificada", "Línea experimental"],
  };

  const CONDICION_LABEL = {
    normal: "Normal",
    baja: "Baja / retraso",
    alta: "Alta / sobresaliente",
    enfermo: "Sospecha sanitaria",
  };

  const OBS_LABEL = {
    "sin-obs": "Sin observaciones",
    "cambio-alimento": "Cambio de alimento",
    vacunacion: "Vacunación",
    "estres-termico": "Estrés térmico",
    manejo: "Manejo / traslado",
    otra: "Otra",
  };

  /** Curva típica broiler (g) aproximada 0–30 d — ejemplo didáctico */
  const DEMO_BROILER = [
    42, 52, 65, 82, 103, 128, 158, 193, 234, 281, 335, 396, 464, 540, 624, 716,
    817, 927, 1046, 1174, 1312, 1460, 1618, 1786, 1964, 2152, 2350, 2558, 2776,
    3004, 3242,
  ];

  const $ = (id) => document.getElementById(id);

  let state = loadState();
  let chart = null;

  function defaultState() {
    return { animal: null, pesos: {} };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return {
        animal: parsed.animal || null,
        pesos: parsed.pesos && typeof parsed.pesos === "object" ? parsed.pesos : {},
      };
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("is-visible"), 2400);
  }

  function fillDias() {
    const sel = $("dia-vida");
    sel.innerHTML = '<option value="">Seleccionar…</option>';
    for (let d = 0; d <= MAX_DAY; d++) {
      const opt = document.createElement("option");
      opt.value = String(d);
      opt.textContent = d === 0 ? "Día 0 (nacimiento)" : `Día ${d}`;
      sel.appendChild(opt);
    }
  }

  function fillRazas(especie) {
    const sel = $("raza");
    const list = RAZAS[especie] || [];
    sel.innerHTML = list.length
      ? '<option value="">Seleccionar…</option>'
      : '<option value="">Seleccionar especie primero…</option>';
    list.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    });
  }

  function sortedDays() {
    return Object.keys(state.pesos)
      .map(Number)
      .sort((a, b) => a - b);
  }

  function computeGains() {
    const days = sortedDays();
    const gains = {};
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      if (i === 0) {
        gains[d] = null;
        continue;
      }
      const prev = days[i - 1];
      const deltaDays = d - prev;
      const deltaW = state.pesos[d].peso - state.pesos[prev].peso;
      gains[d] = deltaDays > 0 ? deltaW / deltaDays : deltaW;
    }
    return gains;
  }

  function updateStats() {
    const days = sortedDays();
    const pesoEl = $("stat-peso");
    const ganEl = $("stat-ganancia");
    const adgEl = $("stat-adg");
    const diasEl = $("stat-dias");

    diasEl.textContent = String(days.length);

    if (!days.length) {
      pesoEl.textContent = "—";
      ganEl.textContent = "—";
      adgEl.textContent = "—";
      return;
    }

    const last = days[days.length - 1];
    const first = days[0];
    const wLast = state.pesos[last].peso;
    const wFirst = state.pesos[first].peso;
    const totalGain = wLast - wFirst;
    const span = Math.max(last - first, 1);
    const adg = totalGain / span;

    pesoEl.textContent = `${formatNum(wLast)} g`;
    ganEl.textContent = `${totalGain >= 0 ? "+" : ""}${formatNum(totalGain)} g`;
    adgEl.textContent = `${formatNum(adg)} g/d`;
  }

  function formatNum(n) {
    return Number(n).toLocaleString("es-AR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    });
  }

  function renderAnimalChip() {
    const box = $("animal-activo");
    if (!state.animal) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    const a = state.animal;
    box.hidden = false;
    box.innerHTML = `<div class="animal-chip"><span></span> Activo: ${escapeHtml(
      a.idAnimal
    )} · ${escapeHtml(a.especieLabel)} · ${escapeHtml(a.raza)} · ${escapeHtml(
      a.sexoLabel
    )}</div>`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderTable() {
    const tbody = $("tabla-pesos");
    const empty = $("tabla-vacia");
    const days = sortedDays();
    const gains = computeGains();
    tbody.innerHTML = "";

    if (!days.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    days.forEach((d) => {
      const row = state.pesos[d];
      const g = gains[d];
      let gainClass = "gain-zero";
      let gainText = "—";
      if (g !== null && g !== undefined) {
        gainClass = g > 0 ? "gain-pos" : g < 0 ? "gain-neg" : "gain-zero";
        gainText = `${g >= 0 ? "+" : ""}${formatNum(g)}`;
      }
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d}</td>
        <td>${formatNum(row.peso)}</td>
        <td class="${gainClass}">${gainText}</td>
        <td>${escapeHtml(CONDICION_LABEL[row.condicion] || row.condicion)}</td>
        <td>${escapeHtml(OBS_LABEL[row.observacion] || row.observacion)}</td>
        <td><button type="button" class="btn btn-ghost" data-del="${d}" style="min-height:2rem;padding:0.25rem 0.6rem;font-size:0.75rem">Quitar</button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function updateChart() {
    const canvas = $("chart-peso");
    if (!canvas || typeof Chart === "undefined") return;

    const days = sortedDays();
    const gains = computeGains();
    const labels = days.map((d) => `D${d}`);
    const pesos = days.map((d) => state.pesos[d].peso);
    const ganancias = days.map((d) => (gains[d] == null ? null : Number(gains[d].toFixed(1))));

    const data = {
      labels,
      datasets: [
        {
          label: "Peso (g)",
          data: pesos,
          borderColor: "#064a31",
          backgroundColor: "rgba(6, 74, 49, 0.12)",
          tension: 0.25,
          yAxisID: "y",
          pointRadius: 4,
          pointBackgroundColor: "#064a31",
        },
        {
          label: "Ganancia diaria (g/día)",
          data: ganancias,
          borderColor: "#e38a00",
          backgroundColor: "rgba(227, 138, 0, 0.12)",
          tension: 0.25,
          yAxisID: "y1",
          pointRadius: 4,
          pointBackgroundColor: "#e38a00",
          spanGaps: true,
        },
      ],
    };

    if (chart) {
      chart.data = data;
      chart.update();
      return;
    }

    chart = new Chart(canvas, {
      type: "line",
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "bottom" },
          title: { display: false },
        },
        scales: {
          x: {
            title: { display: true, text: "Día de vida", color: "#4a5560" },
            grid: { color: "rgba(6, 74, 49, 0.08)" },
          },
          y: {
            type: "linear",
            position: "left",
            title: { display: true, text: "Peso (g)", color: "#064a31" },
            grid: { color: "rgba(6, 74, 49, 0.08)" },
          },
          y1: {
            type: "linear",
            position: "right",
            title: { display: true, text: "Ganancia (g/día)", color: "#e38a00" },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
  }

  function refresh() {
    renderAnimalChip();
    updateStats();
    renderTable();
    updateChart();
  }

  function especieLabel(value) {
    const opt = $("especie").querySelector(`option[value="${value}"]`);
    return opt ? opt.textContent : value;
  }

  function sexoLabel(value) {
    const opt = $("sexo").querySelector(`option[value="${value}"]`);
    return opt ? opt.textContent : value;
  }

  function hydrateAnimalForm() {
    const a = state.animal;
    if (!a) return;
    $("especie").value = a.especie;
    fillRazas(a.especie);
    $("raza").value = a.raza;
    $("sexo").value = a.sexo;
    $("sistema").value = a.sistema;
    $("id-animal").value = a.idAnimal;
    $("fecha-nacimiento").value = a.fechaNacimiento;
    $("peso-nacimiento").value = a.pesoNacimiento;
    $("ubicacion").value = a.ubicacion;
  }

  $("especie").addEventListener("change", (e) => {
    fillRazas(e.target.value);
  });

  $("form-animal").addEventListener("submit", (e) => {
    e.preventDefault();
    const especie = $("especie").value;
    const pesoNac = Number($("peso-nacimiento").value);
    state.animal = {
      especie,
      especieLabel: especieLabel(especie),
      raza: $("raza").value,
      sexo: $("sexo").value,
      sexoLabel: sexoLabel($("sexo").value),
      sistema: $("sistema").value,
      idAnimal: $("id-animal").value.trim(),
      fechaNacimiento: $("fecha-nacimiento").value,
      pesoNacimiento: pesoNac,
      ubicacion: $("ubicacion").value,
    };
    // Día 0 con peso al nacer
    state.pesos["0"] = {
      peso: pesoNac,
      condicion: "normal",
      observacion: "sin-obs",
    };
    saveState();
    refresh();
    toast("Animal guardado. Día 0 registrado.");
  });

  $("form-peso").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.animal) {
      toast("Primero guardá la identificación del animal.");
      return;
    }
    const dia = $("dia-vida").value;
    const peso = Number($("peso-g").value);
    if (dia === "" || !Number.isFinite(peso)) return;

    state.pesos[dia] = {
      peso,
      condicion: $("condicion").value,
      observacion: $("observacion").value,
    };
    saveState();
    $("form-peso").reset();
    $("condicion").value = "normal";
    $("observacion").value = "sin-obs";
    refresh();
    toast(`Peso del día ${dia} registrado.`);
  });

  $("tabla-pesos").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-del]");
    if (!btn) return;
    const d = btn.getAttribute("data-del");
    delete state.pesos[d];
    saveState();
    refresh();
    toast(`Registro del día ${d} eliminado.`);
  });

  $("btn-demo").addEventListener("click", () => {
    const today = new Date();
    const hatch = new Date(today);
    hatch.setDate(hatch.getDate() - 21);
    const iso = hatch.toISOString().slice(0, 10);

    $("especie").value = "pollo-parrillero";
    fillRazas("pollo-parrillero");
    $("raza").value = "Cobb 500";
    $("sexo").value = "mixto";
    $("sistema").value = "experimental";
    $("id-animal").value = "DEMO-Broiler-01";
    $("fecha-nacimiento").value = iso;
    $("peso-nacimiento").value = "42";
    $("ubicacion").value = "modulo-experimental";

    state.animal = {
      especie: "pollo-parrillero",
      especieLabel: "Pollo parrillero (broiler)",
      raza: "Cobb 500",
      sexo: "mixto",
      sexoLabel: "Mixto (lote)",
      sistema: "experimental",
      idAnimal: "DEMO-Broiler-01",
      fechaNacimiento: iso,
      pesoNacimiento: 42,
      ubicacion: "modulo-experimental",
    };

    state.pesos = {};
    // Registrar cada 3 días + día 30 para no saturar
    [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30].forEach((d) => {
      state.pesos[String(d)] = {
        peso: DEMO_BROILER[d],
        condicion: "normal",
        observacion: d === 14 ? "vacunacion" : "sin-obs",
      };
    });

    saveState();
    refresh();
    toast("Ejemplo broiler cargado (0–30 días).");
  });

  $("btn-reset").addEventListener("click", () => {
    if (!confirm("¿Borrar animal y todos los registros de este navegador?")) return;
    state = defaultState();
    saveState();
    $("form-animal").reset();
    $("form-peso").reset();
    fillRazas("");
    refresh();
    toast("Datos limpiados.");
  });

  $("btn-export").addEventListener("click", () => {
    const days = sortedDays();
    if (!days.length) {
      toast("No hay datos para exportar.");
      return;
    }
    const gains = computeGains();
    const a = state.animal || {};
    const lines = [
      "dia,peso_g,ganancia_g_dia,condicion,observacion,id,especie,raza,sexo",
    ];
    days.forEach((d) => {
      const row = state.pesos[d];
      const g = gains[d];
      lines.push(
        [
          d,
          row.peso,
          g == null ? "" : g.toFixed(2),
          row.condicion,
          row.observacion,
          csv(a.idAnimal),
          csv(a.especie),
          csv(a.raza),
          csv(a.sexo),
        ].join(",")
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `avipeso-${(a.idAnimal || "lote").replace(/\s+/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast("CSV exportado.");
  });

  function csv(v) {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  // Init
  fillDias();
  hydrateAnimalForm();
  refresh();
})();
