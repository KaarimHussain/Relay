/**
 * Calls the real platform API for each supported network.
 * Returns the external post ID on success, throws on failure.
 */

interface MediaRef { url: string; mimeType: string; }

export async function publishToPlatform(
  platform: string,
  platformUserId: string,
  accessToken: string,
  caption: string,
  hashtags?: string | null,
  media: MediaRef[] = [],
): Promise<string> {
  const message = hashtags ? `${caption}\n\n${hashtags}` : caption;

  switch (platform) {
    case 'Facebook':  return publishToFacebook(platformUserId, accessToken, message, media);
    case 'Instagram': return publishToInstagram(platformUserId, accessToken, message, media);
    case 'LinkedIn':  return publishToLinkedIn(platformUserId, accessToken, message, media);
    case 'X':         return publishToX(platformUserId, accessToken, message, media);
    case 'TikTok':    return publishToTikTok(platformUserId, accessToken, message, media);
    default:
      throw new Error(`Publishing to ${platform} is not yet implemented`);
  }
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

async function graphPost(url: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json() as any;
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message ?? `Graph API error ${res.status}`);
  }
  return data;
}

/** Fetch remote file bytes (from Cloudinary CDN) into an ArrayBuffer. */
async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch media from ${url}: ${res.status}`);
  return res.arrayBuffer();
}

// ─── Facebook ─────────────────────────────────────────────────────────────────

async function publishToFacebook(
  pageId: string,
  accessToken: string,
  message: string,
  media: MediaRef[],
): Promise<string> {
  const base = `https://graph.facebook.com/v21.0/${pageId}`;
  const images = media.filter(m => m.mimeType.startsWith('image/'));
  const videos = media.filter(m => m.mimeType.startsWith('video/'));

  if (videos.length > 0) {
    const data = await graphPost(`${base}/videos`, {
      file_url: videos[0].url,
      description: message,
      access_token: accessToken,
    });
    return String(data.id);
  }

  if (images.length === 1) {
    const data = await graphPost(`${base}/photos`, {
      url: images[0].url,
      caption: message,
      access_token: accessToken,
    });
    return String(data.post_id ?? data.id);
  }

  if (images.length > 1) {
    const photoIds = await Promise.all(
      images.map(img =>
        graphPost(`${base}/photos`, {
          url: img.url,
          published: false,
          access_token: accessToken,
        }).then(d => String(d.id)),
      ),
    );
    const data = await graphPost(`${base}/feed`, {
      message,
      attached_media: photoIds.map(id => ({ media_fbid: id })),
      access_token: accessToken,
    });
    return String(data.id);
  }

  const data = await graphPost(`${base}/feed`, { message, access_token: accessToken });
  return String(data.id);
}

// ─── Instagram ────────────────────────────────────────────────────────────────

async function publishToInstagram(
  igUserId: string,
  accessToken: string,
  message: string,
  media: MediaRef[],
): Promise<string> {
  const base = `https://graph.facebook.com/v21.0/${igUserId}`;
  const images = media.filter(m => m.mimeType.startsWith('image/'));
  const videos = media.filter(m => m.mimeType.startsWith('video/'));

  if (videos.length > 0) {
    const container = await graphPost(`${base}/media`, {
      media_type: 'REELS',
      video_url: videos[0].url,
      caption: message,
      access_token: accessToken,
    });
    const published = await graphPost(`${base}/media_publish`, {
      creation_id: container.id,
      access_token: accessToken,
    });
    return String(published.id);
  }

  if (images.length === 1) {
    const container = await graphPost(`${base}/media`, {
      image_url: images[0].url,
      caption: message,
      access_token: accessToken,
    });
    const published = await graphPost(`${base}/media_publish`, {
      creation_id: container.id,
      access_token: accessToken,
    });
    return String(published.id);
  }

  if (images.length > 1) {
    const itemIds = await Promise.all(
      images.map(img =>
        graphPost(`${base}/media`, {
          image_url: img.url,
          is_carousel_item: true,
          access_token: accessToken,
        }).then(d => String(d.id)),
      ),
    );
    const carousel = await graphPost(`${base}/media`, {
      media_type: 'CAROUSEL',
      caption: message,
      children: itemIds.join(','),
      access_token: accessToken,
    });
    const published = await graphPost(`${base}/media_publish`, {
      creation_id: carousel.id,
      access_token: accessToken,
    });
    return String(published.id);
  }

  // Text-only fallback
  const container = await graphPost(`${base}/media`, {
    media_type: 'REELS',
    caption: message,
    access_token: accessToken,
  });
  const published = await graphPost(`${base}/media_publish`, {
    creation_id: container.id,
    access_token: accessToken,
  });
  return String(published.id);
}

