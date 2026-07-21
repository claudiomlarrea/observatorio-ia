(function () {
  var cfg = window.JORNADAS_IA_2026;
  if (!cfg) return;

  var formWrap = document.getElementById("jornadas-form-wrap");
  var formFrame = document.getElementById("jornadas-form-frame");
  var formAlt = document.getElementById("jornadas-form-alt");
  var formLink = document.getElementById("jornadas-form-link");
  var uaSelect = document.getElementById("jornadas-ua");
  var openBtn = document.getElementById("jornadas-open-drive");
  var hint = document.getElementById("jornadas-ua-hint");

  function driveUrlFor(unidad) {
    if (unidad && unidad.folderId) {
      return "https://drive.google.com/drive/folders/" + unidad.folderId;
    }
    return cfg.DRIVE_FOLDER_URL;
  }

  function selectedUnidad() {
    if (!uaSelect || !cfg.UNIDADES) return null;
    var i = uaSelect.selectedIndex - 1;
    if (i < 0) return null;
    return cfg.UNIDADES[i] || null;
  }

  function updateHint() {
    if (!hint) return;
    var u = selectedUnidad();
    if (!u) {
      hint.hidden = true;
      hint.textContent = "";
      if (openBtn) openBtn.disabled = true;
      return;
    }
    openBtn.disabled = false;
    if (u.folderId) {
      hint.textContent =
        "Se abrirá la carpeta de tu unidad académica. Subí el archivo Word (.docx) con: Nuevo → Subir archivo.";
    } else {
      hint.textContent =
        'Se abrirá la carpeta “Jornadas de IA 2026”. Entrá a la subcarpeta «' +
        u.label +
        "» y subí el Word (.docx): Nuevo → Subir archivo.";
    }
    hint.hidden = false;
  }

  if (cfg.INSCRIPCION_FORM_URL && formWrap && formFrame) {
    formFrame.src = cfg.INSCRIPCION_FORM_URL;
    formWrap.hidden = false;
    if (formAlt) formAlt.hidden = true;
    if (formLink) {
      formLink.href = cfg.INSCRIPCION_FORM_URL;
      formLink.hidden = false;
    }
  } else if (formAlt) {
    formAlt.hidden = false;
    if (formWrap) formWrap.hidden = true;
  }

  if (uaSelect && cfg.UNIDADES) {
    cfg.UNIDADES.forEach(function (u) {
      var opt = document.createElement("option");
      opt.value = u.label;
      opt.textContent = u.label;
      uaSelect.appendChild(opt);
    });
    uaSelect.addEventListener("change", updateHint);
  }

  if (openBtn) {
    openBtn.addEventListener("click", function () {
      var u = selectedUnidad();
      if (!u) return;
      var url = driveUrlFor(u);
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  updateHint();
})();
