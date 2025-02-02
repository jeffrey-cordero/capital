import { userSchema, User } from "capital-types/user";
import { create, authenticate, getConflictingUsers } from "@/repository/userRepository";

export async function createUser(user: User): Promise<Record<string, string> | User> {
   const fields = userSchema.safeParse(user);

   if (!fields.success) {
      // Return single error message per field
      const errors = fields.error.flatten().fieldErrors;

      return Object.fromEntries(
         Object.entries(errors as Record<string, string[]>).map(([field, errors]) => [
            field,
            errors?.[0] || "Unknown error",
         ])
      );
   } else {
      // TODO: account for password matching (if -> else if (conflicts) -> else create)
      const conflicts = await getConflictingUsers(user.username, user.email);

      if (conflicts !== null) {
         return conflicts;
      } else {
         return await create(user);
      }
   }
}

export async function authenticateUser(username: string, password: string): Promise<Record<string, string> | User> {
   const user = await authenticate(username, password);

   if (user === null) {
      return {
         username: "Invalid credentials",
         password: "Invalid credentials",
      };
   } else {
      return user;
   }
}