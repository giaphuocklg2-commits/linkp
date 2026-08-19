async function test() {
  try {
    const API_KEY = 'd563fb333878a1ec9816ab22092ce10055adff1567cabc5f';
    const CONVERSIONS_URL = 'https://addlivetag.com/api/v1/conversions.php';

    const pageSize = '100';
    const type = 'items';

    console.log('Fetching live conversions...');
    const response = await fetch(`${CONVERSIONS_URL}?type=${type}&page_size=${pageSize}`, {
      headers: {
        'X-API-Key': API_KEY,
        'Accept': 'application/json',
        'User-Agent': 'LinkP-Admin/2.0'
      }
    });

    if (!response.ok) {
      console.log(`AddLiveTag API HTTP ${response.status}: ${response.statusText}`);
      return;
    }

    const payload = await response.json();
    const items = payload.data || [];
    const link4pItems = items.filter(i => JSON.stringify(i).includes('link4p'));
    console.log('Found link4p items:', JSON.stringify(link4pItems, null, 2));

  } catch (err) {
    console.error('ERROR:', err);
  }
}
test();
