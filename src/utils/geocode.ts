const NOMINATIM = 'https://nominatim.openstreetmap.org'

export async function geocodeCity(city: string): Promise<{ lat: number; lng: number; displayName: string }> {
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(city)}&format=json&limit=1`
  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'myk-trip-plan/1.0 (https://github.com/drorgal/myk-trip-plan)',
    },
  })
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`)
  const data = await res.json()
  if (!data.length) throw new Error(`לא נמצא מיקום עבור "${city}"`)
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name.split(',')[0],
  }
}
