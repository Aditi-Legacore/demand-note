import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  ObjectCannedACL,
} from "@aws-sdk/client-s3";

/*
|--------------------------------------------------------------------------
| Lazy Config Loader (Fix Next.js Build Error)
|--------------------------------------------------------------------------
*/

const getSpacesConfig = () => {
  const bucket = process.env.DO_SPACES_BUCKET?.trim();
  const endpoint = process.env.DO_SPACES_ENDPOINT?.trim();
  const accessKey = process.env.DO_SPACES_ACCESS_KEY?.trim();
  const secretKey = process.env.DO_SPACES_SECRET_KEY?.trim();
  const region = process.env.DO_SPACES_REGION?.trim() || "sfo3";

  if (!bucket || !endpoint || !accessKey || !secretKey) {
    throw new Error(
      "Missing DigitalOcean Spaces configuration. Please set DO_SPACES_BUCKET, DO_SPACES_ENDPOINT, DO_SPACES_ACCESS_KEY, and DO_SPACES_SECRET_KEY."
    );
  }

  const endpointUrl = new URL(endpoint);
  const spacesHost = `${bucket}.${endpointUrl.hostname}`;

  const baseUrl = (
    process.env.DO_SPACES_BASE_URL?.trim() || `https://${spacesHost}`
  ).replace(/\/+$/, "");

  const s3Client = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: false,
  });

  return {
    bucket,
    endpoint,
    accessKey,
    secretKey,
    region,
    spacesHost,
    baseUrl,
    s3Client,
  };
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const sanitizeSegment = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

export const buildSpacesKey = (...segments: (string | null | undefined)[]) =>
  segments
    .filter(
      (segment): segment is string =>
        typeof segment === "string" && segment.length > 0
    )
    .map((segment) => sanitizeSegment(segment))
    .filter(Boolean)
    .join("/");

const normalizeKey = (key: string) =>
  key
    .split("/")
    .map((segment) => sanitizeSegment(segment))
    .filter(Boolean)
    .join("/");

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

export type SpacesUploadResult = {
  key: string;
  url: string;
};

/*
|--------------------------------------------------------------------------
| URL Helpers
|--------------------------------------------------------------------------
*/

export const getSpacesPublicUrl = (
  key: string | null | undefined
): string | null => {
  if (!key) return null;

  const { baseUrl } = getSpacesConfig();

  return `${baseUrl}/${encodeURI(key)}`.replace(/([^:]\/\/)\/+/g, "$1");
};

export const isSpacesUrl = (value: string) => {
  try {
    const { spacesHost } = getSpacesConfig();
    const parsed = new URL(value);
    return parsed.hostname === spacesHost;
  } catch {
    return false;
  }
};

export const extractKeyFromSpacesUrl = (
  value: string
): string | null => {
  if (!isSpacesUrl(value)) return null;

  try {
    const parsed = new URL(value);
    return parsed.pathname.replace(/^\/+/, "");
  } catch {
    return null;
  }
};

/*
|--------------------------------------------------------------------------
| Upload
|--------------------------------------------------------------------------
*/

export const uploadToSpaces = async ({
  key,
  body,
  contentType,
  contentLength,
  acl = "public-read",
}: {
  key: string;
  body: Buffer;
  contentType?: string;
  contentLength?: number;
  acl?: ObjectCannedACL;
}): Promise<SpacesUploadResult> => {
  const { s3Client, bucket } = getSpacesConfig();

  const normalizedKey = normalizeKey(key);

  if (!normalizedKey) {
    throw new Error("DigitalOcean Spaces key cannot be empty");
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: normalizedKey,
      Body: body,
      ContentType: contentType,
      ContentLength: contentLength,
      ACL: acl,
    })
  );

  const url = getSpacesPublicUrl(normalizedKey);

  if (!url) {
    throw new Error("Failed to compose DigitalOcean Spaces URL");
  }

  return {
    key: normalizedKey,
    url,
  };
};

/*
|--------------------------------------------------------------------------
| Delete
|--------------------------------------------------------------------------
*/

export const deleteFromSpaces = async (key?: string | null) => {
  if (!key) return;

  const { s3Client, bucket } = getSpacesConfig();

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
};

/*
|--------------------------------------------------------------------------
| Exposed Values
|--------------------------------------------------------------------------
*/

export const spacesBaseUrl = () => getSpacesConfig().baseUrl;
export const spacesBucketHost = () => getSpacesConfig().spacesHost;