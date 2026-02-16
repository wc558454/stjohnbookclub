import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export function GET() {
  const iconUrl = "https://images.unsplash.com/photo-1495640388908-05fa85288e61?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw2fHxvcGVuJTIwYm9va3xlbnwwfHx8fDE3NzEwOTQ4MjN8MA&ixlib=rb-4.1.0&q=80&w=1080";

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
