import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function PATCH(req:Request,{params}:{params:{id:string}}){
  
 const { id } = await params
  const { name, sql, variables, assignedAgents } = await req.json()

  await pool.query(`
    UPDATE queries
    SET name=$1,
        sql=$2,
        variables=$3,
        assigned_agents=$4
    WHERE id=$5
  `,[name,sql,JSON.stringify(variables),assignedAgents,id])

  return NextResponse.json({ success:true })
}

export async function DELETE(req:Request,{params}:{params:{id:string}}){
   const { id } = await params

  await pool.query(`DELETE FROM queries WHERE id=$1`,[id])

  return NextResponse.json({ success:true })
}