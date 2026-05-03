export function formatCandidateName(name: string): string {
    // Candidate names start as LAST, FIRST MIDDLE
    const parts = name.split(",").map(part => part.trim())
    if (parts.length === 2) {
        const lastName = parts[0].toUpperCase().charAt(0) + parts[0].slice(1).toLowerCase()
        const firstMiddle = parts[1].split(" ").filter(Boolean)
        const firstName = firstMiddle[0].toUpperCase().charAt(0) + firstMiddle[0].slice(1).toLowerCase()
        const middleName = firstMiddle.at(1)?.toUpperCase().charAt(0) + (firstMiddle.at(1) || "").slice(1).toLowerCase()
        return `${firstName} ${firstMiddle.at(1) !== undefined ? middleName : ""} ${lastName}`.trim()
    }
    return name
}