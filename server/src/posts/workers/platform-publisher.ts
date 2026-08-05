/**
 * Calls the real platform API for each supported network.
 * Returns the external post ID on success, throws on failure.
 */
export async function publishToPlatform(
  platform: string,
  platformUserId: string,
  accessToken: string,
  caption: string,
  hashtags?: string | null,
): Promise<string> {
  const message = hashtags ? `${caption}\n\n${hashtags}` : caption;

  switch (platform) {
    case 'Facebook':
      return publishToFacebook(platformUserId, accessToken, message);
    case 'Instagram':
      return publishToInstagram(platformUserId, accessToken, message);
    default:
      throw new Error(`Publishing to ${platform} is not yet implemented`);
  }
}

// ─── Facebook ─────────────────────────────────────────────────────────────────
// Docs: https://developers.facebook.com/docs/pages/publishing
async function publishToFacebook(pageId: string, accessToken: string, message: string): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${pageId}/feed`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: accessToken }),
  });
  const body = await res.json() as any;
  if (!res.ok || body.error) {
    const msg = body?.error?.message ?? `Facebook API error ${res.status}`;
    throw new Error(msg);
  }
  return body.id as string; // e.g. "page_id_post_id"
}

// ─── Instagram ────────────────────────────────────────────────────────────────
// Docs: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
// Text-only posts require a media container (reel/story workaround).
// This publishes as a text-caption container — real image/video support
// requires a separate media upload step before calling this.
async function publishToInstagram(igUserId: string, accessToken: string, message: string): Promise<string> {
  const baseUrl = `https://graph.facebook.com/v21.0/${igUserId}`;

  // Step 1: Create a media container
  const containerRes = await fetch(`${baseUrl}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caption: message, media_type: 'REELS', access_token: accessToken }),
  });
  const container = await containerRes.json() as any;
  if (!containerRes.ok || container.error) {
    throw new Error(container?.error?.message ?? `Instagram container error ${containerRes.status}`);
  }

  // Step 2: Publish the container
  const publishRes = await fetch(`${baseUrl}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
  });
  const published = await publishRes.json() as any;
  if (!publishRes.ok || published.error) {
    throw new Error(published?.error?.message ?? `Instagram publish error ${publishRes.status}`);
  }

  return published.id as string;
}
