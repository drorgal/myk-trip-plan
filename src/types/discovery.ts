export type AttractionCategory =
  | 'museum'
  | 'park'
  | 'restaurant'
  | 'landmark'
  | 'beach'
  | 'shopping'
  | 'entertainment'

export interface AttractionReview {
  author: string
  rating: number
  text: string
  date: string
}

export interface AttractionMedia {
  url: string
  caption?: string
  type: 'image' | 'video'
}

export interface Attraction {
  id: string
  name: string
  category: AttractionCategory
  description?: string
  location: string
  rating?: number
  reviewCount?: number
  priceLevel?: 1 | 2 | 3 | 4
  estimatedDuration?: number
  reviews: AttractionReview[]
  media: AttractionMedia[]
  openingHours?: string
  googleMapsUrl?: string
}
