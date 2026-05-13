import type { Attraction, AttractionCategory } from '@/types/discovery'
import { geocodeCity } from '@/utils/geocode'

const OVERPASS = 'https://overpass-api.de/api/interpreter'

function inferCategory(tags: Record<string, string>): AttractionCategory {
  const tourism = tags.tourism ?? ''
  const amenity = tags.amenity ?? ''
  const leisure = tags.leisure ?? ''
  const natural = tags.natural ?? ''

  if (tourism === 'museum' || tourism === 'gallery' || amenity === 'arts_centre') return 'museum'
  if (tourism === 'beach' || natural === 'beach') return 'beach'
  if (leisure === 'park' || leisure === 'nature_reserve' || leisure === 'garden') return 'park'
  if (amenity === 'restaurant' || amenity === 'cafe' || amenity === 'food_court') return 'restaurant'
  if (tags.shop || amenity === 'marketplace' || tourism === 'mall') return 'shopping'
  if (amenity === 'cinema' || amenity === 'theatre' || tourism === 'theme_park') return 'entertainment'
  return 'landmark'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function osmNodeToAttraction(node: any): Attraction | null {
  const tags: Record<string, string> = node.tags ?? {}
  const name = tags['name:he'] ?? tags.name ?? tags['name:en']
  if (!name) return null

  const lat: number | undefined = node.lat
  const lng: number | undefined = node.lon

  return {
    id: `osm-${node.id}`,
    name,
    category: inferCategory(tags),
    description: tags['description:he'] ?? tags.description ?? undefined,
    location: tags['addr:city'] ?? tags['addr:state'] ?? '',
    rating: undefined,
    reviewCount: undefined,
    priceLevel: tags.fee === 'yes' ? 2 : 1,
    estimatedDuration: undefined,
    openingHours: tags.opening_hours,
    googleMapsUrl:
      lat != null && lng != null
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : undefined,
    reviews: [],
    media: tags.image ? [{ url: tags.image, type: 'image' }] : [],
  }
}

export async function fetchFreeAttractions(
  destination: string,
  category?: AttractionCategory,
): Promise<Attraction[]> {
  const { lat, lng } = await geocodeCity(destination).catch(() => {
    throw new Error(`לא נמצא מיקום עבור "${destination}" — כתוב שם העיר באנגלית`)
  })
  const radius = 15000

  const query = `[out:json][timeout:15];
(
  node["tourism"~"museum|gallery|attraction|viewpoint|monument|castle|ruins|theme_park|artwork"](around:${radius},${lat},${lng});
  node["tourism"="beach"](around:${radius},${lat},${lng});
  node["natural"="beach"](around:${radius},${lat},${lng});
  node["leisure"~"park|nature_reserve|garden"](around:${radius},${lat},${lng});
  node["amenity"~"cinema|theatre|restaurant"](around:${radius},${lat},${lng});
);
out body 80;`

  const res = await fetch(OVERPASS, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (!res.ok) throw new Error(`שגיאת Overpass API: ${res.status}`)
  const data = await res.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elements: any[] = data.elements ?? []
  const attractions = elements
    .map(osmNodeToAttraction)
    .filter((a): a is Attraction => a !== null)

  const seen = new Set<string>()
  const unique = attractions.filter(a => {
    if (seen.has(a.name)) return false
    seen.add(a.name)
    return true
  })

  const result = unique.slice(0, 40)
  return category ? result.filter(a => a.category === category) : result
}
