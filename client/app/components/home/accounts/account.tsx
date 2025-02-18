
import { faPencil } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Avatar, Card, CardContent, Fab, Rating, Stack, Tooltip, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";

const data = [
   {
      name: "Property",
      lastUpdated: "September 14, 2023",
      image: "/images/property.png",
      balance: 285
   },
   {
      name: "Bank",
      lastUpdated: "September 14, 2023",
      image: "/images/bank.png",
      balance: 900
   },
   {
      name: "Red Valvet Dress",
      lastUpdated: "September 14, 2023",
      image: "/images/property.png",
      balance: 200
   },
   {
      name: "Cute Soft Teddybear",
      lastUpdated: "September 14, 2023",
      image: "/images/property.png",
      salesPrice: 285,
      balance: 345,
      rating: 2
   }
];

export default function Account() {
   return (
      <Grid
         container = { true }
         spacing = { 3 }
      >
         {
            data.map((account, index) => (
               <Grid
                  key = { index }
                  size = { { xs: 12, md: 4, lg: 3 } }
               >
                  <Card
                     elevation = { 9 }
                     sx = { { p: 0, position: "relative" } }
                     variant = { undefined }
                  >
                     <Typography
                        component = "a"
                        href = "/"
                     >
                        <Avatar
                           src = { account.image }
                           sx = {
                              {
                                 height: 250,
                                 width: "100%"
                              }
                           }
                           variant = "square"
                        />
                     </Typography>
                     <Tooltip title = "Edit Account">
                        <Fab
                           color = "primary"
                           size = "small"
                           sx = { { bottom: "75px", right: "15px", position: "absolute" } }
                        >
                           <FontAwesomeIcon icon = { faPencil } />
                        </Fab>
                     </Tooltip>
                     <CardContent sx = { { p: 3, pt: 2 } }>
                        <Typography variant = "h6">{ account.name }</Typography>
                        <Stack
                           alignItems = "center"
                           direction = "row"
                           justifyContent = "space-between"
                           mt = { 1 }
                        >
                           <Stack
                              alignItems = "center"
                              direction = "row"
                           >
                              <Typography variant = "h6">${ account.balance }</Typography>
                           </Stack>
                           <Rating
                              name = "read-only"
                              readOnly = { true }
                              size = "small"
                              value = { 5 }
                           />
                        </Stack>
                     </CardContent>
                  </Card>
               </Grid>
            ))
         }
      </Grid>
   );
};