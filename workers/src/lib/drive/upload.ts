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
// Cache for folder ID → Shared Drive ID lookups
const driveIdCache = new Map<string, string | null>()

/** Returns the Shared Drive ID that contains the given folder, or undefined if it's in My Drive. */
async function getSharedDriveId(drive: ReturnType<typeof google.drive>, folderId: string): Promise<string | undefined> {
  const cached = driveIdCache.get(folderId)
  if (cached !== undefined) return cached ?? undefined
  try {
    const res = await drive.files.get({
      fileId: folderId,
      fields: 'driveId',
      supportsAllDrives: true,
    })
    const driveId = res.data.driveId ?? null
    driveIdCache.set(folderId, driveId)
    return driveId ?? undefined
  } catch {
    driveIdCache.set(folderId, null)
    return undefined
  }
}
// In-flight promises to prevent parallel creation of the same folder path
const folderInFlight = new Map<string, Promise<string>>()

async function getFolderIdOrCreate(path: string[], rootFolderId?: string): Promise<string> {
  const cacheKey = (rootFolderId ?? '') + '|' + path.join('/')
  const cached = folderCache.get(cacheKey)
  if (cached) return cached

  const inFlight = folderInFlight.get(cacheKey)
  if (inFlight) return inFlight

  const promise = _getFolderIdOrCreate(path, rootFolderId).finally(() => folderInFlight.delete(cacheKey))
  folderInFlight.set(cacheKey, promise)
  return promise
}

async function _getFolderIdOrCreate(path: string[], rootFolderId?: string): Promise<string> {
  const cacheKey = (rootFolderId ?? '') + '|' + path.join('/')
  const cached = folderCache.get(cacheKey)
  if (cached) return cached

  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })

  const root = rootFolderId ?? process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ?? 'root'

  // Shared Drive root IDs start with '0A'. They cannot be used directly as
  // a parent in files.create. The agency must set drive_folder_id to a folder
  // *inside* the Shared Drive, not the drive root itself.
  if (root.startsWith('0A') && root !== 'root') {
    throw new Error(
      `drive_folder_id "${root}" looks like a Shared Drive root ID. ` +
      `Please create a folder inside the Shared Drive and paste that folder's URL instead.`
    )
  }

  // Detect which Shared Drive this folder tree lives in (for scoping list queries).
  const sharedDriveId = root !== 'root' ? await getSharedDriveId(drive, root) : undefined

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
      ...(sharedDriveId ? { corpora: 'drive', driveId: sharedDriveId } : { corpora: 'user' }),
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
}: {
  fileBuffer: ArrayBuffer
  fileName: string
  folderPath: string
  rootFolderId?: string
}): Promise<{ fileId: string; webViewLink: string; folderPath: string }> {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })

  const pathSegments = folderPath.split('/').filter(Boolean)
  const folderId = await getFolderIdOrCreate(pathSegments, rootFolderId)

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
