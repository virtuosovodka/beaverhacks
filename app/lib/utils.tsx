export function formatCandidateName(name: string): string {
    // Candidate names start as LAST, FIRST MIDDLE
    // Want to convert to first middle last
    const parts = name.split(",").map(part => part.trim())
    if (parts.length === 2) {
        const [last, firstMiddle] = parts
        const lastTitleCase = last.split(" ").map(word => formatWord(word)).join(" ")
        const firstMiddleTitleCase = firstMiddle.split(" ").map(word => formatWord(word)).join(" ")
        console.log(`Formatted candidate name: ${firstMiddleTitleCase} ${lastTitleCase}`)
        return `${firstMiddleTitleCase} ${lastTitleCase}`.trim()
    }
    return name
}

function formatWord(word: string): string {
    if (word.length === 0) return word
    // Special cases are hyphenated and nicknames
    if (word.includes("-")) {
        return word.split("-").map(part => formatWord(part)).join("-")
    }
    if (word.startsWith('"') && word.endsWith('"')) {
        return `"${formatWord(word.slice(1, -1))}"`
    }
    // Default case is just capitalize first letter
    return word[0].toUpperCase() + word.slice(1).toLowerCase()
}