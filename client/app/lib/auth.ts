import { sendApiRequest } from "@/lib/server";

export async function fetchAuthentication(): Promise<boolean> {
   return (await sendApiRequest("auth", "GET", null))?.data.authenticated;
};

export async function clearAuthentication(): Promise<void> {
   await sendApiRequest("auth/logout", "POST", null);
};