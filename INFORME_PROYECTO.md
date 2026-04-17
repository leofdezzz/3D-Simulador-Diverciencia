# Informe de Proyecto: Sistema de Posicionamiento Automático de Aerogenerador Flotante

---

## 1. Descripción General del Proyecto

El proyecto consiste en el diseño, construcción y simulación de un **sistema de posicionamiento automático** para un aerogenerador flotante dentro de un tanque de plástico con agua. El objetivo principal es mover la plataforma flotante del aerogenerador hacia la posición que maximice la captación de viento y, por ende, maximice el voltaje generado.

El sistema físico cuenta con cuatro motores JGB37-520 equipados con cabrestantes caseros, uno ubicado en cada esquina del tanque. Cada cabrestante enrolla o desenrolla un cable conectado a la plataforma flotante. Al controlar de forma coordinada los cuatro cables, el sistema puede desplazar el aerogenerador a cualquier punto de la superficie del agua.

Para validar y visualizar el comportamiento del sistema antes de la implementación física, se desarrolló un **simulador 3D interactivo** usando la biblioteca Three.js que reproduce fielmente la geometría del tanque, los cabrestantes, los cables y la plataforma flotante.

---

## 2. Objetivos

### Objetivo General

Desarrollar un sistema automatizado de posicionamiento de un aerogenerador flotante que busque y mantenga la posición óptima dentro de un tanque, maximizando el voltaje generado.

### Objetivos Específicos

- Diseñar un mecanismo de cabrestante casero compatible con los motores JGB37-520 para controlar la tensión de cada cable.
- Implementar un algoritmo de búsqueda de posición óptima basado en la lectura de voltaje del aerogenerador.
- Construir un simulador 3D que represente el sistema físico completo para verificar la lógica de control antes del despliegue.
- Demostrar visualmente el funcionamiento coordinado de los cuatro cables en tiempo real.

---

## 3. Sistema Físico

### 3.1 Tanque

El montaje experimental se realiza dentro de un **tanque de plástico** con las siguientes características:

- **Forma**: Rectangular, con marco estructural en los bordes.
- **Contenido**: Agua en su interior, que sirve como medio de flotación para la plataforma del aerogenerador.
- **Puntos de anclaje**: En cada una de las cuatro esquinas superiores del tanque se instala un cabrestante. Desde esos puntos, los cables bajan hacia la plataforma flotante.

El tanque actúa como el espacio de trabajo confinado dentro del cual el sistema debe encontrar la posición de mayor captación de viento.

### 3.2 Motores JGB37-520

El sistema utiliza **cuatro motores JGB37-520**, uno por cada esquina del tanque. Este motor es un motorreductor de corriente continua con las siguientes características relevantes para el proyecto:

| Característica | Descripción |
|---|---|
| Tipo | Motorreductor DC con caja reductora |
| Voltaje de operación | 6 V – 12 V DC |
| Eje de salida | Doble eje (permite acoplar encoder y tambor) |
| Relación de reducción | Configurable según variante (típicamente 1:30 a 1:120) |
| Torque de salida | Alto, adecuado para enrollar cable bajo tensión |
| Tamaño | Compacto, fácil de montar en las esquinas del tanque |

La reducción interna del motor permite obtener torque suficiente para tensar los cables y mover la plataforma flotante sin necesidad de engranajes adicionales externos.

### 3.3 Cabrestantes Caseros

Cada motor JGB37-520 está acoplado a un **cabrestante fabricado artesanalmente**. El cabrestante es el mecanismo que convierte la rotación del eje del motor en enrollamiento o desenrollamiento del cable.

**Componentes del cabrestante:**

- **Tambor (spool)**: Cilindro de diámetro reducido acoplado directamente al eje del motor, alrededor del cual se enrolla el cable. Las vueltas del cable quedan visibles y ordenadas a lo largo del ancho del tambor.
- **Estructura de soporte**: Fijada a la esquina del tanque, sostiene el motor en posición horizontal y mantiene alineado el cable hacia la plataforma flotante.
- **Guía de cable**: Elemento que encamina el cable desde el tambor hasta el punto de bajada vertical, evitando que el cable se enrede o se salga del tambor.

