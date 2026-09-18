"use client";

import { useState, useEffect, Key } from "react";
import { db, auth } from "@/lib/firebase-client";
import { collection, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PushDataPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientNames, setSelectedClientNames] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState(""); // ✅ search
  const [pushDate, setPushDate] = useState("");
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<any>(null);
  const [recentPushLogs, setRecentPushLogs] = useState<any[]>([]);
  const [lastSubmittedData, setLastSubmittedData] = useState<any[]>([]);

  useEffect(() => {
    loadClients();
    loadRecentPushLogs();
    loadLastSubmittedData();
  }, []);

  /* ================= LOAD CLIENTS ================= */
  async function loadClients() {
    const user = auth.currentUser;
    if (!user) return;

    const snap = await getDocs(collection(db, "clients"));
    setClients(
      snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name || d.id,
      }))
    );
  }

  /* ================= RECENT PUSH LOGS ================= */
  async function loadRecentPushLogs() {
    try {
      const res = await fetch("/api/push/logs");
      const data = await res.json();
      setRecentPushLogs(data || []);
    } catch (error) {
      console.error("Failed to fetch recent push logs", error);
    }
  }

  /* ================= LAST SUBMITTED DATA ================= */
  async function loadLastSubmittedData() {
    try {
      const res = await fetch("/api/last-submitted-data");
      const data = await res.json();

      // ✅ API returns OBJECT → convert to ARRAY
      if (Array.isArray(data)) {
        setLastSubmittedData(data);
      } else if (data) {
        setLastSubmittedData([data]);
      } else {
        setLastSubmittedData([]);
      }
    } catch (error) {
      console.error("Failed to fetch last submitted data", error);
    }
  }

  /* ================= PUSH HANDLER ================= */
  const handlePush = async () => {
    if (selectedClientNames.length === 0 || !pushDate) {
      alert("Select client and date");
      return;
    }

    try {
      setPushing(true);
      setPushResult(null);

      const res = await fetch("/api/push/rcs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_PUSH_API_KEY!,
        },
        body: JSON.stringify({
          clientNames: selectedClientNames,
          fromDate: pushDate,
        }),
      });

      const data = await res.json();
      setPushResult(data);

      alert("✅ Data pushed successfully");
      loadRecentPushLogs();
      loadLastSubmittedData();
    } catch (err) {
      console.error(err);
      alert("❌ Push failed");
    } finally {
      setPushing(false);
    }
  };
  function formatDate(dateValue: any) {
  if (!dateValue) return "-";
  const d = new Date(dateValue);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

  /* ================= CLIENT CHECKBOX HANDLER ================= */
  const handleClientSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clientName = e.target.value;
    setSelectedClientNames((prev) =>
      e.target.checked
        ? [...prev, clientName]
        : prev.filter((name) => name !== clientName)
    );
  };

  /* ================= FILTERED CLIENTS ================= */
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Push Data to RCS</h1>

      {/* ================= PUSH FORM ================= */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Client</label>

        {/* 🔍 Search */}
        <input
          type="text"
          placeholder="Search client..."
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />

        <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-2">
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <div key={client.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={client.id}
                  value={client.name}
                  checked={selectedClientNames.includes(client.name)}
                  onChange={handleClientSelection}
                  className="mr-2"
                />
                <label htmlFor={client.id}>{client.name}</label>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No clients found</p>
          )}
        </div>

        <label className="text-sm font-medium">Date</label>
        <input
          type="date"
          className="w-full border rounded px-3 py-2"
          value={pushDate}
          onChange={(e) => setPushDate(e.target.value)}
        />

        <button
          disabled={pushing || !pushDate || selectedClientNames.length === 0}
          onClick={handlePush}
          className="px-4 py-2 rounded bg-green-600 text-black disabled:opacity-50"
        >
          {pushing ? "Pushing..." : "Push"}
        </button>
      </div>

      {/* ================= PUSH RESULT ================= */}
      {/* ================= PUSH RESULT ================= */}
    {pushResult && (
    <div className="mt-4 space-y-3 border rounded p-3 bg-gray-50">
        <h3 className="font-semibold text-sm">Push Response</h3>

        {/* 🔽 Scrollable Response Box */}
        <div className="max-h-64 overflow-y-auto border rounded bg-white p-3">
        <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(pushResult, null, 2)}
        </pre>
        </div>

        {/* ⬇️ Download Button BELOW */}
        <button
        onClick={() => downloadJSON(pushResult,pushDate)}
        className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
        Download JSON
        </button>
    </div>
    )}

      {/* ================= LOGS & LAST SUBMITTED (SIDE BY SIDE) ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ================= RECENT PUSH LOGS ================= */}
        <Card>
            <CardHeader>
            <CardTitle>Recent Push Logs</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
            <table className="min-w-full border text-sm">
                <thead>
                <tr>
                    <th className="border px-2">Client</th>
                    <th className="border px-2">Source</th>
                    <th className="border px-2">Date</th>
                    <th className="border px-2">Module</th>
                    <th className="border px-2">Status</th>
                </tr>
                </thead>
                <tbody>
                {recentPushLogs.length ? (
                    recentPushLogs.map((log, i) => (
                    <tr key={i}>
                        <td className="border px-2">{log.client_name}</td>
                        <td className="border px-2">{log.source}</td>
                        <td className="border px-2">{formatDate(log.from_date)}</td>
                        <td className="border px-2">{log.module}</td>
                        <td className="border px-2">{log.status}</td>
                    </tr>
                    ))
                ) : (
                    <tr>
                    <td colSpan={5} className="text-center border">
                        No logs available
                    </td>
                    </tr>
                )}
                </tbody>
            </table>
            </CardContent>
        </Card>

        {/* ================= LAST SUBMITTED DATA ================= */}
        <Card>
            <CardHeader>
            <CardTitle>Last Submitted Data</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
            <table className="min-w-full border text-sm">
                <thead>
                <tr>
                    <th className="border px-2">Client</th>
                    <th className="border px-2">SDS</th>
                    <th className="border px-2">Date</th>
                    <th className="border px-2">Branch</th>
                    <th className="border px-2">Type</th>
                </tr>
                </thead>
                <tbody>
                {lastSubmittedData.length ? (
                    lastSubmittedData.map((d, i: Key) => (
                    <tr key={i}>
                        <td className="border px-2">{d.client_name}</td>
                        <td className="border px-2">{d.sds_code}</td>
                        <td className="border px-2">{formatDate(d.report_date)}</td>
                        <td className="border px-2">{d.branch_name}</td>
                        <td className="border px-2">{d.submission_type}</td>
                    </tr>
                    ))
                ) : (
                    <tr>
                    <td colSpan={5} className="text-center border">
                        No data available
                    </td>
                    </tr>
                )}
                </tbody>
            </table>
            </CardContent>
        </Card>

        </div>
    </div>
  );
}

/* ================= DOWNLOAD JSON ================= */
function downloadJSON(data: any, pushDate: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `push_data_${pushDate}.json`;
  a.click();
  URL.revokeObjectURL(url);
}