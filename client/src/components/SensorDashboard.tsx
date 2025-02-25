import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Thermometer, Droplets, Mountain, Compass, Activity, Waves } from 'lucide-react';
import { ref, onValue } from "firebase/database";
import { database } from '../firebase';
import axios from "axios";

interface SensorDashboardProps {
  selectedLake: string;
}

const SensorDashboard: React.FC<SensorDashboardProps> = ({ selectedLake }) => {
  const [latestSensor, setLatestSensor] = useState<any>(null);
  const [timeRange, setTimeRange] = useState("all");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("low");
  const [riskColor, setRiskColor] = useState<string>("bg-green-500");
  const [floatGraphData, setFloatGraphData] = useState<any[]>([]);
  const [shoreGraphData, setShoreGraphData] = useState<any[]>([]);
  const [gyroGraphData, setGyroGraphData] = useState<any[]>([]);
  const [locationName, setLocationName] = useState<string>("");

  useEffect(() => {
    const userId = "ggVVdic7v3gqsBkbQIRYWvlxOFo2"; // Replace with actual user ID
    const dataRef = ref(database, `UsersData/${userId}/readings`);

    const unsubscribe = onValue(
      dataRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          console.error("No data found");
          return;
        }

        const sensorEntries = Object.entries(data);
        if (sensorEntries.length === 0) {
          console.error("No sensor readings available");
          return;
        }

        sensorEntries.sort(([a], [b]) => Number(a) - Number(b));

        const [latestTimestamp, latestValues] = sensorEntries[sensorEntries.length - 1];
        const { floatLatitude, floatLongitude, ...filteredValues } = latestValues as {
          floatLatitude: string;
          floatLongitude: string;
          [key: string]: any;
        };
        setLatestSensor({ timestamp: latestTimestamp, ...filteredValues });
        fetchLocationName(parseFloat(floatLatitude), parseFloat(floatLongitude));
        updateGraphData(sensorEntries, timeRange);
        getPrediction(filteredValues);
      },
      (error) => {
        console.error("Error fetching data:", error);
      }
    );

    return () => unsubscribe();
  }, [timeRange]);

  const fetchLocationName = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();
      if (data.display_name) {
        setLocationName(data.display_name.split(",")[0]);
      } else {
        setLocationName("Location not found");
      }
    } catch (error) {
      console.error("Error fetching location name:", error);
      setLocationName("Error fetching location");
    }
  };

  const getPrediction = async (sensorData: any) => {
    try {
      const features = [
        sensorData.floatTemperature,
        sensorData.floatHumidity,
        sensorData.floatWaterTemperature,
        sensorData.floatAltitude,
        sensorData["floatX-Axis"],
        sensorData["floatY-Axis"],
        sensorData["floatZ-Axis"],
        sensorData.shoreTemperature,
        sensorData.shoreVibration,
        sensorData.floatVelocity,
      ].map(value => isNaN(parseFloat(value)) ? 0 : parseFloat(value));

      console.log("Features for prediction:", features); // Log features

      const response = await axios.post("https://glof-backend.onrender.com/predict", { features });

      const probabilities = response.data.probabilities; // Directly access array
      
      if (!Array.isArray(probabilities) || probabilities.length !== 3) {
        console.error("Invalid probabilities format:", response.data);
        return;
      }
      
      const riskLabels: ("low" | "medium" | "high")[] = ["low", "medium", "high"];
      const maxIndex = probabilities.indexOf(Math.max(...probabilities));
      
      setRiskLevel(riskLabels[maxIndex]);
      
      const riskColors: { [key in "low" | "medium" | "high"]: string } = { low: "bg-green-500", medium: "bg-yellow-500", high: "bg-red-500" };
      setRiskColor(riskColors[riskLabels[maxIndex]]);
    } catch (error) {
      console.error("Error fetching prediction:", error);
    }
  };

  const updateGraphData = (data: any[], range: string) => {
    const now = Date.now() / 1000;
    let filteredData;

    switch (range) {
      case "hour":
        filteredData = data.filter(([timestamp]) => now - Number(timestamp) <= 3600);
        break;
      case "day":
      case "week":
        filteredData = data.filter(([timestamp]) => now - Number(timestamp) <= 604800);
        break;
      case "all":
        filteredData = data;
        break;
      default:
        filteredData = data;
    }

    const formattedFloatData = filteredData.map(([timestamp, values]) => ({
      time: new Date(Number(timestamp) * 1000).toLocaleString(),
      temperature: parseFloat(values.floatTemperature || 0),
      humidity: parseFloat(values.floatHumidity || 0),
      waterTemperature: parseFloat(values.floatWaterTemperature || 0)
    }));

    const formattedShoreData = filteredData.map(([timestamp, values]) => ({
      time: new Date(Number(timestamp) * 1000).toLocaleString(),
      temperature: parseFloat(values.shoreTemperature || 0),
      humidity: parseFloat(values.shoreHumidity || 0),
      vibration: parseFloat(values.shoreVibration || 0)
    }));
    const formattedGyroData = filteredData.map(([timestamp, values]) => ({
      time: new Date(Number(timestamp) * 1000).toLocaleString(),
      magnitude: Math.sqrt(
        Math.pow(parseFloat(values['floatX-Axis'] || 0), 2) +
        Math.pow(parseFloat(values['floatY-Axis'] || 0), 2) +
        Math.pow(parseFloat(values['floatZ-Axis'] || 0), 2)
      )
    }));
    setGyroGraphData(formattedGyroData);

    setFloatGraphData(formattedFloatData);
    setShoreGraphData(formattedShoreData);
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="p-2 border border-gray-300 rounded-md"
        >
          <option value="hour">Last Hour</option>
          <option value="day">Last Day</option>
          <option value="week">Last Week</option>
          <option value="all">All Time</option>
        </select>
      </div>
      {/* Risk Level Indicator */}
      <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
        <h3 className="text-lg font-semibold mb-4">Risk Assessment</h3>
        <div className="flex items-center space-x-6">
          <div className="relative w-40 h-40">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-32 h-32 rounded-full ${riskColor} opacity-20 risk-pulse`}></div>
              <div className={`w-24 h-24 rounded-full ${riskColor} opacity-40`}></div>
              <div className={`w-16 h-16 rounded-full ${riskColor}`}></div>
            </div>
          </div>
          <div>
            <h4 className="text-2xl font-semibold capitalize">{riskLevel} Risk</h4>
            <p className="text-gray-600 mt-1">Based on current sensor readings</p>
            <div className="mt-3 text-sm">
              <div className="flex items-center text-gray-600">
                <Activity className="w-4 h-4 mr-2" />
                <span>Updated every 2 Seconds</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Floating Sensors */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center mb-4">
            <Waves className="w-6 h-6 text-blue-500 mr-2" />
            <h3 className="text-lg font-semibold">Floating Sensors</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
              <div className="flex items-center">
                <Mountain className="w-5 h-5 text-gray-600 mr-2" />
                <span className="text-gray-600">Altitude</span>
              </div>
              <span className="font-semibold">{typeof latestSensor?.floatAltitude === 'string' ? parseFloat(latestSensor.floatAltitude).toFixed(0) : 'N/A'}m</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
              <div className="flex items-center">
                <Droplets className="w-5 h-5 text-gray-600 mr-2" />
                <span className="text-gray-600">Humidity</span>
              </div>
              <span className="font-semibold">{typeof latestSensor?.floatHumidity === 'string' ? parseFloat(latestSensor.floatHumidity).toFixed(1) : 'N/A'}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
              <div className="flex items-center">
                <Thermometer className="w-5 h-5 text-gray-600 mr-2" />
                <span className="text-gray-600">Temperature</span>
              </div>
              <span className="font-semibold">{typeof latestSensor?.floatTemperature === 'string' ? parseFloat(latestSensor.floatTemperature).toFixed(1) : 'N/A'}°C</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
              <div className="flex items-center">
                <Thermometer className="w-5 h-5 text-blue-500 mr-2" />
                <span className="text-gray-600">Water Temp</span>
              </div>
              <span className="font-semibold">{typeof latestSensor?.floatWaterTemperature === 'string' ? parseFloat(latestSensor.floatWaterTemperature).toFixed(1) : 'N/A'}°C</span>
            </div>
          </div>
        </div>

        {/* Gyroscope Data */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center mb-4">
            <Compass className="w-6 h-6 text-blue-500 mr-2" />
            <h3 className="text-lg font-semibold">Gyroscope Data</h3>
          </div>
          <div className="space-y-4">
            {['X', 'Y', 'Z'].map(axis => (
              <div key={axis} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <div className="flex items-center">
                  <Activity className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="text-gray-600">{axis}-axis</span>
                </div>
                <span className="font-semibold">{typeof latestSensor?.[`float${axis}-Axis`] === 'string' ? parseFloat(latestSensor[`float${axis}-Axis`]).toFixed(3) : 'N/A'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Moraine Sensors */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center mb-4">
            <Mountain className="w-6 h-6 text-blue-500 mr-2" />
            <h3 className="text-lg font-semibold">Shore Sensors</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
              <div className="flex items-center">
                <Droplets className="w-5 h-5 text-gray-600 mr-2" />
                <span className="text-gray-600">Humidity</span>
              </div>
              <span className="font-semibold">{typeof latestSensor?.shoreHumidity === 'string' ? parseFloat(latestSensor.shoreHumidity).toFixed(1) : 'N/A'}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
              <div className="flex items-center">
                <Thermometer className="w-5 h-5 text-gray-600 mr-2" />
                <span className="text-gray-600">Temperature</span>
              </div>
              <span className="font-semibold">{typeof latestSensor?.shoreTemperature === 'string' ? parseFloat(latestSensor.shoreTemperature).toFixed(1) : 'N/A'}°C</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
              <div className="flex items-center">
                <Activity className="w-5 h-5 text-gray-600 mr-2" />
                <span className="text-gray-600">Vibration</span>
              </div>
              <span className="font-semibold">{typeof latestSensor?.shoreVibration === 'string' ? parseFloat(latestSensor.shoreVibration).toFixed(3) : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Time Series Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-lg font-semibold mb-4">Temperature & Humidity Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={floatGraphData} className="chart-container">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Temperature" 
                  dot={{ stroke: '#8884d8', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#8884d8', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="waterTemperature" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Water Temperature" 
                  dot={{ stroke: '#82ca9d', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#82ca9d', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="humidity" 
                  stroke="#ffc658" 
                  strokeWidth={2}
                  name="Humidity" 
                  dot={{ stroke: '#ffc658', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#ffc658', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-lg font-semibold mb-4">Vibration Analysis</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={shoreGraphData} className="chart-container">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="vibration" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.3}
                  name="Vibration"
                  activeDot={{ r: 6, stroke: '#8884d8', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* Gyroscope Data Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-lg font-semibold mb-4">Gyroscope Data Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gyroGraphData} className="chart-container">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="magnitude" 
                  stroke="#D8544F" 
                  strokeWidth={2}
                  name="Magnitude" 
                  dot={{ stroke: '#D8544F', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#D8544F', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Water Level Animation */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-lg font-semibold mb-4">Water Level Animation</h3>
          <div className="relative h-80">
            <div className="w-full h-full bg-blue-500"></div>
          </div>
        </div>
      </div>  
    </div>
  );
};

export default SensorDashboard;