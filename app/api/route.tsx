import { createClient } from 'redis';

export async function GET(
    // Access with /api/OR02, for example.
    request: Request,
    { params }: { params: Promise<{ district: string }> }
) {
    const { district } = await params // district = "OR02", for example. 

    const result = {
        senate: [],
        house: [],
    }

    const state = district.slice(0, 2) // "OR"
    const districtNumber = district.slice(2) // "02"
    const electionCycle = new Date().getFullYear() % 2 === 0 ? new Date().getFullYear() : new Date().getFullYear() + 1; // Get the current election cycle (even year)

    // Fetch election data from FEC API for the district, both for House and Senate
    const houseData = await getCachedRequest(`https://api.open.fec.gov/v1/elections/?state=${state}&district=${districtNumber}&cycle=${electionCycle}&office=house&api_key=${process.env.FEC_API_KEY}`);
    const senateData = await getCachedRequest(`https://api.open.fec.gov/v1/elections/?state=${state}&cycle=${electionCycle}&office=senate&api_key=${process.env.FEC_API_KEY}`);

    // Build present committees list
    const committees = null;

    // Fetch committee data from FEC for all committees referenced

    // Build candidates list

    // Get news data for all candidates from news API

    // Get platform data from LLM API for all candidates

    // Finish result object and return it as JSON

    return Response.json(result)
}

async function getCachedRequest(request: string) {
    // Check Redis cache for the request. If it exists, return the cached response.
    // Otherwise, call the request and cache it

    const client = createClient();

    client.on('error', err => console.log('Redis Client Error', err));

    await client.connect();

    const cachedResponse = await client.json.get(request, { path: '$' });

    if (cachedResponse) {
        console.log('Cache hit for request:', request);
        return cachedResponse;
    }

    // Not in cache, so we need to fetch the data and cache it.
    console.log('Cache miss for request:', request);
    const response = await fetch(request);
    const data = await response.json();

    // Cache the response in Redis with an expiration time (e.g., 1 hour).
    await client.json.set(request, '$', data);
    await client.expire(request, 3600); // Set expiration to 1 hour (3600 seconds).

    return data;
}