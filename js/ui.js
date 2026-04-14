const DEFAULT_STATUS = 'Listo. Ajusta el ventilador y pulsa "Buscar".';
const SEEKING_LABEL = "Posicionando...";
const SEEKING_STATUS = "Calculando flujo y tensando cabrestantes.";
const BUTTON_LABEL = "Buscar posicion optima";

export function setupUI(simulator) {
  const sideButtons = Array.from(document.querySelectorAll(".sb"));
  const positionSlider = document.getElementById("sPos");
  const powerSlider = document.getElementById("sPow");
  const positionValue = document.getElementById("vPos");
  const powerValue = document.getElementById("vPow");
  const status = document.getElementById("status");
  const actionButton = document.getElementById("btn");
  const rpmValue = document.getElementById("rpm");
  const windValue = document.getElementById("weff");

  sideButtons.forEach((button) => {
    button.addEventListener("click", () => {
      sideButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      simulator.setSide(button.dataset.side);
    });
  });

  positionSlider.addEventListener("input", (event) => {
    const rawValue = Number(event.target.value);
    positionValue.textContent = `${rawValue}%`;
    simulator.setPosition(rawValue / 100);
  });

  powerSlider.addEventListener("input", (event) => {
    const rawValue = Number(event.target.value);
    powerValue.textContent = `${rawValue}%`;
    simulator.setPower(rawValue / 100);
  });

  actionButton.addEventListener("click", () => {
    if (simulator.isSeeking()) {
      return;
    }

    simulator.seekOptimalPosition();
    actionButton.classList.add("seeking");
    actionButton.textContent = SEEKING_LABEL;
    status.textContent = SEEKING_STATUS;
  });

  simulator.onFrame(({ rpm, windEffect }) => {
    rpmValue.textContent = `${Math.round(Math.abs(rpm))}`;
    windValue.textContent = `${Math.round(windEffect * 100)}%`;
  });

  simulator.onSeekComplete(({ windEffect }) => {
    actionButton.classList.remove("seeking");
    actionButton.textContent = BUTTON_LABEL;
    status.textContent = `Posicion alcanzada. Viento efectivo: ${Math.round(windEffect * 100)}%`;
  });

  simulator.onReady(() => {
    positionValue.textContent = `${positionSlider.value}%`;
    powerValue.textContent = `${powerSlider.value}%`;
    status.textContent = DEFAULT_STATUS;
  });
}
