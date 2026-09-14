# SKY WATCH and richer forecast

## What will change
- Rename **Aether** to **SKY WATCH** throughout the page and sharing metadata.
- Add advanced, understandable insights derived from live conditions: comfort level, wind force, moon phase, golden-hour timing, and an at-a-glance weather summary.
- Rename **7-day outlook** to **7 Day Forecast** and give it a distinct colourful treatment that remains readable in both day and night skies.
- Increase weather-responsive animation with layered sky motion, animated forecast cards, moving condition accents, and more expressive sun, moon, cloud, rain, and atmosphere effects.
- Keep support for villages, towns, and cities worldwide, with no sign-up or API key.

## Technical details
- Extend the existing Open-Meteo data model only where needed; derive astronomy and comfort information locally when the available weather fields are sufficient.
- Add semantic colour and motion tokens in the global design system, including reduced-motion fallbacks.
- Update the existing single weather page without adding accounts, storage, or unrelated pages.
- Verify loading, location search, daytime/nighttime presentation, forecast readability, and desktop/mobile layouts.
