import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export function GET() {
  const iconUrl = "https://images.unsplash.com/photo-1532012197267-da84d127e765?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxib29rJTIwfGVufDB8fHx8MTc3MjM4OTY3Mnww&ixlib=rb-4.1.0&q=80&w=1080";

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 24,
          overflow: 'hidden',
        }}
      >
        <img src={iconUrl} alt="St. John Chrysostom Bookclub" style={{ width: '100%', height: '100%' }} />
      </div>
    ),
    {
      width: 192,
      height: 192,
    }
  )
}
