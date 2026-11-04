# Plan de Implementación: Conteo de Cítricos y Estimación de Rendimiento

Modernización, despliegue y optimización de algoritmos de visión por computador en tiempo real para el conteo de fruta en campo, entrenamiento de modelos y estimación de cosecha agronómica.

---

## 1. Diagnóstico del Sistema y Oportunidades de Optimización

El análisis del código base original (`index_0d720e7d.html`) revela una sólida arquitectura agronómica que presentaba cuellos de botella críticos en visión computacional y experiencia de usuario:

1. **Ausencia de flujo de video en vivo**: Solo admitía captura estática mediante selector de archivos, requiriendo tomar la foto a ciegas y esperar el procesamiento.
2. **Algoritmo de color rígido y sensible a iluminación**: Umbrales HSV estáticos (`h: 6-40` naranja, `42-66` limón) que fallan en campo con sobreexposición solar, contraluz o sombras de follaje; además, la erosión/dilatación ingenua y el etiquetado por componentes conexos en CPU causaban retardos y falsos positivos (hojas amarillentas o reflejos de ramas).
3. **Inferencia YOLO no optimizada**: Las divisiones en cuadrícula (*tiling 2x2*) ejecutaban 4 llamadas independientes a `executeAsync` copiando datos de canvas a canvas secuencialmente sin preasignación de tensores en memoria WebGL.
4. **Falta de datos de demostración inmediatos**: Un nuevo usuario sin modelo `.json` cargado ni fotos de huerto no podía evaluar la herramienta de inmediato.

---

## 2. Arquitectura de la Solución

```
src/
├── types/
│   └── citrus.ts             # Modelos de datos: Captura, BBox, Metadatos huerto, YieldParams
├── services/
│   ├── db.ts                 # IndexedDB persistente (fotos, metadatos, conteos)
│   ├── exif.ts               # Extractor de GPS, fecha y orientación EXIF
│   └── vision/
│       ├── colorDetector.ts  # Algoritmo HSV adaptativo + normalización de luz + filtro de circularidad
│       ├── yoloDetector.ts   # Motor TF.js optimizado (WebGL, NMS vectorizado, tiling inteligente)
│       └── demoData.ts       # Fotos de huerto integradas y detector heurístico demo calibrado
├── components/
│   ├── Layout/
│   │   ├── Navigation.tsx    # Barra de navegación ergonómica para terreno
│   │   └── Header.tsx        # Top Bar Contract con estado de modelo y GPS
│   ├── LiveCamera/
│   │   ├── LiveCameraHUD.tsx # Stream getUserMedia + canvas HUD + contador FPS + botón congelar
│   │   └── CameraControls.tsx# Ajuste de exposición, cambio de lente (trasera/frontal)
│   ├── Annotator/
│   │   ├── CanvasView.tsx    # Canvas interactivo: Pan, Zoom, Bounding Box manual, edición táctil
│   │   └── Toolbar.tsx       # Controles de detección (Color HSV, Modelo YOLO, Limpiar, Deshacer)
│   ├── Tuning/
│   │   └── HSVAdjuster.tsx   # Panel de calibración en vivo: Hue, Sat, Val, Circularidad, Radio mín/máx
│   ├── Library/
│   │   ├── CaptureCard.tsx   # Visualizador de capturas guardadas con badges agronómicos
│   │   └── ExportModal.tsx   # Exportador YOLOv8/11 (ZIP con train/val, .txt y data.yaml) y CSV
│   ├── YieldEngine/
│   │   ├── YieldCalculator.tsx # Estimador agronómico: n muestral (error ±10%), kg/árbol, t/ha
│   │   └── OrchardStats.tsx  # Métricas por cuartel, hilera, cara y variedad
│   └── ModelManager/
│       ├── ModelLoader.tsx   # Carga de modelo TF.js (model.json + binarios) + sliders conf/IoU
│       └── ColabGenerator.tsx# Generador de script Ultralytics YOLO listo para Google Colab
└── App.tsx                   # Coordinador de estado global y vistas
```

---

## 3. Optimizaciones de Computer Vision

### A. Algoritmo de Segmentación HSV Adaptativo en Tiempo Real
- **Normalización de Iluminación Local**: Pre-procesamiento de balance de blancos y ecualización de luminancia para compensar sol directo y sombras intensas del follaje.
- **Ventana Dinámica HSV con Calibración Rápida**: Control interactivo de umbrales para Naranjas (madura/verdeante), Limones (verde/amarillo), Mandarinas y Pomelos.
- **Filtro Morfológico Optimizado con Kernel 3x3/5x5**: Fusión de erosión y dilatación por buffer binario tipado (`Uint8Array`) para desacoplar racimos de frutos en menos de 15ms.
- **Discriminador Geométrico de Circularidad**:
  $$\text{Circularidad} = \frac{4 \pi \cdot \text{Área}}{\text{Perímetro}^2}$$
  Descarte automático de hojas alargadas, ramas horizontales y manchas irregulares ($\text{Circularidad} < 0.55$).
