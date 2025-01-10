import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const data = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
  datasets: [
    {
      label: 'My First Dataset',
      data: [65, 59, 80, 81, 56, 55, 40],
      fill: false,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1,
    },
  ],
};

const options = {
  responsive: true,
  plugins: {
    title: {
      display: true,
      text: 'My Chart Title',
    },
    legend: {
      position: 'top' as const,
    },
  },
};

const Chart = () => {
  return (
    <div>
      <h2>My Line Chart</h2>
      <Line data={data} options={options} />
    </div>
  );
};

export default Chart;
