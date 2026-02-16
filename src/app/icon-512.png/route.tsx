import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export function GET() {
  const iconUrl = "https://images.unsplash.com/photo-1766524791322-8753e582e652?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw5fHxzcGlyaXR1YWwlMjBpY29ufGVufDB8fHx8MTc3MTE2OTY4NXww&ixlib=rb-4.1.0&q=80&w=1080";
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 64,
          overflow: 'hidden',
        }}
      >
        <img src={iconUrl} alt="St. John Chrysostom Bookclub" style={{ width: '100%', height: '100%' }} />
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  )
}
