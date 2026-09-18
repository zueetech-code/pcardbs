"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase-client";
import { collection, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/* ================= TYPES ================= */

type View =
  | "NONE"
  | "TOTAL_CLIENTS"
  | "PENDING_TODAY"
  | "SUBMITTED"
  | "SUBMITTED_SOURCE"
  | "TO_BE_PUSHED"
  | "PUSHED"
  | "FAILED";

export default function PushDataPage() {

  const [clients, setClients] = useState<string[]>([]);
  const [firebaseSubmitted, setFirebaseSubmitted] = useState<any[]>([]);
  const [localSubmitted, setLocalSubmitted] = useState<any[]>([]);
  const [pushLogs, setPushLogs] = useState<any[]>([]);


  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [pushDate, setPushDate] = useState("");

  const [view, setView] = useState<View>("NONE");
  const [viewHistory, setViewHistory] = useState<View[]>([]);

  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  /* ================= VIEW HELPERS ================= */

  function goToView(next: View) {
    setViewHistory((prev) => [...prev, view]);
    setView(next);
  }

  function goBack() {
    setViewHistory((prev) => {
      if (prev.length === 0) {
        setView("NONE");
        return [];
      }
      const last = prev[prev.length - 1];
      setView(last);
      return prev.slice(0, -1);
    });
  }

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    loadClients();
    loadLocalSubmitted();
    loadPushLogs();
  }, []);