**Funcionamiento:**
- Cuando el motor gira en un sentido, el cable se enrolla en el tambor y la plataforma es atraída hacia esa esquina.
- Cuando el motor gira en el sentido contrario, el cable se desenrolla y la plataforma puede alejarse de esa esquina.
- La coordinación de los cuatro cabrestantes determina la posición (X, Z) de la plataforma en el plano horizontal del agua.

### 3.4 Sistema de Cables

Cuatro cables conectan los cabrestantes con la plataforma flotante:

- Cada cable parte de uno de los cuatro cabrestantes ubicados en las esquinas del tanque.
- Los cables convergen en la **plataforma flotante** del aerogenerador, anclados en puntos simétricamente distribuidos.
- La longitud libre de cada cable determina la distancia entre la esquina correspondiente y la plataforma.
- Variando las longitudes de los cuatro cables de forma coordinada, la plataforma puede posicionarse en cualquier punto dentro del área del tanque.

**Principio geométrico de posicionamiento:**

La posición de la plataforma flotante está determinada por la intersección de cuatro circunferencias, una centrada en cada esquina con radio igual a la longitud libre del cable correspondiente. Al controlar esas longitudes, el sistema define con precisión el punto de flotación.

---

## 4. Sistema de Control

### 4.1 Lógica de Posicionamiento

El sistema de control tiene como entrada la **lectura de voltaje** del aerogenerador y como salidas las **señales de velocidad y dirección** de cada uno de los cuatro motores.

El algoritmo de búsqueda de posición óptima funciona de la siguiente manera:

1. **Estado inicial**: La plataforma parte de su posición actual.
2. **Exploración**: El sistema evalúa el voltaje generado en distintas posiciones candidatas.
3. **Cálculo de posición óptima**: Se determina la dirección hacia la cual el voltaje aumenta.
4. **Reposicionamiento**: Se acortan los cables correspondientes a la esquina en la dirección óptima y se alargan los opuestos, desplazando la plataforma suavemente.
5. **Convergencia**: El sistema se detiene cuando la plataforma alcanza la posición de máximo voltaje.

### 4.2 Coordinación de Motores

Para mover la plataforma de una posición a otra, los cuatro motores actúan de forma coordinada:

- Si la plataforma debe moverse hacia el norte, los motores de las esquinas norte acortan sus cables y los del sur los alargan.
- Si debe moverse hacia el este, los motores del este acortan y los del oeste alargan.
- Los movimientos diagonales resultan de la combinación simultánea de las dos acciones anteriores.
- La plataforma siempre queda tensionada por los cuatro cables, lo que estabiliza su posición y evita movimientos no deseados por el oleaje o el viento.

### 4.3 Retroalimentación

La retroalimentación principal del sistema es el **voltaje generado por el aerogenerador**. Una mayor captación de viento se traduce directamente en mayor voltaje, lo que sirve como indicador de calidad de posicionamiento. El sistema busca maximizar ese valor de forma continua o bajo demanda del operador.

---

## 5. Simulador 3D

### 5.1 Propósito del Simulador

Se desarrolló un **simulador 3D interactivo** para visualizar y verificar el comportamiento del sistema antes de construir el prototipo físico completo. El simulador permite:

- Observar el movimiento coordinado de cables y cabrestantes en tiempo real.
- Experimentar con distintas posiciones del aerogenerador y ver el efecto sobre el viento efectivo captado.
- Probar el algoritmo de búsqueda de posición óptima de forma visual e intuitiva.
- Mostrar el proyecto a terceros de manera comprensible.

### 5.2 Tecnología Utilizada

El simulador fue construido con **Three.js (r128)**, una biblioteca de gráficos 3D para navegadores web. No requiere instalación de software adicional: se ejecuta directamente abriendo el archivo `index.html` en cualquier navegador moderno.

**Estructura de archivos:**

```
3D-Simulador-Diverciencia/
├── index.html        # Punto de entrada y estructura HTML
├── css/
│   └── styles.css    # Estilos visuales del panel de control
└── js/
    ├── main.js       # Inicialización del simulador
    ├── ui.js         # Interfaz de usuario y eventos
    └── simulator.js  # Lógica 3D, física y renderizado
```

