import { Container, Grow } from "@mui/material";
import Grid from "@mui/material/Grid2";

export default function Page() {
   return (
      <Container
         maxWidth = "xl"
         sx = { { textAlign: "center", py: 4, px: 2 } }
      >
         <Grow
            in = { true }
            mountOnEnter = { true }
            timeout = { 1000 }
            unmountOnExit = { true }
         >
            <Grid size = { { xs: 12 } }>
               <h1>Budgets</h1>
            </Grid>
         </Grow>
         <Grow
            in = { true }
            mountOnEnter = { true }
            timeout = { 1000 }
            unmountOnExit = { true }
         >
            <Grid size = { { xs: 12 } }>
               <h1>Pie Charts</h1>
            </Grid>
         </Grow>
      </Container>
   );
}