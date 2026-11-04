# CitrusVision: Conteo de Cítricos, Visión por Computador y Estimación de Rendimiento

[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC.svg)](https://tailwindcss.com/)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.22-FF6F00.svg)](https://www.tensorflow.org/js)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_First-success.svg)](https://web.dev/progressive-web-apps/)

**CitrusVision** es una aplicación web progresiva (PWA) táctil diseñada para agrónomos, jefes de campo y especialistas en visión por computador. Permite la detección, conteo y etiquetado en tiempo real de cítricos en huerto (naranjas, limones, mandarinas y pomelos), la verificación estadística de representatividad muestral en terreno y la exportación directa de datasets listos para entrenar modelos **Ultralytics YOLOv8 / YOLO11**.

---

## 🌟 Características Principales

### 1. 📷 Cámara en Vivo con HUD en Tiempo Real
- **Detección continua a 30 FPS**: Procesamiento en el navegador con sobreimpresión gráfica tipo HUD (cajas delimitadoras, porcentaje de confianza y contador de fruta instantáneo).
- **Acción táctil "Congelar & Anotar"**: Congela el fotograma en resolución nativa para transferirlo al lienzo de anotación sin perder la posición de las detecciones.
- **Guardado Rápido con Geolocalización**: Registro ágil en un toque con extracción automática de coordenadas GPS y fecha del muestreo.

### 2. ⚡ Algoritmo de Segmentación HSV Adaptativo Optimizado
- **Normalización de Iluminación Local**: Algoritmo de compensación dinámica de luminancia ($\bar{Y} = 0.299R + 0.587G + 0.114B$) para contrarrestar el lavado cromático bajo sol directo y las sombras densas de copa.
- **Morfología Matemática Acelerada**: Filtros de Apertura (Erosión $\to$ Dilatación con kernel $3 \times 3$) sobre búferes binarios tipados (`Uint8Array`) para desacoplar racimos de fruta y eliminar ruido en menos de 15 ms.
- **Discriminador Geométrico de Circularidad**:
  $$\text{Circularidad} = \frac{4\pi \cdot \text{Área}}{\text{Perímetro}^2}$$
  Descarta automáticamente hojas alargadas, manchas de suelo y ramas horizontales ($\text{circularidad} < 0.50$).
- **Banco de Calibración Interactiva**: Previsualización de máscara binaria y perfiles preconfigurados para *Naranja Valencia*, *Limón Eureka*, *Mandarina Murcott* y *Fruta en Envero*.

### 3. 🧠 Inferencia YOLO con TensorFlow.js (WebGL)
- **Aceleración por Hardware WebGL**: Ejecución local en el navegador con precalentamiento de tensores y gestión estricta de memoria mediante `tf.tidy()`.
- **Estrategia de Mosaico (Tiling 2x2)**: División de la imagen en 4 cuadrantes con un 15% de solapamiento para detectar frutos pequeños o lejanos sin degradación de resolución.
- **Supresión de No Máximos (NMS) Vectorizada**: Eliminación de detecciones redundantes con umbrales configurables de confianza e IoU.
- **Carga de Modelos Propios**: Importación directa de modelos exportados desde Ultralytics (`model.json` + fragmentos `.bin`).
- **Detector Demo Integrado**: Heurística multi-escala calibrada para pruebas inmediatas sin requerir carga previa de pesos neuronales.

### 4. 📊 Motor Agronómico y Muestreo Representativo
- **Cálculo de Tamaño de Muestra Estadísticamente Suficiente ($n$)**:
  $$n = \left(\frac{1.96 \cdot CV\%}{10}\right)^2$$
  Determina si los árboles evaluados en el cuartel garantizan un margen de error $\le 10\%$ al 95% de confianza.
- **Calibración de Follaje y Visibilidad**: Ajuste de factor de fruta oculta en el interior de la copa (típicamente $1.20\times - 1.50\times$).
- **Proyecciones Productivas**: Proyección de carga (frutos/árbol), peso por árbol (kg/árbol) y toneladas métricas estimadas por hectárea (t/ha) según el marco de plantación.

### 5. 📦 Exportación de Datasets y Entrenamiento en la Nube
- **Exportación Estándar YOLO (ZIP)**: Generación automática en el cliente de la estructura de carpetas:
  ```
  dataset/
  ├── images/
  │   ├── train/ (80%)
  │   └── val/   (20%)
  ├── labels/
  │   ├── train/ (*.txt con coordenadas normalizadas)
  │   └── val/
  ├── data.yaml
  └── train_colab.py
  ```
- **Reportes en CSV**: Exportación de planillas detalladas con conteos, coordenadas GPS, variedad, cuartel y kilos proyectados.
- **Google Colab Ready**: Generador de script de entrenamiento para GPU gratuita (NVIDIA T4) con exportación directa a formato TF.js.

### 6. 📴 Persistencia Local e Interfaz Táctil Offline
- Almacenamiento local seguro en **IndexedDB** para operar en huertos sin cobertura 3G/4G/5G.
- Lector de metadatos **EXIF** para fotos de galería (extracción de fecha original y coordenadas GPS).
- Diseño ergonómico optimizado para trabajo en campo con zonas de pulgar natural y alto contraste para legibilidad bajo luz solar directa.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend Core**: React 19, TypeScript
- **Estilos y UI**: Tailwind CSS v4, Lucide React
- **Visión por Computador e IA**: TensorFlow.js (WebGL backend), Canvas API, Color Space Algorithms
- **Persistencia y Datos**: IndexedDB API, JSZip
- **Compilador y Bundler**: Vite 6

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
- [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
- `npm` o gestor de paquetes equivalente

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/citrus-vision.git
cd citrus-vision
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Iniciar el servidor de desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

### 4. Compilar para producción
```bash
npm run build
```

---

## 📖 Secuencia Metodológica de Operación

1. **Definir el Cuartel**: Ingresa el nombre del predio, cuartel, hilera, variedad de cítrico y densidad de plantación en el panel de metadatos.
2. **Calibrar Color**: Selecciona el perfil correspondiente a la variedad (*Naranja*, *Limón*, *Mandarina* o *Envero*) y ajusta si es necesario los umbrales de saturación y brillo en el *Calibrador HSV*.
3. **Muestrear Árboles**: Utiliza la *Cámara en Vivo* para apuntar al árbol. Haz clic en **Congelar & Anotar** para transferir el fotograma al editor interactivo.
4. **Verificar Detección**: Revisa las cajas generadas. Puedes agregar cajas faltantes arrastrando sobre la pantalla o eliminar falsos positivos con un clic. Presiona **Guardar Captura**.
5. **Comprobar la Muestra ($n$)**: En la pestaña *Rendimiento*, verifica si el indicador de representatividad está en verde ($n_{\text{muestreados}} \ge n_{\text{requeridos}}$). Si faltan árboles, continúa el recorrido por el cuartel.
6. **Exportar Resultados**: Descarga el reporte en CSV para la administración del campo o el archivo ZIP para alimentar tu base de entrenamiento de modelos YOLO.

---

## 📄 Licencia

Este proyecto está distribuido bajo la licencia **Apache 2.0**. Consulta el archivo `LICENSE` para más detalles.
