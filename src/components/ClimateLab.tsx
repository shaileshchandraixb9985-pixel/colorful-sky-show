import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  aqiLabel,
  END_YEAR,
  everyDecade,
  impactVerdict,
  project,
  type AirData,
  type Drivers,
} from "@/lib/climate";

interface Props {
  air: AirData | null;
  drivers: Drivers;
  setDrivers: (d: Drivers) => void;
  latitude: number;
  placeName: string;
  targetYear: number;
  setTargetYear: (y: number) => void;
}

const AXIS = "oklch(0.97 0.01 280 / 0.55)";

const tooltipStyle = {
  background: "oklch(0.22 0.06 290 / 0.95)",
  border: "1px solid oklch(0.97 0.01 280 / 0.2)",
  borderRadius: "0.9rem",
  color: "oklch(0.97 0.01 280)",
  fontSize: "0.75rem",
} as const;

export function ClimateLab({
  air,
  drivers,
  setDrivers,
  latitude,
  placeName,
  targetYear,
  setTargetYear,
}: Props) {
  const points = useMemo(
    () => project(drivers, air, latitude),
    [drivers, air, latitude],
  );
  const chart = useMemo(() => everyDecade(points), [points]);
  const final = points[points.length - 1]!;
  const target = points.find((p) => p.year === targetYear) ?? final;
  const verdict = impactVerdict(target);

  const set = (k: keyof Drivers, v: number) => setDrivers({ ...drivers, [k]: v });

  return (
    <>
      {/* live emissions */}
      <div
        className="rise-in mt-5 rounded-3xl bg-foreground/15 p-6 ring-1 ring-foreground/25 backdrop-blur-2xl"
        style={{ animationDelay: "150ms" }}
      >
        <h2 className="font-display text-lg font-semibold">
          Emissions & air over {placeName}
        </h2>
        <p className="mt-1 text-xs text-foreground/60">
          Live atmospheric readings for this exact spot
        </p>

        {!air ? (
          <p className="mt-4 text-sm text-foreground/60">Reading the air…</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric
                icon="🏭"
                label="CO₂"
                value={`${air.co2} ppm`}
                delay={0}
                highlight
              />
              <Metric icon="💨" label="Methane" value={`${air.methane} µg/m³`} delay={60} />
              <Metric
                icon="🌫️"
                label="Air quality"
                value={`${air.aqi} · ${aqiLabel(air.aqi)}`}
                delay={120}
              />
              <Metric icon="🫁" label="PM2.5" value={`${air.pm2_5} µg/m³`} delay={180} />
              <Metric icon="🌪️" label="PM10" value={`${air.pm10} µg/m³`} delay={240} />
              <Metric icon="🚗" label="NO₂" value={`${air.no2} µg/m³`} delay={300} />
              <Metric icon="⚗️" label="SO₂" value={`${air.so2} µg/m³`} delay={360} />
              <Metric icon="☁️" label="Ozone" value={`${air.ozone} µg/m³`} delay={420} />
            </div>

            <div className="mt-5 h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "PM2.5", v: air.pm2_5 },
                    { name: "PM10", v: air.pm10 },
                    { name: "NO₂", v: air.no2 },
                    { name: "SO₂", v: air.so2 },
                    { name: "Ozone", v: air.ozone },
                    { name: "Dust", v: air.dust },
                  ]}
                >
                  <CartesianGrid strokeOpacity={0.12} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={11} tickLine={false} />
                  <YAxis stroke={AXIS} fontSize={11} tickLine={false} width={34} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ opacity: 0.08 }} />
                  <Bar
                    dataKey="v"
                    name="µg/m³"
                    radius={[8, 8, 0, 0]}
                    fill="var(--accent-glow)"
                    animationDuration={1200}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* predictor */}
      <div
        className="rise-in mt-5 overflow-hidden rounded-3xl bg-foreground/15 ring-1 ring-foreground/25 backdrop-blur-2xl"
        style={{ animationDelay: "180ms" }}
      >
        <div className="forecast-spectrum h-1.5 w-full" />
        <div className="p-6">
          <h2 className="font-display text-lg font-semibold">
            Climate predictor · {placeName} to {END_YEAR}
          </h2>
          <p className="mt-1 text-xs text-foreground/60">
            Move the drivers and watch this place&apos;s future change
          </p>

          {/* year scrubber */}
          <div className="mt-5 rounded-2xl bg-foreground/10 p-4 ring-1 ring-foreground/15">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wide text-foreground/60">
                Prediction year
              </span>
              <span className="font-display text-2xl font-bold text-forecast">
                {targetYear}
              </span>
            </div>
            <input
              type="range"
              min={2030}
              max={END_YEAR}
              step={10}
              value={targetYear}
              onChange={(e) => setTargetYear(Number(e.target.value))}
              className="mt-3 w-full accent-[var(--forecast)]"
              aria-label="Prediction year"
            />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric
                icon="🌡️"
                label="Local warming"
                value={`+${target.temp.toFixed(2)} °C`}
                highlight
              />
              <Metric icon="🏭" label="CO₂" value={`${target.co2} ppm`} />
              <Metric icon="🌊" label="Sea level" value={`+${target.seaLevel} cm`} />
              <Metric icon="🔥" label="Days over 35°C" value={`${target.heatDays}`} />
              <Metric icon="🌳" label="Forest left" value={`${target.forest}%`} />
              <Metric icon="💨" label="Methane" value={`${target.methane} ppb`} />
              <Metric icon="👥" label="Population" value={`${target.population}%`} />
              <Metric icon="🏡" label="Liveability" value={`${target.habitability}/100`} />
            </div>
            <div className="mt-4 rounded-2xl bg-foreground/10 p-4 ring-1 ring-foreground/15">
              <p className="font-display text-sm font-semibold text-forecast-glow">
                {verdict.tone} in {targetYear}
              </p>
              <p className="mt-1 text-sm text-foreground/75">{verdict.text}</p>
              <p className="mt-2 text-xs text-foreground/55">
                By {END_YEAR}: +{final.temp.toFixed(2)} °C, {final.co2} ppm CO₂, sea level
                +{final.seaLevel} cm, liveability {final.habitability}/100.
              </p>
            </div>
          </div>

          {/* drivers */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Slider
              label="CO₂ emissions"
              hint="× today's rate"
              value={drivers.co2}
              min={0}
              max={3}
              step={0.05}
              format={(v) => `${v.toFixed(2)}×`}
              onChange={(v) => set("co2", v)}
            />
            <Slider
              label="Methane emissions"
              hint="× today's rate"
              value={drivers.methane}
              min={0}
              max={3}
              step={0.05}
              format={(v) => `${v.toFixed(2)}×`}
              onChange={(v) => set("methane", v)}
            />
            <Slider
              label="Deforestation"
              hint="forest lost each year"
              value={drivers.deforestation}
              min={0}
              max={2}
              step={0.01}
              format={(v) => `${v.toFixed(2)}%/yr`}
              onChange={(v) => set("deforestation", v)}
            />
            <Slider
              label="Population growth"
              hint="per year"
              value={drivers.population}
              min={-1}
              max={3}
              step={0.05}
              format={(v) => `${v.toFixed(2)}%/yr`}
              onChange={(v) => set("population", v)}
            />
            <Slider
              label="Air pollution"
              value={drivers.airPollution}
              min={0}
              max={100}
              step={1}
              format={(v) => `${v}/100`}
              onChange={(v) => set("airPollution", v)}
            />
            <Slider
              label="Land pollution"
              value={drivers.landPollution}
              min={0}
              max={100}
              step={1}
              format={(v) => `${v}/100`}
              onChange={(v) => set("landPollution", v)}
            />
            <Slider
              label="Water pollution"
              value={drivers.waterPollution}
              min={0}
              max={100}
              step={1}
              format={(v) => `${v}/100`}
              onChange={(v) => set("waterPollution", v)}
            />
            <Slider
              label="Noise pollution"
              value={drivers.noisePollution}
              min={0}
              max={100}
              step={1}
              format={(v) => `${v}/100`}
              onChange={(v) => set("noisePollution", v)}
            />
          </div>

          {/* charts */}
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <ChartCard title="Warming at this place (°C)">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="gTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--forecast-glow)" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="var(--forecast-glow)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeOpacity={0.12} vertical={false} />
                <XAxis dataKey="year" stroke={AXIS} fontSize={11} tickLine={false} />
                <YAxis stroke={AXIS} fontSize={11} tickLine={false} width={34} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="temp"
                  name="°C"
                  stroke="var(--forecast-glow)"
                  strokeWidth={2.5}
                  fill="url(#gTemp)"
                  animationDuration={1400}
                />
              </AreaChart>
            </ChartCard>

            <ChartCard title="Greenhouse gases">
              <LineChart data={chart}>
                <CartesianGrid strokeOpacity={0.12} vertical={false} />
                <XAxis dataKey="year" stroke={AXIS} fontSize={11} tickLine={false} />
                <YAxis stroke={AXIS} fontSize={11} tickLine={false} width={44} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="co2"
                  name="CO₂ ppm"
                  stroke="var(--brand)"
                  strokeWidth={2.5}
                  dot={false}
                  animationDuration={1400}
                />
                <Line
                  type="monotone"
                  dataKey="methane"
                  name="CH₄ ppb"
                  stroke="var(--sun)"
                  strokeWidth={2.5}
                  dot={false}
                  animationDuration={1600}
                />
              </LineChart>
            </ChartCard>

            <ChartCard title="Sea level rise (cm)">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="gSea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeOpacity={0.12} vertical={false} />
                <XAxis dataKey="year" stroke={AXIS} fontSize={11} tickLine={false} />
                <YAxis stroke={AXIS} fontSize={11} tickLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="seaLevel"
                  name="cm"
                  stroke="var(--brand)"
                  strokeWidth={2.5}
                  fill="url(#gSea)"
                  animationDuration={1400}
                />
              </AreaChart>
            </ChartCard>

            <ChartCard title="Forest cover & liveability">
              <LineChart data={chart}>
                <CartesianGrid strokeOpacity={0.12} vertical={false} />
                <XAxis dataKey="year" stroke={AXIS} fontSize={11} tickLine={false} />
                <YAxis stroke={AXIS} fontSize={11} tickLine={false} width={34} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="forest"
                  name="Forest %"
                  stroke="var(--forecast)"
                  strokeWidth={2.5}
                  dot={false}
                  animationDuration={1400}
                />
                <Line
                  type="monotone"
                  dataKey="habitability"
                  name="Liveability"
                  stroke="var(--accent-glow)"
                  strokeWidth={2.5}
                  dot={false}
                  animationDuration={1600}
                />
              </LineChart>
            </ChartCard>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-foreground/45">
            A simplified model for exploring scenarios: today&apos;s local readings are
            carried forward with greenhouse warming, latitude amplification and pollution
            load. It shows direction and scale, not an official forecast.
          </p>
        </div>
      </div>
    </>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-2xl bg-foreground/10 p-4 ring-1 ring-foreground/15">
      <p className="mb-2 text-xs uppercase tracking-wide text-foreground/60">{title}</p>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  delay = 0,
  highlight = false,
}: {
  icon: string;
  label: string;
  value: string;
  delay?: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`pop-in rounded-2xl p-3 ring-1 backdrop-blur transition-transform duration-300 hover:-translate-y-0.5 ${
        highlight
          ? "bg-forecast/20 ring-forecast/40"
          : "bg-foreground/10 ring-foreground/15 hover:bg-foreground/20"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-xl">{icon}</p>
      <p className="mt-1 text-[11px] text-foreground/70">{label}</p>
      <p className="font-display text-sm font-semibold">{value}</p>
    </div>
  );
}

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-2xl bg-foreground/10 p-4 ring-1 ring-foreground/15">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-display text-sm font-semibold text-forecast-glow">
          {format(value)}
        </span>
      </div>
      {hint && <p className="text-[11px] text-foreground/50">{hint}</p>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--accent-glow)]"
        aria-label={label}
      />
    </div>
  );
}
