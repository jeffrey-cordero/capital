import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCookies } from 'react-cookie'
import { useRef } from "react";
import { SERVER_URL } from "@/root";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { Form, Button, Col, Row, Container, Image, InputGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserSecret, faLock, faKey } from "@fortawesome/free-solid-svg-icons";

const userSchema = z.object({
   username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be at most 30 characters"),
   password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
});

export default function Login() {
   const {
      register,
      handleSubmit,
      setError,
      formState: { errors },
   } = useForm({
      resolver: zodResolver(userSchema),
   });
   const [cookies, setCookie] = useCookies(['token']);
   const navigate = useNavigate();
   const buttonRef = useRef<HTMLButtonElement>(null);

   const onSubmit = async (data: any) => {
      const credentials = {
         username: data.username.trim(),
         password: data.password.trim(),
      }
      
      try {
         const response = await fetch(`${SERVER_URL}/auth/login`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify(credentials),
         });

         const parsed = await response.json();

         if (response.ok) {
            const token: string = parsed.data.token;
            console.log(token);

            // JWT token is stored in a cookie
            setCookie('token', token, { path: '/' });

            navigate("/home");
         } else {
            const { errors }: { [key: string]: string } = parsed;

            Object.entries(errors).forEach(
               ([field, message]) => setError(field, { type: "server", message })
            );

            console.log(errors)
         }
      } catch (error) {
         console.error(error);
      }
   };

   return (
      <Container className="landing">
         <div className='image'>
            <Image
               src={`${SERVER_URL}/resources/auth/login.jpg`}
               alt="Login Page Image"
            />
         </div>
         <div className="credentials">
            <Form onSubmit={handleSubmit(onSubmit)} className="p-3">
               <InputGroup className="mb-3">
                  <InputGroup.Text>
                     <FontAwesomeIcon icon={faUserSecret} />
                  </InputGroup.Text>
                  <Form.Control
                     placeholder="Username"
                     aria-label="Username"
                     autoComplete="username"
                     {...register("username")}
                     isInvalid={!!errors.username}
                  />
                  <Form.Control.Feedback type="invalid">
                     {errors.username?.message?.toString()}
                  </Form.Control.Feedback>
               </InputGroup>
               <InputGroup className="mb-3">
                  <InputGroup.Text>
                     <FontAwesomeIcon icon={faKey} />
                  </InputGroup.Text>
                  <Form.Control
                     placeholder="Password"
                     aria-label="Password"
                     autoComplete="password"
                     {...register("password")}
                     isInvalid={!!errors.password}
                  />
                  <Form.Control.Feedback type="invalid">
                     {errors.password?.message?.toString()}
                  </Form.Control.Feedback>
               </InputGroup>
               <Button variant="primary" type="submit">
                  Submit
               </Button>
            </Form>
         </div>
      </Container>
   );
}