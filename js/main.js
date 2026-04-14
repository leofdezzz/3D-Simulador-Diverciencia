(function bootstrap() {
  const loading = document.getElementById("loading");
  const ui = document.getElementById("ui");

  if (!window.THREE) {
    loading.firstElementChild.textContent = "Error al cargar Three.js. Verifica tu conexion.";
    return;
  }

  const simulator = new window.FloatingFarmSimulator({ container: document.body });
  window.setupUI(simulator);
  loading.style.display = "none";
  ui.hidden = false;
  simulator.start();
})();
