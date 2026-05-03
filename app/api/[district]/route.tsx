import { get } from 'http';
import { platform } from 'os';
import { encode } from 'punycode';
import { createClient } from 'redis';

export async function GET(
    // Access with /api/OR02, for example.
    request: Request,
    { params }: { params: Promise<{ district: string }> }
) {
    const { district } = await params; // district = "OR02", for example. 

    const state = district.slice(0, 2); // "OR"
    const districtNumber = district.slice(2); // "02"
    const electionCycle = new Date().getFullYear() % 2 === 0 ? new Date().getFullYear() : new Date().getFullYear() + 1; // Get the current election cycle (even year)

    // Fetch election data from FEC API for the district, both for House and Senate
    const houseData = await getCachedRequest(`https://api.open.fec.gov/v1/elections/?state=${state}&district=${districtNumber}&cycle=${electionCycle}&office=house`);
    const senateData = await getCachedRequest(`https://api.open.fec.gov/v1/elections/?state=${state}&cycle=${electionCycle}&office=senate`);
    console.log('House data:', houseData);
    console.log('Senate data:', senateData);

    // Build present committees list
    const committees = getPresentCommittees(houseData, senateData);
    console.log('Present committees:', committees);

    // Fetch committee data from FEC for all committees referenced
    const committeeData = await getCachedCommitteeData(Array.from(committees));
    console.log('Committee data:', committeeData);

    // Build candidates list
    const candidates = getCandidates(houseData, senateData);
    console.log('Candidates:', candidates);

    // Get news data + platform data for all candidates from news API and LLM api
    const candidateData = await getCandidateData(candidates);
    console.log('Candidate data with news and platform info:', candidateData);

    // Finish result object and return it as JSON
    const result = getFormattedResult(houseData, senateData, committeeData, candidateData);

    return Response.json(result);
}

function sanitizeJSON(str: string) {
    return str.replace(/[\r\n\t]/g, '').trim();
}

function isValidJSON(str: string) {
    console.log('Checking if string is valid JSON:', str);
    try {
        JSON.parse(str);
        console.log('String is valid JSON');
        return true;
    } catch (e) {
        console.log('String is not valid JSON');
        return false;
    }
}

function getFormattedResult(houseData: any, senateData: any, committeeData: any[], candidateData: any[]) {
    const result = {
        house: [] as any[],
        senate: [] as any[],
    }

    /*
    Format of result object:

    house and senate contain candidates
    each candidate has:
    - candidate name
    - party affiliation
    - cash on hand
    - total disbursements
    - total receipts
    - list of committees they are associated with (names)
    - news articles about the candidate (title, source, date, url)
    - platform data about the candidate TODO: make this something formatted and structured, not just raw LLM output
    */

    if (houseData && houseData[0].results) {
        houseData[0].results.forEach((candidate: any) => {
            const candidateCommittees = committeeData.filter(committee => candidate['committee_ids'] && candidate['committee_ids'].includes(committee['committee_id'])).map(committee => committee['name']);

            const candidateNews = candidateData[candidate['candidate_id']]?.news || [];
            const candidatePlatform = sanitizeJSON(candidateData[candidate['candidate_id']]?.platform || "{}");
            const platformParsed = isValidJSON(candidatePlatform) ? JSON.parse(candidatePlatform) : {};

            const top_issues = platformParsed.top_issues || [];
            const positions = platformParsed.positions || [];

            const candidateInfo = {
                name: candidate['candidate_name'],
                party: candidate['party_full'],
                cash_on_hand: candidate['cash_on_hand_end_period'],
                total_disbursements: candidate['total_disbursements'],
                total_receipts: candidate['total_receipts'],
                committees: candidateCommittees,
                news: candidateNews.map((article: any) => ({
                    title: article.title,
                    source: article.source_name,
                    date: article.pubDate,
                    url: article.link,
                })),
                top_issues: top_issues,
                positions: positions,
            };
            result.house.push(candidateInfo);
        });
    }

    if (senateData && senateData[0].results) {
        senateData[0].results.forEach((candidate: any) => {
            const candidateCommittees = committeeData.filter(committee => candidate['committee_ids'] && candidate['committee_ids'].includes(committee['committee_id'])).map(committee => committee['name']);
            const candidateDataEntry = candidateData.find(entry => entry[0].candidateId === candidate['candidate_id'])[0];
            console.log(`Candidate ${candidate['candidate_name']} data entry:`, candidateDataEntry);
            const candidateNews = candidateDataEntry?.news || [];
            const candidatePlatform = sanitizeJSON(candidateDataEntry?.platform.content || "{}");
            const platformParsed = isValidJSON(candidatePlatform) ? JSON.parse(candidatePlatform) : {};

            const top_issues = platformParsed.top_issues || [];
            const positions = platformParsed.positions || [];

            const candidateInfo = {
                name: candidate['candidate_name'],
                party: candidate['party_full'],
                cash_on_hand: candidate['cash_on_hand_end_period'],
                total_disbursements: candidate['total_disbursements'],
                total_receipts: candidate['total_receipts'],
                committees: candidateCommittees,
                news: candidateNews.map((article: any) => ({
                    title: article.title,
                    source: article.source_name,
                    date: article.pubDate,
                    url: article.link,
                })),
                top_issues: top_issues,
                positions: positions,
            };
            result.senate.push(candidateInfo);
        });
    }

    return result;
}

