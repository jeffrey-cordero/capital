import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { LineChart } from '@mui/x-charts/LineChart';

import StatCard, { type StatCardProps } from "@/components/home/budget";
import { CardContent, Fade, Slide, Typography } from '@mui/material';
import { theme } from '@/styles/mui/theme';

const data: StatCardProps[] = [
   {
      title: 'Income',
      value: '100k',
      interval: 'Last 30 days',
      trend: 'up',
      data: [
         200, 24, 220, 260, 240, 380, 100, 240, 280, 240, 300, 340, 320, 360, 340, 380,
         360, 400, 380, 420, 400, 640, 340, 460, 440, 480, 460, 600, 880, 920,
      ],
   },
   {
      title: 'Expenses',
      value: '325',
      interval: 'Last 30 days',
      trend: 'down',
      data: [
         1640, 1250, 970, 1130, 1050, 900, 720, 1080, 900, 450, 920, 820, 840, 600, 820,
         780, 800, 760, 380, 740, 660, 620, 840, 500, 520, 480, 400, 360, 300, 220,
      ],
   },
   {
      title: 'Net Worth',
      value: '200k',
      interval: 'Last 30 days',
      trend: 'neutral',
      data: [
         500, 400, 510, 530, 520, 600, 530, 520, 510, 730, 520, 510, 530, 620, 510, 530,
         520, 410, 530, 520, 610, 530, 520, 610, 530, 420, 510, 430, 520, 510,
      ],
   },
];

function AreaGradient({ color, id }: { color: string; id: string }) {
   return (
      <defs>
         <linearGradient id={id} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
         </linearGradient>
      </defs>
   );
}


export default function MainGrid() {
   return (
      <Box sx={{ width: '100%' }}>
         <Fade in={true} timeout={1000} mountOnEnter unmountOnExit>
            <Box>
               <Slide in={true} timeout={1000} direction="down" mountOnEnter unmountOnExit>
                  <Stack
                     direction="column"
                     sx={{ justifyContent: "center", alignItems: "center", gap: 2 }}
                  >
                     <Box
                        component="img"
                        src="stocks.svg"
                        alt="Stocks"
                        sx={{ width: 350, height: "auto", mb: 7 }}
                     />
                     {data.map((card, index) => (
                        <Grid key={index} size={12}>
                           <StatCard {...card} />
                        </Grid>
                     ))}
                     <Grid size={12}>
                        <Card variant="outlined" sx={{ width: '100%', textAlign: 'left' }}>
                           <CardContent>
                              <Typography component="h2" variant="subtitle2" gutterBottom>
                                 Sessions
                              </Typography>
                              <Stack sx={{ justifyContent: 'space-between' }}>
                                 <Stack
                                    direction="row"
                                    sx={{
                                       alignContent: { xs: 'center', sm: 'flex-start' },
                                       alignItems: 'center',
                                       gap: 1,
                                    }}
                                 >
                                    <Typography variant="h4" component="p">
                                       13,277
                                    </Typography>
                                    <Chip size="small" color="success" label="+35%" />
                                 </Stack>
                                 <Typography variant="caption" sx={{ color: 'text.success' }}>
                                    Sessions per day for the last 30 days
                                 </Typography>
                              </Stack>
                              <LineChart
                                 xAxis={[
                                    {
                                       scaleType: 'point',
                                       data: [
                                          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                                       ],
                                       tickInterval: (_index, i) => true,
                                    },
                                 ]}
                                 series={[
                                    {
                                       id: 'direct',
                                       label: 'Direct',
                                       showMark: false,
                                       curve: 'linear',
                                       stack: 'total',
                                       area: true,
                                       stackOrder: 'ascending',
                                       color: theme.palette.success.main,
                                       data: [
                                          300, 900, 600, 1200, 1500, 1800, 2400, 2100, 2700, 3000, 1800, 3300

                                       ],
                                    }
                                 ]}
                                 height={250}
                                 margin={{ left: 50, right: 20, top: 20, bottom: 20 }}
                                 grid={{ horizontal: true }}
                                 slotProps={{
                                    legend: {
                                       hidden: true,
                                    },
                                 }}
                              >
                                 <AreaGradient color={theme.palette.primary.dark} id="organic" />
                                 <AreaGradient color={theme.palette.primary.main} id="referral" />
                                 <AreaGradient color={theme.palette.primary.light} id="direct" />
                              </LineChart>
                           </CardContent>
                        </Card>
                     </Grid>
                  </Stack>
               </Slide>
            </Box>
         </Fade>
      </Box>
   );
}
