import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchWeather,
  hourLabel,
  searchPlaces,
  uvLabel,
  weatherInfo,
  weekday,
  type Place,
  type Weather,
} from "@/lib/weather";
import {
  defaultDrivers,
  fetchAir,
  type AirData,
  type Drivers,
} from "@/lib/climate";
import { ClimateLab } from "@/components/ClimateLab";
import { RotatingEarth } from "@/components/RotatingEarth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SKY WATCH — Weather for anywhere on Earth" },
      {
        name: "description",
        content:
          "Search any village, town or city worldwide and see live weather, altitude, pressure, hourly and 7-day forecasts in an animated day or night sky.",
      },
      { property: "og:title", content: "SKY WATCH — Weather for anywhere on Earth" },
      {
        property: "og:description",
        content:
          "Live weather for any village, town or city — altitude, pressure, visibility, animated day and night skies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const QUICK: { name: string; lat: number; lon: number }[] = [
  { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
  { name: "Hallstatt", lat: 47.5622, lon: 13.6493 },
  { name: "Reykjavík", lat: 64.1466, lon: -21.9426 },
];

interface Selection {
  name: string;
  region?: string | undefined;
  lat: number;
  lon: number;
}

function Index() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<Selection>({
    name: "Kolkata",
    region: "India",
    lat: 22.5726,
    lon: 88.3639,
  });
  const [wx, setWx] = useState<Weather | null>(null);
  const [air, setAir] = useState<AirData | null>(null);
  const [drivers, setDrivers] = useState<Drivers>(() => defaultDrivers(null));
  const [targetYear, setTargetYear] = useState(2100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchBox = useRef<HTMLDivElement>(null);

  const load = useCallback(async (sel: Selection) => {
    setLoading(true);
    setError(null);
    try {
      setWx(await fetchWeather(sel.lat, sel.lon));
    } catch {
      setError("Couldn't load the forecast. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(place);
  }, [place, load]);

  // live air composition for this place
  useEffect(() => {
    let alive = true;
    setAir(null);
    fetchAir(place.lat, place.lon)
      .then((a) => {
        if (!alive) return;
        setAir(a);
        setDrivers(defaultDrivers(a));
      })
      .catch(() => {
        if (alive) setDrivers(defaultDrivers(null));
      });
    return () => {
      alive = false;
    };
  }, [place]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        setSuggestions(await searchPlaces(query.trim()));
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!searchBox.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (p: Place) => {
    setPlace({ name: p.name, region: p.region ?? p.country, lat: p.latitude, lon: p.longitude });
    setQuery("");
    setSuggestions([]);
    setOpen(false);
  };

  const info = wx ? weatherInfo(wx.code, wx.isDay) : null;
  const night = wx ? !wx.isDay : false;
  const raining = !!wx && ((wx.code >= 51 && wx.code <= 67) || (wx.code >= 80 && wx.code <= 99));
  const advanced = wx ? getAdvancedInsights(wx) : null;

  const stars = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        top: `${(i * 37) % 92}%`,
        left: `${(i * 61) % 97}%`,
        size: (i % 3) + 1,
        delay: `${(i % 17) * 0.23}s`,
      })),
    [],
  );
  const drops = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: `${(i * 29) % 100}%`,
        delay: `${((i * 7) % 20) * 0.09}s`,
        dur: `${1 + ((i * 3) % 9) * 0.09}s`,
      })),
    [],
  );

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden font-sans text-foreground transition-[background-image] duration-1000 ${
        night ? "bg-sky-night" : "bg-sky-day"
      }`}
    >
      {/* ambient colour blobs */}
      <div
        className={`pointer-events-none absolute -left-24 -top-32 size-[420px] rounded-full blur-[120px] blob-a ${
          night ? "bg-brand/45" : "bg-sun/50"
        }`}
      />
      <div
        className={`pointer-events-none absolute -right-20 top-40 size-[460px] rounded-full blur-[130px] blob-b ${
          night ? "bg-accent-glow/30" : "bg-accent-glow/45"
        }`}
      />
      <div
        className={`pointer-events-none absolute bottom-0 left-1/3 size-[400px] rounded-full blur-[120px] blob-c ${
          night ? "bg-brand/35" : "bg-sun/40"
        }`}
      />

      {/* stars at night */}
      {night && (
        <div className="pointer-events-none absolute inset-0">
          {stars.map((s) => (
            <span
              key={s.id}
              className="twinkle absolute rounded-full bg-foreground"
              style={{
                top: s.top,
                left: s.left,
                width: s.size,
                height: s.size,
                animationDelay: s.delay,
              }}
            />
          ))}
          <span className="shooting-star absolute left-10 top-10 h-px w-24 bg-gradient-to-r from-transparent via-foreground to-transparent" />
          <span
            className="shooting-star absolute right-1/3 top-0 h-px w-16 bg-gradient-to-r from-transparent via-foreground to-transparent"
            style={{ animationDelay: "3.5s" }}
          />
        </div>
      )}

      {/* drifting clouds by day */}
      {!night && (
        <div className="pointer-events-none absolute inset-0">
          <span className="drift-x absolute left-1/4 top-24 text-6xl opacity-40">☁</span>
          <span className="drift-x absolute right-10 top-56 text-7xl opacity-30" style={{ animationDuration: "18s" }}>
            ☁
          </span>
          <span className="bob-y absolute left-8 top-72 text-5xl opacity-30">☁</span>
        </div>
      )}

      {/* rain */}
      {raining && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {drops.map((d) => (
            <span
              key={d.id}
              className="fall-rain absolute top-0 h-6 w-px bg-foreground/40"
              style={{ left: d.left, animationDelay: d.delay, animationDuration: d.dur }}
            />
          ))}
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-background/10" />
      <div className="sky-orbit pointer-events-none absolute right-[12%] top-28 size-20 rounded-full border border-foreground/20 opacity-60" />
      <div className="cloud-sail pointer-events-none absolute top-[42%] text-7xl opacity-30">☁</div>
      <div className="cloud-sail pointer-events-none absolute top-[68%] text-5xl opacity-20" style={{ animationDelay: "-14s", animationDuration: "34s" }}>☁</div>

      {/* header */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-2.5">
          <div className="bob-y grid size-9 place-items-center rounded-xl bg-foreground/20 text-lg backdrop-blur-md ring-1 ring-foreground/30">
            {night ? "🌙" : "☀"}
          </div>
          <span className="font-display text-xl font-bold tracking-tight">SKY WATCH</span>
        </div>
        <span className="rounded-full bg-foreground/10 px-4 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur-md ring-1 ring-foreground/20">
          {loading
            ? "Reading the sky…"
            : wx
              ? `${night ? "Night" : "Day"} · ${wx.time.slice(11, 16)} local`
              : ""}
        </span>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-10">
        {/* search + live Earth */}
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-5">
        <div ref={searchBox} className="relative w-full max-w-xl">
          <div className="flex items-center gap-3 rounded-full bg-foreground/15 px-5 py-3.5 shadow-2xl shadow-brand/20 backdrop-blur-xl ring-1 ring-foreground/25 focus-within:ring-2 focus-within:ring-foreground/60">
            <span className="text-lg">🔍</span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && suggestions[0]) pick(suggestions[0]);
              }}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground/60"
              placeholder="Search any village, town or city…"
              aria-label="Search for a place"
            />
          </div>
          {open && suggestions.length > 0 && (
            <div className="pop-in absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl bg-background/70 p-1.5 backdrop-blur-xl ring-1 ring-foreground/20">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pick(s)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-foreground/15"
                >
                  <span>{s.name}</span>
                  <span className="text-xs text-foreground/60">
                    {[s.region, s.country].filter(Boolean).join(", ")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <RotatingEarth size={104} night={night} />
        </div>


        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {QUICK.map((q) => (
            <button
              key={q.name}
              onClick={() => setPlace({ name: q.name, lat: q.lat, lon: q.lon })}
              className="rounded-full bg-foreground/10 px-3.5 py-1 text-xs font-medium text-foreground/85 backdrop-blur ring-1 ring-foreground/20 transition-transform hover:-translate-y-0.5 hover:bg-foreground/25"
            >
              {q.name}
            </button>
          ))}
        </div>

        {error && <p className="mt-8 text-center text-sm text-foreground/80">{error}</p>}

        {wx && info && advanced && (
          <div key={`${place.lat}-${place.lon}`}>
            {/* hero + hourly */}
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              <div className="rise-in weather-breathe relative overflow-hidden rounded-3xl bg-foreground/15 p-7 ring-1 ring-foreground/25 backdrop-blur-2xl lg:col-span-2">
                <div className="sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
                <div
                  className={`glow-pulse absolute -right-10 -top-10 size-44 rounded-full blur-2xl ${
                    night ? "bg-brand/40" : "bg-sun/40"
                  }`}
                />
                <div className="relative flex items-start justify-between">
                  <div>
                    <h1 className="text-sm font-medium text-foreground/80">
                      {place.name}
                      {place.region ? `, ${place.region}` : ""}
                    </h1>
                    <p className="mt-0.5 text-xs text-foreground/60">{wx.timezone}</p>
                  </div>
                  <div
                    className={`text-6xl leading-none ${
                      wx.isDay && wx.code <= 1 ? "spin-slow" : "bob-y"
                    }`}
                  >
                    {info.icon}
                  </div>
                </div>
                <div className="relative mt-4 flex items-end gap-3">
                  <span className="font-display text-7xl font-bold leading-none">{wx.temp}</span>
                  <span className="pb-1.5 text-2xl text-foreground/70">°C</span>
                  <span className="mb-1 ml-auto rounded-full bg-foreground/20 px-3 py-1 text-sm font-medium backdrop-blur">
                    {info.label}
                  </span>
                </div>
                <p className="relative mt-2 text-xs text-foreground/60">
                  H {wx.high}° · L {wx.low}° · {wx.elevation} m above sea level
                </p>
                <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat icon="💧" label="Humidity" value={`${wx.humidity}%`} delay={0} />
                  <Stat icon="💨" label="Wind" value={`${wx.wind} km/h ${wx.windDir}`} delay={60} />
                  <Stat icon="🌡" label="Feels like" value={`${wx.feels}°`} delay={120} />
                  <Stat
                    icon="🌅"
                    label="Sunrise · set"
                    value={`${wx.sunrise} · ${wx.sunset}`}
                    delay={180}
                  />
                </div>
              </div>

              <div
                className="rise-in rounded-3xl bg-foreground/15 p-6 ring-1 ring-foreground/25 backdrop-blur-2xl"
                style={{ animationDelay: "80ms" }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold">Next hours</h2>
                  <span className="text-xs text-foreground/60">Hourly</span>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {wx.hourly.slice(0, 6).map((h, i) => {
                    const hi = weatherInfo(h.code, h.isDay);
                    return (
                      <div
                        key={h.time}
                        className={
                          i === 0
                            ? "pop-in flex items-center gap-3 rounded-2xl bg-foreground/10 px-4 py-2.5 ring-1 ring-foreground/15"
                            : "pop-in flex items-center gap-3 px-4"
                        }
                        style={{ animationDelay: `${120 + i * 60}ms` }}
                      >
                        <span
                          className={`text-sm ${i === 0 ? "font-semibold" : "text-foreground/70"}`}
                        >
                          {i === 0 ? "Now" : hourLabel(h.time, wx.time)}
                        </span>
                        <span className="text-lg">{hi.icon}</span>
                        {h.precip > 0 && (
                          <span className="text-[10px] text-foreground/60">💧{h.precip}%</span>
                        )}
                        <span className="ml-auto font-display text-lg font-semibold">{h.temp}°</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* smart insights */}
            <div
              className="rise-in mt-5 overflow-hidden rounded-3xl bg-foreground/15 p-6 ring-1 ring-foreground/25 backdrop-blur-2xl"
              style={{ animationDelay: "100ms" }}
            >
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-foreground/60">Sky intelligence</p>
                  <h2 className="mt-1 font-display text-xl font-semibold">{advanced.summary}</h2>
                </div>
                <span className="rounded-full bg-foreground/15 px-3 py-1 text-xs text-foreground/80 ring-1 ring-foreground/20">Live analysis</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat icon="🫧" label="Comfort" value={advanced.comfort} delay={40} />
                <Stat icon="🍃" label="Wind force" value={advanced.windForce} delay={100} />
                <Stat icon="🌙" label="Moon phase" value={advanced.moonPhase} delay={160} />
                <Stat icon="✨" label="Golden hour" value={advanced.goldenHour} delay={220} />
              </div>
            </div>

            {/* advanced conditions */}
            <div
              className="rise-in forecast-spectrum mt-5 overflow-hidden rounded-3xl p-6 ring-1 ring-foreground/30 backdrop-blur-2xl"
              style={{ animationDelay: "120ms" }}
            >
              <h2 className="font-display text-base font-semibold">Detailed conditions</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat
                  icon="⛰"
                  label="Altitude (sea level)"
                  value={`${wx.elevation} m`}
                  delay={40}
                />
                <Stat icon="🧭" label="Pressure" value={`${wx.pressure} hPa`} delay={80} />
                <Stat icon="👁" label="Visibility" value={`${wx.visibility} km`} delay={120} />
                <Stat icon="🌫" label="Dew point" value={`${wx.dewPoint}°`} delay={160} />
                <Stat icon="☁" label="Cloud cover" value={`${wx.cloudCover}%`} delay={200} />
                <Stat icon="🌬" label="Wind gusts" value={`${wx.gusts} km/h`} delay={240} />
                <Stat icon="🔆" label="UV index" value={`${wx.uv} · ${uvLabel(wx.uv)}`} delay={280} />
                <Stat icon="⏳" label="Daylight" value={wx.dayLength} delay={320} />
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-foreground/70">
                  <span>Rain chance today</span>
                  <span>{wx.precip}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-foreground/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-accent-glow transition-[width] duration-1000"
                    style={{ width: `${wx.precip}%` }}
                  />
                </div>
              </div>
            </div>

            {/* emissions + climate lab */}
            <ClimateLab
              air={air}
              drivers={drivers}
              setDrivers={setDrivers}
              latitude={place.lat}
              placeName={place.name}
              targetYear={targetYear}
              setTargetYear={setTargetYear}
            />

            {/* 7-day */}
            <div
              className="rise-in mt-5 rounded-3xl bg-foreground/15 p-6 ring-1 ring-foreground/25 backdrop-blur-2xl"
              style={{ animationDelay: "160ms" }}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-forecast via-accent-glow to-forecast-glow" />
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-xl font-bold text-forecast">7 Day Forecast</h2>
                <span className="sky-orbit text-2xl">✦</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {wx.daily.map((d, i) => {
                  const di = weatherInfo(d.code, true);
                  return (
                    <div
                      key={d.date}
                      className="rise-in forecast-wave rounded-2xl bg-background/30 p-4 text-center ring-1 ring-forecast/40 shadow-lg shadow-forecast/10 backdrop-blur-md transition-transform duration-300 hover:-translate-y-2 hover:scale-[1.05] hover:bg-background/45"
                      style={{ animationDelay: `${180 + i * 180}ms` }}
                    >
                      <p className="text-xs text-foreground/70">
                        {i === 0 ? "Today" : weekday(d.date)}
                      </p>
                      <p className="bob-y my-2 text-2xl" style={{ animationDelay: `${i * 0.3}s` }}>
                        {di.icon}
                      </p>
                      <p className="font-display font-semibold">{d.max}°</p>
                      <p className="text-xs text-foreground/50">{d.min}°</p>
                      {d.precipProb > 30 && (
                        <p className="mt-1 text-[10px] text-foreground/80">💧{d.precipProb}%</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function getAdvancedInsights(wx: Weather) {
  const comfort = wx.humidity > 78
    ? "Very humid"
    : wx.humidity > 62
      ? "Humid"
      : wx.feels >= 18 && wx.feels <= 27
        ? "Comfortable"
        : wx.feels < 10
          ? "Chilly"
          : "Warm";
  const windForce = wx.wind < 2 ? "Calm" : wx.wind < 12 ? "Light breeze" : wx.wind < 29 ? "Fresh breeze" : wx.wind < 50 ? "Strong wind" : "Gale force";
  const moonPhase = getMoonPhase(new Date(wx.time));
  const goldenHour = wx.isDay ? `${subtractHour(wx.sunset)}–${wx.sunset}` : `${wx.sunrise}–${addHour(wx.sunrise)}`;
  const summary = wx.precip >= 60
    ? "Keep an umbrella close today"
    : wx.uv >= 7
      ? "Strong sunshine — protect your skin"
      : wx.gusts >= 40
        ? "A blustery day with powerful gusts"
        : wx.visibility < 3
          ? "Low visibility — travel carefully"
          : `${weatherInfo(wx.code, wx.isDay).label} with ${comfort.toLowerCase()} air`;
  return { comfort, windForce, moonPhase, goldenHour, summary };
}

function getMoonPhase(date: Date) {
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const lunarCycle = 29.53058867;
  const age = ((date.getTime() - knownNewMoon) / 86400000) % lunarCycle;
  const normalized = age < 0 ? age + lunarCycle : age;
  if (normalized < 1.85 || normalized >= 27.68) return "New moon";
  if (normalized < 5.54) return "Waxing crescent";
  if (normalized < 9.23) return "First quarter";
  if (normalized < 12.92) return "Waxing gibbous";
  if (normalized < 16.61) return "Full moon";
  if (normalized < 20.3) return "Waning gibbous";
  if (normalized < 23.99) return "Last quarter";
  return "Waning crescent";
}

function shiftTime(time: string, hours: number) {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  const shifted = (hour + hours + 24) % 24;
  return `${String(shifted).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function subtractHour(time: string) {
  return shiftTime(time, -1);
}

function addHour(time: string) {
  return shiftTime(time, 1);
}

function Stat({
  icon,
  label,
  value,
  delay = 0,
}: {
  icon: string;
  label: string;
  value: string;
  delay?: number;
}) {
  return (
    <div
      className="pop-in rounded-2xl bg-foreground/10 p-3 ring-1 ring-foreground/15 backdrop-blur transition-transform duration-300 hover:-translate-y-0.5 hover:bg-foreground/20"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-2xl">{icon}</p>
      <p className="mt-1 text-xs text-foreground/70">{label}</p>
      <p className="font-display text-lg font-semibold">{value}</p>
    </div>
  );
}
