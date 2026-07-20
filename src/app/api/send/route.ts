import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, text, accessCode } = body;

    // 1. Validate input parameters (subject is optional)
    if (!to || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: to and text are required.' },
        { status: 400 }
      );
    }
    const finalSubject = subject ? subject.trim() : '(No Subject)';

    // 2. Validate Access Code
    const expectedAccessCode = process.env.ACCESS_CODE;
    if (!expectedAccessCode || accessCode !== expectedAccessCode) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid access code.' },
        { status: 401 }
      );
    }

    // 3. Validate SMTP configuration
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      return NextResponse.json(
        { error: 'Server configuration error: SMTP credentials are not set.' },
        { status: 500 }
      );
    }

    // 4. Create professional HTML email content
    // Replace newlines with <br/> for the HTML version
    const formattedText = text.replace(/\n/g, '<br/>');
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${finalSubject}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #f9fafb;
            color: #111827;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            border: 1px solid #e5e7eb;
          }
          .header {
            background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%);
            padding: 30px 40px;
            text-align: left;
            border-bottom: 3px solid #8b5cf6;
          }
          .header h1 {
            color: #ffffff;
            font-size: 22px;
            font-weight: 700;
            margin: 0;
            letter-spacing: 0.05em;
          }
          .header p {
            color: #a78bfa;
            font-size: 12px;
            margin: 5px 0 0 0;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .content {
            padding: 40px;
            line-height: 1.6;
            font-size: 16px;
            color: #374151;
          }
          .content p {
            margin: 0 0 20px 0;
          }
          .content p:last-child {
            margin-bottom: 0;
          }
          .footer {
            background-color: #f3f4f6;
            padding: 24px 40px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
          }
          .footer a {
            color: #6366f1;
            text-decoration: none;
          }
          .badge {
            display: inline-block;
            padding: 4px 12px;
            background-color: #e0e7ff;
            color: #4338ca;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>reply247</h1>
            <p>Secure Communication Portal</p>
          </div>
          <div class="content">
            <div class="badge">Official Message</div>
            <div style="font-size: 15px; color: #4b5563; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6;">
              <strong>From:</strong> monkeykokkikumar@gmail.com<br>
              <strong>Date:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} IST &nbsp;|&nbsp; Reference: ${new Date().toUTCString()}
            </div>
            <div style="min-height: 100px; white-space: pre-wrap; font-family: inherit;">${formattedText}</div>
          </div>
          <div class="footer">
            This message was sent securely via <a href="#">reply247</a>.<br>
            Reply directly to this email to get in touch.
          </div>
        </div>
      </body>
    </html>
    `;

    // 5. Setup Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    // 6. Send Mail
    const info = await transporter.sendMail({
      from: `"reply247 Portal" <${gmailUser}>`,
      to,
      subject: finalSubject,
      text, // Plain text fallback
      html: htmlContent, // Gorgeous HTML version
      replyTo: gmailUser, // Direct reply back to gmailUser
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email.' },
      { status: 500 }
    );
  }
}
