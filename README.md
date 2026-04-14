# Floating Farm - Simulador 3D

Simulador 3D interactivo de una plataforma flotante con turbina Savonius dentro de un tanque, construido con `Three.js` y servido como sitio estatico. La aplicacion permite mover un ventilador sobre railes, variar su potencia y lanzar una busqueda automatica de la posicion que maximiza el viento efectivo sobre la turbina.

## Objetivo del proyecto

Este proyecto representa visualmente un montaje experimental de "floating farm" con:

- Un tanque estructurado con marco metalico.
- Agua interior animada.
- Un ventilador desplazable por los cuatro lados del tanque.
- Una turbina flotante unida por cables y cabrestantes.
- Particulas que representan el flujo del aire.
- Un panel de control para ajustar la simulacion en tiempo real.

## Estructura actual

Despues de la refactorizacion, el codigo ya no vive en un unico HTML. Ahora esta separado por responsabilidades:

```text
.
|-- index.html
|-- README.md
|-- css/
|   `-- styles.css
`-- js/
    |-- main.js
    |-- simulator.js
    `-- ui.js
```

## Responsabilidad de cada archivo

### `index.html`

Es el punto de entrada de la aplicacion.

- Declara la estructura base del panel de control.
- Carga los estilos desde `css/styles.css`.
- Carga `Three.js` y `OrbitControls` desde CDN.
- Arranca la aplicacion importando `js/main.js`.

### `css/styles.css`

Contiene todos los estilos visuales de la pagina.

- Layout del panel lateral.
- Botones y sliders de control.
- Pantalla de carga.
- Hint inferior con ayuda de navegacion.
- Estilo general del canvas y del fondo.

### `js/main.js`

Se encarga del arranque.

- Verifica si `Three.js` se ha cargado correctamente.
- Crea la instancia principal del simulador.
- Conecta la interfaz con la logica usando `setupUI`.
- Oculta la pantalla de carga cuando todo esta listo.

### `js/ui.js`

Gestiona exclusivamente la interfaz de usuario.

- Escucha clicks de los botones de lado.
- Escucha cambios en los sliders.
- Actualiza texto de porcentaje, RPM y viento efectivo.
- Cambia el estado del boton cuando la turbina entra en modo de busqueda.
- Reacciona a eventos emitidos por el simulador sin mezclar DOM con logica 3D.

### `js/simulator.js`

Contiene la logica de simulacion y render.

- Crea la escena, camara, renderer y controles orbitales.
- Construye el tanque, el agua, los railes, los cabrestantes y la turbina.
- Calcula el efecto del viento segun posicion, alineacion y distancia.
- Actualiza la animacion de aspas, rotor, cables, particulas y oleaje.
- Expone una API pequena para que la UI pueda interactuar sin tocar detalles internos.

## Flujo general de funcionamiento

1. `index.html` carga el documento, los estilos y las dependencias externas.
2. `main.js` comprueba que `window.THREE` exista.
3. Se crea `new FloatingFarmSimulator(...)`.
4. `ui.js` registra los eventos del panel.
5. `simulator.js` construye la escena 3D y comienza el loop de animacion.
6. En cada frame se actualizan:
   - las olas del agua,
   - la iluminacion submarina,
   - la rotacion del ventilador,
   - la posicion de la turbina,
   - la velocidad del rotor,
   - las particulas del viento,
   - los cables y los tambores.
7. El simulador emite eventos para que la UI refleje RPM, viento efectivo y fin de busqueda.

## API publica del simulador

La clase `FloatingFarmSimulator` expone estas operaciones para la interfaz:

- `start()`: construye la escena y lanza la animacion.
- `setSide(side)`: cambia el lado del ventilador.
- `setPosition(position)`: mueve el ventilador sobre el rail.
- `setPower(power)`: ajusta la potencia del ventilador.
- `seekOptimalPosition()`: desplaza la turbina hacia la posicion objetivo.
- `isSeeking()`: indica si la busqueda automatica sigue en curso.
- `onReady(callback)`: evento cuando el simulador ya esta inicializado.
- `onFrame(callback)`: evento en cada frame con RPM y viento efectivo.
- `onSeekComplete(callback)`: evento al terminar la busqueda automatica.

## Como se calcula el viento efectivo

El metodo `getWindEffect()` combina tres factores:

- `power`: potencia configurada por el usuario.
- `distance`: atenuacion exponencial en funcion de la distancia entre ventilador y turbina.
- `alignment`: cuanto coincide la direccion del flujo con la posicion relativa de la turbina.
- `lateralDistance`: penalizacion adicional cuando la turbina queda fuera del eje del chorro de aire.

Formula conceptual:

```text
viento_efectivo =
  potencia *
  atenuacion_por_distancia *
  atenuacion_lateral *
  alineacion
