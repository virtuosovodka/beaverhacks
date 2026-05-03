"use client"
// need next client to have interactive ui components in browser

import { Suspense } from "react"
import { formatCandidateName } from "../lib/utils"
import { useSearchParams, useRouter } from "next/navigation"

// Shape of candidate data passed from election page via URL query param
type Candidate = {
  name: string
  party: string
  cash_on_hand: number
  total_disbursements: number
  total_receipts: number
  committees: string[]
  top_issues: string[]
  positions: string[]
  incumbent_challenge_full: string
}

// Formats a raw dollar amount into a readable shorthand (e.g. $1.4M, $280K)
function formatMoney(n: number): string {
  if (!n) return "$0"
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

// Returns what percentage `part` is of `total` as a string (e.g. "58%")
// Guards against divide-by-zero when a candidate has no financial data
function pct(part: number, total: number): string {
  if (!total) return "0%"
  return `${Math.round((part / total) * 100)}%`
}

function CandidateContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Read candidate data from URL query param (passed from election page)
  // We use URL params instead of fetching because all data is already
  // available from the /api/[district] route called on the election page
  const raw = searchParams.get("data")
  if (!raw) return (
    <p className="text-center mt-12 text-gray-400">No candidate data found.</p>
  )

  const candidate: Candidate = JSON.parse(decodeURIComponent(raw))

  return (
    <>
      {/* HEADER -- matches election page header style */}
      <div className="flex flex-col items-center justify-center font-sans p-8 w-full">
        <button onClick={() => router.push("/")} className="text-3xl font-bold">Infolection</button>
      </div>

      <div className="flex flex-col items-start justify-start font-serif p-4 pr-32 pl-32 gap-6">

        {/* BACK BUTTON */}
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← Back to ballot
        </button>

        {/* NAME + PARTY */}
        <div>
            <h1 className="text-4xl font-bold font-sans">{formatCandidateName(candidate.name)}</h1>
          <p className="text-gray-500 mt-1">{candidate.party} — {candidate.incumbent_challenge_full}</p>
        </div>

        {/* TOP ROW -- three columns: funding, top issues, committees */}
        <div className="grid grid-cols-3 gap-6 w-full">

          {/* LEFT -- campaign funding breakdown */}
          <div className="border border-gray-300 rounded-md p-4">
            <h3 className="font-sans font-bold text-lg mb-3">Campaign Funding</h3>
            <p>Raised: <strong>{formatMoney(candidate.total_receipts)}</strong></p>
            <p>Spent: <strong>{formatMoney(candidate.total_disbursements)}</strong></p>
            <p>Cash on hand: <strong>{formatMoney(candidate.cash_on_hand)}</strong></p>

            {/* Progress bar showing what fraction of raised money has been spent */}
            {candidate.total_receipts > 0 && (
              <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-stone-800 rounded-full transition-all"
                  style={{ width: pct(candidate.total_disbursements, candidate.total_receipts) }}
                />
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {pct(candidate.total_disbursements, candidate.total_receipts)} of raised funds spent
            </p>
          </div>

          {/* MIDDLE -- top issues populated by LLM via Tavily in /api/[district] route */}
          <div className="border border-gray-300 rounded-md p-4">
            <h3 className="font-sans font-bold text-lg mb-3">Top Issues</h3>
            {candidate.top_issues.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {candidate.top_issues.map((issue, i) => (
                  <span
                    key={i}
                    className="bg-stone-100 text-stone-700 text-sm px-2 py-1 rounded-md"
                  >
                    {issue}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No issues data available.</p>
            )}
          </div>

          {/* RIGHT -- associated committees from FEC data */}
          <div className="border border-gray-300 rounded-md p-4">
            <h3 className="font-sans font-bold text-lg mb-3">Associated Committees</h3>
            {candidate.committees.length > 0 ? (
              candidate.committees.map((committee, i) => (
                <p key={i} className="text-sm text-gray-600">{committee}</p>
              ))
            ) : (
              <p className="text-gray-400 text-sm">No committee data available.</p>
            )}
          </div>
        </div>

        {/* BOTTOM -- platform positions populated by LLM via Tavily */}
        <div className="border border-gray-300 rounded-md p-4 w-full">
          <h3 className="font-sans font-bold text-lg mb-3">Platform & Positions</h3>
          {candidate.positions.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {candidate.positions.map((position, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-stone-400 mt-0.5">•</span>
                  <span>{position}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">No platform data available.</p>
          )}
        </div>

      </div>
    </>
  )
}

export default function Candidate() {
  return (
    // Suspense required by Next.js App Router when using useSearchParams()
    <Suspense fallback={<p className="text-center mt-12">Loading...</p>}>
      <CandidateContent />
    </Suspense>
  )
}