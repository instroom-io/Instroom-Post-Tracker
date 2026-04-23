import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import type { Readable } from 'stream'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkRouteLimit, limiters } from '@/lib/rate-limit'
import { getFreshAccessToken, getAgencyFreshAccessToken } from '@/lib/google/tokens'

type DriveStreamRes = {
  data: NodeJS.ReadableStream
  status: number
  headers: Record<string, string>
}

function getServiceAuth() {
  const json = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64!, 'base64').toString('utf-8')
  return new google.auth.GoogleAuth({
    credentials: JSON.parse(json) as object,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
}

function getOAuthAuth(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return auth
}

type DriveAuth = ReturnType<typeof getServiceAuth> | ReturnType<typeof getOAuthAuth>

async function buildAuthCandidates(workspaceId: string | null): Promise<DriveAuth[]> {
  const candidates: DriveAuth[] = []

  if (workspaceId) {
    const svc = createServiceClient()

    const { data: ws } = await svc
      .from('workspaces')
      .select('agency_id')
      .eq('id', workspaceId)
      .single()

    const agencyId = (ws as unknown as { agency_id: string | null } | null)?.agency_id

    if (agencyId) {
      const agencyToken = await getAgencyFreshAccessToken(agencyId)
      if (agencyToken) candidates.push(getOAuthAuth(agencyToken))
    } else {
      const { data: ownerMember } = await svc
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId)
        .eq('role', 'owner')
        .single()

      const ownerId = ownerMember?.user_id ?? null
      if (ownerId) {
        const ownerToken = await getFreshAccessToken(ownerId)
        if (ownerToken) candidates.push(getOAuthAuth(ownerToken))
      }
    }
  }

  // Service account is always the last-resort fallback
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64) {
    candidates.push(getServiceAuth())
  }

  return candidates
}

/**
 * Probe each auth candidate against the file metadata endpoint.
 * Returns the first auth that can successfully read the file, plus its metadata.
 * This avoids starting a stream only to find out mid-way that the token is wrong.
 */
async function resolveWorkingAuth(
  fileId: string,
  candidates: DriveAuth[]
): Promise<{ auth: DriveAuth; contentType: string; fileSize: number } | null> {
  for (const auth of candidates) {
    try {
      const drive = google.drive({ version: 'v3', auth })
      const meta = await drive.files.get({
        fileId,
        fields: 'mimeType,size',
        supportsAllDrives: true,
      })
      return {
        auth,
        contentType: meta.data.mimeType ?? 'video/mp4',
        fileSize: Number(meta.data.size ?? 0),
      }
    } catch {
      // Token can't access this file — try the next candidate
    }
  }
  return null
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

  const workspaceId = request.nextUrl.searchParams.get('workspaceId')

  const candidates = await buildAuthCandidates(workspaceId)
  if (candidates.length === 0) {
    return new NextResponse('Drive not configured', { status: 503 })
  }

  const resolved = await resolveWorkingAuth(fileId, candidates)
  if (!resolved) {
    console.error('[proxy-drive] No auth candidate could read file', fileId, 'workspace', workspaceId)
    return new NextResponse('Failed', { status: 502 })
  }

  const { auth, contentType, fileSize } = resolved

  try {
    const drive = google.drive({ version: 'v3', auth })

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
      const contentRange = res.headers['content-range']
      if (contentRange) responseHeaders['Content-Range'] = contentRange
      const chunkLength = res.headers['content-length']
      if (chunkLength) responseHeaders['Content-Length'] = chunkLength
    } else if (fileSize > 0) {
      responseHeaders['Content-Length'] = String(fileSize)
    }

    return new NextResponse(webStream, { status: isPartial ? 206 : 200, headers: responseHeaders })
  } catch (err) {
    console.error('[proxy-drive] Stream failed for file', fileId, err)
    return new NextResponse('Failed', { status: 502 })
  }
}