// ─── LinkedIn ─────────────────────────────────────────────────────────────────
// Docs: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api

async function publishToLinkedIn(
  personId: string,
  accessToken: string,
  message: string,
  media: MediaRef[],
): Promise<string> {
  // platformUserId may be a raw ID or already a URN — normalise to URN
  const author = personId.startsWith('urn:li:')
    ? personId
    : `urn:li:person:${personId}`;

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'LinkedIn-Version': '202601',
    'X-Restli-Protocol-Version': '2.0.0',
    'Content-Type': 'application/json',
  };

  const images = media.filter(m => m.mimeType.startsWith('image/'));
  const videos = media.filter(m => m.mimeType.startsWith('video/'));

  let contentBlock: Record<string, unknown> | undefined;

  // ── Image upload ────────────────────────────────────────────────────────────
  if (images.length > 0) {
    const initRes = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
      method: 'POST',
      headers,
      body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
    });
    const initData = await initRes.json() as any;
    if (!initRes.ok) throw new Error(initData.message ?? 'LinkedIn image init failed');

    const { uploadUrl, image: imageUrn } = initData.value;
    const imgBytes = await fetchBytes(images[0].url);

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': images[0].mimeType },
      body: imgBytes,
    });
    if (!uploadRes.ok) throw new Error(`LinkedIn image upload failed: ${uploadRes.status}`);

    contentBlock = { media: { id: imageUrn } };
  }

  // ── Video upload ────────────────────────────────────────────────────────────
  else if (videos.length > 0) {
    const headRes = await fetch(videos[0].url, { method: 'HEAD' });
    const fileSizeBytes = Number(headRes.headers.get('content-length') ?? 0);

    const initRes = await fetch('https://api.linkedin.com/rest/videos?action=initializeUpload', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: author,
          fileSizeBytes,
          uploadCaptions: false,
          uploadThumbnail: false,
        },
      }),
    });
    const initData = await initRes.json() as any;
    if (!initRes.ok) throw new Error(initData.message ?? 'LinkedIn video init failed');

    const { uploadInstructions, video: videoUrn, uploadToken } = initData.value;
    const videoBytes = await fetchBytes(videos[0].url);
    const uploadedPartIds: string[] = [];

    for (const instr of uploadInstructions) {
      const chunk = videoBytes.slice(instr.firstByte, instr.lastByte + 1);
      const partRes = await fetch(instr.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: chunk,
      });
      if (!partRes.ok) throw new Error(`LinkedIn video chunk upload failed: ${partRes.status}`);
      uploadedPartIds.push(partRes.headers.get('etag') ?? '');
    }

    const finalRes = await fetch(
      `https://api.linkedin.com/rest/videos/${encodeURIComponent(videoUrn)}?action=finalizeUpload`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ finalizeUploadRequest: { video: videoUrn, uploadToken, uploadedPartIds } }),
      },
    );
    if (!finalRes.ok) {
      const fd = await finalRes.json() as any;
      throw new Error(fd.message ?? 'LinkedIn video finalize failed');
    }

    contentBlock = { media: { id: videoUrn } };
  }

  // ── Create post ─────────────────────────────────────────────────────────────
  const body: Record<string, unknown> = {
    author,
    commentary: message,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };
  if (contentBlock) body.content = contentBlock;

  const postRes = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!postRes.ok) {
    const err = await postRes.json() as any;
    throw new Error(err.message ?? `LinkedIn post failed: ${postRes.status}`);
  }

  // LinkedIn returns the post URN in the x-restli-id response header
  return postRes.headers.get('x-restli-id') ?? postRes.headers.get('X-LinkedIn-Id') ?? 'linkedin-post';
}