- **Filtro de Radio y Densidad**: Rango configurable en píxeles ($r_{\min} - r_{\max}$) adaptado a la distancia del árbol.

### B. Flujo de Video en Vivo con HUD y Congelado Instantáneo
- Acceso a cámara de terreno (`facingMode: "environment"`) mediante `navigator.mediaDevices.getUserMedia` con resolución óptima (1080p o 720p según hardware).
- Detección en tiempo real con superposición en HUD (Bounding boxes verdes/naranjas con recuento instantáneo y tasa de refresco FPS en pantalla).
- Botón táctil ergonómico de gran tamaño ($56 \times 56\text{px}$) **"Congelar y Guardar"**: Toma el fotograma en resolución nativa, transfiere las detecciones al lienzo de edición manual y permite corregir antes de guardar en IndexedDB.

### C. Aceleración del Motor YOLO TensorFlow.js
- Inicialización en backend `webgl` con pre-calentamiento (*warm-up*) de tensores.
- Limpieza estricta de memoria con `tf.tidy()` para evitar fugas de VRAM en sesiones largas de muestreo en campo.
- Supresión de No Máximos (NMS) multi-escala vectorizada para evitar recuadros duplicados entre bordes de mosaicos (*tiles*).

---

## 4. Funcionalidades Agronómicas Integradas

1. **Registro de Contexto de Muestreo**: Predio, Cuartel, Hilera, N° Árbol, Cara (Norte/Sur/Oriente/Poniente), Variedad de cítrico y etapa fenológica.
2. **Cálculo de Muestra Estadística Representativa**:
   $$n = \left(\frac{Z_{1-\alpha/2} \cdot CV}{E}\right)^2$$
   Calcula en tiempo real si el número de árboles muestreados en el cuartel es suficiente para un error $\le 10\%$ con 95% de confianza.
3. **Estimación de Toneladas por Hectárea (t/ha)**:
   - Densidad de plantación (árboles/ha).
   - Calibrador de visibilidad de follaje (% de fruta oculta en el interior de la copa, típicamente 30-50%).
   - Peso medio proyectado por fruto (g/fruto).
4. **Exportación Estándar YOLO**:
   - Generación de archivo ZIP en cliente con partición 80/20 (train/val), coordenadas normalizadas (`<class> <x_center> <y_center> <width> <height>`) y `data.yaml`.
5. **Muestras Demo Integradas**:
   - Imágenes de huerto pre-cargadas para evaluación inmediata en cualquier dispositivo sin requerir cámara física activa en el momento de la prueba.

---

## 5. Fases de Ejecución

1. **Fase 1: Configuración de Dependencias y Tipado**:
   - Instalación de `jszip` (para exportación de datasets YOLO en formato zip) y `@tensorflow/tfjs` si es necesario.
   - Definición de tipos TypeScript completos en `src/types/citrus.ts`.
2. **Fase 2: Servicios de Visión y Algoritmos**:
   - Implementación del detector HSV adaptativo optimizado con morfología y circularidad (`src/services/vision/colorDetector.ts`).
   - Implementación del cargador e inferencia YOLO TF.js (`src/services/vision/yoloDetector.ts`).
   - Servicio IndexedDB persistente con transacciones asíncronas (`src/services/db.ts`).
   - Muestras de prueba de huerto integradas (`src/services/demoData.ts`).
3. **Fase 3: Interfaz Táctil y Componentes**:
   - Modo Cámara en Vivo con HUD de detección y congelado táctil (`LiveCameraHUD.tsx`).
   - Lienzo de inspección y anotación táctil con zoom, pan y cajas editables (`CanvasView.tsx`).
   - Deslizadores de calibración HSV interactivos con previsualización en tiempo real (`HSVAdjuster.tsx`).
   - Módulo agronómico de rendimiento y cálculo de muestra representativa (`YieldCalculator.tsx`).
   - Exportador de datos (ZIP YOLO + CSV de conteo) y generador Colab.
4. **Fase 4: Verificación y Pruebas**:
   - Compilación con `compile_applet`.
   - Verificación de contraste WCAG AA, ergonomía táctil en resoluciones móviles y pantallas de escritorio.
