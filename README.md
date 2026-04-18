# Patrik Warranty Form

Next.js 16 warranty registration form for Patrik windsurfing products.

## Getting Started

Copy env vars and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000/warranty](http://localhost:3000/warranty).

## File Uploads (Hetzner S3)

Files are uploaded directly from the browser to Hetzner Object Storage using **presigned PUT URLs** — credentials never leave the server.

### Flow

1. On form submit, a `submissionId` (UUID) is generated in the browser
2. For each file, the browser calls `POST /api/upload-url` with `{ submissionId, slot, filename, contentType }`
3. The API route generates a presigned PUT URL (valid 5 min) and returns it alongside the permanent public URL
4. The browser PUTs the file directly to Hetzner
5. All public URLs are collected and sent with the rest of the form data to the backend

### Storage structure

```
uploads/warranty/<submissionId>/invoice.<ext>
uploads/warranty/<submissionId>/serial.<ext>
uploads/warranty/<submissionId>/full.<ext>
uploads/warranty/<submissionId>/closeup.<ext>
```

All files for one claim share the same `submissionId` folder, making it easy to locate them in Google Drive or any file browser.

### Environment variables

| Variable | Description |
|---|---|
| `S3_ENDPOINT` | `https://fsn1.your-objectstorage.com` |
| `S3_REGION` | `fsn1` |
| `S3_BUCKET` | `patrik-assets` |
| `S3_PUBLIC_BASE` | `https://patrik-assets.fsn1.your-objectstorage.com` |
| `S3_ACCESS_KEY_ID` | Hetzner access key |
| `S3_SECRET_ACCESS_KEY` | Hetzner secret key |

### Migrating to AWS S3

1. Remove `S3_ENDPOINT` from env
2. Remove `forcePathStyle: true` and `requestChecksumCalculation`/`responseChecksumValidation` from `src/lib/s3.ts`
3. Set `S3_REGION` to e.g. `eu-central-1`

### CORS

The Hetzner bucket needs a CORS rule allowing `PUT` from your domain. Apply with:

```bash
aws s3api put-bucket-cors --bucket patrik-assets --cors-configuration file://cors.json --endpoint-url https://fsn1.your-objectstorage.com
```

`cors.json` is committed to the repo root.
