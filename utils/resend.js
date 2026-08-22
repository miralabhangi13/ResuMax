const nodemailer=require("nodemailer");
const transporter=nodemailer.createTransport({
    service:"gmail",
    auth:{
        user:process.env.EMAIL,
        pass:process.env.EMAIL_APP_PASSWORD
    }
});

async function sendEmail(email, otp) {
    await transporter.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: "ResuMax Password Reset",
        html: `
<div style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #334155;">
    <h2 style="color: #4F46E5; margin-top: 0; font-size: 22px;">ResuMax</h2>

    <p style="font-size: 16px; margin-bottom: 20px;">
        Use the verification code below to reset your password:
    </p>

    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4F46E5;">
            ${otp}
        </span>
    </div>

    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
        This code is valid for 1 minutes. If you didn't request this, you can safely ignore this email.
    </p>
</div>
`
    });
}
async function send_V_Email(email, otp) {
    await transporter.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: "ResuMax Password Reset",
        html: `
<div style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #334155;">
    <h2 style="color: #4F46E5; margin-top: 0; font-size: 22px;">ResuMax</h2>

    <p style="font-size: 16px; margin-bottom: 20px;">
        Use the verification code below to verify  your account:
    </p>

    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4F46E5;">
            ${otp}
        </span>
    </div>

    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
        This code is valid for 1 minutes. If you didn't request this, you can safely ignore this email.
    </p>
</div>
`
    });
}

module.exports = {
    sendEmail,
    send_V_Email
};