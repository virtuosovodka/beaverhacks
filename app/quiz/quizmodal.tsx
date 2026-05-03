import { quizNext, quizResults, QuizState } from "../lib/quiz"
import { Candidate } from "../election/page"

export function QuizModal({ candidates, quizState, answer }: { candidates: Candidate[], quizState: QuizState, answer: (answer: 1 | 2 | null) => void }) {
    if (!quizState?.currentQuestion) {
        return null
    }

    if (quizState.asked > 10) {
        const results = quizResults(quizState)
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 w-full max-w-md">
                    <h2 className="text-2xl font-bold mb-4">Your Quiz Results</h2>
                    {results.map((result, index) => (
                        <div key={index} className="mb-4">
                            <h3 className="text-xl font-semibold">{candidates[result.candidateIndex].name}</h3>
                            <p>Top positions: {result.topPositions.join(", ")}</p>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const [candidate1Index, position1Index] = quizState.currentQuestion[0]
    const [candidate2Index, position2Index] = quizState.currentQuestion[1]

    const candidate1 = quizState.candidatePositions[candidate1Index][position1Index]
    const candidate2 = quizState.candidatePositions[candidate2Index][position2Index]

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Which candidate do you agree with more?</h2>
                <button onClick={() => answer(1)} className="w-full bg-blue-500 text-white py-2 px-4 rounded mb-4">{candidate1}</button>
                <button onClick={() => answer(2)} className="w-full bg-green-500 text-white py-2 px-4 rounded">{candidate2}</button>
            </div>
        </div>
    )
}