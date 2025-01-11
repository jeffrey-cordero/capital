import { faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Card, Col, Container, FloatingLabel, Form, Image, Row } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { z } from "zod";

import NavigateButton from "@/client/app/components/global/navigate-button";
import { SERVER_URL } from "@/client/app/root";
import { userSchema } from "@/types/user";

const loginSchema = z.object({
   username: userSchema.shape.username,
   password: userSchema.shape.password
});

export default function Login() {
   const [isNavigationButtonDisabled, setIsNavigationButtonDisabled] = useState(true);

   const {
      register,
      handleSubmit,
      setError,
      formState: { errors }
   } = useForm({
      resolver: zodResolver(loginSchema)
   });

   const onSubmit = async(data: any) => {
      // Prevent multiple form submissions
      if (!isNavigationButtonDisabled) return;

      const credentials = {
         username: data.username.trim(),
         password: data.password.trim()
      };

      try {
         const response = await fetch(`${SERVER_URL}/auth/login`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json"
            },
            body: JSON.stringify(credentials),
            credentials: "include"
         });

         const parsed = await response.json();

         if (response.ok) {
            // Navigate to the home page
            setIsNavigationButtonDisabled(false);

            setTimeout(() => {
               document.getElementById("login")?.click();
            }, 500);
         } else {
            // Display server-side validation errors
            const { errors }: Record<string, string> = parsed;

            Object.entries(errors).forEach(
               ([field, message]) => setError(field, { type: "server", message })
            );
         }
      } catch (error) {
         console.error(error);
      }
   };

   return (
      <Container>
         <Row className = "vh-100 d-flex justify-content-center align-items-center mx-3">
            <Col
               lg = { 6 }
               md = { 8 }
               xs = { 12 }
            >
               <Card className = "border-5 border-primary border-top border-bottom-0 border-end-0 border-start-0 shadow-sm my-5">
                  <Card.Body>
                     <div className = "mb-3 mt-4">
                        <div className = "image">
                           <Image
                              src = { `${SERVER_URL}/resources/auth/login.jpg` }
                           />
                           <p className = "fw-semibold">Please enter your credentials</p>
                        </div>
                        <Form
                           className = "mb-3"
                           onSubmit = { handleSubmit(onSubmit) }
                        >
                           <Form.Group className = "mb-3">
                              <FloatingLabel
                                 className = "mb-3"
                                 controlId = "username"
                                 label = "Username"
                              >
                                 <Form.Control
                                    aria-label = "Username"
                                    autoComplete = "username"
                                    placeholder = "Username"
                                    type = "text"
                                    { ...register("username") }
                                    isInvalid = { !!errors.username }
                                 />
                                 <Form.Control.Feedback
                                    className = "mt-2"
                                    type = "invalid"
                                 >
                                    { errors.username?.message?.toString() }
                                 </Form.Control.Feedback>
                              </FloatingLabel>
                           </Form.Group>
                           <Form.Group className = "mb-3">
                              <FloatingLabel
                                 className = "mb-3"
                                 controlId = "password"
                                 label = "Password"
                              >
                                 <Form.Control
                                    aria-label = "Password"
                                    autoComplete = "current-password"
                                    placeholder = "Password"
                                    type = "password"
                                    { ...register("password") }
                                    isInvalid = { !!errors.password }
                                 />
                                 <Form.Control.Feedback
                                    className = "mt-2"
                                    type = "invalid"
                                 >
                                    { errors.password?.message?.toString() }
                                 </Form.Control.Feedback>
                              </FloatingLabel>
                           </Form.Group>
                           <Form.Group className = "mb-3">
                              <NavigateButton
                                 className = "primary icon"
                                 disabled = { isNavigationButtonDisabled }
                                 id = "login"
                                 navigate = { () => window.location.reload() }
                                 type = "submit"
                              >
                                 <FontAwesomeIcon icon = { faUnlockKeyhole } />
                                 <span>Login</span>
                              </NavigateButton>
                           </Form.Group>
                        </Form>
                        <div className = "mt-3">
                           <p className = "mb-0 text-center">
                              Don&apos;t have an account?{ " " }
                              <a
                                 className = "text-primary fw-bold"
                                 href = "/register"
                              >
                                 Sign Up
                              </a>
                           </p>
                        </div>
                     </div>
                  </Card.Body>
               </Card>
            </Col>
         </Row>
      </Container>
   );
}