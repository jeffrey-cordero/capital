import { faIdCard } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { userSchema } from "capital-types/user";
import { useState } from "react";
import { Card, Col, Container, FloatingLabel, Form, Image, Row } from "react-bootstrap";
import { useForm } from "react-hook-form";
import Button from "@mui/material/Button";

import { SERVER_URL } from "@/root";

const registrationSchema = userSchema.extend({
   verifyPassword: userSchema.shape.password
});

export default function Register() {
   const [isNavigationButtonDisabled, setIsNavigationButtonDisabled] = useState(true);

   const {
      register,
      handleSubmit,
      setError,
      formState: { errors }
   } = useForm({
      resolver: zodResolver(registrationSchema)
   });

   const onSubmit = async(data: any) => {
      // Prevent multiple form submissions
      if (!isNavigationButtonDisabled) return;

      const registration = {
         username: data.username.trim(),
         name: data.name.trim(),
         password: data.password.trim(),
         verifyPassword: data.verifyPassword.trim(),
         email: data.email.trim()
      };

      try {
         const response = await fetch(`${SERVER_URL}/users`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json"
            },
            body: JSON.stringify(registration),
            credentials: "include"
         });

         const parsed = await response.json();

         if (response.ok) {
            // Navigate to the home page
            setIsNavigationButtonDisabled(false);

            setTimeout(() => {
               document.getElementById("register")?.click();
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
                              src = { `${SERVER_URL}/resources/auth/register.jpg` }
                           />
                           <p className = "fw-semibold">Please enter your personal details</p>
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
                                 controlId = "name"
                                 label = "Name"
                              >
                                 <Form.Control
                                    aria-label = "Name"
                                    autoComplete = "name"
                                    placeholder = "Name"
                                    type = "text"
                                    { ...register("name") }
                                    isInvalid = { !!errors.name }
                                 />
                                 <Form.Control.Feedback
                                    className = "mt-2"
                                    type = "invalid"
                                 >
                                    { errors.name?.message?.toString() }
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
                                    autoComplete = "new-password"
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
                              <FloatingLabel
                                 className = "mb-3"
                                 controlId = "verifyPassword"
                                 label = "Verify Password"
                              >
                                 <Form.Control
                                    aria-label = "Verify Password"
                                    autoComplete = "new-password"
                                    placeholder = "Verify Password"
                                    type = "password"
                                    { ...register("verifyPassword") }
                                    isInvalid = { !!errors.verifyPassword }
                                 />
                                 <Form.Control.Feedback
                                    className = "mt-2"
                                    type = "invalid"
                                 >
                                    { errors.verifyPassword?.message?.toString() }
                                 </Form.Control.Feedback>
                              </FloatingLabel>
                           </Form.Group>
                           <Form.Group className = "mb-3">
                              <FloatingLabel
                                 className = "mb-3"
                                 controlId = "email"
                                 label = "Email"
                              >
                                 <Form.Control
                                    aria-label = "Email"
                                    autoComplete = "email"
                                    placeholder = "Email"
                                    type = "email"
                                    { ...register("email") }
                                    isInvalid = { !!errors.email }
                                 />
                                 <Form.Control.Feedback
                                    className = "mt-2"
                                    type = "invalid"
                                 >
                                    { errors.email?.message?.toString() }
                                 </Form.Control.Feedback>
                              </FloatingLabel>
                           </Form.Group>
                           <Form.Group className = "mb-3">
                              <Button
                                 className = "primary icon"
                                 disabled = { isNavigationButtonDisabled }
                                 id = "register"
                                 type = "submit"
                              >
                                 <FontAwesomeIcon icon = { faIdCard } />
                                 <span>Register</span>
                              </Button>
                           </Form.Group>
                        </Form>
                        <div className = "mt-3">
                           <p className = "mb-0 text-center">
                              Already have an account?{ " " }
                              <a
                                 className = "text-primary fw-bold"
                                 href = "/login"
                              >
                                 Log In
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