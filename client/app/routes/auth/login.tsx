import { faDoorOpen, faKey, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, Col, Container, Form, Image, Row, FloatingLabel, InputGroup } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";

import NavigateButton from "@/components/global/navigate-button";
import { SERVER_URL } from "@/root";
import { userSchema } from "@/zod/user";
import { useState } from "react";

const loginSchema = z.object({
   username: userSchema.shape.username,
   password: userSchema.shape.password
});

export default function Login() {
   const navigate = useNavigate();
   const [isLoggedIn, setLoggedIn] = useState(false);

   const {
      register,
      handleSubmit,
      setError,
      formState: { errors }
   } = useForm({
      resolver: zodResolver(loginSchema)
   });

   const onSubmit = async (data: any) => {
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
            setLoggedIn(true);
            document.getElementById("login")?.click();
         } else {
            const { errors }: { [key: string]: string } = parsed;

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
         <Row className="vh-100 d-flex justify-content-center align-items-center mx-3">
            <Col
               lg={6}
               md={8}
               xs={12}
            >
               <Card className="border-5 border-primary border-top border-bottom-0 border-end-0 border-start-0 shadow-sm">
                  <Card.Body>
                     <div className="mb-3 mt-4">
                        <div className="image">
                           <Image
                              src={`${SERVER_URL}/resources/auth/login.jpg`}
                           />
                           <p className="lead">Please enter your credentials</p>
                        </div>
                        <Form
                           className="mb-3"
                           onSubmit={handleSubmit(onSubmit)}
                        >
                           <Form.Group className="mb-3">
                              <FloatingLabel
                                 label="Username"
                                 className="mb-3">
                                 <Form.Control
                                    type="text"
                                    aria-label="Username"
                                    autoComplete="username"
                                    placeholder="Username"
                                    {...register("username")}
                                    isInvalid={!!errors.username}
                                 />
                                 <Form.Control.Feedback
                                    className="mt-2"
                                    type="invalid"
                                 >
                                    {errors.username?.message?.toString()}
                                 </Form.Control.Feedback>
                              </FloatingLabel>
                           </Form.Group>
                           <Form.Group className="mb-3">
                              <FloatingLabel
                                 label="Password"
                                 className="mb-3">
                                 <Form.Control
                                    type="password"
                                    aria-label="Password"
                                    autoComplete="current-password"
                                    placeholder="Password"
                                    {...register("password")}
                                    isInvalid={!!errors.password}
                                 />
                                 <Form.Control.Feedback
                                    className="mt-2"
                                    type="invalid"
                                 >
                                    {errors.password?.message?.toString()}
                                 </Form.Control.Feedback>
                              </FloatingLabel>
                           </Form.Group>
                           <Form.Group className="mb-3">
                              <NavigateButton
                                 id="login"
                                 className="primary icon"
                                 navigate={() => { }}

                                 type="submit"
                              >
                                 <FontAwesomeIcon icon={faDoorOpen} />
                                 <span>Login</span>
                              </NavigateButton>
                           </Form.Group>
                        </Form>
                        <div className="mt-3">
                           <p className="mb-0 text-center">
                              Don&apos;t have an account?{" "}
                              <a
                                 className="text-primary fw-bold"
                                 href="/register"
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