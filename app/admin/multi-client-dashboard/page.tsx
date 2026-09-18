"use client"

import { useEffect, useState } from "react"

import { resolveHeartbeatStatus } from "@/lib/heartbeat"



export default function MultiClientRunner(){

const [clients,setClients] = useState<any[]>([])
const [users,setUsers] = useState<any[]>([])
const [queries,setQueries] = useState<any[]>([])

const [selectedClients,setSelectedClients] = useState<string[]>([])
const [clientStatus,setClientStatus] = useState<any>({})

const [date,setDate] = useState("")
const [loading,setLoading] = useState(false)
const [lastClosingDates, setLastClosingDates] = useState<any>({})
const [moduleStatus, setModuleStatus] = useState<any>({})
const [emails, setEmails] = useState<Record<string, string>>({})



const [selectAll,setSelectAll] = useState(false)

/* ---------------- INIT ---------------- */

useEffect(()=>{ init() },[])

async function init(){

  const [clientsRes, usersRes, queriesRes, emailsRes] = await Promise.all([
    fetch("/api/clients"),
    fetch("/api/admin/users"),
    fetch("/api/queries"),
    fetch("/api/client-emails")
  ])

  const clientsData = await clientsRes.json()
  const usersData = await usersRes.json()
  const queriesData = await queriesRes.json()
  const emailsData = await emailsRes.json()
  setEmails(emailsData)
  /* ✅ FILTER ONLINE CLIENTS DIRECTLY */

  const onlineClients = clientsData.filter((c:any)=>{
    return resolveHeartbeatStatus(c.lastSeen) === "online"
  })

  setClients(onlineClients)
  setUsers(usersData)
  setQueries(queriesData)
}

/* ---------------- HELPERS ---------------- */

function toggleClient(id:string){

setSelectedClients(prev=>
prev.includes(id)
? prev.filter(c=>c!==id)
: [...prev,id]
)

}

function getEmail(clientId: string) {
  return emails[clientId] || "-"
  
}

function getAgent(clientId:string){
  const user = users.find(u=>u.client_id===clientId)
  return user?.id
}

function getAgentQueries(agentUid:string){
  return queries.filter(q =>
    (q.assigned_agents || []).includes(agentUid)
  )
}
function toggleSelectAll(){

  if(selectAll){
    setSelectedClients([])
    setSelectAll(false)
  }else{

    const allCompleted = clients
      .filter(c =>
        ["member","deposit","loan","jewel","memberwise"].every(
          m => moduleStatus[c.client_id]?.[m]
        )
      )
      .map(c => c.client_id)

    setSelectedClients(allCompleted)
    setSelectAll(true)
  }
}

/* ---------------- CREATE COMMAND ---------------- */



/* ---------------- WAIT COMMAND ---------------- */



/* ---------------- WAIT RESULT ---------------- */



/* ---------------- FETCH RESULT ---------------- */



/* ---------------- SAVE LOCAL ---------------- */


async function checkSubmissionStatus(){

  if(!date){
    alert("Select date first")
    return
  }

  try {

    const res = await fetch("/api/check-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({ date })
    })

    const data = await res.json()

    console.log("📊 STATUS API RESPONSE:", data)

    const statusMap:any = {}

    for(const c of clients){

      const status = data[c.name] || {}

      console.log(
        "CLIENT STATUS:",
        c.name,
        status
      )

      statusMap[c.client_id] = {
        member: status.member === true,
        deposit: status.deposit === true,
        loan: status.loan === true,
        jewel: status.jewel === true,
        memberwise: status.memberwise === true
      }

    }

    console.log("📊 FINAL STATUS MAP:", statusMap)

    setModuleStatus(statusMap)

  } catch(err) {

    console.error("❌ STATUS CHECK ERROR:", err)

  }
}


useEffect(()=>{

if(clients.length && date){
checkSubmissionStatus()
}

},[clients,date])

/* ---------------- PROCESS CLIENT ---------------- */

async function processClient(clientId: string) {

  // 🔹 Get module status for this client
  const status = moduleStatus[clientId] || {}

  // 🔹 Find missing modules
  const missingModules: string[] = []

  if (!status.member) missingModules.push("member")
  if (!status.deposit) missingModules.push("deposit")
  if (!status.loan) missingModules.push("loan")
  if (!status.jewel) missingModules.push("jewel")
  if (!status.memberwise) missingModules.push("memberwise")

  // 🔹 If all modules completed → skip
  if (missingModules.length === 0) {
    console.log("✅ Already completed:", clientId)
    return
  }

  console.log("🚀 Running client:", clientId, "Modules:", missingModules)

  // 🔹 Set UI status
  setClientStatus((prev: any) => ({
    ...prev,
    [clientId]: "Running"
  }))

  try {

    const res = await fetch("/api/run-client", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        clientId,
        date,
        modules: missingModules // 🔥 KEY PART
      })
    })

    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error("Run failed")
    }

    // 🔹 Save report locally
   

    // 🔹 Update moduleStatus AFTER success
    setModuleStatus((prev: any) => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        ...missingModules.reduce((acc: any, m: string) => {
          acc[m] = true
          return acc
        }, {})
      }
    }))

    // 🔹 Update UI status
    setClientStatus((prev: any) => ({
      ...prev,
      [clientId]: "Completed"
    }))

  } catch (err) {

    console.error("❌ Error processing:", clientId, err)

    setClientStatus((prev: any) => ({
      ...prev,
      [clientId]: "Failed"
    }))
  }
}
/* ---------------- RUN ---------------- */

