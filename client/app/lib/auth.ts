import { SERVER_URL } from "@/root";

export async function fetchAuthentication(): Promise<boolean> {
   try {
      // Fetch the authentication status from the server
      const response = await fetch(`${SERVER_URL}/auth`, {
         method: "GET",
         headers: {
            "Content-Type": "application/json"
         },
         credentials: "include"
      });

      const parsed = await response.json();

      if (parsed.data.authenticated) {
         return true;
      } else {
         return false;
      }
   } catch (error) {
      console.error(error);

      return false;
   }
};