import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import type { Readable } from 'stream'
import { createClient } from '@/lib/supabase/server'
import { checkRouteLimit, limiters } from '@/lib/rate-limit'

type DriveStreamRes = {
  data: NodeJS.ReadableStream
  status: number
  headers: Record<string, string>
}

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

  const rateLimitRes = await checkRouteLimit(`proxydrive:user:${user.id}`, limiters.proxyDrive)
  if (rateLimitRes) return rateLimitRes

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

    // Forward the browser's Range header so Google returns a partial response,
    // enabling video seeking without buffering the whole file in memory.
    const rangeHeader = request.headers.get('range')
    const streamOpts: Record<string, unknown> = { responseType: 'stream' }
    if (rangeHeader) streamOpts.headers = { Range: rangeHeader }

    const res = await (
      drive.files.get as unknown as (p: object, o: object) => Promise<DriveStreamRes>
    )({ fileId, alt: 'media', supportsAllDrives: true }, streamOpts)

    // Pipe the Node.js Readable into a Web ReadableStream without buffering.
    const nodeStream = res.data
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)))
        nodeStream.on('end', () => controller.close())
        nodeStream.on('error', (err: Error) => controller.error(err))
      },
      cancel() {
        (nodeStream as Readable).destroy()
      },
    })

    const isPartial = res.status === 206
    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    }

    if (isPartial) {
      // Forward Google's Content-Range and the chunk size back to the browser.
      const contentRange = res.headers['content-range']
      if (contentRange) responseHeaders['Content-Range'] = contentRange
      const chunkLength = res.headers['content-length']
      if (chunkLength) responseHeaders['Content-Length'] = chunkLength
    } else if (fileSize > 0) {
      responseHeaders['Content-Length'] = String(fileSize)
    }

    return new NextResponse(webStream, { status: isPartial ? 206 : 200, headers: responseHeaders })
  } catch (err) {
    console.error('[proxy-drive]', err)
    return new NextResponse('Failed', { status: 502 })
  }
}
