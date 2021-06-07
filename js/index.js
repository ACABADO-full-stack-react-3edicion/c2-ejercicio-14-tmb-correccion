/* global mapboxgl */

// URL del mapa de Google Maps
const urlMapa = "https://www.google.com/maps?z=19&t=m&q=loc:";

// Datos para las APIs
const geocodingApi = "https://api.mapbox.com/geocoding/v5/mapbox.places/";
const mapboxToken =
  "pk.eyJ1IjoibWFyaW9nbCIsImEiOiJja2x0NGdkZXYwZ2hkMm9vMzhyNXJxY29iIn0.HrOAaHOb_rLEMlxZKNwukQ";
const tmbApi = "https://api.tmb.cat/v1/planner/plan";
const appId = "03bcca40";
const appKey = "165d4531e0f64b8d5fa4cbf2cba980ac";
mapboxgl.accessToken = mapboxToken;

// LLama a esta función para generar el pequeño mapa que sale en cada paso
// Le tienes que pasar un array con las dos coordenadas y el elemento HTML donde tiene que generar el mapa
const generaMapa = (coordenadas, mapa) => {
  const mapbox = new mapboxgl.Map({
    container: mapa,
    style: "mapbox://styles/mapbox/streets-v11",
    center: coordenadas,
    zoom: 14,
  });
};

// Coordenadas que se mandarán a la API de TMB. Tienes que alimentar este objeto a partir de las coordenadas que te dé la API de Mapbox
const coordenadas = {
  desde: {
    latitud: 0,
    longitud: 0,
  },
  hasta: {
    latitud: 0,
    longitud: 0,
  },
};

// Elementos del DOM
const formulario = document.querySelector(".form-coordenadas");
const formulariosCoordenadas = document.querySelectorAll(".coordenadas");
const pasosElemento = document.querySelector(".pasos");

// Extraer información de los pasos
const extraerPasos = (datosPasos) => {
  const {
    plan: { itineraries },
  } = datosPasos;
  const { legs: pasos } = itineraries[0];
  let i = 0;
  for (const paso of pasos) {
    const pasoElemento = document.querySelector(".paso-dummy").cloneNode(true);
    insertaPasoElemento(pasoElemento, paso, ++i);
  }
};

const insertaPasoElemento = (pasoElemento, paso, i) => {
  const {
    startTime,
    from: { name: nombreInicio, lat, lon },
    to: { name: nombreFin },
    distance,
    duration,
    mode,
  } = paso;

  pasoElemento.classList.remove("paso-dummy");
  pasoElemento.classList.add(mode.toLowerCase());
  pasoElemento.querySelector(".paso-numero").textContent = i;
  pasoElemento.querySelector(".paso-from").textContent = nombreInicio;
  pasoElemento.querySelector(".paso-to").textContent = nombreFin;
  pasoElemento.querySelector(".paso-mapa").href = `${urlMapa}${lat}+${lon}`;
  pasoElemento.querySelector(".paso-hora .dato").textContent = new Date(
    startTime
  ).toLocaleTimeString();
  pasoElemento.querySelector(
    ".paso-distancia .dato"
  ).textContent = `${Math.round(distance)}m`;
  pasoElemento.querySelector(".paso-duracion .dato").textContent = `${
    duration / 100
  }m`;
  generaMapa([lon, lat], pasoElemento.querySelector(".mapa"));

  pasosElemento.append(pasoElemento);
};

// Extraer coordenadas y nombre de lugar de la respuesta de la API de Geocoding
const extraeDatosGeocoding = (datosGeocoding, contenedor) => {
  const { features } = datosGeocoding;
  const { place_name: placeName, center } = features[0];
  const { tipo } = contenedor.dataset;

  const nombreLugarElemento = contenedor.querySelector(".nombre-lugar");
  nombreLugarElemento.textContent = placeName;
  // eslint-disable-next-line prefer-destructuring
  coordenadas[tipo].latitud = center[0];
  // eslint-disable-next-line prefer-destructuring
  coordenadas[tipo].longitud = center[1];
};

// Escuchadores de eventos
for (const formularioCoordenadas of formulariosCoordenadas) {
  // Escuchamos el evento change de los radio
  formularioCoordenadas.addEventListener("change", (e) => {
    const seleccionElemento = e.target;
    const inputDireccion = formularioCoordenadas.querySelector(
      ".direccion-definitiva"
    );
    if (seleccionElemento.id.endsWith("-direccion")) {
      inputDireccion.classList.add("on");
      inputDireccion.focus();
      inputDireccion.value = "";
    } else if (seleccionElemento.id.endsWith("-mi-ubicacion")) {
      inputDireccion.classList.remove("on");
      obtenerUbicacionUsuario(formularioCoordenadas);
    }
  });

  // Escuchamos el evento input del input de dirección
  let timer;
  formularioCoordenadas.addEventListener("input", (e) => {
    const inputDireccion = e.target;
    if (!inputDireccion.classList.contains("direccion-definitiva")) {
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      const direccion = encodeURI(inputDireccion.value);
      // Aquí nos conectaremos a la API
      fetch(`${geocodingApi}${direccion}.json?access_token=${mapboxToken}`)
        .then((resp) => resp.json())
        .then((respuestaGeocoding) => {
          extraeDatosGeocoding(respuestaGeocoding, formularioCoordenadas);
        });
    }, 500);
  });
}

formulario.addEventListener("submit", (e) => {
  e.preventDefault();

  // Pasarle las coordenadas a la API de TMB
  const {
    desde: { latitud: desdeLatitud, longitud: desdeLongitud },
    hasta: { latitud: hastaLatitud, longitud: hastaLongitud },
  } = coordenadas;
  fetch(
    `${tmbApi}?app_id=${appId}&app_key=${appKey}&fromPlace=${desdeLongitud},${desdeLatitud}&toPlace=${hastaLongitud},${hastaLatitud}`
  )
    .then((resp) => resp.json())
    .then((datosPlanificador) => extraerPasos(datosPlanificador));
});

// Obtener coordenadas del dispositivo
const obtenerUbicacionUsuario = (contenedor) => {
  navigator.geolocation.getCurrentPosition((posicion) => {
    const { latitude, longitude } = posicion.coords;
    const { tipo } = contenedor.dataset;
    coordenadas[tipo].latitud = latitude;
    coordenadas[tipo].longitud = longitude;
  });
};
