import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";

function TestAPI() {
  const [msg, setMsg] = useState("");

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/test")
      .then((res) => setMsg(res.data.message))
      .catch(() => setMsg("Error contacting server"));
  }, []);

  return (
    <Layout role="admin">
      <h2>Backend API Test</h2>
      <p>{msg}</p>
    </Layout>
  );
}
export default TestAPI;
