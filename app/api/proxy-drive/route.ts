import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

function getAuth() {
  const json = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64!, 'base64').toString('utf-8')
  return new google.auth.GoogleAuth({
    credentials: JSON.parse(json) as object,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const fileId = request.nextUrl.searchParams.get('id')
  if (!fileId) return new NextResponse('Missing id', { status: 400 })

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64) {
    return new NextResponse('Drive not configured', { status: 503 })
  }

  try {
    const drive = google.drive({ version: 'v3', auth: getAuth() })

    const meta = await drive.files.get({
      fileId,
      fields: 'mimeType,size',
      supportsAllDrives: true,
    })
    const contentType = meta.data.mimeType ?? 'video/mp4'
    const fileSize = Number(meta.data.size ?? 0)

    const res = await (drive.files.get as unknown as (p: object, o: object) => Promise<{ data: ArrayBuffer }>)(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    )

    const buffer = res.data
    const rangeHeader = request.headers.get('range')

    if (rangeHeader && fileSize > 0) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
      if (match) {
        const start = parseInt(match[1], 10)
        const end = match[2] ? Math.min(parseInt(match[2], 10), fileSize - 1) : fileSize - 1
        return new NextResponse(buffer.slice(start, end + 1), {
          status: 206,
          headers: {
            'Content-Type': contentType,
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Content-Length': String(end - start + 1),
            'Accept-Ranges': 'bytes',
          },
        })
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    }
    if (fileSize > 0) headers['Content-Length'] = String(fileSize)

    return new NextResponse(buffer, { headers })
  } catch (err) {
    console.error('[proxy-drive]', err)
    return new NextResponse('Failed', { status: 502 })
  }
}
