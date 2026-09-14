import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchWeather,
  hourLabel,
  searchPlaces,
  weatherInfo,
  weekday,
  type Place,
  type Weather,
} from "@/lib/weather";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aether — Weather for anywhere on Earth" },
      {
        name: "description",
        content:
          "Search any village, town or city worldwide and see live weather, hourly and 7-day forecasts in a colourful animated sky.",
      },
      { property: "og:title", content: "Aether — Weather for anywhere on Earth" },
      {
        property: "og:description",
        content:
          "Live weather for any village, town or city — animated, colourful, global.",
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

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-aurora font-sans text-foreground">
      {/* animated aurora background */}
      <div className="pointer-events-none absolute -left-24 -top-32 size-[420px] rounded-full bg-brand/50 blur-[120px] blob-a" />
      <div className="pointer-events-none absolute -right-20 top-40 size-[460px] rounded-full bg-accent-glow/45 blur-[130px] blob-b" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 size-[400px] rounded-full bg-sun/40 blur-[120px] blob-c" />
      <div className="pointer-events-none absolute inset-0 bg-background/10" />

      {/* header */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-foreground/20 text-lg backdrop-blur-md ring-1 ring-foreground/30">
            ☀
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Aether</span>
        </div>
        <span className="rounded-full bg-foreground/10 px-4 py-1.5 text-xs font-medium text-foreground/70 backdrop-blur-md ring-1 ring-foreground/20">
          {loading ? "Reading the sky…" : wx ? `Updated · ${wx.time.slice(11, 16)} local` : ""}
        </span>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-10">
        {/* search */}
        <div ref={searchBox} className="relative mx-auto max-w-xl">
          <div className="flex items-center gap-3 rounded-full bg-foreground/15 px-5 py-3.5 shadow-2xl shadow-brand/20 backdrop-blur-xl ring-1 ring-foreground/25 focus-within:ring-2 focus-within:ring-brand">
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
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground/50"
              placeholder="Search any village, town or city…"
              aria-label="Search for a place"
            />
          </div>
          {open && suggestions.length > 0 && (
            <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl bg-background/60 p-1.5 backdrop-blur-xl ring-1 ring-foreground/20">
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

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {QUICK.map((q) => (
            <button
              key={q.name}
              onClick={() => setPlace({ name: q.name, lat: q.lat, lon: q.lon })}
              className="rounded-full bg-foreground/10 px-3.5 py-1 text-xs font-medium text-foreground/80 backdrop-blur ring-1 ring-foreground/20 transition-colors hover:bg-foreground/25"
            >
              {q.name}
            </button>
          ))}
        </div>

        {error && <p className="mt-8 text-center text-sm text-foreground/80">{error}</p>}

        {wx && info && (
          <div key={`${place.lat}-${place.lon}`}>
            {/* hero + hourly */}
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              <div className="rise-in relative overflow-hidden rounded-3xl bg-foreground/15 p-7 ring-1 ring-foreground/25 backdrop-blur-2xl lg:col-span-2">
                <div className="glow-pulse absolute -right-10 -top-10 size-44 rounded-full bg-sun/30 blur-2xl" />
                <div className="drift-x absolute bottom-2 left-3 flex gap-1.5">
                  <span className="text-3xl opacity-70">☁</span>
                  <span className="text-2xl opacity-50">☁</span>
                  <span className="text-4xl opacity-80">☁</span>
                </div>
                <div className="relative flex items-start justify-between">
                  <div>
                    <h1 className="text-sm font-medium text-foreground/70">
                      {place.name}
                      {place.region ? `, ${place.region}` : ""}
                    </h1>
                    <p className="mt-0.5 text-xs text-foreground/50">{wx.timezone}</p>
                  </div>
                  <div className={`text-6xl leading-none ${wx.isDay && wx.code <= 1 ? "spin-slow" : ""}`}>
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
                <p className="relative mt-2 text-xs text-foreground/50">
                  H {wx.high}° · L {wx.low}°
                </p>
                <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat icon="💧" label="Humidity" value={`${wx.humidity}%`} />
                  <Stat icon="💨" label="Wind" value={`${wx.wind} km/h ${wx.windDir}`} />
                  <Stat icon="🌡" label="Feels like" value={`${wx.feels}°`} />
                  <Stat icon="🌅" label="Sunrise · set" value={`${wx.sunrise} · ${wx.sunset}`} />
                </div>
              </div>

              <div className="rise-in rounded-3xl bg-foreground/15 p-6 ring-1 ring-foreground/25 backdrop-blur-2xl" style={{ animationDelay: "80ms" }}>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold">Next hours</h2>
                  <span className="text-xs text-foreground/50">Hourly</span>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {wx.hourly.slice(0, 6).map((h, i) => {
                    const hi = weatherInfo(h.code, h.isDay);
                    return (
                      <div
                        key={h.time}
                        className={
                          i === 0
                            ? "flex items-center gap-3 rounded-2xl bg-foreground/10 px-4 py-2.5 ring-1 ring-foreground/15"
                            : "flex items-center gap-3 px-4"
                        }
                      >
                        <span className={`text-sm ${i === 0 ? "font-semibold" : "text-foreground/60"}`}>
                          {i === 0 ? "Now" : hourLabel(h.time, wx.time)}
                        </span>
                        <span className="text-lg">{hi.icon}</span>
                        <span className="ml-auto font-display text-lg font-semibold">{h.temp}°</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 7-day */}
            <div className="rise-in mt-5 rounded-3xl bg-foreground/15 p-6 ring-1 ring-foreground/25 backdrop-blur-2xl" style={{ animationDelay: "160ms" }}>
              <h2 className="font-display text-base font-semibold">7-day outlook</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {wx.daily.map((d, i) => {
                  const di = weatherInfo(d.code, true);
                  return (
                    <div
                      key={d.date}
                      className="rise-in rounded-2xl bg-foreground/10 p-4 text-center ring-1 ring-foreground/15 transition-transform hover:-translate-y-0.5"
                      style={{ animationDelay: `${180 + i * 40}ms` }}
                    >
                      <p className="text-xs text-foreground/60">{i === 0 ? "Today" : weekday(d.date)}</p>
                      <p className="my-2 text-2xl">{di.icon}</p>
                      <p className="font-display font-semibold">{d.max}°</p>
                      <p className="text-xs text-foreground/40">{d.min}°</p>
                      {d.precipProb > 30 && <p className="mt-1 text-[10px] text-brand">💧{d.precipProb}%</p>}
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

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-foreground/10 p-3 ring-1 ring-foreground/15 backdrop-blur">
      <p className="text-2xl">{icon}</p>
      <p className="mt-1 text-xs text-foreground/60">{label}</p>
      <p className="font-display text-lg font-semibold">{value}</p>
    </div>
  );
}
