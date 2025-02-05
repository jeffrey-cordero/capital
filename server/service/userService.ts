import { userSchema, User } from "capital-types/user";
import { create, authenticate, getConflictingUsers } from "@/repository/userRepository";
import { ServiceResponse } from "@/lib/api/response";

export async function authenticateUser(username: string, password: string): Promise<ServiceResponse> {
   const result = await authenticate(username, password);

   if (result === null) {
      return {
         code: 401,
         message: "Invalid credentials",
         errors: {
            username: "Invalid credentials",
            password: "Invalid credentials"
         } 
      };
   } else {
      return {
         code: 200,
         message: "Successfully authenticated",
         data: result
      };
   }
}

export async function createUser(user: User): Promise<ServiceResponse> {
   const fields = userSchema.safeParse(user);

   if (!fields.success) {
      // Return single error message per registration field
      const errors = fields.error.flatten().fieldErrors;

      return {
         code: 400,
         message: "Invalid user fields",
         errors: Object.fromEntries(
            Object.entries(errors as Record<string, string[]>).map(([field, errors]) => [
               field,
               errors?.[0] || "Unknown error",
            ])
         )
      }
   } else if (fields.data.password !== fields.data.verifyPassword) {
      // Invalid new password verification
      return {
         code: 400,
         message: "Invalid user fields",
         errors: {
            password: "Passwords do not match",
            verifyPassword: "Passwords do not match"
         }
      };
   } else {
      // Handle user uniqueness or successfully create new user
      const result = await getConflictingUsers(user.username, user.email);

      if (result !== null) {
         return {
            code: 409,
            message: "Invalid user fields",
            errors: result
         };
      } else {
         return {
            code: 201,
            message: "Successfully registered",
            data: await create(user)
         }
      }
   }
}