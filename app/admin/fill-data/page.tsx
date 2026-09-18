"use client"

import { useState, useEffect, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from "react"
import * as XLSX from "xlsx"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function FillDataPage() {

  /* ================= BASIC STATE ================= */
  const [activeTab, setActiveTab] = useState("branch")
  const [Fromdate, setFromdate] = useState("")
  const [clientId, setClientId] = useState("")
  const [agentUid, setAgentUid] = useState("")
  const [queries, setQueries] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState("")
  const [sdsCode, setSdsCode] = useState("")
  const [reportDate, setReportDate] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [previewStep, setPreviewStep] = useState(0)
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const meta = { SDSCode: sdsCode, Date: reportDate }
  const [clientName, setClientName] = useState("")
  const isClientReady = (clientName || "").trim().length > 0
  const [saveOptions, setSaveOptions] = useState({
    offline: true
  })
  
  


  



  const [fetchedData, setFetchedData] = useState<any>({
    branch: [],
    member: [],
    deposit: [],
    loan: [],
    jewel: []
  })

  const [columnOrders, setColumnOrders] = useState<any>({
    branch: [],
    member: [],
    deposit: [],
    loan: [],
    jewel: []
  })

/* ================= NPA ================= */
interface NPAData {
  SDSCode: string;
  Date: string;
  GNPA: { amount: string; percent: string };
  NNPA: { amount: string; percent: string };
  ProvisionPercent: string;
  TotalOverdue: { count: string; amount: string };
  NoActionTaken: { count: string; amount: string };
  RegisteredNoticesSent: { count: string; amount: string };
  ActionTaken: {
    ARC: { count: string; amount: string };
    DECREE: { count: string; amount: string };
    EP: { count: string; amount: string };
  };
}

const [npaData, setNpaData] = useState<NPAData>({
  SDSCode: "",
  Date: "",
  GNPA: {amount: "", percent: ""},
  NNPA: {amount: "", percent: ""},
  ProvisionPercent: "",
  TotalOverdue:{  count: "", amount: "" },
  NoActionTaken:{  count: "", amount: "" },
  RegisteredNoticesSent:{  count: "", amount: "" },
  ActionTaken: {
    ARC: {  count: "", amount: "" },
    DECREE: {  count: "", amount: "" },
    EP: {  count: "", amount: "" }
  }
})

  /* ================= PROFIT ================= */
  const [profitData, setProfitData] = useState({
    SDSCode: "",
    Date: "",
    CDRatio: "",
    OtherIncome: "",
    Expenditure: "",
    ProfitLoss: {
      AuditCompletedYear: "",
      NetProfit: "",
      CurrentProfitWithCumulativeLoss: "",
      CurrentLossWithAccumulatedLoss: ""
    }
  })

  /* ================= SAFETY ================= */
  const [safetyData, setSafetyData] = useState({
    SDSCode: "",
    Date: "",
    SafetyLocker: "",
    DefenderDoor: "",
    BurglaryAlarm: "",
    CCTV: "",
    SMSAlert: ""
  })

  /* ================= Emplyee ================= */
  const [empdata, setEmpData] = useState({
    SDSCode: "",
    Date: "",
    ApprovedCadreStrength: "",
    Filled: "",
    Vacant: ""
  })

  /* ================= INIT ================= */
  useEffect(() => {
  async function init() {
    try {
      setLoading(true)

      /* ================= GET USER ================= */
      const res = await fetch("/api/me")

      if (!res.ok) {
        throw new Error("Failed to fetch user")
      }

      const data = await res.json()

      console.log("✅ /api/me response:", data)

      // 🔥 SAFE MAPPING (handles both camelCase + snake_case)
      const clientIdValue =
        data.clientId || data.client_id || ""

      const clientNameValue =
        data.clientName || data.client_name || ""

      const agentUidValue =
        data.agentUid || data.agent_uid || ""

      setClientId(clientIdValue)
      setClientName(clientNameValue)
      setAgentUid(agentUidValue)

      /* ================= VALIDATION ================= */
      if (!clientNameValue) {
        console.warn("⚠️ clientName missing from API")
      }

      /* ================= GET QUERIES ================= */
      const qres = await fetch("/api/queries")

      if (!qres.ok) {
        throw new Error("Failed to fetch queries")
      }

      const qdata = await qres.json()

      console.log("✅ Queries loaded:", qdata.length)

      setQueries(qdata || [])

    } catch (error) {
      console.error("❌ INIT ERROR:", error)
    } finally {
      setLoading(false)
    }
  }

  init()
}, [])

  /* ================= WAIT UNTIL COMMAND SUCCESS ================= */
  

  const handleBack = () => {
  router.back() // go to previous page
  // OR router.push("/dashboard") if you want fixed route
}
const deriveColumnOrder = (rows: any[]) => {
  if (!rows || rows.length === 0) return []
  return Object.keys(rows[0])
}

const handleLogout = async () => {
  try {
   await fetch("/api/logout")
   router.push("/") // redirect to login page
  } catch (error) {
    console.error("Logout error:", error)
  }
}

   
  /* ================= FETCH RESULT ================= */
 

  /* ================= RUN SINGLE QUERY ================= */
 

  //Dowload Excel
  const downloadExcel = () => {
          const wb = XLSX.utils.book_new()

          const addSheetWithOrder = (
            name: string,
            data: any[],
            columns: string[]
          ) => {
            if (!data.length || !columns.length) return

            const sheetData = [
              columns, // header row
              ...data.map(row => columns.map(col => row[col] ?? ""))
            ]

            const ws = XLSX.utils.aoa_to_sheet(sheetData)
            XLSX.utils.book_append_sheet(wb, ws, name)
          }
          const addKeyValueSheet = (
            name: string,
            fields: [string, (d: any) => any][],
            data: any
          ) => {
            const rows = [
              ["Field", "Value"],
              ...fields.map(([label, getter]) => [label, getter(data) ?? ""])
            ]

            const ws = XLSX.utils.aoa_to_sheet(rows)
            XLSX.utils.book_append_sheet(wb, ws, name)
          }

          addSheetWithOrder("Branch", fetchedData.branch, columnOrders.branch)
          addSheetWithOrder("Members", fetchedData.member, columnOrders.member)
          addSheetWithOrder("Deposits", fetchedData.deposit, columnOrders.deposit)
          addSheetWithOrder("Loans", fetchedData.loan, columnOrders.loan)
          addSheetWithOrder("Jewel", fetchedData.jewel, columnOrders.jewel)

          addKeyValueSheet("NPA", NPA_FIELDS, npaData)
          addKeyValueSheet("Profit", PROFIT_FIELDS, profitData)
          addKeyValueSheet("Employee", EMP_FIELDS, empdata)
          addKeyValueSheet("Safety", SAFETY_FIELDS, safetyData)

          XLSX.writeFile(
            wb,
            `Report_${sdsCode}_${clientName}_${reportDate}.xlsx`
          )
        }
      //Handle Preview and Download

      const handlePreviewOk = async () => {
                try {
                    setSubmitting(true)          // 🔥 START LOADING
                    setShowPreview(false)        // close preview immediately

                    await handleSubmitReport()   // save to Firestore
                    downloadExcel()              // download Excel

                } catch (err) {
                    console.error(err)
                    alert("Submission failed")
                } finally {
                    setSubmitting(false)         // 🔥 STOP LOADING
                    setPreviewStep(0)
                }
                }

      const syncMetaIntoTabs = () => {
          setNpaData(p => ({ ...p, SDSCode: sdsCode, Date: reportDate }))
          setProfitData(p => ({ ...p, SDSCode: sdsCode, Date: reportDate }))
          setSafetyData(p => ({ ...p, SDSCode: sdsCode, Date: reportDate }))
          setEmpData(p => ({ ...p, SDSCode: sdsCode, Date: reportDate }))
        }

      const NPA_FIELDS: [string, (d: any) => any][] = [
          ["SDS Code", (d: any) => d.SDSCode],
          ["Date", (d: any) => d.Date],
          ["GNPA Amount", (d: any) => d.GNPA.amount],
          ["GNPA %", (d: any) => d.GNPA.percent],
          ["NNPA Amount", (d: any) => d.NNPA.amount],
          ["NNPA %", (d: any) => d.NNPA.percent],
          ["Provision %", (d: any) => d.ProvisionPercent],
          ["Total Overdue Count", (d: any) => d.TotalOverdue.count],
          ["Total Overdue Amount", (d: any) => d.TotalOverdue.amount],
          ["No Action Taken Count", (d: any) => d.NoActionTaken.count],
          ["No Action Taken Amount", (d: any) => d.NoActionTaken.amount],
          ["Registered Notices Count", (d: any) => d.RegisteredNoticesSent.count],
          ["Registered Notices Amount", (d: any) => d.RegisteredNoticesSent.amount],
          ["ARC Count", (d: any) => d.ActionTaken.ARC.count],
          ["ARC Amount", (d: any) => d.ActionTaken.ARC.amount],
          ["DECREE Count", (d: any) => d.ActionTaken.DECREE.count],
          ["DECREE Amount", (d: any) => d.ActionTaken.DECREE.amount],
          ["EP Count", (d: any) => d.ActionTaken.EP.count],
          ["EP Amount", (d: any) => d.ActionTaken.EP.amount],
        ]

        const PROFIT_FIELDS: [string, (d: any) => any][] = [
          ["SDS Code", (d: any) => d.SDSCode],
          ["Date", (d: any) => d.Date],
          ["CD Ratio", (d: any) => d.CDRatio],
          ["Other Income", (d: any) => d.OtherIncome],
          ["Expenditure", (d: any) => d.Expenditure],
          ["Audit Completed Year", (d: any) => d.ProfitLoss.AuditCompletedYear],
          ["Net Profit", (d: any) => d.ProfitLoss.NetProfit],
          ["Current Profit with Cumulative Loss", (d: any) => d.ProfitLoss.CurrentProfitWithCumulativeLoss],
          ["Current Loss with Accumulated Loss", (d: any) => d.ProfitLoss.CurrentLossWithAccumulatedLoss],
        ]

        const EMP_FIELDS: [string, (d: any) => any][] = [
          ["SDS Code", (d: any) => d.SDSCode],
          ["Date", (d: any) => d.Date],
          ["Approved Cadre Strength", (d: any) => d.ApprovedCadreStrength],
          ["Filled", (d: any) => d.Filled],
          ["Vacant", (d: any) => d.Vacant],
        ]

        const SAFETY_FIELDS: [string, (d: any) => any][] = [
          ["SDS Code", (d: any) => d.SDSCode],
          ["Date", (d: any) => d.Date],
          ["Safety Locker", (d: any) => d.SafetyLocker],
          ["Defender Door", (d: any) => d.DefenderDoor],
          ["Burglary Alarm", (d: any) => d.BurglaryAlarm],
          ["CCTV", (d: any) => d.CCTV],
          ["SMS Alert", (d: any) => d.SMSAlert],
        ]


     const PreviewTableWithColumns = ({
          title,
          data,
          columns
        }: {
          title: string
          data: any[]
          columns: string[]
        }) => {
          if (!data.length || !columns.length) return null

          return (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">{title}</h3>

              <div className="overflow-x-auto border">
                <table className="table-auto border-collapse w-full">
                  <thead>
                    <tr>
                      {columns.map((col, i) => (
                        <th
                          key={i}
                          className="border px-2 py-1 bg-muted text-left"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {data.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {columns.map((col, cIdx) => (
                          <td key={cIdx} className="border px-2 py-1 align-middle">
                            {row[col] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }
     const PreviewKeyValue = ({
          title,
          fields,
          data
        }: {
          title: string
          fields: [string, (d: any) => any][]
          data: any
        }) => (
          <div className="mb-6">
            <h3 className="font-semibold mb-3">{title}</h3>
            <table className="table-auto border-collapse w-full">
              <tbody>
                {fields.map(([label, getter], i) => (
                  <tr key={i}>
                    <td className="border px-3 py-2 font-medium w-1/2">
                      {label}
                    </td>
                    <td className="border px-3 py-2">
                      {String(getter(data) ?? "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )


  /* ================= HANDLE GET DATA ================= */


const formatDateOnly = (value: any) => {
  if (!value) return ""

  // ✅ Safe YYYY-MM-DD string → return as-is
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  // ✅ ISO string → strip time (no Date parsing)
  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0]
  }

  // ✅ Firestore Timestamp → LOCAL date (IST safe)
  if (typeof value === "object" && value?.seconds) {
    const d = new Date(value.seconds * 1000)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }

  return String(value)
}

const normalizeRowsDates = (rows: any[]) =>
  rows.map(row => {
    const out: any = {}
    for (const k in row) {
      out[k] = k.toLowerCase().includes("date")
        ? formatDateOnly(row[k])
        : row[k]
    }
    return out
  })

const forceDateAndSds = (date: string, sds: string) => {
  setReportDate(date)

  setNpaData(p => ({ ...p, Date: date, SDSCode: sds }))
  setProfitData(p => ({ ...p, Date: date, SDSCode: sds }))
  setEmpData(p => ({ ...p, Date: date, SDSCode: sds }))
  setSafetyData(p => ({ ...p, Date: date, SDSCode: sds }))
}


const handleGetData = async () => {

  if (!clientName || !Fromdate) {
    alert("Client Name or From Date not ready")
    return
  }

  if (loading) return

  try {
    setLoading(true)
    setProgress("Checking existing local report...")

    /* =====================================================
       STEP 1: CHECK LOCAL DB (EXACT DATE)
    ===================================================== */

    const existingRes = await fetch("/api/get-report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        clientName,
        fromDate: Fromdate,
        exact: true
      })
    })

    if (existingRes.ok) {

      const data = await existingRes.json()

      if (data?.branch?.length) {

        const normalizeRows = (rows: any[]) =>
          rows.map(r => {
            const o: any = {}
            for (const k in r) {
              o[k] = k.toLowerCase().includes("date")
                ? formatDateOnly(r[k])
                : r[k]
            }
            return o
          })

        setFetchedData({
          branch: normalizeRows(data.branch),
          member: normalizeRows(data.member),
          deposit: normalizeRows(data.deposit),
          loan: normalizeRows(data.loan),
          jewel: normalizeRows(data.jewel),
        })

        setColumnOrders({
          branch: deriveColumnOrder(data.branch),
          member: deriveColumnOrder(data.member),
          deposit: deriveColumnOrder(data.deposit),
          loan: deriveColumnOrder(data.loan),
          jewel: deriveColumnOrder(data.jewel),
        })

        const sds = data.sdsCode || ""

        setSdsCode(sds)
        setReportDate(Fromdate)

        setNpaData(p => ({ ...p, ...data.npa }))
        setProfitData(p => ({ ...p, ...data.profit }))
        setEmpData(p => ({ ...p, ...data.emp }))
        setSafetyData(p => ({ ...p, ...data.safety }))

        setProgress("Loaded from local database")
        return
      }
    }

    /* =====================================================
       STEP 2: FETCH FROM DATABASE (RUN CLIENT)
    ===================================================== */

    setProgress("Fetching fresh data from database...")

    const res = await fetch("/api/run-client", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        clientId,
        date: Fromdate
      })
    })

    const result = await res.json()

    if (!result.success) {
      throw new Error("Failed to run client")
    }

    const report = result.report

    /* ================= SET DATA ================= */

    setFetchedData({
      branch: report.branch || [],
      member: report.member || [],
      deposit: report.deposit || [],
      loan: report.loan || [],
      jewel: report.jewel || []
    })

   setColumnOrders({
  branch: report.branchColumnOrder || deriveColumnOrder(report.branch),
  member: report.memberColumnOrder || deriveColumnOrder(report.member),
  deposit: report.depositColumnOrder || deriveColumnOrder(report.deposit),
  loan: report.loanColumnOrder || deriveColumnOrder(report.loan),
  jewel: report.jewelColumnOrder || deriveColumnOrder(report.jewel)
})

    /* ================= SDS + DATE ================= */

    if (report.branch?.length > 0) {

      const first = report.branch[0]

      const sds =
        first.sdscode ||
        first.SDSCODE ||
        first.sdsCode ||
        ""

      setSdsCode(sds)
    }

    setReportDate(Fromdate)

    /* =====================================================
       STEP 3: SAVE TO LOCAL DB (IMPORTANT)
    ===================================================== */

    await fetch("/api/save-report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        clientName,
        fromDate: Fromdate,
        ...report
      })
    })

    setProgress("Data fetched and saved successfully")

  } catch (err) {

    console.error("❌ handleGetData error:", err)
    setProgress("Error loading data")

  } finally {
    setLoading(false)
  }
}

const saveToLocalServer = async (updatedData: { updatedEmp: any; updatedNpa: any; updatedProfit: any; updatedSafety: any }) => {
  await fetch("/api/save-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientName,
      fromDate: Fromdate,
      branch: fetchedData.branch,
      member: fetchedData.member,
      deposit: fetchedData.deposit,
      loan: fetchedData.loan,
      jewel: fetchedData.jewel,
      emp: updatedData.updatedEmp,
      npa: updatedData.updatedNpa,
      profit: updatedData.updatedProfit,
      safety: updatedData.updatedSafety,
    }),
  })
}


//Summit to Reports
const handleSubmitReport = async () => {
  if (!clientName || !Fromdate) {
    alert("Client Name or From Date missing")
    return
  }

  if (!saveOptions.offline) {
    alert("Please select at least one save option")
    return
  }

  try {
    let updatedData: any = {
      updatedEmp: empdata,
      updatedNpa: npaData,
      updatedProfit: profitData,
      updatedSafety: safetyData
    }

    // 🔥 If Online selected → Save to Firebase
   

    // 🔥 If Offline selected → Save to API
    if (saveOptions.offline) {
      await saveToLocalServer(updatedData)
      alert("Saved to Server successfully!")
    }

    resetall()
    setFromdate("")
    setActiveTab("branch")

  } catch (error) {
    console.error(error)
    alert("Error saving report")
  }
}
const SAFETY_KEYS = [
  "SafetyLocker",
  "DefenderDoor",
  "BurglaryAlarm",
  "CCTV",
  "SMSAlert",
] as const
const resetall = () => {
  // 🔥 CLEAR EVERYTHING AFTER SAVE
      setFetchedData({
        branch: [],
        member: [],
        deposit: [],
        loan: [],
        jewel: []
      })

      setColumnOrders({
        branch: [],
        member: [],
        deposit: [],
        loan: [],
        jewel: []
      })

      setNpaData({
        SDSCode: "",
        Date: "",
        GNPA: { amount: "", percent: "" },
        NNPA: { amount: "", percent: "" },
        ProvisionPercent: "",
        TotalOverdue: { count: "", amount: "" },
        NoActionTaken: { count: "", amount: "" },
        RegisteredNoticesSent: { count: "", amount: "" },
        ActionTaken: {
          ARC: { count: "", amount: "" },
          DECREE: { count: "", amount: "" },
          EP: { count: "", amount: "" }
        }
      })

      setProfitData({
        SDSCode: "",
        Date: "",
        CDRatio: "",
        OtherIncome: "",
        Expenditure: "",
        ProfitLoss: {
          AuditCompletedYear: "",
          NetProfit: "",
          CurrentProfitWithCumulativeLoss: "",
          CurrentLossWithAccumulatedLoss: ""
        }
      })

      setSafetyData({
        SDSCode: "",
        Date: "",
        SafetyLocker: "",
        DefenderDoor: "",
        BurglaryAlarm: "",
        CCTV: "",
        SMSAlert: ""
      })

      setEmpData({
        SDSCode: "",
        Date: "",
        ApprovedCadreStrength: "",
        Filled: "",
        Vacant: ""
      })
    }



  /* ================= EDITABLE TABLE ================= */
const renderTable = (tab: string) => {
  const data = fetchedData[tab] || [];
  const columns = columnOrders[tab] || [];
  const isEditable = tab === "branch";

  if (!data.length)
    return (
      <div className="p-6 text-center text-gray-500 bg-white/50 rounded-xl">
        No data available
      </div>
    );

  return (
    <div className="space-y-4">

      {/* Glass Container */}
      <div className="backdrop-blur-xl bg-white/60 border border-white/30 
                      rounded-2xl shadow-xl p-6">

        {/* Modern Table */}
        <div className="overflow-x-auto">
          <table className="border-collapse w-full table-auto">

            {/* Header */}
            <thead className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm">
              <tr className="text-gray-600 text-xs uppercase tracking-wider">
                {columns.map((col: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined, i: Key | null | undefined) => {
                  // Minimum widths for important columns
                  const minWidthClasses = {
                    branchname: "min-w-[150px]",
                    type: "min-w-[100px]",
                    schemedescription: "min-w-[250px]",
                  };

                  const colString = typeof col === "string" ? col.toLowerCase() : "";
                  const widthClass = minWidthClasses[colString as keyof typeof minWidthClasses] || "";

                  return (
                    <th
                      key={i}
                      className={`border px-3 py-2 text-left bg-muted whitespace-nowrap min-w-[140px] ${widthClass}`}
                    >
                      {col}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {data.map((row: { [x: string]: any; id: any }, rIdx: string | number) => (
                <tr
                  key={row.id || rIdx}
                  className="bg-white/70 backdrop-blur-md 
                             hover:bg-white hover:shadow-md 
                             transition-all duration-200 rounded-xl"
                >
                  {columns.map((col: string | number, cIdx: Key | null | undefined) => (
                    <td
                      key={cIdx}
                      className="border px-2 py-1 align-middle"
                    >
                      <Input
                        value={row[col] || ""}
                        readOnly={!isEditable}
                        disabled={!isEditable}
                        onChange={(e) => {
                          if (!isEditable) return;

                          const updated = data.map((r: any) => ({ ...r }));
                          updated[rIdx][col] = e.target.value;

                          setFetchedData((prev: any) => ({
                            ...prev,
                            [tab]: updated
                          }));
                        }}
                        className="w-full min-w-[140px] border border-gray-300 rounded px-2 py-1"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>

          </table>
        </div>

      </div>
    </div>
  );
};





/* ================= RENDER ================= */
const renderTabContent = () => {
  if (["branch","member","deposit","loan","jewel"].includes(activeTab)) 
    return renderTable(activeTab)

    if (activeTab === "npa")
            return (
                  <div className="max-w-5xl space-y-5 text-sm">
                    <div className="flex items-center">
                    <Label className="w-64">SDS Code</Label>
                    <Input
                      className="w-32 h-8 rounded-none"
                      value={sdsCode}
                      readOnly
                    />
                  </div>

                {/* Date */}
                <div className="flex items-center">
                  <Label className="w-64">Date</Label>
                  <Input
                    type="date"
                    className="w-44 h-8 rounded-none"
                    value={reportDate}
                    onChange={(e) => {
                    const d = e.target.value
                    setReportDate(d)
                    setNpaData(p => ({ ...p, Date: d }))
                          }}
                  />
                    
                </div>

                {/* GNPA / NNPA */}
                <div className="grid grid-cols-2 gap-y-4">

                  <div className="flex items-center">
                    <Label className="w-64">GNPA Amount</Label>
                    <Input
                      className="w-32 h-8 rounded-none"
                      value={npaData.GNPA.amount}
                      onChange={(e) =>
                        setNpaData({
                          ...npaData,
                          GNPA: { ...npaData.GNPA, amount: e.target.value }
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center">
                    <Label className="w-64">GNPA %</Label>
                    <Input
                      className="w-24 h-8 rounded-none"
                      value={npaData.GNPA.percent}
                      onChange={(e) =>
                        setNpaData({
                          ...npaData,
                          GNPA: { ...npaData.GNPA, percent: e.target.value }
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center">
                    <Label className="w-64">NNPA Amount</Label>
                    <Input
                      className="w-32 h-8 rounded-none"
                      value={npaData.NNPA.amount}
                      onChange={(e) =>
                        setNpaData({
                          ...npaData,
                          NNPA: { ...npaData.NNPA, amount: e.target.value }
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center">
                    <Label className="w-64">NNPA %</Label>
                    <Input
                      className="w-24 h-8 rounded-none"
                      value={npaData.NNPA.percent}
                      onChange={(e) =>
                        setNpaData({
                          ...npaData,
                          NNPA: { ...npaData.NNPA, percent: e.target.value }
                        })
                      }
                    />
                  </div>

                </div>

                {/* Provision */}
                <div className="flex items-center">
                  <Label className="w-64">Provision %</Label>
                  <Input
                    className="w-24 h-8 rounded-none"
                    value={npaData.ProvisionPercent}
                    onChange={(e) =>
                      setNpaData({ ...npaData, ProvisionPercent: e.target.value })
                    }
                  />
                </div>

                {/* Section Divider */}
                <div className="border-t pt-4" />

                {/* Count / Amount Sections */}
                {[
                  { label: "Total Overdue", key: "TotalOverdue" as const },
                  { label: "No Action Taken", key: "NoActionTaken" as const },
                  { label: "Registered Notices Sent", key: "RegisteredNoticesSent" as const },
                ].map((item) => (
                  <div key={item.key} className="grid grid-cols-2 gap-y-4">

                    <div className="flex items-center">
                      <Label className="w-64">{item.label} Count</Label>
                      <Input
                        className="w-28 h-8 rounded-none"
                        value={npaData[item.key].count}
                        onChange={(e) =>
                          setNpaData({
                            ...npaData,
                            [item.key]: {
                              ...npaData[item.key],
                              count: e.target.value
                            }
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center">
                      <Label className="w-64">{item.label} Amount</Label>
                      <Input
                        className="w-32 h-8 rounded-none"
                        value={npaData[item.key].amount}
                        onChange={(e) =>
                          setNpaData({
                            ...npaData,
                            [item.key]: {
                              ...npaData[item.key],
                              amount: e.target.value
                            }
                          })
                        }
                      />
                    </div>

                  </div>
                ))}

                {/* Action Taken Section */}
                <div className="border-t pt-4" />

                {[
                  { label: "ARC", key: "ARC" as const },
                  { label: "DECREE", key: "DECREE" as const },
                  { label: "EP", key: "EP" as const },
                ].map((item) => (
                  <div key={item.key} className="grid grid-cols-2 gap-y-4">

                    <div className="flex items-center">
                      <Label className="w-64">Action - {item.label} Count</Label>
                      <Input
                        className="w-28 h-8 rounded-none"
                        value={npaData.ActionTaken[item.key].count}
                        onChange={(e) =>
                          setNpaData({
                            ...npaData,
                            ActionTaken: {
                              ...npaData.ActionTaken,
                              [item.key]: {
                                ...npaData.ActionTaken[item.key],
                                count: e.target.value
                              }
                            }
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center">
                      <Label className="w-64">Action - {item.label} Amount</Label>
                      <Input
                        className="w-32 h-8 rounded-none"
                        value={npaData.ActionTaken[item.key].amount}
                        onChange={(e) =>
                          setNpaData({
                            ...npaData,
                            ActionTaken: {
                              ...npaData.ActionTaken,
                              [item.key]: {
                                ...npaData.ActionTaken[item.key],
                                amount: e.target.value
                              }
                            }
                          })
                        }
                      />
                    </div>

                  </div>
                ))}

              </div>
            );


     if (activeTab === "profit")
              return (
                <div className="max-w-5xl space-y-6 text-sm">
                  
                    <div className="flex items-center">
                    <Label className="w-64">SDS Code</Label>
                    <Input
                      className="w-32 h-8 rounded-none"
                      value={sdsCode}
                      readOnly
                    />
                  </div>
                   {/* Date */}
                <div className="flex items-center">
                  <Label className="w-64">Date</Label>
                  <Input
                    type="date"
                    className="w-44 h-8 rounded-none"
                    value={reportDate}
                    onChange={(e) => {
                    const d = e.target.value
                    setReportDate(d)
                    setProfitData(p => ({ ...p, Date: d }))
                          }
                    }
                  />
                </div>

                  <div className="grid grid-cols-2 gap-y-4">

                    {/* LEFT COLUMN */}
                    <div className="space-y-4">

                      <div className="flex items-center">
                        <Label className="w-64">CD Ratio (%)</Label>
                        <Input
                          className="w-32 h-8 rounded-none"
                          value={profitData.CDRatio}
                          onChange={(e) =>
                            setProfitData({ ...profitData, CDRatio: e.target.value })
                          }
                        />
                      </div>

                      <div className="flex items-center">
                        <Label className="w-64">Expenditure</Label>
                        <Input
                          className="w-32 h-8 rounded-none"
                          value={profitData.Expenditure}
                          onChange={(e) =>
                            setProfitData({ ...profitData, Expenditure: e.target.value })
                          }
                        />
                      </div>

                      <div className="flex items-center">
                        <Label className="w-64">Net Profit</Label>
                        <Input
                          className="w-32 h-8 rounded-none"
                          value={profitData.ProfitLoss.NetProfit}
                          onChange={(e) =>
                            setProfitData({
                              ...profitData,
                              ProfitLoss: {
                                ...profitData.ProfitLoss,
                                NetProfit: e.target.value,
                              },
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center">
                        <Label className="w-64">Current Loss with Accumulated Loss</Label>
                        <Input
                          className="w-32 h-8 rounded-none"
                          value={profitData.ProfitLoss.CurrentLossWithAccumulatedLoss}
                          onChange={(e) =>
                            setProfitData({
                              ...profitData,
                              ProfitLoss: {
                                ...profitData.ProfitLoss,
                                CurrentLossWithAccumulatedLoss: e.target.value,
                              },
                            })
                          }
                        />
                      </div>

                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-4">

                      <div className="flex items-center">
                        <Label className="w-64">Other Income</Label>
                        <Input
                          className="w-32 h-8 rounded-none"
                          value={profitData.OtherIncome}
                          onChange={(e) =>
                            setProfitData({ ...profitData, OtherIncome: e.target.value })
                          }
                        />
                      </div>

                      <div className="flex items-center">
                        <Label className="w-64">Audit Completed Year</Label>
                        <Input
                          className="w-32 h-8 rounded-none"
                          value={profitData.ProfitLoss.AuditCompletedYear}
                          onChange={(e) =>
                            setProfitData({
                              ...profitData,
                              ProfitLoss: {
                                ...profitData.ProfitLoss,
                                AuditCompletedYear: e.target.value,
                              },
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center">
                        <Label className="w-64">Current Profit with Cumulative Loss</Label>
                        <Input
                          className="w-32 h-8 rounded-none"
                          value={profitData.ProfitLoss.CurrentProfitWithCumulativeLoss}
                          onChange={(e) =>
                            setProfitData({
                              ...profitData,
                              ProfitLoss: {
                                ...profitData.ProfitLoss,
                                CurrentProfitWithCumulativeLoss: e.target.value,
                              },
                            })
                          }
                        />
                      </div>

                    </div>

                  </div>

                </div>
              );


     if (activeTab === "emp")
          return (
            <div className="max-w-5xl space-y-5 text-sm">
              <div className="flex items-center">
                    <Label className="w-64">SDS Code</Label>
                    <Input
                      className="w-32 h-8 rounded-none"
                      value={sdsCode}
                      readOnly
                    />
                  </div>

                  {/* Date */}
                <div className="flex items-center">
                  <Label className="w-64">Date</Label>
                  <Input
                    type="date"
                    className="w-44 h-8 rounded-none"
                    value={reportDate}
                    onChange={(e) => {
                    const d = e.target.value
                    setReportDate(d)
                    setEmpData(p => ({ ...p, Date: d }))
                          }}
                  />
                </div>

              <div className="flex items-center">
                <Label className="w-64">Approved Cadre Strength</Label>
                <Input
                  className="w-32 h-8 rounded-none"
                  value={empdata.ApprovedCadreStrength}
                  onChange={(e) =>
                    setEmpData({
                      ...empdata,
                      ApprovedCadreStrength: e.target.value
                    })
                  }
                />
              </div>

              <div className="flex items-center">
                <Label className="w-64">Filled</Label>
                <Input
                  className="w-32 h-8 rounded-none"
                  value={empdata.Filled}
                  onChange={(e) =>
                    setEmpData({
                      ...empdata,
                      Filled: e.target.value
                    })
                  }
                />
              </div>

              <div className="flex items-center">
                <Label className="w-64">Vacant</Label>
                <Input
                  className="w-32 h-8 rounded-none"
                  value={empdata.Vacant}
                  onChange={(e) =>
                    setEmpData({
                      ...empdata,
                      Vacant: e.target.value
                    })
                  }
                />
              </div>

            </div>
          );


    if (activeTab === "safety")
            return (
              <div className="max-w-5xl space-y-4 text-sm">
                <div className="flex items-center">
                    <Label className="w-64">SDS Code</Label>
                    <Input
                      className="w-32 h-8 rounded-none"
                      value={sdsCode}
                      readOnly
                    />
                  </div>

                    {/* Date */}
                <div className="flex items-center">
                  <Label className="w-64">Date</Label>
                  <Input
                    type="date"
                    className="w-44 h-8 rounded-none"
                    value={reportDate}
                    onChange={(e) => {
                    const d = e.target.value
                    setReportDate(d)
                    setSafetyData(p => ({ ...p, Date: d }))
                          }}
                  />
                </div>

                {SAFETY_KEYS.map((key) => {
                    const labelText = key.replace(/([A-Z])/g, " $1").trim()

                    return (
                      <div className="flex items-center" key={key}>
                        <Label className="w-64">{labelText}</Label>

                        <Select
                          value={safetyData[key] || ""}
                          onValueChange={(val) =>
                            setSafetyData({
                              ...safetyData,
                              [key]: val,
                            })
                          }
                        >
                          <SelectTrigger className="w-32 h-8 rounded-none">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yes">Yes</SelectItem>
                            <SelectItem value="No">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )
                  })}

              </div>
            );


    return null
  }

  return (
    <>
        {loading && (
                <div className="fixed top-0 left-0 w-full h-1 bg-transparent z-50">
                    <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                    />
                </div>
                )}
    <div className="space-y-6">

      
            <div className="flex justify-between items-center mb-8 bg-white/30 backdrop-blur-xl border border-white/40 rounded-3xl px-6 py-4 shadow-lg">
  
  <div>
                <h1 className="text-3xl font-bold tracking-tight">
                Fill Data Report
                </h1>
                <p className="text-sm text-gray-600">
                Generate and submit monthly report
                </p>
            </div>

            <div className="flex gap-3">
                <Button
                variant="outline"
                className="rounded-xl"
                onClick={handleBack}
                >
                Back
                </Button>

                <Button
                variant="destructive"
                className="rounded-xl"
                onClick={handleLogout}
                >
                Logout
                </Button>
            </div>
            </div>

            


      <div className="flex items-end gap-4">
        <div>
          <Label>From Date</Label>
          <Input type="date"
            value={Fromdate}
            onChange={(e)=>setFromdate(e.target.value)}/>
        </div>

        <Button onClick={handleGetData} disabled={loading || !isClientReady}>
          {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
          Get Data
        </Button>
        <div className="flex items-center gap-6 mt-4">

        

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="offline"
              checked={saveOptions.offline}
              onChange={(e) =>
                setSaveOptions(prev => ({
                  ...prev,
                  offline: e.target.checked
                }))
              }
            />
            <label htmlFor="offline" className="font-medium">
              Offline (Local Server Only)
            </label>
          </div>

        </div>
      </div>

      

      <div className="flex gap-3 flex-wrap mb-6">
        {["branch","emp","member","deposit","loan","jewel","npa","profit","safety"]
            .map((tab) => (
            <Button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-6 transition-all duration-300 font-medium
                ${activeTab === tab
                    ? "bg-white text-black shadow-lg scale-105"
                    : "bg-white/30 text-gray-800 hover:bg-white/50"}
                `}
            >
                {tab.toUpperCase()}
            </Button>
            ))}
        </div>




      <Card className="bg-white/30 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl">

        <CardHeader>
          <CardTitle>{activeTab.toUpperCase()}</CardTitle>
        </CardHeader>
        <CardContent>
           <div key={activeTab} className="animate-fade">
                {renderTabContent()}
                </div>
        </CardContent>
      </Card>
     
     <Button
            className="w-full"
            disabled={loading || !isClientReady}
            onClick={() => {
              syncMetaIntoTabs() 
              setPreviewStep(0)
              setShowPreview(true)
            }}
          >
            Preview & Submit
      </Button>
    </div>
    {showPreview && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
              <div className="bg-white w-[90%] max-h-[90%] overflow-y-auto p-6 rounded">

                <h2 className="text-xl font-bold mb-4">
                  Preview ({previewStep + 1}/9)
                </h2>

                {/* STEP CONTENT */}
                {previewStep === 0 && (
                  <PreviewTableWithColumns
                    title="Branch"
                    data={fetchedData.branch}
                    columns={columnOrders.branch}
                  />
                )}

                {previewStep === 1 && (
                  <PreviewTableWithColumns
                    title="Members"
                    data={fetchedData.member}
                    columns={columnOrders.member}
                  />
                )}

                {previewStep === 2 && (
                  <PreviewTableWithColumns
                    title="Deposits"
                    data={fetchedData.deposit}
                    columns={columnOrders.deposit}
                  />
                )}

                {previewStep === 3 && (
                  <PreviewTableWithColumns
                    title="Loans"
                    data={fetchedData.loan}
                    columns={columnOrders.loan}
                  />
                )}

                {previewStep === 4 && (
                  <PreviewTableWithColumns
                    title="Jewel"
                    data={fetchedData.jewel}
                    columns={columnOrders.jewel}
                  />
                )}
                {previewStep === 5 && (
                  <PreviewKeyValue
                    title="NPA"
                    fields={NPA_FIELDS}
                    data={npaData}
                  />
                )}

                {previewStep === 6 && (
                  <PreviewKeyValue
                    title="Profit"
                    fields={PROFIT_FIELDS}
                    data={profitData}
                  />
                )}

                {previewStep === 7 && (
                  <PreviewKeyValue
                    title="Employee"
                    fields={EMP_FIELDS}
                    data={empdata}
                  />
                )}

                {previewStep === 8 && (
                  <PreviewKeyValue
                    title="Safety"
                    fields={SAFETY_FIELDS}
                    data={safetyData}
                  />
                )}



                {/* ACTIONS */}
                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() =>
                      previewStep === 0
                        ? setShowPreview(false)
                        : setPreviewStep(p => p - 1)
                    }
                  >
                    Back
                  </Button>

                  {previewStep < 8 ? (
                    <Button onClick={() => setPreviewStep(p => p + 1)}>
                      Next
                    </Button>
                  ) : (
                    <Button onClick={handlePreviewOk} disabled={submitting}>
                        OK & Submit
                        </Button>

                  )}
                </div>

              </div>
            </div>
          )}
          {submitting && (
            <div className="fixed inset-0 z-[999] bg-white/80 backdrop-blur-md 
                            flex flex-col items-center justify-center">
                <Loader2 className="animate-spin h-12 w-12 text-indigo-600 mb-4" />
                <p className="text-lg font-medium text-gray-700">
                Submitting report, please wait...
                </p>
            </div>
            )}
            {loading && (
                <div className="fixed inset-0 z-[999] bg-white/80 backdrop-blur-md 
                                flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin h-12 w-12 text-indigo-600 mb-4" />
                    <p className="text-lg font-medium text-gray-700">
                    {progress || "Loading data, please wait..."}
                    </p>
                </div>
                )}
  </>
  )
}
