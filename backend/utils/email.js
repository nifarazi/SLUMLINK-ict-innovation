import nodemailer from "nodemailer";

// PRODUCTION READY: App Password configured in .env
const SEND_REAL_EMAILS = true;

// Configure email transporter (using Gmail with App Password)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

function getAppBaseUrl() {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;

  const port = process.env.SERVER_PORT || 5001;
  return `http://localhost:${port}`;
}

export const sendRegistrationReceivedEmail = async (orgName, email) => {
  try {
    const baseUrl = getAppBaseUrl();

    const mailOptions = {
      from: process.env.EMAIL_USER || "slumlink@gmail.com",
      to: email,
      subject: "📝 NGO Registration Received - SLUMLINK",
      html: `
        <div style="font-family: Poppins, Arial, sans-serif; background: #f5f5f5; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2d7a3d; margin-bottom: 15px;">Thank you for registering</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Dear <strong>${orgName}</strong>,
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              We have received your NGO registration on <strong>SLUMLINK</strong>.
              Your account is currently <strong>pending verification</strong>.
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Please wait for your account to be verified by the admin team.
              Once your account is approved, you will be able to sign in using the email address you registered with.
            </p>
            <a href="${baseUrl}" style="display: inline-block; background: #2d7a3d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600;">
              Visit SLUMLINK
            </a>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you have any questions, please contact our support team.
            </p>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
              SLUMLINK - Empowering Slum Communities
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Registration received email sent to ${email}`);
  } catch (err) {
    console.error("Error sending registration received email:", err);
    throw err;
  }
};

export const sendApprovalEmail = async (orgName, email) => {
  try {
    const baseUrl = getAppBaseUrl();

    const mailOptions = {
      from: process.env.EMAIL_USER || "slumlink@gmail.com",
      to: email,
      subject: "✅ Your NGO Registration Approved - SLUMLINK",
      html: `
        <div style="font-family: Poppins, Arial, sans-serif; background: #f5f5f5; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2d7a3d; margin-bottom: 15px;">Congratulations! 🎉</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Dear <strong>${orgName}</strong>,
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Your NGO registration has been <strong style="color: #2d7a3d;">approved</strong> by the SLUMLINK admin team. 
              Your account is now active and you can start using our platform.
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              You can now log in to your account and begin managing campaigns, connecting with slum dwellers, 
              and making a positive impact in communities.
            </p>
            <a href="${baseUrl}" style="display: inline-block; background: #2d7a3d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600;">
              Log In to Your Account
            </a>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you have any questions, please contact our support team.
            </p>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
              SLUMLINK - Empowering Slum Communities
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Approval email sent to ${email}`);
  } catch (err) {
    console.error("Error sending approval email:", err);
    throw err;
  }
};

export const sendRejectionEmail = async (orgName, email) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || "slumlink@gmail.com",
      to: email,
      subject: "❌ NGO Registration Status - SLUMLINK",
      html: `
        <div style="font-family: Poppins, Arial, sans-serif; background: #f5f5f5; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d32f2f; margin-bottom: 15px;">Registration Status Update</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Dear <strong>${orgName}</strong>,
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Thank you for your interest in joining SLUMLINK. Unfortunately, your NGO registration has been 
              <strong style="color: #d32f2f;">rejected</strong> by our admin team after careful review.
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              This may be due to incomplete documentation, non-compliance with our guidelines, or other verification issues.
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              <strong>What can you do?</strong>
            </p>
            <ul style="color: #333; font-size: 16px; line-height: 1.8;">
              <li>Review our registration requirements carefully</li>
              <li>Ensure all documents are complete and valid</li>
              <li>Contact our support team for more information</li>
              <li>You can reapply after addressing the issues</li>
            </ul>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              For any questions or clarifications, please reach out to our support team.
            </p>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
              SLUMLINK - Empowering Slum Communities
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Rejection email sent to ${email}`);
  } catch (err) {
    console.error("Error sending rejection email:", err);
    throw err;
  }
};
