import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { clientName, date } = await req.json();

    const snapshot = await adminDb
      .collection("final_reports")
      .where("clientName", "==", clientName)
      .where("fromDate", "==", date)
      .get();

    const batch = adminDb.batch();

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      deleted: snapshot.size,
    });
  } catch (err) {
    console.error("Delete error:", err);

    return NextResponse.json(
      { error: "Delete failed" },
      { status: 500 }
    );
  }
}
