/**
 * Seva AI — Weather Risk Service (Agentic Tool)
 *
 * Called by Gemma 4 31B's function calling during disaster report reasoning.
 * Uses Open-Meteo API (free, no auth required — perfect for hackathon demo).
 *
 * Returns a structured risk assessment usable as a weather bonus (+0.5 to +1.5)
 * in the Urgency Decay Formula: U = S × (1 + T/12) × Z + R + W
 */

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

/**
 * Weather condition → urgency bonus mapping.
 * Matches the architecture formula: W = +0.5 rain, +1.0 heat, +1.5 flood
 */
function classifyWeatherRisk(current) {
  const code = current.weathercode ?? 0;
  const temp = current.temperature_2m ?? 25;
  const wind = current.windspeed_10m ?? 0;
  const rain = current.precipitation ?? 0;

  // WMO Weather Interpretation Codes
  if (code >= 95) return { bonus: 1.5, label: 'THUNDERSTORM', description: 'Active thunderstorm — extreme risk, flash flooding likely' };
  if (code >= 80) return { bonus: 1.5, label: 'HEAVY_RAIN',   description: 'Heavy rainfall — flood risk, evacuation routes may be blocked' };
  if (code >= 61) return { bonus: 1.0, label: 'RAIN',         description: 'Moderate rain — reduced visibility, mobility impaired' };
  if (code >= 51) return { bonus: 0.7, label: 'DRIZZLE',      description: 'Drizzle — minor mobility impact' };
  if (temp > 42)  return { bonus: 1.0, label: 'HEAT_WAVE',    description: 'Heat wave (>42°C) — extreme dehydration risk for elderly' };
  if (temp > 38)  return { bonus: 0.7, label: 'HIGH_HEAT',    description: 'High heat (>38°C) — elevated risk for vulnerable populations' };
  if (wind > 60)  return { bonus: 0.8, label: 'STRONG_WIND',  description: 'Strong winds (>60 km/h) — structural damage risk' };
  return { bonus: 0.5, label: 'CLEAR',       description: 'Clear conditions — standard risk baseline' };
}

/**
 * Fetch current weather for a GPS coordinate using Open-Meteo.
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{ bonus: number, label: string, description: string, raw: object }>}
 */
async function getWeatherRisk(lat, lng) {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat.toFixed(4));
    url.searchParams.set('longitude', lng.toFixed(4));
    url.searchParams.set('current', [
      'temperature_2m',
      'weathercode',
      'windspeed_10m',
      'precipitation',
      'relativehumidity_2m',
    ].join(','));
    url.searchParams.set('timezone', 'Asia/Kolkata');
    url.searchParams.set('forecast_days', '1');

    const resp = await fetch(url.toString(), { timeout: 5000 });
    if (!resp.ok) throw new Error(`Open-Meteo ${resp.status}`);

    const data = await resp.json();
    const current = data.current || {};
    const risk = classifyWeatherRisk(current);

    return {
      ...risk,
      raw: {
        temperature: current.temperature_2m,
        weathercode: current.weathercode,
        windspeed: current.windspeed_10m,
        precipitation: current.precipitation,
        humidity: current.relativehumidity_2m,
      },
    };
  } catch (err) {
    console.warn('[WeatherService] Open-Meteo failed:', err.message);
    // Safe default — moderate risk in case of API failure
    return { bonus: 0.5, label: 'UNKNOWN', description: 'Weather data unavailable — using baseline risk' };
  }
}

module.exports = { getWeatherRisk, classifyWeatherRisk };
