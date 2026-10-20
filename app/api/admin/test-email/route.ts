import { NextResponse } from "next/server";
import { getMailTransporter, sendOrderConfirmationEmail } from "@/lib/email";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetEmail =
    searchParams.get("to") ||
    process.env.BREVO_ADMIN_EMAIL ||
    process.env.BREVO_LOGIN_EMAIL ||
    "raghuldelights@gmail.com";

  const transporter = getMailTransporter();
  if (!transporter) {
    return NextResponse.json(
      {
        success: false,
        error: "SMTP credentials not found in environment.",
        envCheck: {
          hasLogin: !!(process.env.SMTP_USER || process.env.BREVO_LOGIN_EMAIL),
          hasKey: !!(process.env.SMTP_PASS || process.env.BREVO_SMTP_KEY),
          host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
          port: process.env.SMTP_PORT || 587,
        },
      },
      { status: 500 }
    );
  }

  // 1. Verify connection
  try {
    await transporter.verify();
  } catch (verifyErr: unknown) {
    const errorMsg = verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
    return NextResponse.json(
      {
        success: false,
        phase: "verify",
        error: errorMsg,
        tip: errorMsg.includes("525") || errorMsg.includes("Unauthorized IP")
          ? "Brevo blocked this IP address (525): In Brevo, go to Settings > Security > Authorized IPs and click 'Deactivate' under 'Blocking unauthorized IP addresses', or click the verification link in the 'Validate your IP address' email Brevo just sent you."
          : errorMsg.includes("535")
          ? "Authentication failed: Please check your Brevo account (Settings > SMTP & API > SMTP tab) for the exact Login and SMTP Key, or make sure transactional emails are activated on Brevo."
          : "Could not establish connection to the SMTP server. Check host, port, and firewall.",
      },
      { status: 500 }
    );
  }

  // 2. Send sample order confirmation email to verify rendering and delivery
  try {
    const sampleOrderNumber = `RS-${Date.now().toString().slice(-8)}`;
    await sendOrderConfirmationEmail({
      customerName: "Valued Customer",
      customerEmail: targetEmail,
      phone: "9876543210",
      orderNumber: sampleOrderNumber,
      items: [
        {
          name: "Ragi Millet Laddu",
          weight: "250g",
          quantity: 2,
          price: 180,
        },
        {
          name: "Traditional Butter Murukku",
          weight: "200g",
          quantity: 1,
          price: 140,
        },
      ],
      subtotal: 500,
      shipping: 0,
      discount: 50,
      total: 450,
      couponCode: "WELCOME10",
      address: "123 Temple View Road, Gandhipuram",
      city: "Coimbatore",
      state: "Tamil Nadu",
      pincode: "641012",
      paymentMethod: "online",
    });

    return NextResponse.json({
      success: true,
      message: `Test order confirmation email sent successfully to ${targetEmail}`,
      orderNumber: sampleOrderNumber,
    });
  } catch (sendErr: unknown) {
    const errorMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
    return NextResponse.json(
      {
        success: false,
        phase: "send",
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
