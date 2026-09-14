// Local air composition + a transparent climate projection model.
const AQ_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

export interface AirData {
  co2: number; // ppm
  methane: number; // µg/m³
  pm2_5: number;
  pm10: number;
  co: number;
  no2: number;
  so2: number;
  ozone: number;
  dust: number;
  aqi: number;
  usAqi: number;
}

export async function fetchAir(lat: number, lon: number): Promise<AirData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "pm10,pm2_5,carbon_monoxide,carbon_dioxide,nitrogen_dioxide,sulphur_dioxide,ozone,methane,dust,european_aqi,us_aqi",
  });
  const res = await fetch(`${AQ_URL}?${params}`);
  if (!res.ok) throw new Error("Air quality fetch failed");
  const j = await res.json();
  const c = j.current ?? {};
  return {
    co2: Math.round(c.carbon_dioxide ?? 425),
    methane: Math.round(c.methane ?? 1900),
    pm2_5: round1(c.pm2_5),
    pm10: round1(c.pm10),
    co: round1(c.carbon_monoxide),
    no2: round1(c.nitrogen_dioxide),
    so2: round1(c.sulphur_dioxide),
    ozone: round1(c.ozone),
    dust: round1(c.dust),
    aqi: Math.round(c.european_aqi ?? 0),
    usAqi: Math.round(c.us_aqi ?? 0),
  };
}

function round1(n: number | undefined) {
  return Math.round((n ?? 0) * 10) / 10;
}

export function aqiLabel(aqi: number) {
  if (aqi <= 20) return "Excellent";
  if (aqi <= 40) return "Good";
  if (aqi <= 60) return "Moderate";
  if (aqi <= 80) return "Poor";
  if (aqi <= 100) return "Very poor";
  return "Hazardous";
}

/** User-tunable drivers of the projection. 1 = business as usual today. */
export interface Drivers {
  co2: number; // fossil CO2 emission factor
  methane: number; // methane emission factor
  deforestation: number; // % of remaining forest lost each year
  population: number; // % population growth each year
  airPollution: number; // 0-100 local air pollution load
  landPollution: number; // 0-100
  waterPollution: number; // 0-100
  noisePollution: number; // 0-100
}

export interface ProjectionPoint {
  year: number;
  co2: number;
  methane: number;
  temp: number; // °C above pre-industrial, locally adjusted
  seaLevel: number; // cm above today
  forest: number; // % of today's forest cover remaining
  population: number; // index, today = 100
  habitability: number; // 0-100
  heatDays: number; // days per year above 35°C
}

const BASE_YEAR = 2026;
export const END_YEAR = 2200;

export function defaultDrivers(air: AirData | null): Drivers {
  const pm = air?.pm2_5 ?? 15;
  return {
    co2: 1,
    methane: 1,
    deforestation: 0.35,
    population: 0.85,
    airPollution: clamp(Math.round((pm / 75) * 100), 5, 100),
    landPollution: 40,
    waterPollution: 45,
    noisePollution: 40,
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Simple, readable climate model:
 *  - CO2 accumulates from emissions scaled by population and weakened forest sinks
 *  - radiative forcing from CO2 + CH4 drives a warming response
 *  - warming is amplified with latitude (poles warm faster) and by local pollution
 */
export function project(
  drivers: Drivers,
  air: AirData | null,
  latitude: number,
  todayTemp = 1.3,
): ProjectionPoint[] {
  let co2 = air?.co2 ?? 425;
  let ch4ppb = (air?.methane ?? 1900) / 0.716; // µg/m³ -> ppb (approx at STP)
  ch4ppb = clamp(ch4ppb, 1850, 2400);
  let forest = 100;
  let pop = 100;
  let seaLevel = 0;

  const latAmp = 1 + Math.min(Math.abs(latitude), 80) / 160; // 1.0 tropics -> 1.5 poles
  const pollutionLoad =
    (drivers.airPollution * 0.5 +
      drivers.landPollution * 0.2 +
      drivers.waterPollution * 0.2 +
      drivers.noisePollution * 0.1) /
    100;

  const points: ProjectionPoint[] = [];

  for (let year = BASE_YEAR; year <= END_YEAR; year++) {
    if (year > BASE_YEAR) {
      pop *= 1 + drivers.population / 100;
      forest *= 1 - drivers.deforestation / 100;

      const sink = 0.55 * (forest / 100) + 0.2; // oceans keep absorbing a little
      const emissions = 2.45 * drivers.co2 * Math.pow(pop / 100, 0.6);
      co2 += Math.max(emissions * (1 - sink * 0.45), -1);

      const ch4Emit = 100 * drivers.methane * Math.pow(pop / 100, 0.5);
      ch4ppb += ch4Emit - (ch4ppb - 700) / 12; // ~12 year atmospheric lifetime
      ch4ppb = Math.max(700, ch4ppb);
    }

    const forcing =
      5.35 * Math.log(co2 / 278) + 0.036 * (Math.sqrt(ch4ppb) - Math.sqrt(722));
    const globalTemp = 0.52 * forcing;
    const temp = globalTemp * latAmp * (1 + pollutionLoad * 0.06);

    if (year > BASE_YEAR) seaLevel += Math.max(0, globalTemp) * 0.42; // cm per year

    const heatDays = clamp(
      Math.round(
        Math.max(0, 40 - Math.abs(latitude) * 0.85) * Math.pow(Math.max(temp, 0.2), 1.25),
      ),
      0,
      365,
    );

    const habitability = clamp(
      Math.round(
        100 -
          Math.max(0, temp - todayTemp) * 16 -
          (100 - forest) * 0.2 -
          pollutionLoad * 22 -
          seaLevel * 0.06,
      ),
      0,
      100,
    );

    points.push({
      year,
      co2: Math.round(co2),
      methane: Math.round(ch4ppb),
      temp: Math.round(temp * 100) / 100,
      seaLevel: Math.round(seaLevel),
      forest: Math.round(forest * 10) / 10,
      population: Math.round(pop),
      habitability,
      heatDays,
    });
  }

  return points;
}

export function everyDecade(points: ProjectionPoint[]) {
  return points.filter((p, i) => p.year % 10 === 0 || i === 0 || i === points.length - 1);
}

export function impactVerdict(p: ProjectionPoint) {
  if (p.temp >= 6)
    return {
      tone: "Catastrophic",
      text: "Large parts of the year would be unsurvivable outdoors, with farming and fresh water collapsing.",
    };
  if (p.temp >= 4)
    return {
      tone: "Severe",
      text: "Extreme heatwaves, failing harvests, mass migration and coastlines pushed far inland.",
    };
  if (p.temp >= 2.5)
    return {
      tone: "Dangerous",
      text: "Frequent deadly heat, water stress and serious damage to coastal towns and cities.",
    };
  if (p.temp >= 1.8)
    return {
      tone: "Disruptive",
      text: "Hotter summers, heavier floods and steady pressure on crops and water supply.",
    };
  return {
    tone: "Manageable",
    text: "Close to today's climate — noticeable change, but communities can adapt.",
  };
}