### 5.3 Elementos Representados

El simulador reproduce fielmente los siguientes componentes del sistema físico:

| Elemento simulado | Descripción |
|---|---|
| Tanque | Estructura rectangular con paredes de plástico translúcido y marco metálico |
| Agua | Plano animado con ondas sinusoidales superpuestas |
| Plataforma flotante | Cilindro flotante que representa el soporte del aerogenerador |
| 4 cabrestantes | Motor + tambor + guía de cable en cada esquina |
| 4 cables | Líneas que conectan cada cabrestante con la plataforma |
| Fuente de viento | Ventilador desplazable por los cuatro lados del tanque |
| Partículas de viento | Flujo de aire visualizado con partículas animadas |

### 5.4 Panel de Control

La interfaz del simulador incluye un panel lateral con los siguientes controles:

- **Selección de lado (N / S / E / O)**: Define desde qué lado del tanque sopla el viento.
- **Posición en barra**: Deslizador que mueve la fuente de viento a lo largo del lado seleccionado.
- **Potencia del viento**: Deslizador que ajusta la intensidad del flujo de aire.
- **Buscar posición óptima**: Botón que activa el reposicionamiento automático de la plataforma hacia la posición de máximo viento efectivo.
- **Indicadores en tiempo real**: Muestra las RPM del rotor y el porcentaje de viento efectivo captado.

### 5.5 Algoritmo de Viento Efectivo (Simulado)

En el simulador, el **viento efectivo** que recibe la plataforma se calcula combinando cuatro factores:

```
viento_efectivo = potencia × atenuación_distancia × atenuación_lateral × alineación
```

Donde:

- **Potencia**: Valor configurado por el usuario (0 a 100 %).
- **Atenuación por distancia**: Decrece exponencialmente con la distancia entre la fuente y la plataforma.
- **Atenuación lateral**: Penaliza la captación cuando la plataforma queda desviada del eje del chorro de aire.
- **Alineación**: Factor que mide cuánto coincide la dirección del viento con la posición relativa de la plataforma.

Este modelo permite que el simulador reproduzca de manera cualitativa el mismo comportamiento que se observa en el sistema físico: hay una posición de máxima captación y el sistema debe encontrarla de forma autónoma.

### 5.6 Visualización de Cabrestantes y Cables

Uno de los aspectos más representativos del simulador es la **animación sincronizada de los cabrestantes**: cuando la plataforma se mueve, los cuatro tambores rotan en tiempo real, enrollando o desenrollando el cable de acuerdo con la variación de longitud de cada uno. Esto permite verificar visualmente que la lógica de coordinación de motores es correcta antes de implementarla en el hardware.

---

## 6. Relación entre el Simulador y el Sistema Físico

| Elemento | Sistema Físico | Simulador 3D |
|---|---|---|
| Tanque | Tanque de plástico real | Estructura 3D con paredes translúcidas |
| Motor | JGB37-520 (4 unidades) | Motor cilíndrico con aletas de enfriamiento |
| Cabrestante | Fabricado artesanalmente | Tambor animado con vueltas de cable visibles |
| Cable | Cable físico de acero o nylon | Línea 3D de color dorado |
| Plataforma | Pontón flotante real | Cilindro blanco sobre el agua simulada |
| Viento | Fuente de viento real (ventilador externo) | Ventilador 3D desplazable con partículas |
| Voltaje / RPM | Lectura de voltaje real del aerogenerador | Cálculo de viento efectivo simulado |

---

## 7. Conclusiones

El proyecto integra mecánica, electrónica y programación para resolver un problema concreto: **llevar un aerogenerador flotante a la posición donde genera más energía**, de forma automática.

Los cuatro motores JGB37-520 con sus cabrestantes caseros ofrecen una solución robusta y económica para controlar con precisión la posición de la plataforma a través de los cuatro cables. La geometría del sistema garantiza que la plataforma quede siempre tensionada y estable.

El simulador 3D desarrollado cumple un papel fundamental como herramienta de validación y comunicación del proyecto: permite probar la lógica de control, visualizar el comportamiento esperado y presentar el funcionamiento del sistema de forma clara e interactiva antes de la construcción definitiva del prototipo.
