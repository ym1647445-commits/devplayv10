import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { to, orderId, productName, deliveryCode, deliveryNote } = body;

    if (!to || !orderId || !productName || !deliveryCode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { error } = await resend.emails.send({
      from: "DevPlay Store <support@devplaystudio.com>",
      to,
      subject: `تم شحن طلبك #${orderId} بنجاح`,
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
              <h1 style="margin:0;font-size:34px"> DevPlay Studio</h1>
              <p style="margin-top:10px;font-size:16px">تم تنفيذ طلبك بنجاح</p>
            </td>
          </tr>

          <tr>
            <td style="padding:35px">
              <h2 style="margin-top:0;color:#00d4ff;font-size:28px">✅ تم شحن طلبك</h2>

              <p style="font-size:16px;line-height:1.9">
                شكراً لاستخدامك DevPlay Studio. تم تجهيز طلبك وأصبح جاهزاً للاستلام.
              </p>

              <div style="background:#17233d;padding:22px;border-radius:18px;margin-top:25px">
                <p><b>رقم الطلب:</b> #${orderId}</p>
                <p><b>المنتج:</b></p>
                <p style="color:#8cdcff;font-size:18px;font-weight:bold">${productName}</p>
              </div>

              <div style="margin-top:25px;background:#061728;border:2px dashed #00d4ff;padding:25px;border-radius:20px;text-align:center">
                <div style="font-size:14px;color:#8fa7c9;margin-bottom:10px">
                  كود التسليم
                </div>

                <div style="font-size:28px;font-weight:bold;color:#00d4ff;letter-spacing:2px;word-break:break-word">
                  ${deliveryCode}
                </div>
              </div>

              ${
                deliveryNote
                  ? `
                    <div style="margin-top:25px;background:#182842;padding:18px;border-radius:16px">
                      <b>ملاحظة:</b><br/>
                      ${deliveryNote}
                    </div>
                  `
                  : ""
              }

              <div style="margin-top:35px;padding:20px;border-radius:16px;background:#111c32">
                💙 إذا واجهتك أي مشكلة يمكنك التواصل مع الدعم الفني مباشرة.
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