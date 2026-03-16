import { google, type Auth } from 'googleapis'
import { Readable } from 'stream'

let _auth: Auth.GoogleAuth | null = null

function getAuth() {
  if (_auth) return _auth
  const json = Buffer.from(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64!,
    'base64'
  ).toString('utf-8')
  const credentials = JSON.parse(json) as object
  _auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  }) as Auth.GoogleAuth
  return _auth
}

// In-memory folder ID cache: path string → folder ID
const folderCache = new Map<string, string>()

async function getFolderIdOrCreate(path: string[]): Promise<string> {
  const cacheKey = path.join('/')
  const cached = folderCache.get(cacheKey)
  if (cached) return cached

  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })

  let parentId = 'root'
  let currentPath = ''

  for (const segment of path) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment
    const partialKey = currentPath

    const partialCached = folderCache.get(partialKey)
    if (partialCached) {
      parentId = partialCached
      continue
    }

    // Search for existing folder
    const res = await drive.files.list({
      q: `name = '${segment.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`,
      fields: 'files(id)',
      pageSize: 1,
    })

    let folderId: string

    if (res.data.files && res.data.files.length > 0) {
      folderId = res.data.files[0].id!
    } else {
      // Create it
      const created = await drive.files.create({
        requestBody: {
          name: segment,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        },
        fields: 'id',
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
}: {
  fileBuffer: ArrayBuffer
  fileName: string
  folderPath: string
}): Promise<{ fileId: string; webViewLink: string; folderPath: string }> {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })

  const pathSegments = folderPath.split('/').filter(Boolean)
  const folderId = await getFolderIdOrCreate(pathSegments)

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
