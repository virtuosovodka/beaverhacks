import { createClient } from 'redis'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")

    if (!address) {
        return Response.json({ error: "No address provided" }, { status: 400 })
    }

    const data = await getCachedRequest(
        `https://www.googleapis.com/civicinfo/v2/divisionsByAddress?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_CIVIC_API_KEY}`
    )

    return Response.json(data)
}

async function getCachedRequest(request: string) {
    const client = createClient()

    client.on('error', err => console.log('Redis Client Error', err))

    await client.connect()

    const cachedResponse = await client.json.get(request, { path: '$' })

    if (cachedResponse) {
        console.log('Cache hit for request:', request)
        return cachedResponse
    }

    console.log('Cache miss for request:', request)
    const response = await fetch(request)
    const data = await response.json()

    await client.json.set(request, '$', data)
    await client.expire(request, 3600)

    return data
}