import { ENV } from "./env";

export async function sendAuthEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!ENV.resendApiKey || !ENV.emailFrom) {
    throw new Error(
      "Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM."
    );
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${ENV.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ENV.emailFrom,
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    });
  } catch (error) {
    console.error("[Email] Resend request failed", error);
    throw new Error("Email provider could not be reached.");
  }

  if (!response.ok) {
    console.error("[Email] Resend rejected message", {
      status: response.status,
    });
    throw new Error(
      "Email provider rejected the message. Check the sender and provider configuration."
    );
  }
}
