// Open-Meteo: free, no API key, covers every named place on Earth.
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WX_URL = "https://api.open-meteo.com/v1/forecast";

export interface Place {
  id: number;
  name: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const url = `${GEO_URL}?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Search failed");
  const json = await res.json();
  return (json.results ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    region: r.admin1,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

export interface Weather {
  temp: number;
  feels: number;
  code: number;
  isDay: boolean;
  humidity: number;
  wind: number;
  windDir: string;
  high: number;
  low: number;
  precip: number;
  uv: number;
  sunrise: string;
  sunset: string;
  time: string;
  timezone: string;
  hourly: { time: string; temp: number; code: number; isDay: boolean; precip: number }[];
  daily: {
    date: string;
    code: number;
    max: number;
    min: number;
    precipProb: number;
  }[];
}

const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export async function fetchWeather(lat: number, lon: number): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m",
    hourly: "temperature_2m,weather_code,is_day,precipitation_probability",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max",
    timezone: "auto",
    forecast_days: "7",
  });
  const res = await fetch(`${WX_URL}?${params}`);
  if (!res.ok) throw new Error("Weather fetch failed");
  const j = await res.json();
  const c = j.current;
  const nowIdx = Math.max(
    0,
    j.hourly.time.findIndex((t: string) => t > c.time) - 1,
  );

  const hourly = j.hourly.time
    .slice(nowIdx, nowIdx + 12)
    .map((time: string, i: number) => ({
      time,
      temp: Math.round(j.hourly.temperature_2m[nowIdx + i]),
      code: j.hourly.weather_code[nowIdx + i],
      isDay: j.hourly.is_day[nowIdx + i] === 1,
      precip: j.hourly.precipitation_probability?.[nowIdx + i] ?? 0,
    }));

  return {
    temp: Math.round(c.temperature_2m),
    feels: Math.round(c.apparent_temperature),
    code: c.weather_code,
    isDay: c.is_day === 1,
    humidity: c.relative_humidity_2m,
    wind: Math.round(c.wind_speed_10m),
    windDir: DIRS[Math.round(c.wind_direction_10m / 45) % 8],
    high: Math.round(j.daily.temperature_2m_max[0]),
    low: Math.round(j.daily.temperature_2m_min[0]),
    precip: j.daily.precipitation_probability_max?.[0] ?? 0,
    uv: Math.round(j.daily.uv_index_max?.[0] ?? 0),
    sunrise: fmtTime(j.daily.sunrise[0]),
    sunset: fmtTime(j.daily.sunset[0]),
    time: c.time,
    timezone: j.timezone,
    hourly,
    daily: j.daily.time.map((date: string, i: number) => ({
      date,
      code: j.daily.weather_code[i],
      max: Math.round(j.daily.temperature_2m_max[i]),
      min: Math.round(j.daily.temperature_2m_min[i]),
      precipProb: j.daily.precipitation_probability_max?.[i] ?? 0,
    })),
  };
}

function fmtTime(iso: string | undefined) {
  return iso ? iso.slice(11, 16) : "--:--";
}

export function weatherInfo(code: number, isDay = true): { icon: string; label: string } {
  const day = isDay;
  if (code === 0) return { icon: day ? "☀" : "🌙", label: "Clear sky" };
  if (code === 1) return { icon: day ? "🌤" : "🌙", label: "Mostly clear" };
  if (code === 2) return { icon: "⛅", label: "Partly cloudy" };
  if (code === 3) return { icon: "☁", label: "Overcast" };
  if (code === 45 || code === 48) return { icon: "🌫", label: "Fog" };
  if (code >= 51 && code <= 57) return { icon: "🌦", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { icon: "🌧", label: code >= 65 ? "Heavy rain" : "Rain" };
  if (code >= 71 && code <= 77) return { icon: "🌨", label: "Snow" };
  if (code >= 80 && code <= 82) return { icon: "🌧", label: "Rain showers" };
  if (code === 85 || code === 86) return { icon: "🌨", label: "Snow showers" };
  if (code >= 95) return { icon: "⛈", label: "Thunderstorm" };
  return { icon: "☁", label: "Cloudy" };
}

export function weekday(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en", { weekday: "short" });
}

export function hourLabel(iso: string, tzNowIso: string) {
  if (iso === tzNowIso) return "Now";
  return new Date(iso).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false });
}
