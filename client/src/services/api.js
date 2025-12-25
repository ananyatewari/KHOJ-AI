const BASE_URL = "http://localhost:3000/api";

export async function ingestDocument(payload) {
  return fetch(`${BASE_URL}/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "supersecret123"
    },
    body: JSON.stringify(payload)
  }).then(res => res.json());
}

export async function semanticSearch(query, scope, documentId) {
  return fetch("http://localhost:3000/api/search/semantic", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({
      query,
      scope,
      documentId
    }),
  }).then(res => res.json());
}

export async function getStats() {
  return fetch(`${BASE_URL}/dashboard/stats`, {
    headers: {
      "x-api-key": "supersecret123"
    }
  }).then(res => res.json());
}
