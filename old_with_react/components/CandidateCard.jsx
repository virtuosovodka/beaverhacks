function CandidateCard({ name, office, party, state }) {
  return (
    <div style={{ border: "1px solid #ccc", padding: "16px", borderRadius: "8px", marginBottom: "16px" }}>
      <h2>{name}</h2>
      <p><strong>Office:</strong> {office}</p>
      <p><strong>Party:</strong> {party}</p>
      <p><strong>State:</strong> {state}</p>
    </div>
  )
}

export default CandidateCard
