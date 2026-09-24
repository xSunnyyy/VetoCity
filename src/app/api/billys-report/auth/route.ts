import { NextResponse } from "next/server";
import { isBillysAuthConfigured, checkBillysPasscode, issueBillysToken } from "@/app/lib/billysReportAuth";

export async function POST(req: Request) {
  if (!isBillysAuthConfigured()) {
    return NextResponse.json(
      { error: "Adding/editing reports isn't configured yet — set BILLYS_REPORT_PASSCODE in the app's environment." },
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const input = typeof body?.passcode === "string" ? body.passcode : "";

  if (!checkBillysPasscode(input)) {
    return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
  }

  return NextResponse.json({ token: issueBillysToken() });
}