async function loadClients() {
  try {
    const res = await fetch("/api/clients");
    const data = await res.json();

    // expected format: [{ name: "ABC PACS" }]
    const formatted = data.map((d: any) => d.name);

    setClients(formatted.sort());
  } catch {
    setClients([]);
  }
}
 

  async function loadLocalSubmitted() {
    try {
      const res = await fetch("/api/last-submitted-data");
      const data = await res.json();

      const formatted = (Array.isArray(data) ? data : [data]).map((d) => ({
        client_name: d.client_name,
        report_date: d.report_date,
      }));

      setLocalSubmitted(formatted);
    } catch {
      setLocalSubmitted([]);
    }
  }

  async function loadPushLogs() {
    try {
      const res = await fetch("/api/push/logs");
      const data = await res.json();
      setPushLogs(Array.isArray(data) ? data : []);
    } catch {
      setPushLogs([]);
    }
  }

  /* ================= DATE ================= */

  function formatDate(date: Date) {
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0")
    );
  }

  useEffect(() => {
  const today = new Date();
  setSelectedDate(formatDate(today));
}, []);

  

  /* ================= SUBMITTED LIST ================= */



  const localToday = localSubmitted
    .filter((d) => d.report_date === selectedDate)
    .map((d) => d.client_name);

  const allSubmitted = Array.from(new Set(localToday));

  const activeSubmitted = localToday;
    
  const pendingToday = clients.filter(
    (c) => !allSubmitted.includes(c)
  );

  const todayPushLogs = pushLogs.filter(
    (l) => l.report_date === selectedDate
  );

  /* ================= PUSH STATUS ================= */

  function groupPushLogsByClient(logs: any[]) {
    const map = new Map<string, any[]>();

    logs.forEach((log) => {
      if (!map.has(log.client_name)) {
        map.set(log.client_name, []);
      }
      map.get(log.client_name)!.push(log);
    });

    return map;
  }

  function deriveFinalClientStatus(logs: any[]) {
    const grouped = groupPushLogsByClient(logs);

    const pushed: string[] = [];
    const failed: string[] = [];

    grouped.forEach((entries, client) => {
      const hasFailed = entries.some((e) => e.status === "FAILED");
      const hasSuccess = entries.some((e) => e.status === "SUCCESS");

      if (hasFailed) failed.push(client);
      else if (hasSuccess) pushed.push(client);
    });

    return { pushed, failed };
  }

  const { pushed: pushedClients, failed: failedClients } =
    deriveFinalClientStatus(todayPushLogs);
    const pushedData = Object.values(
  todayPushLogs.reduce((acc: any, log: any) => {

    if (!acc[log.client_name]) {
      acc[log.client_name] = {
        client_name: log.client_name,
        report_date: log.report_date,
        modules: [],
        status: "SUCCESS",
      };
    }

    acc[log.client_name].modules.push(log.module);

    if (log.status === "FAILED") {
      acc[log.client_name].status = "FAILED";
    }

    return acc;

  }, {})
);

  const toBePushed = activeSubmitted.filter(
    (c) => !pushedClients.includes(c)
  );

  /* ================= COUNTS ================= */

  const totalClientsCount = clients.length;
  const pendingTodayCount = pendingToday.length;

  const pushedCount = pushedClients.length;
  const failedCount = failedClients.length;
  const toBePushedCount = toBePushed.length;

  /* ================= DOWNLOAD ================= */

  function downloadJSON(data: any, date: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `push_result_${date}.json`;
    a.click();
  }

  /* ================= PUSH ================= */

  async function handlePush() {
    if (selectedClients.length === 0) return;

    try {
      setLoading(true);

      const apiEndpoint = "/api/push/local";

      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_PUSH_API_KEY!,
        },
        body: JSON.stringify({
          clientNames: selectedClients,
          fromDate: pushDate,
        }),
      });

      const data = await res.json();

      downloadJSON(data, pushDate);

      await loadPushLogs();

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      {loading && (
        <div className="fixed inset-0 z-50 bg-blue-600/20 flex items-center justify-center">
          <div className="bg-white px-10 py-8 rounded-xl shadow-xl text-center space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
            <p className="text-lg font-semibold text-blue-700">
              Pushing data to RCS...
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">

          <label className="font-semibold">
            Select Date
          </label>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border px-3 py-2 rounded"
          />

        </div>

      {view !== "NONE" && (
        <button
          onClick={goBack}
          className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
        >
          ← Back
        </button>
      )}

      {/* MAIN DASHBOARD */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <Card onClick={() => goToView("TOTAL_CLIENTS")}>
          <CardHeader>
            <CardTitle>Total Clients</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {totalClientsCount}
          </CardContent>
        </Card>

        <Card
          onClick={() => goToView("SUBMITTED")}
          className="cursor-pointer hover:bg-green-50"
        >
          <CardHeader>
            <CardTitle>Submitted Today</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-green-600">
           {localToday.length}
          </CardContent>
        </Card>

        <Card
          onClick={() => goToView("PENDING_TODAY")}
          className="cursor-pointer hover:bg-red-50"
        >
          <CardHeader>
            <CardTitle>Pending Today</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-red-600">
            {pendingTodayCount}
          </CardContent>
        </Card>

      </div>

      {/* SUBMITTED SOURCE */}

      {view === "SUBMITTED" && (
  <div>
    <Card onClick={() => goToView("SUBMITTED_SOURCE")}>
      <CardHeader>
        <CardTitle>Submitted Clients</CardTitle>
      </CardHeader>
      <CardContent>{localToday.length}</CardContent>
    </Card>
  </div>
)}

      {/* SOURCE DASHBOARD */}

      {view === "SUBMITTED_SOURCE" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <Card onClick={() => goToView("PUSHED")}>
            <CardHeader>
              <CardTitle>Total Data Pushed</CardTitle>
            </CardHeader>
            <CardContent>{pushedCount}</CardContent>
          </Card>

          <Card
            onClick={() => {
              setSelectedClients(toBePushed);
              setPushDate(selectedDate);
              goToView("TO_BE_PUSHED");
            }}
          >
            <CardHeader>
              <CardTitle>To Be Pushed</CardTitle>
            </CardHeader>
            <CardContent>{toBePushedCount}</CardContent>
          </Card>

          <Card onClick={() => goToView("FAILED")}>
            <CardHeader>
              <CardTitle>Failed</CardTitle>
            </CardHeader>
            <CardContent>{failedCount}</CardContent>
          </Card>

        </div>
      )}

      {/* LIST VIEWS */}

      {[
        ["TOTAL_CLIENTS", clients],
        ["PENDING_TODAY", pendingToday],
       
        ["FAILED", failedClients]
      ].map(
        ([v, list]) =>
          view === v && (
            <div key={v} className="border rounded p-4">
              <ul className="space-y-1">
                {(list as string[]).map((c, i) => (
                  <li key={`${c}-${i}`}>{c}</li>
                ))}
              </ul>
            </div>
          )
      )}

      {/* TO BE PUSHED */}

      {view === "TO_BE_PUSHED" && (
        <div className="space-y-4 border rounded p-4">

          <div className="max-h-60 overflow-y-auto border p-2 rounded">
            {toBePushed.map((c, i) => (
              <label key={`${c}-${i}`} className="flex gap-2">
                <input
                  type="checkbox"
                  checked={selectedClients.includes(c)}
                  onChange={(e) =>
                    setSelectedClients((p) =>
                      e.target.checked
                        ? [...p, c]
                        : p.filter((x) => x !== c)
                    )
                  }
                />
                {c}
              </label>
            ))}
          </div>

          <input
            type="date"
            value={pushDate}
            onChange={(e) => setPushDate(e.target.value)}
            className="border rounded px-3 py-2"
          />

          <button
            disabled={loading || selectedClients.length === 0}
            onClick={handlePush}
            className="bg-green-600 px-6 py-2 rounded disabled:opacity-50"
          >
            {loading ? "Processing..." : "Push to RCS"}
          </button>

        </div>
      )}
      {view === "PUSHED" && (
  <div className="border rounded p-4 overflow-x-auto">

    <table className="w-full border text-sm">

      <thead className="bg-gray-100">
        <tr>
          <th className="border px-3 py-2 text-left">Client</th>
          <th className="border px-3 py-2 text-left">Date</th>
          <th className="border px-3 py-2 text-left">Modules</th>
          <th className="border px-3 py-2 text-left">Status</th>
        </tr>
      </thead>

      <tbody>

        {pushedData.map((row: any, i: number) => (
          <tr key={i}>

            <td className="border px-3 py-2">
              {row.client_name}
            </td>

            <td className="border px-3 py-2">
              {row.report_date}
            </td>

            <td className="border px-3 py-2">
              {row.modules.join(", ")}
            </td>

            <td className="border px-3 py-2">
              {row.status === "SUCCESS" ? (
                <span className="text-green-600 font-semibold">
                  SUCCESS
                </span>
              ) : (
                <span className="text-red-600 font-semibold">
                  FAILED
                </span>
              )}
            </td>

          </tr>
        ))}

      </tbody>

    </table>

  </div>
)}
      

    </div>
  );
}