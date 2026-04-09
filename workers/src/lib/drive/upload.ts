import { google, type Auth } from 'googleapis'
import { Readable } from 'stream'

let _serviceAuth: Auth.GoogleAuth | null = null

function getServiceAuth() {
  if (_serviceAuth) return _serviceAuth
  const json = Buffer.from(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64!,
    'base64'
  ).toString('utf-8')
  const credentials = JSON.parse(json) as object
  _serviceAuth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  }) as Auth.GoogleAuth
  return _serviceAuth
}

function getOAuthClient(accessToken: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET
  )
  oauth2.setCredentials({ access_token: accessToken })
  return oauth2
}

// In-memory folder ID cache: path string → folder ID
const folderCache = new Map<string, string>()
// In-flight promises to prevent parallel creation of the same folder path
const folderInFlight = new Map<string, Promise<string>>()

async function getFolderIdOrCreate(
  path: string[],
  rootFolderId: string | undefined,
  auth: Auth.GoogleAuth | Auth.OAuth2Client
): Promise<string> {
  const cacheKey = (rootFolderId ?? '') + '|' + path.join('/')
  const cached = folderCache.get(cacheKey)
  if (cached) return cached

  const inFlight = folderInFlight.get(cacheKey)
  if (inFlight) return inFlight

  const promise = _getFolderIdOrCreate(path, rootFolderId, auth).finally(() => folderInFlight.delete(cacheKey))
  folderInFlight.set(cacheKey, promise)
  return promise
}

async function _getFolderIdOrCreate(
  path: string[],
  rootFolderId: string | undefined,
  auth: Auth.GoogleAuth | Auth.OAuth2Client
): Promise<string> {
  const cacheKey = (rootFolderId ?? '') + '|' + path.join('/')
  const cached = folderCache.get(cacheKey)
  if (cached) return cached

  const drive = google.drive({ version: 'v3', auth })

  const root = rootFolderId ?? process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ?? 'root'
  let parentId = root
  let currentPath = ''

  for (const segment of path) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment
    const partialKey = root + '|' + currentPath

    const partialCached = folderCache.get(partialKey)
    if (partialCached) {
      parentId = partialCached
      continue
    }

    const res = await drive.files.list({
      q: `name = '${segment.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`,
      fields: 'files(id)',
      pageSize: 1,
      corpora: 'allDrives',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })

    let folderId: string

    if (res.data.files && res.data.files.length > 0) {
      folderId = res.data.files[0].id!
    } else {
      const created = await drive.files.create({
        requestBody: {
          name: segment,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        },
        fields: 'id',
        supportsAllDrives: true,
      })
      folderId = created.data.id!
    }

    folderCache.set(partialKey, folderId)
    parentId = folderId
  }

  return parentId
}

export async function uploadToDrive({
  fileBuffer,
  fileName,
  folderPath,
  rootFolderId,
  accessToken,
}: {
  fileBuffer: ArrayBuffer
  fileName: string
  folderPath: string
  rootFolderId?: string
  accessToken?: string
}): Promise<{ fileId: string; webViewLink: string; folderPath: string }> {
  const auth = accessToken ? getOAuthClient(accessToken) : getServiceAuth()
  const drive = google.drive({ version: 'v3', auth })

  const pathSegments = folderPath.split('/').filter(Boolean)
  const folderId = await getFolderIdOrCreate(pathSegments, rootFolderId, auth)

  const mimeType = getMimeType(fileName)
  const stream = Readable.from(Buffer.from(fileBuffer))

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, webViewLink',
    supportsAllDrives: true,
  })

  return {
    fileId: res.data.id!,
    webViewLink: res.data.webViewLink!,
    folderPath,
  }
}

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  }
  return mimeTypes[ext ?? ''] ?? 'application/octet-stream'
}
