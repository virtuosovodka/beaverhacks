type QuizState = {
    candidatePositions: string[][]
    scores: number[][]
    opportunities: number[][]
    currentQuestion: [[number, number], [number, number]]
    currentAnswer: 1 | 2 | null
}

export function quizNext(state: QuizState, answer: 1 | 2 | null) {
    if (state.currentAnswer !== null) {
        // Update scores based on the answer
        const [candidate1, candidate2] = state.currentQuestion
        if (answer === 1) {
            state.scores[candidate1[0]][candidate1[1]] += 1
            state.scores[candidate2[0]][candidate2[1]] -= 1
        } else {
            state.scores[candidate2[0]][candidate2[1]] += 1
            state.scores[candidate1[0]][candidate1[1]] -= 1
        }
        state.opportunities[candidate1[0]][candidate1[1]] += 1
        state.opportunities[candidate2[0]][candidate2[1]] += 1
    }

    // Select next pair of candidates to compare
    const [nextCandidate1, nextCandidate2] = getLeastSeenPair(state)
    const nextIndex1 = getLeastSeenPosition(state, nextCandidate1)
    const nextIndex2 = getLeastSeenPosition(state, nextCandidate2)

    state.currentQuestion = [[nextCandidate1, nextIndex1], [nextCandidate2, nextIndex2]]
    state.currentAnswer = null

    return state
}

function getLeastSeenPair(state: QuizState): [number, number] {
    const candidateTotals = state.opportunities.map((candidate, index) => ({
        total: candidate.reduce((a, b) => a + b, 0),
        index
    })).sort((a, b) => a.total - b.total);

    return [candidateTotals[0].index, candidateTotals[1].index]
}

function getLeastSeenPosition(state: QuizState, candidateIndex: number): number {
    let minOpportunities = Infinity
    let positionIndex = 0

    for (let i = 0; i < state.candidatePositions[candidateIndex].length; i++) {
        if (state.opportunities[candidateIndex][i] < minOpportunities) {
            minOpportunities = state.opportunities[candidateIndex][i]
            positionIndex = i
        }
    }

    return positionIndex
}

export function quizResults(state: QuizState) {
    // Calculate final results based on scores

    const results = state.candidatePositions.map((candidate, index) => {
        let score = 0

        for (let i = 0; i < state.scores[index].length; i++) {
            if (state.opportunities[index][i] === 0) continue // Avoid division by zero
            score += state.scores[index][i] / state.opportunities[index][i]
        }

        const sortedPositions = state.candidatePositions[index]
            .map((position, posIndex) => ({ position, score: state.scores[index][posIndex] }))
            .sort((a, b) => b.score - a.score)

        return {
            candidate: candidate[0], // Candidate index
            score: score, // Total score
            topPositions: sortedPositions.slice(0, 3).map((p) => p.position) // Top 3 positions the user agrees with
        };
    }).sort((a, b) => b.score - a.score) // Sort candidates by score

    return results;
}