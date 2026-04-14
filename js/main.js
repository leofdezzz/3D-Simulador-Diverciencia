import { FloatingFarmSimulator } from "./simulator.js";
import { setupUI } from "./ui.js";

const loading = document.getElementById("loading");
const ui = document.getElementById("ui");

if (!window.THREE) {
  loading.firstElementChild.textContent = "Error al cargar Three.js. Verifica tu conexion.";
} else {
  const simulator = new FloatingFarmSimulator({ container: document.body });
  setupUI(simulator);
  loading.style.display = "none";
  ui.hidden = false;
  simulator.start();
}