```

Ese valor alimenta directamente la velocidad angular del rotor y la lectura de "Viento efectivo" de la interfaz.

## Busqueda de posicion optima

Cuando el usuario pulsa `Buscar posicion optima`:

1. La UI llama a `seekOptimalPosition()`.
2. El simulador calcula una posicion ideal alineada con el ventilador.
3. La turbina se desplaza suavemente hacia esa posicion en el loop de animacion.
4. Al acabar el temporizador de busqueda, el simulador emite `seekComplete`.
5. La UI actualiza el texto del boton y muestra el viento efectivo alcanzado.

## Controles de usuario

- Botones `N`, `S`, `E`, `O`: cambian el lado donde actua el ventilador.
- Slider `Posicion en barra`: mueve el ventilador a lo largo del rail.
- Slider `Potencia ventilador`: cambia la intensidad del chorro.
- Boton `Buscar posicion optima`: inicia el reposicionamiento automatico.
- Mouse:
  - arrastrar izquierdo para orbitar,
  - rueda para zoom,
  - click derecho para pan.

## Como ejecutar el proyecto

Como usa modulos ES (`type="module"`), conviene abrirlo desde un servidor local en lugar de abrir el archivo HTML directamente.

### Opcion 1: Visual Studio Code + Live Server

1. Abre la carpeta del proyecto en VS Code.
2. Instala la extension `Live Server` si no la tienes.
3. Haz click derecho sobre `index.html`.
4. Selecciona `Open with Live Server`.

### Opcion 2: Python

Si tienes Python instalado:

```bash
python -m http.server 8000
```

Despues abre:

```text
http://localhost:8000
```

### Opcion 3: Node.js

Si tienes `npx` disponible:

```bash
npx serve .
```

## Dependencias

No hay dependencias instaladas con `npm`. El proyecto usa:

- `three.js r128` desde CDN.
- `OrbitControls` de `three.js` desde CDN.

Esto significa que la primera carga necesita conexion a internet.

## Motivo de la refactorizacion

Antes, todo el proyecto estaba concentrado en un unico `index.html`, lo que dificultaba:

- localizar errores,
- reutilizar partes,
- ampliar la interfaz,
- separar responsabilidades,
- revisar cambios en Git.

Con la nueva estructura:

- HTML define la estructura.
- CSS define la presentacion.
- UI y simulacion quedan desacopladas.
- La logica 3D es mas facil de extender.
- El mantenimiento futuro es bastante mas sostenible.

## Validacion realizada

Se hizo una comprobacion local de importacion del modulo `js/simulator.js` para confirmar que la nueva separacion no introdujo errores de sintaxis en el modulo principal.

## Siguientes mejoras recomendadas

- Mover las dependencias de CDN a un flujo con `npm` y bundler.
- Separar la construccion de escena en modulos aun mas pequenos (`tank`, `fan`, `turbine`, `particles`).
- Añadir controles para resetear la simulacion.
- Añadir leyendas o panel de debug para ver mas metricas fisicas.
- Incorporar una guia de despliegue en GitHub Pages si se quiere publicar como demo web.
