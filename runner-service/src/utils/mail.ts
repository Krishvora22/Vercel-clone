import dotenv from "dotenv";
dotenv.config();

import { Resend } from "resend";
import supabase from "./supabase";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing Resend API Key !!");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendDeploymentMail = async ({
  userId,
  projectName,
  deployedUrl,
  framework,
  deploymentTime,
}: {
  userId: string;
  projectName: string;
  deployedUrl: string;
  framework: string;
  deploymentTime: string;
}) => {
  try {
    const { data: userData, error: errorUserData } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (errorUserData) throw new Error("Can't find User to mail !!");

    const { error } = await resend.emails.send({
      from: "vercel@notifications.priyanshuvaliya.dev",
      to: userData.email,
      subject: `${projectName} Deployed Successfully`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.12); border: 1px solid #e9ecef;">
            <div style="background: #000000; color: #ffffff; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Deployment Successful</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #495057;">Hello, ${userData.name}</p>
              <p style="margin: 0 0 32px 0; font-size: 16px; color: #495057;">
                Your project <strong style="color: #000000;">${projectName}</strong> has been successfully deployed and is now live.
              </p>
              <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin: 32px 0; border-left: 4px solid #000000;">
                <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #000000;">Project Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #495057; width: 120px;">Framework:</td>
                    <td style="padding: 8px 0; color: #000000;">${framework}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #495057; width: 120px;">Deployed:</td>
                    <td style="padding: 8px 0; color: #000000;">${deploymentTime}</td>
                  </tr>
                </table>
              </div>
              <div style="text-align: center; margin: 40px 0;">
                <a href="${deployedUrl}" target="_blank" style="display: inline-block; background: #000000; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  View Live Site
                </a>
              </div>
              <div style="border-top: 1px solid #e9ecef; padding-top: 24px; margin-top: 40px;">
                <p style="margin: 0; font-size: 14px; color: #6c757d; font-weight: 500;">— Priyanshu Valiya</p>
              </div>
            </div>
          </div>
        </div>
      `,
    });

    if (error) console.error("Failed to send email:", error);
    return { success: true };
  } catch (err) {
    console.error("Error sending deployment email:", err);
    return { success: false, error: err };
  }
};
