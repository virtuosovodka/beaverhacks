import { quizNext, quizResults, QuizState } from "../lib/quiz"
import { Candidate } from "../election/page"
import { formatCandidateName } from "../lib/utils"

export function QuizModal({ candidates, quizState, answer, onClose }: { 
  candidates: Candidate[]
  quizState: QuizState
  answer: (answer: 1 | 2 | null) => void
  onClose: () => void
}) {
  // don't render anything if the quiz hasn't started
  if (!quizState?.currentQuestion) return null
 
  // show results screen after 10 questions
  if (quizState.asked > 10) {
    const results = quizResults(quizState)
    return (
      // semi-transparent overlay so election page shows through behind
      <div className="fixed inset-0 bg-transparent backdrop-brightness-50 flex items-center justify-center z-50">
        {/* wider results card in off-white to match site background */}
        <div className="rounded-lg p-8 w-full max-w-2xl relative" style={{ background: "oklch(92.3% 0.003 48.717)" }}>
          {/* x button to close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl font-bold transition-colors"
          >
            ✕
          </button>
          <div>
            <h2 className="text-2xl font-bold font-sans mb-6">Your Results</h2>
            {results.map((result, index) => (
              <div key={index} className="mb-4 p-4 border border-gray-200 rounded-md">
                {/* show rank number next to name */}
                <h3 className="font-sans font-semibold text-lg">
                  #{index + 1} {formatCandidateName(candidates[result.candidateIndex].name)}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Top positions you agreed with: {result.topPositions.join(", ")}
                </p>
              </div>
            ))}

          </div>
        </div>
      </div>
    )
  }
 
  // get the two positions being compared this round
  const [candidate1Index, position1Index] = quizState.currentQuestion[0]
  const [candidate2Index, position2Index] = quizState.currentQuestion[1]
 
  const candidate1Position = quizState.candidatePositions[candidate1Index][position1Index]
  const candidate2Position = quizState.candidatePositions[candidate2Index][position2Index]
  const candidate1Name = formatCandidateName(candidates[candidate1Index].name)
  const candidate2Name = formatCandidateName(candidates[candidate2Index].name)
 
  return (
    <div className="fixed inset-0 backdrop-brightness-50 flex items-center justify-center z-50">
      <div className="bg-white opacity-100 rounded-lg p-8 w-full max-w-md relative">
 
        {/* x button to close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl font-bold transition-colors"
        >
          ✕
        </button>
 
        {/* question counter */}
        <p className="text-xs text-gray-400 font-sans uppercase tracking-wide mb-2">
          Question {quizState.asked} of 10
        </p>
 
        <h2 className="text-xl font-bold font-sans mb-6">Which position do you agree with more?</h2>
 
        {/* candidate 1 button */}
        <button
          onClick={() => answer(1)}
          className="w-full text-left border border-gray-300 rounded-md p-4 mb-3 hover:bg-stone-100 transition-colors"
        >
          <p className="text-sm font-serif">{candidate1Position}</p>
        </button>
 
        {/* candidate 2 button */}
        <button
          onClick={() => answer(2)}
          className="w-full text-left border border-gray-300 rounded-md p-4 hover:bg-stone-100 transition-colors"
        >
          <p className="text-sm font-serif">{candidate2Position}</p>
        </button>
 
      </div>
    </div>
  )
}
 