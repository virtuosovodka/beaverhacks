"use client"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { quizNext, quizResults, QuizState } from "../lib/quiz"
import { QuizModal } from "../quiz/quizmodal"
import { formatCandidateName } from "../lib/utils"

// shape of a candidate from /api/[district]
export type Candidate = {
  candidate_id: string
  name: string
  party_full: string
  incumbent_challenge_full: string
  district: string
  top_issues: string[]
  positions: string[]
}

// state + district resolved from the user's address
type Divisions = {
  state: string
  district: string
}

// fun facts shown on the loading screen while data fetches
const FUN_FACTS = [
  "The word 'vote' comes from the Latin 'votum', meaning a vow or wish.",
  "The first U.S. presidential election was held in 1788.",
  "Australia has mandatory voting. There are fines for not showing up!",
  "The secret ballot was introduced in the U.S. in the 1880s.",
  "Women gained the right to vote in the U.S. in 1920 with the 19th Amendment.",
  "The youngest U.S. president was Theodore Roosevelt at age 42.",
  "Only 55% of eligible voters participated in the 2016 presidential election.",
  "The U.S. has over 10,000 distinct election jurisdictions.",
  "Oregon was the first state to adopt vote-by-mail in 2000.",
  "The longest serving U.S. Senator was Robert Byrd at 51 years.",
  "Voter turnout in midterm elections is typically 20% lower than presidential years.",
  "The Electoral College has 538 total electors.",
]

// shown while /district and /api/[district] are fetching — also used as Suspense fallback
function LoadingScreen() {
  const [factIndex, setFactIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // cycle through fun facts every 3 seconds
    const factInterval = setInterval(() => {
      setFactIndex(i => (i + 1) % FUN_FACTS.length)
    }, 3000)

    // ease toward 95% over ~25 seconds, never hits 100 until data is done
    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 95) return 95
        return p + (95 - p) * 0.03
      })
    }, 300)

    return () => {
      clearInterval(factInterval)
      clearInterval(progressInterval)
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-8">
      <button className="text-3xl font-bold font-sans">Infolection</button>

      <div className="flex flex-col items-center gap-4 max-w-md w-full">
        <p className="font-sans font-medium text-lg">Loading your ballot...</p>

        {/* animated progress bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-stone-800 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-xs text-gray-400">
          Fetching candidates, funding data, and platform analysis. This may take up to 60 seconds on first load.
        </p>
      </div>

      {/* fun fact card — cycles through FUN_FACTS every 3s */}
      <div className="max-w-md w-full border border-gray-200 rounded-md p-6 bg-white">
        <p className="text-xs font-sans font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Did you know?
        </p>
        <p key={factIndex} className="font-serif text-gray-700 text-sm leading-relaxed">
          {FUN_FACTS[factIndex]}
        </p>
      </div>
    </div>
  )
}

