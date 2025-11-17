"use client";

import { useState } from "react";

export default function TestApiPage() {
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleClick = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/health");
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div>
      <h1>API Test Page</h1>
      <button onClick={handleClick}>Make API Request</button>
      {response && (
        <div>
          <h2>Response:</h2>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
      {error && (
        <div>
          <h2>Error:</h2>
          <pre>{error.message}</pre>
        </div>
      )}
    </div>
  );
}
