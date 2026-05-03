import { get } from 'http';
import { platform } from 'os';
import { encode } from 'punycode';
import { createClient } from 'redis';
const { tavily } = require('@tavily/core');

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
    console.log('Candidate platform info:', candidateData);

    // Finish result object and return it as JSON
    const result = getFormattedResult(houseData, senateData, committeeData, candidateData);

    return Response.json(result);
}

function sanitizeJSON(str: string) {
    // Often returned without proper anything really. The most reliable part is that it will have ["issue1", "issue2"] and ["position1", "position2"] lists, so just look for those.
    const topIssuesMatch = str.match(/"?top_issues"?\s*:\s*(\[[^\]]*\])/);
    const positionsMatch = str.match(/"?positions"?\s*:\s*(\[[^\]]*\])/);

    if (topIssuesMatch && positionsMatch) {
        const json = JSON.parse(`{"top_issues": ${topIssuesMatch[1]}, "positions": ${positionsMatch[1]}}`);
        // Make all the issues title case and all the positions start with a capital letter
        json.top_issues = json.top_issues.map((issue: string) => issue.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
        json.positions = json.positions.map((position: string) => position.charAt(0).toUpperCase() + position.slice(1));
        return JSON.stringify(json);
    }

    return "{}";
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
    - platform data about the candidate
    */

    if (houseData && houseData[0].results) {
        houseData[0].results.forEach((candidate: any) => {
            const candidateCommittees = committeeData.filter(committee => candidate['committee_ids'] && candidate['committee_ids'].includes(committee['committee_id'])).map(committee => committee['name']);
            const candidateDataEntry = candidateData.find(entry => entry[0].candidateId === candidate['candidate_id'])[0];
            console.log(`Candidate ${candidate['candidate_name']} data entry:`, candidateDataEntry);
            const candidatePlatform = sanitizeJSON(candidateDataEntry?.platform.answer || "{}");
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
            const candidatePlatform = sanitizeJSON(candidateDataEntry?.platform.answer || "{}");
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
    client.on('error', err => console.log('Redis Client Error', err));
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

        const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

        const candidatePlatformData: Record<string, any> = {};

        // Run news articles through LLM to get platform data
        for (const [candidateId, candidateName] of candidates) {
            if (!missingCandidateIds.includes(candidateId)) {
                continue; // Skip candidates that are already cached
            }

            const platformData = await tavilyClient.search(`Find information on the political platform of ${candidateName}, returning a JSON object with the lists "top_issues" (short keywords) and "positions" (partial sentences, starting with verbs).`, {
                searchDepth: "basic",
                includeAnswer: "advanced",
            });

            candidatePlatformData[candidateId] = platformData;
        }

        // Cache the candidate data in Redis
        for (const candidateId of missingCandidateIds) {
            const data = {
                candidateId: candidateId,
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