function ElectionContent() {
  const searchParams = useSearchParams()
  const address = searchParams.get("address")
  const router = useRouter()

  const [divisions, setDivisions] = useState<Divisions | null>(null)
  const [houseCandidates, setHouseCandidates] = useState<Candidate[]>([])
  const [senateCandidates, setSenateCandidates] = useState<Candidate[]>([])
  const [quizCandidates, setQuizCandidates] = useState<Candidate[]>([])
  const [quizState, setQuizState] = useState(null as any)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchData() {
      try {
        // retry up to 3 times in case the route isn't ready on first navigation
        let divData = null
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const divRes = await fetch(`/district?address=${encodeURIComponent(address ?? "")}`)
            const json = await divRes.json()
            if (json && json[0]) { divData = json[0]; break }
          } catch {
            // wait 500ms before retrying
            await new Promise(r => setTimeout(r, 500))
          }
        }
        if (!divData) throw new Error("District lookup failed after retries")

        const state = divData.normalizedInput.state

        // extract district number from ocd-division key e.g. "ocd-division/country:us/state:or/cd:5"
        let district = "00"
        for (const key of Object.keys(divData.divisions)) {
          const match = key.match(/\/cd:(\d+)/)
          if (match) {
            district = match[1].padStart(2, "0")
            break
          }
        }

        setDivisions({ state, district })

        // fetch candidates + platform data — hits FEC + Tavily, cached in Redis
        const electionData = await fetch(`/api/${state}${district}`).then(res => res.json())
        console.log("Election data:", electionData)

        setHouseCandidates(electionData.house)
        setSenateCandidates(electionData.senate)

        setLoading(false)
      } catch (err) {
        console.log(err)
        setError("Failed to load election data")
        setLoading(false)
      }
    }
    // force a fresh fetch every time the address changes
    if (address) {
      setLoading(true)
      setError("")
      fetchData()
    }
  }, [address])

  // show loading screen while fetching
  if (loading) return <LoadingScreen />
  if (error) return <p style={{ textAlign: "center", marginTop: "48px", color: "var(--accent)" }}>{error}</p>

  // initialize quiz state for a given set of candidates
  function startQuiz(candidates: Candidate[]) {
    const quizState: QuizState = {
      candidatePositions: candidates.map(c => c.positions),
      scores: candidates.map((candidate) => Array(candidate.positions.length).fill(0)),
      opportunities: candidates.map((candidate) => Array(candidate.positions.length).fill(0)),
      currentQuestion: [[0, 0], [1, 0]],
      currentAnswer: null,
      asked: 0
    }
    const updatedQuizState = quizNext(quizState, null)
    setQuizState(updatedQuizState)
    setQuizCandidates(candidates)
  }

  // handle each quiz answer and advance to the next question
  function quizUpdateHandler(answer: 1 | 2 | null) {
    if (!quizState) return
    const updatedQuizState = quizNext(quizState, answer)
    setQuizState({ ...updatedQuizState })
  }

  console.log(`quizState:`, quizState)

  return (
    <>
      {/* header */}
      <div className="flex flex-col items-center justify-center font-sans p-8 w-full">
        <button onClick={() => router.push("/")} className="text-3xl font-bold">Infolection</button>
      </div>

      {/* state + district label */}
      <div className="flex flex-col items-start justify-start font-serif p-4 pl-16 pr-16">
        <p className="text-sm text-gray-500">
          {divisions?.state} - {divisions?.district} Congressional District
        </p>
      </div>

      <div className="flex flex-col items-start justify-start font-serif p-4 pr-32 pl-32">
        <div className="flex flex-col gap-5 w-full">
          <h2 className="text-3xl font-bold font-sans">U.S. Senate</h2>
          {/*check for if there actually is little man running*/}
          {senateCandidates.length > 0 ? (
            senateCandidates.map((c, i) => (
              <CandidateCard key={i} candidate={c} onClick={() => router.push(`/candidate?data=${encodeURIComponent(JSON.stringify(c))}`)} />
            ))
          ) : (
            <p className="text-gray-400 text-sm">No candidates found for this state.</p>
          )}
        </div>

        {/* house candidates */}
        <div className="flex flex-col gap-5 mt-8 w-full">
          <h2 className="text-3xl font-bold font-sans">U.S. House of Representatives</h2>
          {houseCandidates.length > 0 ? (
            houseCandidates.map((c, i) => (
              <CandidateCard key={i} candidate={c} onClick={() => router.push(`/candidate?data=${encodeURIComponent(JSON.stringify(c))}`)} />
            ))
          ) : (
            <p className="text-gray-400 text-sm">No candidates found for this district.</p>
          )}
        </div>
      </div>

      {/* quiz modal — only visible when quizState is set */}
      <QuizModal candidates={quizCandidates} quizState={quizState} answer={quizUpdateHandler} />
    </>
  )
}

// Suspense required by Next.js App Router when using useSearchParams()
export default function Election() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ElectionContent />
    </Suspense>
  )
}

function QuizButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="ml-4 text-sm font-sans text-gray-500 hover:text-gray-700 transition-colors"
    >
      Find your match
    </button>
  )
}

// clickable card showing candidate name and top issues
function CandidateCard({ candidate, onClick }: { candidate: Candidate, onClick?: () => void }) {
  return (
    <div
      className="cursor-pointer flex w-full flex-row items-center gap-4 p-4 border border-gray-300 rounded-md hover:bg-stone-300 transition-colors"
      onClick={onClick}
    >
      <h3 className="font-sans text-md font-bold">{formatCandidateName(candidate.name)}</h3>
      <p>{candidate.top_issues.join(", ")}</p>
    </div>
  )
}