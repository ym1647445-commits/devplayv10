import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { to, requestId, title, message, adminReply } = body;

    if (!to || !requestId || !title || !adminReply) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { error } = await resend.emails.send({
      from: "DevPlay Support <support@devplaystudio.com>",
      to,
      subject: `رد الدعم الفني على رسالتك #${requestId}`,
      html: `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8" />
</head>

<body style="margin:0;padding:0;background:#08111f;font-family:Tahoma,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 15px">
        <table width="650" cellpadding="0" cellspacing="0" style="background:#0f172a;border:1px solid rgba(255,255,255,.08);border-radius:24px;overflow:hidden;color:white">
          <tr>
            <td style="background:linear-gradient(135deg,#4f8cff,#00d4ff);padding:35px;text-align:center">
              <h1 style="margin:0;font-size:32px">🎧 DevPlay Support</h1>
              <p style="margin-top:10px;font-size:16px">تم الرد على رسالتك</p>
            </td>
          </tr>

          <tr>
            <td style="padding:35px">
              <h2 style="margin-top:0;color:#00d4ff">رد الدعم الفني ✅</h2>

              <div style="background:#17233d;padding:20px;border-radius:18px;margin-top:20px">
                <p><b>رقم الرسالة:</b> #${requestId}</p>
                <p><b>عنوان الرسالة:</b> ${title}</p>
                ${
                  message
                    ? `<p style="color:#b8c2d8"><b>رسالتك:</b><br/>${message}</p>`
                    : ""
                }
              </div>

              <div style="margin-top:25px;background:#061728;border:2px solid #00d4ff;padding:24px;border-radius:20px">
                <div style="font-size:14px;color:#8fa7c9;margin-bottom:10px">
                  رد الإدارة
                </div>

                <div style="font-size:18px;line-height:1.9;color:white">
                  ${adminReply}
                </div>
              </div>

              <div style="margin-top:30px;padding:18px;border-radius:16px;background:#111c32;color:#b8c2d8">
                شكراً لتواصلك معنا 💙
              </div>
            </td>
          </tr>

          <tr>
            <td style="text-align:center;padding:25px;background:#0b1324;color:#8fa7c9;font-size:13px">
              DevPlay Studio © 2026
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}