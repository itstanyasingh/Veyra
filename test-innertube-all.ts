async function testClients(videoId: string) {
  console.log(`\n=== Testing Innertube clients for ${videoId} ===`);
  
  // Get API key from page
  let apiKey = '';
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const html = await pageRes.text();
    const m = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
    if (m) apiKey = m[1];
  } catch (e: any) {
    console.log('Failed to get page:', e.message);
  }

  console.log('INNERTUBE_API_KEY found:', !!apiKey);

  const clientConfigs = [
    {
      name: 'ANDROID (20.10.38)',
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: '20.10.38',
          androidSdkVersion: 34,
          hl: 'en',
          gl: 'US',
        },
      },
      userAgent: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip',
    },
    {
      name: 'ANDROID_TESTSUITE (1.9)',
      context: {
        client: {
          clientName: 'ANDROID_TESTSUITE',
          clientVersion: '1.9',
          hl: 'en',
          gl: 'US',
        },
      },
      userAgent: 'Google-YouTube-TestSuite/1.9',
    },
    {
      name: 'WEB_EMBEDDED_PLAYER (1.20240313.01.00)',
      context: {
        client: {
          clientName: 'WEB_EMBEDDED_PLAYER',
          clientVersion: '1.20240313.01.00',
          hl: 'en',
          gl: 'US',
        },
        thirdParty: {
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
        },
      },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    },
    {
      name: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
      context: {
        client: {
          clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
          clientVersion: '2.0',
          hl: 'en',
          gl: 'US',
        },
        thirdParty: {
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
        },
      },
      userAgent: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 5.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/5.0 TV Safari/538.1',
    },
    {
      name: 'MEDIA_CONNECT_FRONTEND',
      context: {
        client: {
          clientName: 'MEDIA_CONNECT_FRONTEND',
          clientVersion: '0.1',
          hl: 'en',
          gl: 'US',
        },
      },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  ];

  for (const conf of clientConfigs) {
    try {
      const url = apiKey 
        ? `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`
        : 'https://www.youtube.com/youtubei/v1/player';

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': conf.userAgent,
          'X-YouTube-Client-Name': conf.context.client.clientName,
          'X-YouTube-Client-Version': conf.context.client.clientVersion,
        },
        body: JSON.stringify({
          context: conf.context,
          videoId,
        }),
      });

      const d = await res.json() as any;
      const status = d.playabilityStatus?.status;
      const reason = d.playabilityStatus?.reason;
      const tracks = d.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      console.log(`[${conf.name}] status: ${status}${reason ? ` (${reason})` : ''}, captionTracks: ${tracks?.length || 0}`);
      if (tracks && tracks.length > 0) {
        console.log(`  -> SUCCESS! Found ${tracks.length} tracks. Track 0:`, tracks[0].baseUrl);
      }
    } catch (e: any) {
      console.log(`[${conf.name}] Error:`, e.message);
    }
  }
}

async function run() {
  await testClients('k1-TrAvp_xs');
  await testClients('dQw4w9WgXcQ');
}

run();
