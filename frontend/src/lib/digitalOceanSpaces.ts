import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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
const baseUrl = (process.env.DO_SPACES_BASE_URL?.trim() || `https://${spacesHost}`).replace(/\/+$/, "");

const s3Client = new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
  forcePathStyle: false,
});

const sanitizeSegment = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

export const buildSpacesKey = (...segments: (string | null | undefined)[]) =>
  segments
    .filter((segment): segment is string => typeof segment === "string" && segment.length > 0)
    .map((segment) => sanitizeSegment(segment))
    .filter(Boolean)
    .join("/");

const normalizeKey = (key: string) =>
  key
    .split("/")
    .map((segment) => sanitizeSegment(segment))
    .filter(Boolean)
    .join("/");

export type SpacesUploadResult = {
  key: string;
  url: string;
};

export const getSpacesPublicUrl = (key: string | null | undefined): string | null => {
  if (!key) return null;
  return `${baseUrl}/${encodeURI(key)}`.replace(/([^:]\/\/)\/+/g, "$1");
};

export const isSpacesUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.hostname === spacesHost;
  } catch {
    return false;
  }
};

export const extractKeyFromSpacesUrl = (value: string): string | null => {
  if (!isSpacesUrl(value)) return null;
  try {
    const parsed = new URL(value);
    return parsed.pathname.replace(/^\/+/, "");
  } catch {
    return null;
  }
};

type ObjectCannedACL =
  | "private"
  | "public-read"
  | "public-read-write"
  | "authenticated-read"

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
  acl?: "private" | "public-read" | string;
}): Promise<SpacesUploadResult> => {
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
      ACL: acl as ObjectCannedACL,
    })
  );

  const url = getSpacesPublicUrl(normalizedKey);
  if (!url) {
    throw new Error("Failed to compose DigitalOcean Spaces URL");
  }

  return { key: normalizedKey, url };
};

export const deleteFromSpaces = async (key?: string | null) => {
  if (!key) return;
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
};

export const spacesBaseUrl = baseUrl;
export const spacesBucketHost = spacesHost;
