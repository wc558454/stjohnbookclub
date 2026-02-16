import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'St. John Chrysostom Bookclub',
    short_name: 'Chrysostom Bookclub',
    description: 'A specialized platform for spiritual reading fellowship, designed for the St. Paul Hospital Medical College Campus Fellowship.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f6f5', // From --background HSL
    theme_color: '#314154', // From --primary HSL
  }
}
