import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
  const iconUrl = "https://images.unsplash.com/photo-1532012197267-da84d127e765?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxib29rJTIwfGVufDB8fHx8MTc3MjM4OTY3Mnww&ixlib=rb-4.1.0&q=80&w=1080";
  
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          overflow: 'hidden'
        }}
      >
        <img src={iconUrl} alt="St. John Chrysostom Bookclub" style={{ width: '100%', height: '100%' }} />
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  )
}