async function getCandidateData(candidates: [string, string][]) {
    const client = createClient();
    await client.connect();

    const candidateData = [];
    const missingCandidateIds = [];
    for (const [candidateId, candidateName] of candidates) {
        const cachedData = await client.json.get(candidateId, { path: '$' });
        if (cachedData) {
            candidateData.push(cachedData);
        } else {
            missingCandidateIds.push(candidateId);
        }
    }

    if (missingCandidateIds.length > 0) {
        console.log('Cache miss for candidate IDs:', missingCandidateIds);
        // Fetch data for missing candidate IDs and cache it

        // Fetch news articles about each candidate
        const newsData: Record<string, any[]> = {};

        for (const [candidateId, candidateName] of candidates) {
            if (!missingCandidateIds.includes(candidateId)) {
                continue; // Skip candidates that are already cached
            }
            console.log(`Fetching news for candidate ${candidateName} (ID: ${candidateId})`);
            const request = `https://api.worldnewsapi.com/search-news/?text=${encodeURIComponent(candidateName)}&api-key=${process.env.NEWS_API_KEY}`;
            const response = await fetch(request);
            const data = await response.json();
            newsData[candidateId] = data.news; // Store articles for the candidate
        }

        const candidatePlatformData: Record<string, any> = {};

        // Run news articles through LLM to get platform data
        for (const [candidateId, candidateName] of candidates) {
            if (!missingCandidateIds.includes(candidateId)) {
                continue; // Skip candidates that are already cached
            }
            const articles = newsData[candidateId];
            console.log('Articles:', articles);
            console.log(`Processing candidate ${candidateName} with ${articles.length} articles for platform data extraction.`);
            const articlesContent = articles.map((article: any) => `${article.title}\n${article.text}`).join('\n\n');

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
                    messages: [
                        {
                            role: 'user',
                            content: `You will be given a series of news articles covering ${candidateName}. Output a valid JSON object, with no additional formatting or text, following this format:
                            {
                            "top_issues": [],
                            "positions": []
                            }
                            Where you identify three of the candidate's most important issues (in three words or less), and some positions they hold for a future office (partial sentences, starting with verbs). The issues and positions are not necessarily related. Here are the articles` + articlesContent,
                        }
                    ],
                    reasoning: { enabled: false }
                })
            });

            const result = await response.json();
            console.log('LLM response:', result);
            const platformData = result.choices[0].message;

            candidatePlatformData[candidateId] = platformData;
        }

        // Cache the candidate data in Redis
        for (const candidateId of missingCandidateIds) {
            const data = {
                candidateId: candidateId,
                news: newsData[candidateId],
                platform: candidatePlatformData[candidateId],
            };
            candidateData.push(data);
            await client.json.set(candidateId, '$', data);
            await client.expire(candidateId, 3600); // Cache for 1 hour
        }
    } else {
        console.log('Cache hit for all candidate IDs');
    }

    return candidateData;
}

function getCandidates(houseData: any, senateData: any) {
    const candidates: [string, string][] = [];

    if (houseData && houseData[0].results) {
        houseData[0].results.forEach((candidate: any) => {
            candidates.push([candidate['candidate_id'], candidate['candidate_name']]);
        });
    }

    if (senateData && senateData[0].results) {
        senateData[0].results.forEach((candidate: any) => {
            candidates.push([candidate['candidate_id'], candidate['candidate_name']]);
        });
    }

    return candidates;
}

function getPresentCommittees(houseData: any, senateData: any) {
    const committees = new Set<string>();

    if (houseData && houseData[0].results) {
        houseData[0].results.forEach((candidate: any) => {
            if (candidate['committee_ids']) {
                candidate['committee_ids'].forEach((committeeId: string) => {
                    committees.add(committeeId);
                });
            }
        });
    }

    if (senateData && senateData[0].results) {
        senateData[0].results.forEach((candidate: any) => {
            if (candidate['committee_ids']) {
                candidate['committee_ids'].forEach((committeeId: string) => {
                    committees.add(committeeId);
                });
            }
        });
    }

    return Array.from(committees);
}

async function getCachedCommitteeData(committeeIds: string[]) {
    const client = createClient();
    await client.connect();

    const committeeData = [];
    const missingCommitteeIds = [];
    for (const committeeId of committeeIds) {
        const cachedData = await client.json.get(committeeId, { path: '$' });
        if (cachedData) {
            committeeData.push(cachedData);
        } else {
            missingCommitteeIds.push(committeeId);
        }
    }

    if (missingCommitteeIds.length > 0) {
        console.log('Cache miss for committee IDs:', missingCommitteeIds);
        // Fetch data for missing committee IDs and cache it
        const request = `https://api.open.fec.gov/v1/committees/?committee_id=${missingCommitteeIds.join(',')}&api_key=${process.env.FEC_API_KEY}`;
        const response = await fetch(request);
        const data = await response.json();

        if (data && data.results) {
            for (const committee of data.results) {
                committeeData.push(committee);
                await client.json.set(committee['committee_id'], '$', committee);
                await client.expire(committee['committee_id'], 3600); // Cache for 1 hour
            }
        }
    } else {
        console.log('Cache hit for all committee IDs');
    }

    return committeeData;
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
    const response = await fetch(request + `&api_key=${process.env.FEC_API_KEY}`);
    const data = await response.json();

    // Cache the response in Redis with an expiration time (e.g., 1 hour).
    await client.json.set(request, '$', data);
    await client.expire(request, 3600); // Set expiration to 1 hour (3600 seconds).

    return data;
}