// ─── X (Twitter) ──────────────────────────────────────────────────────────────
// Docs: https://developer.x.com/en/docs/x-api/tweets/manage-tweets/api-reference/post-tweets

async function publishToX(
  userId: string,
  accessToken: string,
  message: string,
  media: MediaRef[],
): Promise<string> {
  const authHeader = { Authorization: `Bearer ${accessToken}` };
  const images = media.filter(m => m.mimeType.startsWith('image/'));
  const videos = media.filter(m => m.mimeType.startsWith('video/'));
  const mediaIds: string[] = [];

  // ── Image upload (base64 via v1.1) ─────────────────────────────────────────
  for (const img of images.slice(0, 4)) {
    const bytes = await fetchBytes(img.url);
    const base64 = Buffer.from(bytes).toString('base64');

    const uploadRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ media_data: base64, media_type: img.mimeType }).toString(),
    });
    const uploadData = await uploadRes.json() as any;
    if (!uploadRes.ok) throw new Error(uploadData.errors?.[0]?.message ?? 'X image upload failed');
    mediaIds.push(String(uploadData.media_id_string));
  }

  // ── Video upload (chunked INIT/APPEND/FINALIZE via v1.1) ──────────────────
  if (videos.length > 0) {
    const vid = videos[0];
    const bytes = await fetchBytes(vid.url);
    const totalBytes = bytes.byteLength;

    // INIT
    const initRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        command: 'INIT',
        total_bytes: String(totalBytes),
        media_type: vid.mimeType,
        media_category: 'tweet_video',
      }).toString(),
    });
    const initData = await initRes.json() as any;
    if (!initRes.ok) throw new Error(initData.errors?.[0]?.message ?? 'X video INIT failed');
    const mediaId = String(initData.media_id_string);

    // APPEND in 5 MB chunks
    const CHUNK = 5 * 1024 * 1024;
    let segmentIndex = 0;
    for (let offset = 0; offset < totalBytes; offset += CHUNK) {
      const chunk = bytes.slice(offset, offset + CHUNK);
      const form = new FormData();
      form.append('command', 'APPEND');
      form.append('media_id', mediaId);
      form.append('segment_index', String(segmentIndex++));
      form.append('media', new Blob([chunk], { type: vid.mimeType }));

      const appendRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
        method: 'POST',
        headers: authHeader,
        body: form,
      });
      if (!appendRes.ok) {
        const ad = await appendRes.json().catch(() => ({})) as any;
        throw new Error(ad.errors?.[0]?.message ?? `X video APPEND failed at segment ${segmentIndex}`);
      }
    }

    // FINALIZE
    const finalRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ command: 'FINALIZE', media_id: mediaId }).toString(),
    });
    const finalData = await finalRes.json() as any;
    if (!finalRes.ok) throw new Error(finalData.errors?.[0]?.message ?? 'X video FINALIZE failed');

    // If processing_info exists, video needs processing time — fire-and-forget for now
    mediaIds.push(mediaId);
  }

  // ── Post tweet ──────────────────────────────────────────────────────────────
  const tweetBody: Record<string, unknown> = { text: message };
  if (mediaIds.length > 0) tweetBody.media = { media_ids: mediaIds };

  const tweetRes = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(tweetBody),
  });
  const tweetData = await tweetRes.json() as any;
  if (!tweetRes.ok) throw new Error(tweetData.detail ?? tweetData.title ?? `X tweet failed: ${tweetRes.status}`);

  return String(tweetData.data?.id ?? 'x-tweet');
}

// ─── TikTok ───────────────────────────────────────────────────────────────────
// Docs: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post

async function publishToTikTok(
  userId: string,
  accessToken: string,
  message: string,
  media: MediaRef[],
): Promise<string> {
  const videos = media.filter(m => m.mimeType.startsWith('video/'));
  if (!videos.length) throw new Error('TikTok requires a video — images are not supported for direct posting.');

  const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: message.slice(0, 150),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: videos[0].url,
        video_size: 0,
        chunk_size: 0,
        total_chunk_count: 1,
      },
    }),
  });

  const data = await res.json() as any;
  if (data.error?.code !== 'ok') {
    throw new Error(data.error?.message ?? `TikTok publish failed: ${res.status}`);
  }

  return String(data.data?.publish_id ?? 'tiktok-post');
}