async function run(){

if(!date)
return alert("Select Date")

if(selectedClients.length===0)
return alert("Select Clients")

/* skip already completed */

const clientsToRun = selectedClients.filter(
id => clientStatus[id] !== "Completed"
)

if(clientsToRun.length === 0){
alert("All selected clients already completed")
return
}

setLoading(true)

const MAX_PARALLEL=15
let index=0

async function worker(){

while(true){

const i=index++

if(i>=clientsToRun.length)
break

await processClient(clientsToRun[i])

}

}

const workers=[]

for(let i=0;i<MAX_PARALLEL;i++)
workers.push(worker())

await Promise.all(workers)

setLoading(false)

await checkSubmissionStatus()

alert("All Clients Completed")

}
function formatDateDMY(dateValue: any) {

  if (!dateValue) return "-"

  const d =
    dateValue?.toDate?.() || // Firestore Timestamp
    new Date(dateValue)

  if (isNaN(d.getTime())) return "-"

  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()

  return `${day}-${month}-${year}`
}
async function fetchLastClosingDates(){

  const res = await fetch("/api/cash-balances")
  const data = await res.json()

  const map:any = {}

  Object.entries(data).forEach(([clientId, value]: any)=>{
    map[clientId] = formatDateDMY(value.lastClosingDate)
  })

  setLastClosingDates(map)
}
useEffect(() => {

  if (clients.length > 0) {
    fetchLastClosingDates()
  }

}, [clients])

function parseDMY(dateStr: string) {
  if (!dateStr || dateStr === "-") return null

  const [day, month, year] = dateStr.split("-")
  return new Date(`${year}-${month}-${day}`)
}
/* ---------------- UI ---------------- */

return(

<div className="p-10 space-y-6">

<h1 className="text-2xl font-bold">
Multi Client Get Data
</h1>

<div className="flex gap-4">

<input
type="date"
value={date}
onChange={(e)=>setDate(e.target.value)}
className="border px-3 py-2 rounded"
/>



<button
onClick={run}
disabled={loading}
className="bg-blue-600 text-white px-6 py-2 rounded"
>
{loading ? "Running..." : "Run Selected Clients"}
</button>

<button
onClick={checkSubmissionStatus}
className="bg-green-600 text-white px-6 py-2 rounded"
>
Check Status
</button>

</div>

<table className="w-full border">

<thead className="bg-gray-100">

<tr>

<th className="border p-2">Client</th>
<th className="border p-2">Email</th>
<th className="border p-2">Last Closing Date</th>
<th className="border p-2">Member</th>
<th className="border p-2">Deposit</th>
<th className="border p-2">Loan</th>
<th className="border p-2">Jewel</th>
<th className="border p-2">Memberwise</th>
<th className="border p-2">Status</th>
<th className="border p-2">

<input
type="checkbox"
checked={selectAll}
onChange={toggleSelectAll}
/>

</th>

</tr>

</thead>

<tbody>

{[...clients]
  .sort((a, b) => {

    const dateA = parseDMY(lastClosingDates[a.client_id])
    const dateB = parseDMY(lastClosingDates[b.client_id])

    if (!dateA) return 1
    if (!dateB) return -1

    return dateB.getTime() - dateA.getTime()
  })
  .map((c, index) => {

    return (
      <tr key={c.client_id || index}>

        <td className="border p-2">
          {c.name}
        </td>

        <td className="border p-2">
          {getEmail(c.client_id)}
        </td>

        <td className="border p-2">
          {lastClosingDates[c.client_id] || "-"}
        </td>
        <td>{moduleStatus[c.client_id]?.member ? "✅" : "❌"}</td>
<td>{moduleStatus[c.client_id]?.deposit ? "✅" : "❌"}</td>
<td>{moduleStatus[c.client_id]?.loan ? "✅" : "❌"}</td>
<td>{moduleStatus[c.client_id]?.jewel ? "✅" : "❌"}</td>
<td>{moduleStatus[c.client_id]?.memberwise ? "✅" : "❌"}</td>

<td>
  {
    ["member","deposit","loan","jewel","memberwise"].every(
      m => moduleStatus[c.client_id]?.[m]
    )
      ? "✅ Completed"
      : "⏳ Pending"
  }
</td>
        <td className="border p-2">
          {clientStatus[c.client_id] || "Idle"}
        </td>

        <td className="border p-2">
          <input
            type="checkbox"
            checked={selectedClients.includes(c.client_id)}
            onChange={()=>toggleClient(c.client_id)}
          />
        </td>

      </tr>
    )
})}

</tbody>

</table>

</div>

)

}